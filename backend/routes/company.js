const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const bcrypt = require('bcryptjs');

const upload = multer({ storage: multer.memoryStorage() });
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';

// Helper to save report in MySQL
async function saveAnalysisReport(resumeId, userId, analysis) {
  const { ats_score, skills, grammar_issues, suggestions } = analysis;
  
  const keywords_found = JSON.stringify(skills || []);
  const grammar_issues_str = JSON.stringify(grammar_issues || []);
  const suggestions_str = JSON.stringify(suggestions || []);

  const [result] = await db.query(
    'INSERT INTO analysis_reports (resume_id, user_id, ats_score, keywords_found, grammar_issues, suggestions) VALUES (?, ?, ?, ?, ?, ?)',
    [resumeId, userId, ats_score, keywords_found, grammar_issues_str, suggestions_str]
  );
  return result.insertId;
}

// 1. Get All Candidates (For recruiter dashboard, filterable and sorted by ATS score)
router.get('/candidates', async (req, res) => {
  const { skill, minScore, search } = req.query;

  let query = `
    SELECT r.id as resume_id, r.title, r.template_type, r.created_at, 
           u.name as candidate_name, u.email as candidate_email,
           ar.ats_score, ar.keywords_found, ar.profile_strength
    FROM resumes r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN (
       SELECT resume_id, MAX(id) as max_report_id 
       FROM analysis_reports 
       GROUP BY resume_id
    ) latest_rep ON r.id = latest_rep.resume_id
    LEFT JOIN analysis_reports ar ON latest_rep.max_report_id = ar.id
    WHERE u.role = 'user'
  `;
  
  const params = [];

  // Keyword/Search filter
  if (search) {
    query += ` AND (u.name LIKE ? OR r.title LIKE ? OR ar.keywords_found::text LIKE ?)`;
    const searchVal = `%${search}%`;
    params.push(searchVal, searchVal, searchVal);
  }


  // Minimum ATS Score filter
  if (minScore) {
    query += ` AND ar.ats_score >= ?`;
    params.push(parseInt(minScore));
  }

  // Order candidates by highest score first
  query += ` ORDER BY COALESCE(ar.ats_score, 0) DESC`;

  try {
    const [candidates] = await db.query(query, params);
    
    // Format JSON and filters in JS
    const formatted = candidates.map(c => {
      let parsedSkills = [];
      try {
        parsedSkills = typeof c.keywords_found === 'string' ? JSON.parse(c.keywords_found) : (c.keywords_found || []);
      } catch (e) {
        parsedSkills = [];
      }
      return {
        ...c,
        skills: parsedSkills
      };
    });

    // Handle optional skill matching in Node code for flexibility
    let results = formatted;
    if (skill) {
      const matchSkill = skill.toLowerCase();
      results = formatted.filter(c => c.skills.some(s => s.toLowerCase().includes(matchSkill)));
    }

    res.json(results);
  } catch (err) {
    console.error('Error fetching candidates:', err);
    res.status(500).json({ error: 'Database error fetching candidates.' });
  }
});

// 2. Shortlist/Review Candidate Action
router.post('/shortlist', async (req, res) => {
  const { company_id, resume_id, score, status, notes } = req.body;

  if (!company_id || !resume_id) {
    return res.status(400).json({ error: 'company_id and resume_id are required' });
  }

  try {
    // Check if entry already exists
    const [existing] = await db.query(
      'SELECT id FROM shortlisted_resumes WHERE company_id = ? AND resume_id = ?',
      [company_id, resume_id]
    );

    if (existing.length > 0) {
      // Update
      await db.query(
        'UPDATE shortlisted_resumes SET score = ?, status = ?, notes = ? WHERE company_id = ? AND resume_id = ?',
        [score || 0, status || 'applied', notes || '', company_id, resume_id]
      );
      return res.json({ message: 'Shortlist entry updated successfully!' });
    } else {
      // Insert
      await db.query(
        'INSERT INTO shortlisted_resumes (company_id, resume_id, score, status, notes) VALUES (?, ?, ?, ?, ?)',
        [company_id, resume_id, score || 0, status || 'applied', notes || '']
      );
      return res.status(201).json({ message: 'Candidate added to recruiter list!' });
    }
  } catch (err) {
    console.error('Error shortlisting candidate:', err);
    res.status(500).json({ error: 'Database error handling shortlist.' });
  }
});

