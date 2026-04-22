// Nazifa Ahmed (261112966)
// some parts added by Sophia Casalme (261149930)

const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');

router.post('/register', (req, res) => {
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

      // Return user info
      res.json({
        message: 'registered',
        user: {
          name: name.trim(),
          email: email.trim(),
          role
        }
      });
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

  const [rows] = await pool.query(
      `SELECT * FROM users WHERE email = ?`, 
      [email.trim()]
  );

  if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
  }

  const user = rows[0];

  const match = await bcrypt.compare(password, user.password_hash)
if (!match) {
    return res.status(401).json({ error: 'Invalid email or password' })
}

  req.session.user = { id: user.id, email: user.email, role: user.role };

  res.json({
      message: 'Logged in',
      user: { id: user.id, email: user.email, role: user.role }
  });
});

router.get('/me', (req, res) => {
    res.json({
      message: 'No authentication state yet',
      user: null
    });
});

module.exports = router;