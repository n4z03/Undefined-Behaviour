// Bonita Baladi, 261097353
// Code added by Nazifa Ahmed (261112966)
// owner-owner functionality code added by Rupneet (261096653)

// Booking type 1: request a meeting

const express = require('express');
const router = express.Router();
const pool = require('../db');

// ─────────────────────────────────────────────
// AUTH MIDDLEWARE
// ─────────────────────────────────────────────
function requireLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'You must be logged in.' });
    }
    req.user = req.session.user;
    next();
}

function requireOwner(req, res, next) {
    if (req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Owner access only.' });
    }
    next();
}

function requireUser(req, res, next) {
    if (req.user.role !== 'user') {
        return res.status(403).json({ error: 'User access only.' });
    }
    next();
}

// ─────────────────────────────────────────────
// POST /api/meetingRequests
// Any logged-in account (user or owner) can send a meeting request to an owner,
// including a proposed date and time.
// ─────────────────────────────────────────────
router.post('/', requireLogin, async (req, res) => { //added by Rupneet (261096653)
    const user_id = req.user.id;

    const {
        owner_id,
        subject = null,
        message,
        proposed_date,   // YYYY-MM-DD
        proposed_start,  // HH:MM or HH:MM:SS
        proposed_end,    // HH:MM or HH:MM:SS
    } = req.body;

    const errors = [];
    if (!owner_id || !Number.isInteger(Number(owner_id))) {
        errors.push('owner_id is required and must be an integer.');
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
        errors.push('message is required.');
    }
    if (!proposed_date || !/^\d{4}-\d{2}-\d{2}$/.test(proposed_date)) {
        errors.push('proposed_date must be in YYYY-MM-DD format.');
    }
    if (!proposed_start || !/^\d{2}:\d{2}(:\d{2})?$/.test(proposed_start)) {
        errors.push('proposed_start must be in HH:MM or HH:MM:SS format.');
    }
    if (!proposed_end || !/^\d{2}:\d{2}(:\d{2})?$/.test(proposed_end)) {
        errors.push('proposed_end must be in HH:MM or HH:MM:SS format.');
    }
    if (proposed_start && proposed_end && proposed_start >= proposed_end) {
        errors.push('proposed_start must be earlier than proposed_end.');
    }
    if (errors.length > 0) return res.status(400).json({ errors });

    try {
        const [ownerRows] = await pool.query(
            `SELECT id, name, email FROM users WHERE id = ? AND role = 'owner'`,
            [Number(owner_id)]
        );
        if (ownerRows.length === 0) return res.status(404).json({ error: 'Owner not found.' });

        if (Number(owner_id) === user_id) {
            return res.status(400).json({ error: 'You cannot send a meeting request to yourself.' });
        }

        // Store proposed time as a prefix in the subject field.
        // Format: "[YYYY-MM-DD HH:MM - HH:MM] subject"
        // This is used later when the owner accepts, to create the booking slot.
        const timePrefix = `[${proposed_date} ${proposed_start} - ${proposed_end}]`;
        const fullSubject = subject ? `${timePrefix} ${subject.trim()}` : timePrefix;

        const [result] = await pool.query(
            `INSERT INTO meeting_requests (owner_id, user_id, subject, message, status)
             VALUES (?, ?, ?, ?, 'pending')`,
            [Number(owner_id), user_id, fullSubject, message.trim()]
        );

        const [newRequest] = await pool.query(
            `SELECT mr.*,
                u.name AS user_name, u.email AS user_email,
                o.name AS owner_name, o.email AS owner_email
             FROM meeting_requests mr
             JOIN users u ON mr.user_id = u.id
             JOIN users o ON mr.owner_id = o.id
             WHERE mr.id = ?`,
            [result.insertId]
        );

        res.status(201).json({
	  message: 'Meeting request sent.',
	  request: newRequest[0],
	  // Frontend uses this to open a mailto to notify the owner
	  notify: {
		to: newRequest[0].owner_email,
		subject: `New meeting request from ${newRequest[0].user_name}`,
		body: `Hi ${newRequest[0].owner_name},\n\n${newRequest[0].user_name} has requested a meeting with you.\n\nProposed time: ${proposed_date} from ${proposed_start} to ${proposed_end}.\n\nMessage: ${message.trim()}\n\nPlease log in to McBook to accept or decline.`,
	  },
	});


    } catch (err) {
        console.error('Error creating meeting request:', err);
        res.status(500).json({ error: 'Failed to send meeting request.' });
    }
});