// 3. Get Shortlisted Resumes for a Company
router.get('/shortlisted/:companyId', async (req, res) => {
  const { companyId } = req.params;

  try {
    const [list] = await db.query(`
      SELECT sr.id as shortlist_id, sr.status, sr.notes, sr.score as shortlist_score, sr.created_at as action_date,
             r.id as resume_id, r.title,
             u.name as candidate_name, u.email as candidate_email
      FROM shortlisted_resumes sr
      JOIN resumes r ON sr.resume_id = r.id
      JOIN users u ON r.user_id = u.id
      WHERE sr.company_id = ?
      ORDER BY sr.created_at DESC
    `, [companyId]);

    res.json(list);
  } catch (err) {
    console.error('Error fetching shortlisted list:', err);
    res.status(500).json({ error: 'Database error fetching shortlist.' });
  }
});

// 4. Get Recruitement Dashboard Statistics
router.get('/stats/:companyId', async (req, res) => {
  const { companyId } = req.params;

  try {
    // Total applicants
    const [totalRes] = await db.query("SELECT COUNT(*) as count FROM resumes r JOIN users u ON r.user_id = u.id WHERE u.role = 'user'");
    const totalApplicants = totalRes[0].count;

    // Shortlisted status distribution for this company
    const [statusDist] = await db.query(
      'SELECT status, COUNT(*) as count FROM shortlisted_resumes WHERE company_id = ? GROUP BY status',
      [companyId]
    );

    // Average score
    const [avgScoreRes] = await db.query(
      'SELECT AVG(score) as avg_score FROM shortlisted_resumes WHERE company_id = ?',
      [companyId]
    );

    res.json({
      totalApplicants,
      statusDistribution: statusDist,
      averageScore: Math.round(avgScoreRes[0].avg_score || 0)
    });
  } catch (err) {
    console.error('Error fetching statistics:', err);
    res.status(500).json({ error: 'Database error fetching stats.' });
  }
});

// 5. Add / Import Candidate Resume (For recruiter manual upload)
router.post('/add-candidate', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a PDF, DOCX, or TXT file' });
  }

  const { company_id, name, email } = req.body;
  
  if (!company_id) {
    return res.status(400).json({ error: 'company_id is required' });
  }

  try {
    // 1. Forward file to Python for parsing and ATS analysis
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(`${PYTHON_SERVICE_URL}/analyze`, formData, {
      headers: formData.getHeaders()
    });
    const analysisResult = response.data;

    // Use provided name/email, fallback to extracted values, or generic defaults
    const candidateEmail = email || analysisResult.contact_info.email || `imported_${Date.now()}@example.com`;
    const candidateName = name || analysisResult.contact_info.name || req.file.originalname.split('.')[0] || "Imported Candidate";

    // 2. Check if candidate user already exists, otherwise create a user record
    let userId;
    const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [candidateEmail]);
    if (existingUsers.length > 0) {
      userId = existingUsers[0].id;
    } else {
      // Create user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('imported_candidate_pass_123', salt);
      const [userResult] = await db.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, \'user\')',
        [candidateName, candidateEmail, hashedPassword]
      );
      userId = userResult.insertId;
    }

    // 3. Create Resume record
    const mockResumeContent = {
      personal_info: {
        name: candidateName,
        email: candidateEmail,
        phone: analysisResult.contact_info.phone || "",
        website: analysisResult.contact_info.website || "",
        summary: "Imported via Recruiter Uploader."
      },
      skills: analysisResult.skills || [],
      experience: [],
      education: []
    };

    const [resResult] = await db.query(
      'INSERT INTO resumes (user_id, title, content, template_type) VALUES (?, ?, ?, ?)',
      [userId, req.file.originalname, JSON.stringify(mockResumeContent), 'modern']
    );
    const resumeId = resResult.insertId;

    // 4. Save analysis report
    const reportId = await saveAnalysisReport(resumeId, userId, analysisResult);

    // 5. Shortlist/Track immediately for this company
    await db.query(
      'INSERT INTO shortlisted_resumes (company_id, resume_id, score, status, notes) VALUES (?, ?, ?, \'applied\', \'Imported by Recruiter\')',
      [company_id, resumeId, analysisResult.ats_score || 0]
    );


    res.status(201).json({
      message: 'Candidate and resume imported successfully!',
      resumeId,
      reportId,
      userId,
      analysis: analysisResult
    });

  } catch (err) {
    console.error('Error importing candidate:', err.message);
    res.status(502).json({ error: 'AI Analysis engine failed or database error.' });
  }
});

module.exports = router;

