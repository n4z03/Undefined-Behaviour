// Nazifa Ahmed (261112966)
const express = require('express');
const router = express.Router();

router.post('/register', (req, res) => {
    const { name, email, password } = req.body;

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

module.exports = router;