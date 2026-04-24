// Nazifa Ahmed (261112966)

const express = require('express');
const router = express.Router();
const pool = require('../db');

function requireLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'You must be logged in.' });
    }
    req.user = req.session.user;
    next();
}

// GET /api/owners
// Returns all owners who have at least one active booking slot.
// Used by users to populate the owner picker when browsing slots or sending meeting requests.
router.get('/', requireLogin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT DISTINCT u.id, u.name, u.email
             FROM users u
             JOIN booking_slots bs ON bs.owner_id = u.id
             WHERE u.role = 'owner' AND bs.status = 'active'
             ORDER BY u.name ASC`
        );

        res.json({ owners: rows });
    } catch (err) {
        console.error('Error fetching owners:', err);
        res.status(500).json({ error: 'Failed to fetch owners.' });
    }
});

module.exports = router;
