const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const db = require('../config/db');

// Set up memory storage for multer (holds files in buffers rather than disk)
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

// 1. Analyze Resume Text (from Builder UI)
router.post('/text', async (req, res) => {
  const { resume_id, user_id, text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Resume text is required for analysis' });
  }

  try {
    // Send text to Python Flask API
    const response = await axios.post(`${PYTHON_SERVICE_URL}/analyze`, { text });
    const analysisResult = response.data;

    let reportId = null;
    // If saving to an existing database resume record
    if (resume_id && user_id) {
      reportId = await saveAnalysisReport(resume_id, user_id, analysisResult);
    }

    res.json({
      message: 'Analysis completed successfully',
      reportId,
      analysis: analysisResult
    });
  } catch (err) {
    console.error('Error communicating with Python service:', err.message);
    res.status(502).json({ error: 'AI Analysis engine is offline or returned an error.' });
  }
});

// 2. Analyze Uploaded Document File (PDF/DOCX/TXT)
router.post('/file', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a PDF, DOCX, or TXT file' });
  }

  const { user_id } = req.body; // optional user_id, if logged in

  try {
    // Construct FormData to forward to Flask
    const FormData = require('form-data'); // Require locally or build boundary manually
    // Since we want to keep it simple, we can construct the multipart manual payload or use axios standard FormData
    // Let's use form-data package or standard Axios FormData
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(`${PYTHON_SERVICE_URL}/analyze`, formData, {
      headers: formData.getHeaders()
    });
    
    const analysisResult = response.data;

    let resumeId = null;
    let reportId = null;

    // If user is authenticated, let's create a temporary resume database record for them
    if (user_id) {
      const mockResumeContent = {
        personal_info: {
          name: req.body.name || "Uploaded Resume User",
          email: analysisResult.contact_info.email || "",
          phone: analysisResult.contact_info.phone || "",
          website: analysisResult.contact_info.website || "",
          summary: "Imported via file uploader analyzer."
        },
        skills: analysisResult.skills,
        experience: [],
        education: []
      };

      const [resResult] = await db.query(
        'INSERT INTO resumes (user_id, title, content, template_type) VALUES (?, ?, ?, ?)',
        [user_id, req.file.originalname, JSON.stringify(mockResumeContent), 'modern']
      );
      resumeId = resResult.insertId;

      reportId = await saveAnalysisReport(resumeId, user_id, analysisResult);
    }

    res.json({
      message: 'Document analyzed successfully',
      resumeId,
      reportId,
      analysis: analysisResult
    });

  } catch (err) {
    console.error('File analysis error forwarding to Python:', err.message);
    res.status(502).json({ error: 'AI Analysis engine failed to process the document.' });
  }
});

// 3. Get Analysis History for a User
router.get('/history/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const [reports] = await db.query(`
      SELECT ar.*, r.title as resume_title 
      FROM analysis_reports ar
      JOIN resumes r ON ar.resume_id = r.id
      WHERE ar.user_id = ?
      ORDER BY ar.created_at DESC
    `, [userId]);

    // Parse JSON lists safely (handles both MySQL string JSON and Postgres native JSON formats)
    reports.forEach(r => {
      if (typeof r.keywords_found === 'string') r.keywords_found = JSON.parse(r.keywords_found);
      if (typeof r.grammar_issues === 'string') r.grammar_issues = JSON.parse(r.grammar_issues);
      if (typeof r.suggestions === 'string') r.suggestions = JSON.parse(r.suggestions);
    });


    res.json(reports);
  } catch (err) {
    console.error('Error fetching analysis history:', err);
    res.status(500).json({ error: 'Database error fetching reports.' });
  }
});

module.exports = router;
