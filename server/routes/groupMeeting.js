// Bonita Baladi, 261097353

// Booking type 2: group meeting calendar method
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

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

// Add N weeks to a YYYY-MM-DD string
function addWeeks(dateStr, weeks) {
    const date = new Date(dateStr + 'T00:00:00');
    date.setDate(date.getDate() + weeks * 7);
    return date.toISOString().slice(0, 10);
}

// Validate a single slot option object
function validateSlotOption(slot, index) {
    const errors = [];
    const prefix = `slots[${index}]`;

    if (!slot.slot_date || !/^\d{4}-\d{2}-\d{2}$/.test(slot.slot_date)) {
        errors.push(`${prefix}: slot_date must be YYYY-MM-DD.`);
    }
    if (!slot.start_time || !/^\d{2}:\d{2}(:\d{2})?$/.test(slot.start_time)) {
        errors.push(`${prefix}: start_time must be HH:MM or HH:MM:SS.`);
    }
    if (!slot.end_time || !/^\d{2}:\d{2}(:\d{2})?$/.test(slot.end_time)) {
        errors.push(`${prefix}: end_time must be HH:MM or HH:MM:SS.`);
    }
    if (slot.start_time && slot.end_time && slot.start_time >= slot.end_time) {
        errors.push(`${prefix}: start_time must be earlier than end_time.`);
    }

    return errors;
}

// ─────────────────────────────────────────────
// POST /api/groupMeeting
// Owner creates a group meeting with multiple slot options.
// Body: { name, description, slots: [{ slot_date, start_time, end_time }] }
// ─────────────────────────────────────────────
router.post('/', requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;
    const { name, description = null, slots } = req.body;

    // Validate group fields
    const errors = [];
    if (!name || typeof name !== 'string' || !name.trim()) {
        errors.push('name is required.');
    }
    if (!Array.isArray(slots) || slots.length === 0) {
        errors.push('slots must be a non-empty array of time options.');
    } else {
        slots.forEach((slot, i) => {
            errors.push(...validateSlotOption(slot, i));
        });
    }
    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    const conn = await pool.getConnection();
    let committed = false;
    try {
        await conn.beginTransaction();

        // 1. Create the slot group
        const [groupResult] = await conn.query(
            `INSERT INTO slot_groups (owner_id, name, description)
             VALUES (?, ?, ?)`,
            [owner_id, name.trim(), description]
        );
        const group_id = groupResult.insertId;

        // 2. Insert all slot options (private by default, type group_meeting)
        const slotIds = [];
        for (const slot of slots) {
            const [slotResult] = await conn.query(
                `INSERT INTO booking_slots (
                    owner_id, group_id, title, description, slot_date,
                    start_time, end_time, slot_type, status,
                    max_bookings, is_recurring
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'group_meeting', 'private', 999, 0)`,
                // max_bookings=999 because any number of users can vote
                [owner_id, group_id, name.trim(), description,
                 slot.slot_date, slot.start_time, slot.end_time]
            );
            slotIds.push(slotResult.insertId);
        }

        await conn.commit();
        committed = true;

        // FIX: release the lock BEFORE calling pool.query(), otherwise
        // pool.query() tries to acquire the same lock and self-deadlocks.
        conn.release();

        // Return group + all slot options
        const [groupRows] = await pool.query(
            `SELECT * FROM slot_groups WHERE id = ?`, [group_id]
        );
        const [slotRows] = await pool.query(
            `SELECT * FROM booking_slots WHERE group_id = ? ORDER BY slot_date ASC, start_time ASC`,
            [group_id]
        );

        res.status(201).json({
            message: `Group meeting created with ${slotIds.length} time option(s).`,
            group: groupRows[0],
            slots: slotRows,
        });

    } catch (err) {
        if (!committed) {
            await conn.rollback();
            conn.release();
        }
        console.error('Error creating group meeting:', err);
        res.status(500).json({ error: 'Failed to create group meeting.' });
    }
});

// ─────────────────────────────────────────────
// GET /api/groupMeeting/:groupId
// Anyone logged in can view slot options + vote counts for a group.
// Users see which slots they personally voted for.
// ─────────────────────────────────────────────
router.get('/:groupId', requireLogin, async (req, res) => {
    const group_id = Number(req.params.groupId);
    const current_user_id = req.user.id;

    if (!Number.isInteger(group_id)) {
        return res.status(400).json({ error: 'Invalid group id.' });
    }

    try {
        // Get the group
        const [groupRows] = await pool.query(
            `SELECT sg.*, u.name AS owner_name, u.email AS owner_email
             FROM slot_groups sg
             JOIN users u ON sg.owner_id = u.id
             WHERE sg.id = ?`,
            [group_id]
        );
        if (groupRows.length === 0) {
            return res.status(404).json({ error: 'Group not found.' });
        }

        // Get all slot options with vote counts
        // Also flag which ones the current user has voted for
        const [slots] = await pool.query(
            `SELECT 
                bs.*,
                COUNT(b.id) AS vote_count,
                MAX(CASE WHEN b.user_id = ? THEN 1 ELSE 0 END) AS i_voted
             FROM booking_slots bs
             LEFT JOIN bookings b ON b.slot_id = bs.id AND b.status = 'confirmed'
             WHERE bs.group_id = ?
             GROUP BY bs.id
             ORDER BY bs.slot_date ASC, bs.start_time ASC`,
            [current_user_id, group_id]
        );

        res.json({
            group: groupRows[0],
            slots,
        });

    } catch (err) {
        console.error('Error fetching group meeting:', err);
        res.status(500).json({ error: 'Failed to fetch group meeting.' });
    }
});

