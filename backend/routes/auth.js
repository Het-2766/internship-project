const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'smart_resume_secret_key_123';

// 1. User/Recruiter Signup
router.post('/register', async (req, res) => {
  const { name, email, password, role, industry } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields (name, email, password) are required.' });
  }

  const userRole = role || 'user'; // default to job seeker

  try {
    // Check if user email already exists
    const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, userRole]
    );

    const userId = result.insertId;

    // If recruiter, also insert into companies table
    let companyId = null;
    if (userRole === 'recruiter') {
      const companyName = name + "'s Tech Firm";
      const [compResult] = await db.query(
        'INSERT INTO companies (name, industry, email, password) VALUES (?, ?, ?, ?)',
        [companyName, industry || 'Technology', email, hashedPassword]
      );
      companyId = compResult.insertId;
    }

    // Generate JWT
    const token = jwt.sign(
      { id: userId, name, email, role: userRole, companyId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registration successful!',
      token,
      user: { id: userId, name, email, role: userRole, companyId }
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Database error during registration.' });
  }
});

// 2. User/Recruiter Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password.' });
  }

  try {
    // Find user
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // If recruiter, fetch company ID
    let companyId = null;
    if (user.role === 'recruiter') {
      const [comps] = await db.query('SELECT id FROM companies WHERE email = ?', [email]);
      if (comps.length > 0) {
        companyId = comps[0].id;
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, companyId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, companyId }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Database error during login.' });
  }
});

module.exports = router;