// ─────────────────────────────────────────────
// GET /api/meetingRequests/incoming
// Owner sees all requests sent to them
// ─────────────────────────────────────────────
router.get('/incoming', requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;
    const { status } = req.query;
    const allowed = ['pending', 'accepted', 'declined'];

    try {
        let query = `
            SELECT mr.*, u.name AS user_name, u.email AS user_email, u.role AS requester_role
            FROM meeting_requests mr
            JOIN users u ON mr.user_id = u.id
            WHERE mr.owner_id = ?`;
        const params = [owner_id];

        if (status && allowed.includes(status)) {
            query += ` AND mr.status = ?`;
            params.push(status);
        }
        query += ` ORDER BY mr.created_at DESC`;

        const [requests] = await pool.query(query, params);
        res.json({ requests });

    } catch (err) {
        console.error('Error fetching incoming requests:', err);
        res.status(500).json({ error: 'Failed to fetch requests.' });
    }
});

// ─────────────────────────────────────────────
// GET /api/meetingRequests/outgoing
// Sender (user or owner) sees all requests they have sent
// ─────────────────────────────────────────────
router.get('/outgoing', requireLogin, async (req, res) => {
    const user_id = req.user.id;
    const { status } = req.query;
    const allowed = ['pending', 'accepted', 'declined'];

    try {
        let query = `
            SELECT mr.*, o.name AS owner_name, o.email AS owner_email
            FROM meeting_requests mr
            JOIN users o ON mr.owner_id = o.id
            WHERE mr.user_id = ?`;
        const params = [user_id];

        if (status && allowed.includes(status)) {
            query += ` AND mr.status = ?`;
            params.push(status);
        }
        query += ` ORDER BY mr.created_at DESC`;

        const [requests] = await pool.query(query, params);
        res.json({ requests });

    } catch (err) {
        console.error('Error fetching outgoing requests:', err);
        res.status(500).json({ error: 'Failed to fetch requests.' });
    }
});

// ─────────────────────────────────────────────
// PATCH /api/meetingRequests/:id/accept
// Owner accepts a request.
// Parses the proposed time from the subject prefix,
// creates a booking slot, links it via created_slot_id,
// and returns the user's email for mailto notification.
// ─────────────────────────────────────────────
router.patch('/:id/accept', requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;
    const request_id = Number(req.params.id);
    if (!Number.isInteger(request_id)) return res.status(400).json({ error: 'Invalid request id.' });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [rows] = await conn.query(
            `SELECT mr.*, u.name AS user_name, u.email AS user_email
             FROM meeting_requests mr
             JOIN users u ON mr.user_id = u.id
             WHERE mr.id = ? AND mr.owner_id = ?`,
            [request_id, owner_id]
        );

        if (rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Request not found.' });
        }

        const request = rows[0];

        if (request.status !== 'pending') {
            await conn.rollback();
            return res.status(400).json({
                error: `Request is already '${request.status}' and cannot be accepted.`
            });
        }

        // Parse proposed date/time from subject prefix: [YYYY-MM-DD HH:MM - HH:MM]
        const timeMatch = request.subject && request.subject.match(
            /^\[(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}(?::\d{2})?)\s+-\s+(\d{2}:\d{2}(?::\d{2})?)\]/
        );

        if (!timeMatch) {
            await conn.rollback();
            return res.status(400).json({
                error: 'Could not parse proposed time from request. Subject format may be corrupted.'
            });
        }

        const [, slot_date, start_time, end_time] = timeMatch;

        // Create the booking slot from the proposed time
        // is_recurring = 0 (SQLite boolean)
        const [slotResult] = await conn.query(
            `INSERT INTO booking_slots (
                owner_id, title, description, slot_date, start_time, end_time,
                slot_type, status, max_bookings, is_recurring
            ) VALUES (?, ?, ?, ?, ?, ?, 'requested', 'active', 1, 0)`,
            [
                owner_id,
                `Meeting with ${request.user_name}`,
                request.subject,
                slot_date,
                start_time,
                end_time,
            ]
        );

        const slot_id = slotResult.insertId;

        // Auto-book the slot for the user
        await conn.query(
            `INSERT INTO bookings (slot_id, user_id, status) VALUES (?, ?, 'confirmed')`,
            [slot_id, request.user_id]
        );

        // Mark request accepted and link to the created slot
        await conn.query(
            `UPDATE meeting_requests SET status = 'accepted', created_slot_id = ? WHERE id = ?`,
            [slot_id, request_id]
        );

        await conn.commit();

        res.json({
            message: 'Request accepted. Booking slot created.',
            slot_id,
            slot_date,
            start_time,
            end_time,
            notify: {
                to: request.user_email,
                subject: `Your meeting request has been accepted`,
                body: `Hi ${request.user_name}, your meeting request has been accepted. Date: ${slot_date}, Time: ${start_time} - ${end_time}.`,
            },
        });

    } catch (err) {
        await conn.rollback();
        console.error('Error accepting request:', err);
        res.status(500).json({ error: 'Failed to accept request.' });
    } finally {
        conn.release();
    }
});

