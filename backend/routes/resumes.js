const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 1. Create/Save Resume
router.post('/', async (req, res) => {
  const { user_id, title, content, template_type } = req.body;

  if (!user_id || !title || !content) {
    return res.status(400).json({ error: 'user_id, title, and content are required.' });
  }

  try {
    // stringify JSON content if it is an object
    const jsonContent = typeof content === 'object' ? JSON.stringify(content) : content;

    const [result] = await db.query(
      'INSERT INTO resumes (user_id, title, content, template_type) VALUES (?, ?, ?, ?)',
      [user_id, title, jsonContent, template_type || 'modern']
    );

    res.status(201).json({
      message: 'Resume saved successfully!',
      resumeId: result.insertId
    });
  } catch (err) {
    console.error('Error saving resume:', err);
    res.status(500).json({ error: 'Database error saving resume.' });
  }
});

// 2. Get All Resumes for a Specific User
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const [resumes] = await db.query(
      'SELECT id, title, template_type, created_at FROM resumes WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.json(resumes);
  } catch (err) {
    console.error('Error fetching user resumes:', err);
    res.status(500).json({ error: 'Database error fetching resumes.' });
  }
});

// 3. Get Specific Resume Details
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [resumes] = await db.query('SELECT * FROM resumes WHERE id = ?', [id]);
    if (resumes.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const resume = resumes[0];
    
    // Parse content back if it is stored as string/buffer
    if (typeof resume.content === 'string') {
      resume.content = JSON.parse(resume.content);
    }

    res.json(resume);
  } catch (err) {
    console.error('Error fetching resume:', err);
    res.status(500).json({ error: 'Database error fetching resume.' });
  }
});

// 4. Update Resume
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, template_type } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'title and content are required.' });
  }

  try {
    const jsonContent = typeof content === 'object' ? JSON.stringify(content) : content;

    const [result] = await db.query(
      'UPDATE resumes SET title = ?, content = ?, template_type = ? WHERE id = ?',
      [title, jsonContent, template_type || 'modern', id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Resume not found or no changes made.' });
    }

    res.json({ message: 'Resume updated successfully!' });
  } catch (err) {
    console.error('Error updating resume:', err);
    res.status(500).json({ error: 'Database error updating resume.' });
  }
});

// 5. Delete Resume
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM resumes WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    res.json({ message: 'Resume deleted successfully!' });
  } catch (err) {
    console.error('Error deleting resume:', err);
    res.status(500).json({ error: 'Database error deleting resume.' });
  }
});

module.exports = router;
