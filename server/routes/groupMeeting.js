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

// added by Bonita (261097353) — format HH:MM:SS or HH:MM to 12h time for email bodies
function fmt12h(timeStr) {
    if (!timeStr) return timeStr;
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
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

        const [groupResult] = await conn.query(
            `INSERT INTO slot_groups (owner_id, name, description)
             VALUES (?, ?, ?)`,
            [owner_id, name.trim(), description]
        );
        const group_id = groupResult.insertId;

        const slotIds = [];
        for (const slot of slots) {
            const [slotResult] = await conn.query(
                `INSERT INTO booking_slots (
                    owner_id, group_id, title, description, slot_date,
                    start_time, end_time, slot_type, status,
                    max_bookings, is_recurring
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'group_meeting', 'private', 999, 0)`,
                // max_bookings=999 because any number of users can vote
                // is_recurring=0 (SQLite boolean)
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

        const [slots] = await pool.query(
            `SELECT
                bs.*,
                COUNT(b.id) AS vote_count,
                MAX(CASE WHEN b.user_id = ? THEN 1 ELSE 0 END) AS i_voted
             FROM booking_slots bs
             LEFT JOIN bookings b ON b.slot_id = bs.id AND b.status = 'confirmed'
             WHERE bs.group_id = ?
               AND bs.parent_slot_id IS NULL
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


router.get('/', requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;

    try {
        const [groups] = await pool.query(
            `SELECT sg.*,
                COUNT(DISTINCT bs.id) AS total_slots,
                COUNT(DISTINCT b.user_id) AS total_voters
             FROM slot_groups sg
             -- Exclude recurring child slots; they share group_id with the parent
             -- but shouldn't inflate the "X time options" count post-confirm.
             LEFT JOIN booking_slots bs
                    ON bs.group_id = sg.id AND bs.parent_slot_id IS NULL
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
        const [groupRows] = await pool.query(
            `SELECT id, owner_id FROM slot_groups WHERE id = ?`, [group_id]
        );
        if (groupRows.length === 0) {
            return res.status(404).json({ error: 'Group not found.' });
        }

        // Owners cannot vote in their own group
        if (groupRows[0].owner_id === user_id) {
            return res.status(403).json({ error: 'You cannot vote in your own group meeting.' });
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

        let inserted = 0;
        for (const slot_id of slot_ids) {
            const [result] = await pool.query(
                `INSERT INTO bookings (slot_id, user_id, status)
                 VALUES (?, ?, 'confirmed')
                 ON CONFLICT(slot_id, user_id) DO UPDATE
                   SET status = 'confirmed',
                       updated_at = datetime('now')
                   WHERE bookings.status != 'confirmed'`,
                [slot_id, user_id]
            );
            inserted += result.affectedRows;
        }

        // Count total unique voters across all slots in this group.
        // Used to notify the owner after each new vote.
        const [voterCountRows] = await pool.query(
            `SELECT COUNT(DISTINCT b.user_id) AS voter_count
             FROM bookings b
             JOIN booking_slots bs ON b.slot_id = bs.id
             WHERE bs.group_id = ? AND b.status = 'confirmed'`,
            [group_id]
        );

        // Get owner info for the notify mailto
        const [ownerRows] = await pool.query(
            `SELECT u.name, u.email
             FROM slot_groups sg
             JOIN users u ON sg.owner_id = u.id
             WHERE sg.id = ?`,
            [group_id]
        );

        // Get the voting user's name for the email body
        const [voterRows] = await pool.query(
            `SELECT name FROM users WHERE id = ?`, [user_id]
        );

        const voterCount = voterCountRows[0].voter_count;
        const owner = ownerRows[0];
        const voterName = voterRows[0] ? voterRows[0].name : 'A student';

        // Build notify object — frontend opens a mailto to the owner after each vote.
        // This keeps the owner informed of new interest as votes come in.
        const notify = {
            to: owner.email,
            subject: `New vote on your group meeting (ID: ${group_id})`,
            body: `Hi ${owner.name},\n\n${voterName} has just voted on your group meeting.\n\nTotal unique voters so far: ${voterCount}.\n\nLog in to McBook to review the results and confirm a time when you're ready.`,
        };

        res.json({
            message: `Voted for ${inserted} slot(s).`,
            skipped: slot_ids.length - inserted, // already voted for these
            voter_count: voterCount,
            notify, // frontend opens mailto to owner after each vote
        });

    } catch (err) {
        console.error('Error voting:', err);
        res.status(500).json({ error: 'Failed to register votes.' });
    }
});


router.delete('/:groupId/vote/:slotId', requireLogin, async (req, res) => {
    const user_id = req.user.id;
    const group_id = Number(req.params.groupId);
    const slot_id = Number(req.params.slotId);

    if (!Number.isInteger(group_id) || !Number.isInteger(slot_id)) {
        return res.status(400).json({ error: 'Invalid group or slot id.' });
    }

    try {
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

        const [groupRows] = await conn.query(
            `SELECT sg.*, u.name AS owner_name, u.email AS owner_email
             FROM slot_groups sg
             JOIN users u ON sg.owner_id = u.id
             WHERE sg.id = ? AND sg.owner_id = ?`,
            [group_id, owner_id]
        );
        if (groupRows.length === 0) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ error: 'Group not found.' });
        }

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

        // added by Bonita (261097353) — fetch ALL voters across the whole group, not just
        // those who voted for the winning slot, so confirmation email goes to everyone who participated
        const [voters] = await conn.query(
            `SELECT DISTINCT u.id, u.name, u.email
             FROM bookings b
             JOIN users u ON b.user_id = u.id
             JOIN booking_slots bs ON b.slot_id = bs.id
             WHERE bs.group_id = ? AND b.status = 'confirmed'`,
            [group_id]
        );

        const weeks = is_recurring ? Number(recurrence_weeks) : 0;

        // Activate the confirmed slot (make it public/official)
        // is_recurring uses 1/0 for SQLite booleans
        await conn.query(
            `UPDATE booking_slots
             SET status = 'active', is_recurring = ?, recurrence_weeks = ?
             WHERE id = ?`,
            [is_recurring ? 1 : 0, is_recurring ? weeks : null, slot_id]
        );

        // Delete all bookings (votes) on the unchosen slots, then delete the slots themselves.
        // This removes losing options from the calendar entirely.
        const [unchosen] = await conn.query(
            `SELECT id FROM booking_slots WHERE group_id = ? AND id != ?`,
            [group_id, slot_id]
        );
        if (unchosen.length > 0) {
            const unchosenIds = unchosen.map(r => r.id);
            const ph = unchosenIds.map(() => '?').join(', ');
            await conn.query(
                `DELETE FROM bookings WHERE slot_id IN (${ph})`,
                unchosenIds
            );
            await conn.query(
                `DELETE FROM booking_slots WHERE id IN (${ph})`,
                unchosenIds
            );
        }

        // Book ALL voters (across every slot option) onto the confirmed slot.
        // This ensures the prof's choice wins regardless of which slot each person voted for.
        // First clear any existing bookings on the winning slot (the votes), then reinsert cleanly.
        await conn.query(
            `DELETE FROM bookings WHERE slot_id = ?`,
            [slot_id]
        );
        for (const voter of voters) {
            await conn.query(
                `INSERT OR IGNORE INTO bookings (slot_id, user_id, status)
                 VALUES (?, ?, 'confirmed')`,
                [slot_id, voter.id]
            );
        }

        // If recurring, generate child slots and book all voters for each.
        // recurrence_weeks counts TOTAL occurrences including the parent (week 1),
        // matching how recurringSlots.js handles regular recurring slots — so
        // weeks=2 means 2 meetings total (parent + 1 child), not parent + 2 children.
        if (is_recurring && weeks > 1) {
            for (let w = 1; w < weeks; w++) {
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
            // Frontend uses this to build mailto: notifications for all voters
            // demo1 fix: owner also receives a confirmation email
            notify: [
                // notify all voters (students)
                // use fmt12h for times and proper newlines
                ...voters.map(v => ({
                    to: v.email,
                    subject: `Your meeting has been confirmed`,
                    body: `Hello,\n\nYour group meeting has been confirmed.\n\nDate: ${confirmedSlot.slot_date}\nTime: ${fmt12h(confirmedSlot.start_time)} - ${fmt12h(confirmedSlot.end_time)}${is_recurring ? `\nThis meeting repeats for ${weeks} week(s).` : ''}\n\nSee you there!`,
                })),
                // notify the owner themselves
                // use fmt12h for times and proper newlines
                {
                    to: groupRows[0].owner_email,
                    subject: `You confirmed a group meeting time`,
                    body: `Hi ${groupRows[0].owner_name},\n\nYou have confirmed the time slot for your group meeting "${groupRows[0].title}".\n\nDate: ${confirmedSlot.slot_date}\nTime: ${fmt12h(confirmedSlot.start_time)} - ${fmt12h(confirmedSlot.end_time)}${is_recurring ? `\nThis meeting repeats for ${weeks} week(s).` : ''}\n\n${voters.length} participant(s) have been booked.`,
                },
            ],
        });

    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('Error confirming slot:', err);
        res.status(500).json({ error: 'Failed to confirm slot.' });
    }
});

module.exports = router;
