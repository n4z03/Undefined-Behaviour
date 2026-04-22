// Bonita Baladi, 261097353

// Booking type 3: recurring OH

const express = require('express');
const router = express.Router();
const pool = require('../db');

// ─────────────────────────────────────────────
// AUTH MIDDLEWARE (placeholder until Nazifa finishes)
// TODO: replace with real session/JWT middleware
// ─────────────────────────────────────────────
function requireLogin(req, res, next) {
    // TEMP: real auth will set req.user from session/token
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

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

// Add N weeks to a YYYY-MM-DD string, returns a new YYYY-MM-DD string
function addWeeks(dateStr, weeks) {
    const date = new Date(dateStr + 'T00:00:00');  // force local midnight, avoid UTC shift
    date.setDate(date.getDate() + weeks * 7);
    return date.toISOString().slice(0, 10);
}

// Validate the fields needed to create a recurring slot
function validateInput(body) {
    const errors = [];

    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
        errors.push('title is required.');
    }
    if (!body.slot_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.slot_date)) {
        errors.push('slot_date must be YYYY-MM-DD (the date of the first slot).');
    }
    if (!body.start_time || !/^\d{2}:\d{2}(:\d{2})?$/.test(body.start_time)) {
        errors.push('start_time must be HH:MM or HH:MM:SS.');
    }
    if (!body.end_time || !/^\d{2}:\d{2}(:\d{2})?$/.test(body.end_time)) {
        errors.push('end_time must be HH:MM or HH:MM:SS.');
    }
    if (body.start_time && body.end_time && body.start_time >= body.end_time) {
        errors.push('start_time must be earlier than end_time.');
    }
    if (
        !body.recurrence_weeks ||
        !Number.isInteger(Number(body.recurrence_weeks)) ||
        Number(body.recurrence_weeks) < 1 ||
        Number(body.recurrence_weeks) > 52
    ) {
        errors.push('recurrence_weeks must be an integer between 1 and 52.');
    }

    return errors;
}

// ─────────────────────────────────────────────
// POST /api/recurringSlots
// Owner creates a recurring office hours slot.
// Generates one parent slot + recurrence_weeks child slots.
// ─────────────────────────────────────────────
router.post('/', requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;

    const {
        title,
        description = null,
        slot_date,        // date of the FIRST occurrence
        start_time,
        end_time,
        location = null,
        recurrence_weeks,
        max_bookings = 1,
        status = 'private',
    } = req.body;

    const errors = validateInput({ title, slot_date, start_time, end_time, recurrence_weeks });
    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    const weeks = Number(recurrence_weeks);

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Insert the parent slot (is_recurring = true, no parent_slot_id)
        const [parentResult] = await conn.query(
            `INSERT INTO booking_slots (
                owner_id, title, description, slot_date, start_time, end_time,
                location, slot_type, status, max_bookings,
                is_recurring, recurrence_weeks, parent_slot_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'office_hours', ?, ?, true, ?, NULL)`,
            [
                owner_id, title.trim(), description, slot_date,
                start_time, end_time, location, status, max_bookings, weeks,
            ]
        );

        const parent_id = parentResult.insertId;

        // 2. Generate child slots, one per week after the first
        //    Week 0 = the parent itself, so children start at week 1
        const childValues = [];
        for (let w = 1; w <= weeks; w++) {
            const childDate = addWeeks(slot_date, w);
            childValues.push([
                owner_id, parent_id, title.trim(), description, childDate,
                start_time, end_time, location, status, max_bookings,
            ]);
        }

        if (childValues.length > 0) {
            await conn.query(
                `INSERT INTO booking_slots (
                    owner_id, parent_slot_id, title, description, slot_date,
                    start_time, end_time, location, slot_type, status, max_bookings,
                    is_recurring, recurrence_weeks
                ) VALUES ?`,
                // map each child row; slot_type, is_recurring, recurrence_weeks are literals
                [childValues.map(r => [...r, 'office_hours', true, null])]
            );
        }

        await conn.commit();

        // Return the parent + the number of children created
        const [parentRows] = await conn.query(
            `SELECT * FROM booking_slots WHERE id = ?`, [parent_id]
        );

        res.status(201).json({
            message: `Recurring slot created with ${weeks} occurrence(s).`,
            parent: parentRows[0],
            children_created: childValues.length,
        });

    } catch (err) {
        await conn.rollback();
        console.error('Error creating recurring slot:', err);
        res.status(500).json({ error: 'Failed to create recurring slot.' });
    } finally {
        conn.release();
    }
});

// ─────────────────────────────────────────────
// GET /api/recurringSlots
// Owner sees all their recurring parent slots
// ─────────────────────────────────────────────
router.get('/', requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;

    try {
        // Only fetch parents (parent_slot_id IS NULL) that are recurring
        const [parents] = await pool.query(
            `SELECT bs.*,
                COUNT(children.id) AS total_children,
                SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) AS total_bookings
            FROM booking_slots bs
            LEFT JOIN booking_slots children ON children.parent_slot_id = bs.id
            LEFT JOIN bookings b ON b.slot_id = children.id AND b.status = 'confirmed'
            WHERE bs.owner_id = ? AND bs.is_recurring = true AND bs.parent_slot_id IS NULL
            GROUP BY bs.id
            ORDER BY bs.slot_date ASC`,
            [owner_id]
        );

        res.json({ recurring_slots: parents });
    } catch (err) {
        console.error('Error fetching recurring slots:', err);
        res.status(500).json({ error: 'Failed to fetch recurring slots.' });
    }
});