// ─────────────────────────────────────────────
// GET /api/groupMeeting
// Owner sees all their group meetings
// ─────────────────────────────────────────────
router.get('/', requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;

    try {
        const [groups] = await pool.query(
            `SELECT sg.*,
                COUNT(DISTINCT bs.id) AS total_slots,
                COUNT(DISTINCT b.user_id) AS total_voters
             FROM slot_groups sg
             LEFT JOIN booking_slots bs ON bs.group_id = sg.id
             LEFT JOIN bookings b ON b.slot_id = bs.id AND b.status = 'confirmed'
             WHERE sg.owner_id = ?
             GROUP BY sg.id
             ORDER BY sg.created_at DESC`,
            [owner_id]
        );

        res.json({ groups });

    } catch (err) {
        console.error('Error fetching group meetings:', err);
        res.status(500).json({ error: 'Failed to fetch group meetings.' });
    }
});

// ─────────────────────────────────────────────
// POST /api/groupMeeting/:groupId/vote
// User votes for one or more slots in a group.
// Body: { slot_ids: [1, 2, 3] }
// ─────────────────────────────────────────────
router.post('/:groupId/vote', requireLogin, async (req, res) => {
    const user_id = req.user.id;
    const group_id = Number(req.params.groupId);
    const { slot_ids } = req.body;

    if (!Number.isInteger(group_id)) {
        return res.status(400).json({ error: 'Invalid group id.' });
    }
    if (!Array.isArray(slot_ids) || slot_ids.length === 0) {
        return res.status(400).json({ error: 'slot_ids must be a non-empty array.' });
    }

    try {
        // Confirm the group exists
        const [groupRows] = await pool.query(
            `SELECT id, owner_id FROM slot_groups WHERE id = ?`, [group_id]
        );
        if (groupRows.length === 0) {
            return res.status(404).json({ error: 'Group not found.' });
        }

        // Owners cannot vote in their own group
        if (groupRows[0].owner_id === user_id) {
            return res.status(403).json({ error: 'Owners cannot vote in their own group meeting.' });
        }

        // Confirm all slot_ids belong to this group.
        // FIX: SQLite doesn't auto-expand IN (?) for arrays like MySQL does.
        // Build one placeholder per id: IN (?, ?, ...)
        const placeholders = slot_ids.map(() => '?').join(', ');
        const [validSlots] = await pool.query(
            `SELECT id FROM booking_slots WHERE group_id = ? AND id IN (${placeholders})`,
            [group_id, ...slot_ids]
        );
        if (validSlots.length !== slot_ids.length) {
            return res.status(400).json({ error: 'One or more slot_ids do not belong to this group.' });
        }

        // FIX: INSERT OR IGNORE is the correct SQLite syntax (INSERT IGNORE is MySQL-only)
        let inserted = 0;
        for (const slot_id of slot_ids) {
            const [result] = await pool.query(
                `INSERT OR IGNORE INTO bookings (slot_id, user_id, status)
                 VALUES (?, ?, 'confirmed')`,
                [slot_id, user_id]
            );
            inserted += result.affectedRows;
        }

        res.json({
            message: `Voted for ${inserted} slot(s).`,
            skipped: slot_ids.length - inserted, // already voted for these
        });

    } catch (err) {
        console.error('Error voting:', err);
        res.status(500).json({ error: 'Failed to register votes.' });
    }
});

// ─────────────────────────────────────────────
// DELETE /api/groupMeeting/:groupId/vote/:slotId
// User removes their vote for a specific slot
// ─────────────────────────────────────────────
router.delete('/:groupId/vote/:slotId', requireLogin, async (req, res) => {
    const user_id = req.user.id;
    const group_id = Number(req.params.groupId);
    const slot_id = Number(req.params.slotId);

    if (!Number.isInteger(group_id) || !Number.isInteger(slot_id)) {
        return res.status(400).json({ error: 'Invalid group or slot id.' });
    }

    try {
        // Confirm the slot belongs to this group
        const [slotRows] = await pool.query(
            `SELECT id FROM booking_slots WHERE id = ? AND group_id = ?`,
            [slot_id, group_id]
        );
        if (slotRows.length === 0) {
            return res.status(404).json({ error: 'Slot not found in this group.' });
        }

        const [result] = await pool.query(
            `DELETE FROM bookings WHERE slot_id = ? AND user_id = ?`,
            [slot_id, user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'You have not voted for this slot.' });
        }

        res.json({ message: 'Vote removed.' });

    } catch (err) {
        console.error('Error removing vote:', err);
        res.status(500).json({ error: 'Failed to remove vote.' });
    }
});