// ─────────────────────────────────────────────
// PATCH /api/meetingRequests/:id/decline
// Owner declines a request.
// Returns the user's email for mailto notification.
// ─────────────────────────────────────────────
router.patch('/:id/decline', requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;
    const request_id = Number(req.params.id);
    if (!Number.isInteger(request_id)) return res.status(400).json({ error: 'Invalid request id.' });

    try {
        const [rows] = await pool.query(
            `SELECT mr.*, u.name AS user_name, u.email AS user_email
             FROM meeting_requests mr
             JOIN users u ON mr.user_id = u.id
             WHERE mr.id = ? AND mr.owner_id = ?`,
            [request_id, owner_id]
        );

        if (rows.length === 0) return res.status(404).json({ error: 'Request not found.' });

        const request = rows[0];

        if (request.status !== 'pending') {
            return res.status(400).json({
                error: `Request is already '${request.status}' and cannot be declined.`
            });
        }

        await pool.query(
            `UPDATE meeting_requests SET status = 'declined' WHERE id = ?`,
            [request_id]
        );

        res.json({
            message: 'Request declined.',
            notify: {
                to: request.user_email,
                subject: `Your meeting request has been declined`,
                body: `Hi ${request.user_name}, unfortunately your meeting request has been declined.`,
            },
        });

    } catch (err) {
        console.error('Error declining request:', err);
        res.status(500).json({ error: 'Failed to decline request.' });
    }
});

// edit pending requests done by Nazifa Ahmed (261112966)
router.patch('/:id', requireLogin, requireUser, async (req, res) => {
    const user_id = req.user.id;
    const request_id = Number(req.params.id);
    if (!Number.isInteger(request_id)) {
        return res.status(400).json({ error: 'Invalid request id.' });
    }

    const {
        message,
        subject = null,
        proposed_date,
        proposed_start,
        proposed_end,
    } = req.body;

    const errors = [];
    if (!message || typeof message !== 'string' || !message.trim()) {
        errors.push('message is required.');
    }
    if (!proposed_date || !/^\d{4}-\d{2}-\d{2}$/.test(proposed_date)) {
        errors.push('proposed_date must be in YYYY-MM-DD format.');
    }
    if (!proposed_start || !/^\d{2}:\d{2}(:\d{2})?$/.test(proposed_start)) {
        errors.push('proposed_start must be in HH:MM or HH:MM:SS format.');
    }
    if (!proposed_end || !/^\d{2}:\d{2}(:\d{2})?$/.test(proposed_end)) {
        errors.push('proposed_end must be in HH:MM or HH:MM:SS format.');
    }
    if (proposed_start && proposed_end && proposed_start >= proposed_end) {
        errors.push('proposed_start must be earlier than proposed_end.');
    }
    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    try {
        const [rows] = await pool.query(
            `SELECT * FROM meeting_requests WHERE id = ? AND user_id = ?`,
            [request_id, user_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Request not found.' });
        }
        if (rows[0].status !== 'pending') {
            return res.status(400).json({ error: 'You can only edit a pending request.' });
        }

        const timePrefix = `[${proposed_date} ${proposed_start} - ${proposed_end}]`;
        const fullSubject = subject && String(subject).trim()
            ? `${timePrefix} ${String(subject).trim()}`
            : timePrefix;

        await pool.query(
            `UPDATE meeting_requests
             SET message = ?,
                 subject = ?,
                 updated_at = datetime('now')
             WHERE id = ? AND user_id = ?`,
            [message.trim(), fullSubject, request_id, user_id]
        );

        const [out] = await pool.query(
            `SELECT mr.*, o.name AS owner_name, o.email AS owner_email
             FROM meeting_requests mr
             JOIN users o ON mr.owner_id = o.id
             WHERE mr.id = ?`,
            [request_id]
        );

        res.json({
            message: 'Request updated.',
            request: out[0] || null,
        });
    } catch (err) {
        console.error('Error updating meeting request:', err);
        res.status(500).json({ error: 'Failed to update request.' });
    }
});

// ─────────────────────────────────────────────
// DELETE /api/meetingRequests/:id
// Sender (user or owner) cancels their own pending request
// ─────────────────────────────────────────────
router.delete('/:id', requireLogin, async (req, res) => {
    const user_id = req.user.id;
    const request_id = Number(req.params.id);
    if (!Number.isInteger(request_id)) return res.status(400).json({ error: 'Invalid request id.' });

    try {
        const [rows] = await pool.query(
            `SELECT * FROM meeting_requests WHERE id = ? AND user_id = ?`,
            [request_id, user_id]
        );

        if (rows.length === 0) return res.status(404).json({ error: 'Request not found.' });

        if (rows[0].status !== 'pending') {
            return res.status(400).json({
                error: `Cannot cancel a request that is already '${rows[0].status}'.`
            });
        }

        await pool.query(
            `DELETE FROM meeting_requests WHERE id = ? AND user_id = ?`,
            [request_id, user_id]
        );

        res.json({ message: 'Meeting request cancelled.', deleted_request_id: request_id });

    } catch (err) {
        console.error('Error cancelling request:', err);
        res.status(500).json({ error: 'Failed to cancel request.' });
    }
});

module.exports = router;