// ─────────────────────────────────────────────
// GET /api/recurringSlots/:id/children
// Owner sees all child occurrences for a parent slot, with booking counts
// ─────────────────────────────────────────────
router.get('/:id/children', requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;
    const parent_id = Number(req.params.id);

    if (!Number.isInteger(parent_id)) {
        return res.status(400).json({ error: 'Invalid slot id.' });
    }

    try {
        // Confirm the parent exists and belongs to this owner
        const [parentRows] = await pool.query(
            `SELECT * FROM booking_slots
             WHERE id = ? AND owner_id = ? AND parent_slot_id IS NULL AND is_recurring = true`,
            [parent_id, owner_id]
        );

        if (parentRows.length === 0) {
            return res.status(404).json({ error: 'Recurring slot not found.' });
        }

        const [children] = await pool.query(
            `SELECT bs.*,
                COUNT(b.id) AS booking_count
            FROM booking_slots bs
            LEFT JOIN bookings b ON b.slot_id = bs.id AND b.status = 'confirmed'
            WHERE bs.parent_slot_id = ? AND bs.owner_id = ?
            GROUP BY bs.id
            ORDER BY bs.slot_date ASC`,
            [parent_id, owner_id]
        );

        res.json({
            parent: parentRows[0],
            children,
        });
    } catch (err) {
        console.error('Error fetching children:', err);
        res.status(500).json({ error: 'Failed to fetch occurrences.' });
    }
});

// ─────────────────────────────────────────────
// PATCH /api/recurringSlots/:id/visibility
// Toggle all children active/private at once
// ─────────────────────────────────────────────
router.patch('/:id/visibility', requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;
    const parent_id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(parent_id)) {
        return res.status(400).json({ error: 'Invalid slot id.' });
    }
    if (!['private', 'active'].includes(status)) {
        return res.status(400).json({ error: "status must be 'private' or 'active'." });
    }

    try {
        // Confirm parent ownership
        const [parentRows] = await pool.query(
            `SELECT id FROM booking_slots
             WHERE id = ? AND owner_id = ? AND parent_slot_id IS NULL AND is_recurring = true`,
            [parent_id, owner_id]
        );

        if (parentRows.length === 0) {
            return res.status(404).json({ error: 'Recurring slot not found.' });
        }

        // Update parent + all children in one query
        const [result] = await pool.query(
            `UPDATE booking_slots
             SET status = ?
             WHERE owner_id = ? AND (id = ? OR parent_slot_id = ?)`,
            [status, owner_id, parent_id, parent_id]
        );

        res.json({
            message: `All occurrences set to '${status}'.`,
            rows_updated: result.affectedRows,
        });
    } catch (err) {
        console.error('Error updating visibility:', err);
        res.status(500).json({ error: 'Failed to update visibility.' });
    }
});

// ─────────────────────────────────────────────
// DELETE /api/recurringSlots/:id
// Delete the parent slot and all its children.
// Returns a list of affected users so the owner can send mailto notifications.
// ─────────────────────────────────────────────
router.delete('/:id', requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;
    const parent_id = Number(req.params.id);

    if (!Number.isInteger(parent_id)) {
        return res.status(400).json({ error: 'Invalid slot id.' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Confirm ownership
        const [parentRows] = await conn.query(
            `SELECT * FROM booking_slots
             WHERE id = ? AND owner_id = ? AND parent_slot_id IS NULL AND is_recurring = true`,
            [parent_id, owner_id]
        );

        if (parentRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Recurring slot not found.' });
        }

        // Collect all affected users across all children before deleting
        // (bookings will cascade-delete when slots are deleted)
        const [affectedUsers] = await conn.query(
            `SELECT DISTINCT u.id, u.name, u.email, bs.slot_date, bs.start_time, bs.end_time
             FROM bookings bk
             JOIN users u ON bk.user_id = u.id
             JOIN booking_slots bs ON bk.slot_id = bs.id
             WHERE bk.status = 'confirmed'
               AND (bs.id = ? OR bs.parent_slot_id = ?)
             ORDER BY bs.slot_date ASC`,
            [parent_id, parent_id]
        );

        // Delete children first (foreign key: parent_slot_id), then parent
        await conn.query(
            `DELETE FROM booking_slots WHERE parent_slot_id = ? AND owner_id = ?`,
            [parent_id, owner_id]
        );
        await conn.query(
            `DELETE FROM booking_slots WHERE id = ? AND owner_id = ?`,
            [parent_id, owner_id]
        );

        await conn.commit();

        res.json({
            message: 'Recurring slot and all occurrences deleted.',
            deleted_parent_id: parent_id,
            affected_users: affectedUsers,
            // Frontend uses affected_users to build mailto: notification links
        });

    } catch (err) {
        await conn.rollback();
        console.error('Error deleting recurring slot:', err);
        res.status(500).json({ error: 'Failed to delete recurring slot.' });
    } finally {
        conn.release();
    }
});

module.exports = router;