// ─────────────────────────────────────────────
// PATCH /api/groupMeeting/:groupId/confirm/:slotId
// Owner confirms a winning slot.
// If recurring, generates child slots for N weeks and books all voters for each.
// Body: { is_recurring: bool, recurrence_weeks: int (required if is_recurring) }
// ─────────────────────────────────────────────
router.patch('/:groupId/confirm/:slotId', requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;
    const group_id = Number(req.params.groupId);
    const slot_id = Number(req.params.slotId);
    const { is_recurring = false, recurrence_weeks = null } = req.body;

    if (!Number.isInteger(group_id) || !Number.isInteger(slot_id)) {
        return res.status(400).json({ error: 'Invalid group or slot id.' });
    }
    if (is_recurring) {
        if (
            !recurrence_weeks ||
            !Number.isInteger(Number(recurrence_weeks)) ||
            Number(recurrence_weeks) < 1 ||
            Number(recurrence_weeks) > 52
        ) {
            return res.status(400).json({ error: 'recurrence_weeks must be an integer between 1 and 52.' });
        }
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Confirm the group belongs to this owner
        const [groupRows] = await conn.query(
            `SELECT * FROM slot_groups WHERE id = ? AND owner_id = ?`,
            [group_id, owner_id]
        );
        if (groupRows.length === 0) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ error: 'Group not found.' });
        }

        // Confirm the slot belongs to this group
        const [slotRows] = await conn.query(
            `SELECT * FROM booking_slots WHERE id = ? AND group_id = ?`,
            [slot_id, group_id]
        );
        if (slotRows.length === 0) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ error: 'Slot not found in this group.' });
        }

        const confirmedSlot = slotRows[0];

        // Get all users who voted for this specific slot
        const [voters] = await conn.query(
            `SELECT u.id, u.name, u.email
             FROM bookings b
             JOIN users u ON b.user_id = u.id
             WHERE b.slot_id = ? AND b.status = 'confirmed'`,
            [slot_id]
        );

        const weeks = is_recurring ? Number(recurrence_weeks) : 0;

        // Activate the confirmed slot (make it public/official)
        await conn.query(
            `UPDATE booking_slots
             SET status = 'active', is_recurring = ?, recurrence_weeks = ?
             WHERE id = ?`,
            [is_recurring, is_recurring ? weeks : null, slot_id]
        );

        // If recurring, generate child slots and book all voters for each
        if (is_recurring && weeks > 0) {
            for (let w = 1; w <= weeks; w++) {
                const childDate = addWeeks(confirmedSlot.slot_date, w);

                const [childResult] = await conn.query(
                    `INSERT INTO booking_slots (
                        owner_id, group_id, parent_slot_id, title, description,
                        slot_date, start_time, end_time, location,
                        slot_type, status, max_bookings, is_recurring
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'group_meeting', 'active', 999, 1)`,
                    [
                        owner_id, group_id, slot_id,
                        confirmedSlot.title, confirmedSlot.description,
                        childDate, confirmedSlot.start_time, confirmedSlot.end_time,
                        confirmedSlot.location,
                    ]
                );

                const child_slot_id = childResult.insertId;

                // FIX: INSERT OR IGNORE is the correct SQLite syntax
                for (const voter of voters) {
                    await conn.query(
                        `INSERT OR IGNORE INTO bookings (slot_id, user_id, status)
                         VALUES (?, ?, 'confirmed')`,
                        [child_slot_id, voter.id]
                    );
                }
            }
        }

        await conn.commit();
        conn.release();

        res.json({
            message: is_recurring
                ? `Slot confirmed and repeated for ${weeks} week(s). ${voters.length} voter(s) booked for all occurrences.`
                : `Slot confirmed. ${voters.length} voter(s) booked.`,
            confirmed_slot_id: slot_id,
            is_recurring,
            recurrence_weeks: is_recurring ? weeks : null,
            booked_users: voters,
            // Frontend uses this to build mailto: notifications
            notify: voters.map(v => ({
                to: v.email,
                subject: `Your meeting has been confirmed`,
                body: `Hi ${v.name}, your group meeting has been confirmed. Date: ${confirmedSlot.slot_date}, Time: ${confirmedSlot.start_time} - ${confirmedSlot.end_time}${is_recurring ? `, repeating for ${weeks} week(s)` : ''}.`,
            })),
        });

    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('Error confirming slot:', err);
        res.status(500).json({ error: 'Failed to confirm slot.' });
    }
});

module.exports = router;
