// Nazifa Ahmed (261112966)
// some parts added by Sophia Casalme (261149930)

const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body || {};

    if (
        typeof name !== 'string' || !name.trim() ||
        typeof email !== 'string' || !email.trim() ||
        typeof password !== 'string' || !password.trim()
      ) {
        return res.status(400).json({ error: 'All fields are required' });
      }
    
    // Check if the email is from McGill University domain
    // Email can be either @mcgill.ca or @mail.mcgill.ca
    // If not, return 400 error
    if (!email.endsWith('@mcgill.ca') && !email.endsWith('@mail.mcgill.ca')) {
        return res.status(400).json({ error: 'Email must be from McGill University domain' });
      }

      // Assign owner role if email is a prof email
      let role;
      if (email.endsWith('@mcgill.ca')) {
        role = 'owner';
      } else {
        role = 'user';
      }

      try {
        // Check if email already exists
        const [existing] = await pool.query(
            `SELECT id FROM users WHERE email = ?`, [email.trim()]
        );
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already registered.' });
        }

        // Hash the password
        const password_hash = await bcrypt.hash(password, 10);

        // Insert into database
        const [result] = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
            [name.trim(), email.trim(), password_hash, role]
        );

        res.json({
            message: 'registered',
            user: { id: result.insertId, name: name.trim(), email: email.trim(), role }
        });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ error: 'Registration failed.' });
    }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (
    typeof email !== 'string' || !email.trim() ||
    typeof password !== 'string' || !password.trim()
  ) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!email.endsWith('@mcgill.ca') && !email.endsWith('@mail.mcgill.ca')) {
    return res.status(400).json({ error: 'Email must be from McGill University domain' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT * FROM users WHERE email = ?`,
      [email.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // stick user info on the session so other routes can read req.user
    req.session.user = { id: user.id, email: user.email, role: user.role };

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Login failed. Please try again.' });
      }
      res.json({
        message: 'Logged in',
        user: { id: user.id, email: user.email, role: user.role }
      });
    });
  } catch (e) {
    console.error('login error:', e);
    return res.status(500).json({ error: 'Login failed.' });
  }
});

router.get('/me', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Not logged in', user: null });
    }

    const [rows] = await pool.query(
      `SELECT id, name, email, role FROM users WHERE id = ?`,
      [req.session.user.id]
    );

    if (rows.length === 0) {
      // cookie said we were logged in but user row is missing, drop session
      return req.session.destroy(() => {
        res.status(404).json({ error: 'User not found', user: null });
      });
    }

    const user = rows[0];
    return res.json({ user });
  } catch (err) {
    console.error('Error fetching current user:', err);
    return res.status(500).json({ error: 'Failed to fetch current user', user: null });
  }
});

// Added by Sophia
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed.' });
    }
    // same options as the session cookie in index.js (otherwise browser might keep it)
    res.clearCookie('connect.sid', { path: '/', httpOnly: true, sameSite: 'lax' });
    res.json({ message: 'Logged out' });
  });
});

module.exports = router;