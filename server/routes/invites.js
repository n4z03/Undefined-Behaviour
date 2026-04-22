// Comp 307 Project: Invitation System
// Sophia Casalme, 261149930 

/* Invitation System 
Generate a unique URL per owner linking to to their specific booking page. 
Enforce authentication before allowing access to private booking pages. */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const crypto = require('crypto');

// Ensure that the user is logged in
function requireLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: "You must be logged in." });
    }

    req.user = req.session.user;
    next();
}

function requireOwner(req, res, next) {
    if (req.user.role !== "owner") {
        return res.status(403).json({ error: "Owner access only." });
    }

    next();
}

// POST /api/invites/generate
// Generate a unique invite
router.post('/generate', requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;
    const { group_id = null, label = null, expires_at = null } = req.body;

    try {
        const token = crypto.randomBytes(32).toString('hex');

        await pool.query(
            `INSERT INTO owner_invites (owner_id, group_id, token, label, expires_at)
             VALUES (?, ?, ?, ?, ?)`,
            [owner_id, group_id, token, label, expires_at]
        );

        res.status(201).json({
            message: 'Invite generated successfully.',
            invite_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/user-dashboard?invite=${token}`,
            token
        });
    } catch (err) {
        console.error('Error generating invite:', err);
        res.status(500).json({ error: 'Failed to generate invite.' });
    }
});

// GET /api/invites/:token
// Get the owner's active slot for a given invite token (user must be logged in to access)
router.get('/:token', requireLogin, async (req, res) => {
    const { token } = req.params;

    try {
        // Find the invite
        const [invites] = await pool.query(
            `SELECT * FROM owner_invites WHERE token = ?`,
            [token]
        );

        if (invites.length === 0) {
            return res.status(404).json({ error: 'Invite not found.' });
        }

        const invite = invites[0];

        // Check if invite is expired
        if (invites.expires_at && new Date(invite.expires_at) < new Date()) {
            return res.status(410).json({ error: 'This invite has expired.' });
        }

        // Fetch only active slots for this owner
        let query = `SELECT * FROM booking_slots WHERE owner_id = ? AND status = 'active'`;
        const params = [invite.owner_id];

        if (invite.group_id) {
            query += ` AND group_id = ?`;
            params.push(invite.group_id);
        }

        query += ` ORDER BY slot_date ASC, start_time ASC`;

        const [slots] = await pool.query(query, params);

        res.json({
            owner_id: invite.owner_id,
            label: invite.label,
            slots
        });
    } catch (err) {
        console.error('Error fetching invite slots:', err);
        res.status(500).json({ error: 'Failed to fetch invite.' });
    }
});

// GET /api/invites
// Get all invites for the logged-in owner
router.get('/', requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;

    try {
        const [invites] = await pool.query(
            `SELECT * FROM owner_invites WHERE owner_id = ? ORDER BY created_at DESC`,
            [owner_id]
        );

        res.json({ invites });
    } catch (err) {
        console.error('Error fetching invites:', err);
        res.status(500).json({ error: 'Failed to fetch invites.' });
    }
});

// DELETE /api/invites/:token
// Delete an invite token
router.delete('/:token', requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;
    const { token } = req.params;

    try {
        const [result] = await pool.query(
            `DELETE FROM owner_invites WHERE token = ? AND owner_id = ?`,
            [token, owner_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Invite not found.' });
        }

        res.json({ message: 'Invite deleted successfully.' });
    } catch (err) {
        console.error('Error deleting invite:', err);
        res.status(500).json({ error: 'Failed to delete invite.' });
    }
});

module.exports = router;
