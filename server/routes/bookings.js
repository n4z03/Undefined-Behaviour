// Nazifa Ahmed (261112966)
// code added by Rupneet (ID: 261096653)
// code added by Bonita Baladi (261097353)


const express = require('express');
const router = express.Router();
const pool = require('../db');

// Authentication required for all the routes
function requireLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'You must be logged in.' });
    }
    req.user = req.session.user;
    next();
}

// Bookings will only be available to users
function requireUser(req, res, next) {
    if (req.user.role !== 'user') {
        return res.status(403).json({ error: 'User access only.' });
    }
    next();
}

async function tryRollback(conn) {
    try {
        await conn.rollback();
    } catch (e) {}
}

//helper funntion to make sure that tines dont overlap

function normalizeTimeForSql(timeValue) {
    if (!timeValue) return null;
    const txt = String(timeValue).trim();
    if (/^\d{2}:\d{2}$/.test(txt)) return `${txt}:00`;
    return txt;
}

// added by Bonita — converts 24h time string to 12h format
// e.g. 15:00:00 to 3:00 PM
function formatTime12(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    const min = String(m).padStart(2, '0');
    return `${hour}:${min} ${period}`;
}

// added by Bonita — converts date format from YYYY-MM-DD to words e.g. Monday, April 28, 2026
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

async function userHasOverlap(conn, user_id, slotDate, startTime, endTime, bookingToIgnore = null) {
    const start = normalizeTimeForSql(startTime);
    const end = normalizeTimeForSql(endTime);
    const params = [user_id, slotDate, end, start];
    let ignoreSql = '';
    if (bookingToIgnore != null) {
        ignoreSql = ' AND b.id != ?';
        params.push(bookingToIgnore);
    }

    const [rows] = await conn.query(
        `SELECT b.id
         FROM bookings b
         JOIN booking_slots bs ON bs.id = b.slot_id
         WHERE b.user_id = ?
           AND b.status = 'confirmed'
           AND bs.slot_date = ?
           AND time(bs.start_time) < time(?)
           AND time(bs.end_time) > time(?)
           AND NOT (bs.slot_type = 'group_meeting' AND bs.status = 'private')
           ${ignoreSql}
         LIMIT 1`,
        params
    );
    return rows.length > 0;
}

// GET /api/bookings/available-slots
// This will return all active slots not owned by the current user that still have space
// + that the current user hasn't already booked.
router.get('/available-slots', requireLogin, async (req, res) => {
    const user_id = req.user.id;

    try {
        const [rows] = await pool.query(
            `SELECT
                bs.id,
                bs.owner_id,
                bs.title,
                bs.description,
                bs.slot_date,
                bs.start_time,
                bs.end_time,
                bs.location,
                bs.slot_type,
                bs.max_bookings,
                bs.is_recurring,
                u.name  AS owner_name,
                u.email AS owner_email,
                COUNT(b.id) AS booking_count
            FROM booking_slots bs
            JOIN users u ON bs.owner_id = u.id
            LEFT JOIN bookings b ON b.slot_id = bs.id AND b.status = 'confirmed'
            WHERE bs.status = 'active'
              AND bs.slot_type != 'group_meeting'
              AND bs.owner_id != ?
              AND NOT EXISTS (
                  SELECT 1 FROM bookings b2
                  WHERE b2.slot_id = bs.id
                    AND b2.user_id = ?
                    AND b2.status = 'confirmed'
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM bookings b3
                  JOIN booking_slots bs2 ON bs2.id = b3.slot_id
                  WHERE b3.user_id = ?
                    AND b3.status = 'confirmed'
                    AND bs2.slot_date = bs.slot_date
                    AND time(bs2.start_time) < time(bs.end_time)
                    AND time(bs2.end_time) > time(bs.start_time)
                    AND NOT (bs2.slot_type = 'group_meeting' AND bs2.status = 'private')
              )
            GROUP BY bs.id
            HAVING COUNT(b.id) < bs.max_bookings
            ORDER BY bs.slot_date ASC, bs.start_time ASC`,
            [user_id, user_id, user_id]
        );

        res.json({ slots: rows });
    } catch (err) {
        console.error('There was an error fetching available slots:', err);
        res.status(500).json({ error: 'Failed to fetch available slots.' });
    }
});

// GET /api/bookings
// This will return the current user's confirmed bookings with owner and slot details.
router.get('/', requireLogin, requireUser, async (req, res) => {
    const user_id = req.user.id;

    try {
        const [rows] = await pool.query(
            `SELECT
                b.id          AS booking_id,
                b.notes,
                b.booked_at,
                bs.id         AS slot_id,
                bs.title,
                bs.description,
                bs.slot_date,
                bs.start_time,
                bs.end_time,
                bs.location,
                bs.slot_type,
                bs.is_recurring,
                u.id          AS owner_id,
                u.name        AS owner_name,
                u.email       AS owner_email
            FROM bookings b
            JOIN booking_slots bs ON b.slot_id = bs.id
            JOIN users u ON bs.owner_id = u.id
            WHERE b.user_id = ? AND b.status = 'confirmed'
              -- Group-meeting votes are stored as confirmed bookings, but the slot
              -- stays 'private' until the owner confirms a winning time. Don't show
              -- those pending votes as if they were real appointments.
              AND NOT (bs.slot_type = 'group_meeting' AND bs.status = 'private')
            ORDER BY bs.slot_date ASC, bs.start_time ASC`,
            [user_id]
        );

        res.json({ bookings: rows });
    } catch (err) {
        console.error('Error fetching bookings:', err);
        res.status(500).json({ error: 'Failed to fetch bookings.' });
    }
});

// POST /api/bookings/book-slot/:slotId
// Books an active slot for the current user.
// This will return a notify payload so the frontend can open a mailto: to the owner.
router.post('/book-slot/:slotId', requireLogin, requireUser, async (req, res) => {
    const user_id = req.user.id;
    const slot_id = Number(req.params.slotId);

    if (!Number.isInteger(slot_id)) {
        return res.status(400).json({ error: 'Invalid slot id.' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [slotRows] = await conn.query(
            `SELECT bs.*, u.name AS owner_name, u.email AS owner_email
             FROM booking_slots bs
             JOIN users u ON bs.owner_id = u.id
             WHERE bs.id = ? AND bs.status = 'active'`,
            [slot_id]
        );

        if (slotRows.length === 0) {
            await tryRollback(conn);
            return res.status(404).json({ error: 'Slot not found or not active.' });
        }

        const slot = slotRows[0];

        if (Number(slot.owner_id) === Number(user_id)) {
            await tryRollback(conn);
            return res.status(400).json({ error: 'You cannot book your own slot.' });
        }

        const [existingRows] = await conn.query(
            `SELECT id, status FROM bookings
             WHERE slot_id = ? AND user_id = ?`,
            [slot_id, user_id]
        );
        const existing = existingRows[0];
        if (existing && existing.status === 'confirmed') {
            await tryRollback(conn);
            return res.status(400).json({ error: 'You have already booked this slot.' });
        }

        // Check capacity
        const [countRows] = await conn.query(
            `SELECT COUNT(*) AS count FROM bookings
             WHERE slot_id = ? AND status = 'confirmed'`,
            [slot_id]
        );

        if (countRows[0].count >= slot.max_bookings) {
            await tryRollback(conn);
            return res.status(400).json({ error: 'This slot is fully booked.' });
        }

        const hasOverlap = await userHasOverlap(
            conn,
            user_id,
            slot.slot_date,
            slot.start_time,
            slot.end_time
        );
        if (hasOverlap) {
            await tryRollback(conn);
            return res.status(400).json({
                error: 'This booking overlaps with one of your existing confirmed bookings.',
            });
        }

        const [userRows] = await conn.query(
            `SELECT name, email FROM users WHERE id = ?`,
            [user_id]
        );
        if (!userRows || userRows.length === 0) {
            await tryRollback(conn);
            return res.status(500).json({ error: 'User not found.' });
        }
        const booker = userRows[0];

        let bookingId;
        if (existing && existing.status === 'cancelled') {
            await conn.query(
                `UPDATE bookings
                 SET status = 'confirmed',
                     updated_at = datetime('now')
                 WHERE id = ? AND user_id = ? AND slot_id = ?`,
                [existing.id, user_id, slot_id]
            );
            bookingId = existing.id;
        } else {
            const [result] = await conn.query(
                `INSERT INTO bookings (slot_id, user_id, status) VALUES (?, ?, 'confirmed')`,
                [slot_id, user_id]
            );
            bookingId = result.insertId;
        }

        await conn.commit();

        // added by Bonita — use \r\n for mailto line breaks (works in Outlook + Gmail)
        // and format times as 12h for readability
        res.status(201).json({
            message: 'Slot booked successfully.',
            booking_id: bookingId,
            notify: {
                to: slot.owner_email,
                subject: `New booking: ${slot.title}`,
                body: [
                    `Hi ${slot.owner_name},`,
                    '',
                    `${booker.name} (${booker.email}) has booked your slot "${slot.title}".`,
                    '',
                    `Date: ${formatDate(slot.slot_date)}`,
                    `Time: ${formatTime12(slot.start_time)} - ${formatTime12(slot.end_time)}`,
                    '',
                    'You can view this booking in your McBook dashboard.',
                ].join('\r\n'),
            },
        });

    } catch (err) {
        await tryRollback(conn);
        console.error('Error booking slot:', err);
        res.status(500).json({ error: 'Failed to book slot.' });
    } finally {
        conn.release();
    }
});

// Fixed /api/bookings/:bookingId/reschedule
// Move a confirmed booking to a different open slot (same as changing date/time from the user side).
router.patch('/:bookingId/reschedule', requireLogin, requireUser, async (req, res) => {
    const user_id = req.user.id;
    const booking_id = Number(req.params.bookingId);
    const new_slot_id = Number(req.body && req.body.slot_id);

    if (!Number.isInteger(booking_id)) {
        return res.status(400).json({ error: 'Invalid booking id.' });
    }
    if (!Number.isInteger(new_slot_id) || new_slot_id < 1) {
        return res.status(400).json({ error: 'Invalid slot id.' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [bookRows] = await conn.query(
            `SELECT b.id, b.slot_id, b.status, bs.slot_type
             FROM bookings b
             JOIN booking_slots bs ON b.slot_id = bs.id
             WHERE b.id = ? AND b.user_id = ?`,
            [booking_id, user_id]
        );
        if (bookRows.length === 0) {
            await tryRollback(conn);
            return res.status(404).json({ error: 'Booking not found.' });
        }
        const booking = bookRows[0];
        if (booking.status !== 'confirmed') {
            await tryRollback(conn);
            return res.status(400).json({ error: 'Only active bookings can be rescheduled.' });
        }
        if (booking.slot_type === 'group_meeting') {
            await tryRollback(conn);
            return res.status(403).json({
                error: 'Group meetings can only be rescheduled by the organizer.',
            });
        }

        const old_slot_id = Number(booking.slot_id);
        if (new_slot_id === old_slot_id) {
            await tryRollback(conn);
            return res.status(400).json({ error: 'Pick a different time slot than your current one.' });
        }

        const [oldSlotRows] = await conn.query(
            `SELECT owner_id, title, slot_date, start_time, end_time
             FROM booking_slots WHERE id = ?`,
            [old_slot_id]
        );
        if (oldSlotRows.length === 0) {
            await tryRollback(conn);
            return res.status(404).json({ error: 'Current slot is missing.' });
        }
        const oldSlot = oldSlotRows[0];
        const oldOwnerId = Number(oldSlot.owner_id);

        const [newSlotRows] = await conn.query(
            `SELECT bs.*, u.name AS owner_name, u.email AS owner_email
             FROM booking_slots bs
             JOIN users u ON bs.owner_id = u.id
             WHERE bs.id = ? AND bs.status = 'active'`,
            [new_slot_id]
        );
        if (newSlotRows.length === 0) {
            await tryRollback(conn);
            return res.status(404).json({ error: 'That slot is not available.' });
        }
        const newSlot = newSlotRows[0];

        if (oldOwnerId !== Number(newSlot.owner_id)) {
            await tryRollback(conn);
            return res.status(400).json({
                error: 'You can only switch to another time with the same instructor.',
            });
        }

        if (Number(newSlot.owner_id) === Number(user_id)) {
            await tryRollback(conn);
            return res.status(400).json({ error: 'You cannot book your own slot.' });
        }

        const [clash] = await conn.query(
            `SELECT id FROM bookings
             WHERE slot_id = ? AND user_id = ? AND status = 'confirmed' AND id != ?`,
            [new_slot_id, user_id, booking_id]
        );
        if (clash.length > 0) {
            await tryRollback(conn);
            return res.status(400).json({ error: 'You already have a booking in that slot.' });
        }

        const [countRows] = await conn.query(
            `SELECT COUNT(*) AS count FROM bookings
             WHERE slot_id = ? AND status = 'confirmed'`,
            [new_slot_id]
        );
        if (countRows[0].count >= newSlot.max_bookings) {
            await tryRollback(conn);
            return res.status(400).json({ error: 'That slot is full.' });
        }

        const hasOverlap = await userHasOverlap(
            conn,
            user_id,
            newSlot.slot_date,
            newSlot.start_time,
            newSlot.end_time,
            booking_id
        );
        if (hasOverlap) {
            await tryRollback(conn);
            return res.status(400).json({
                error: 'That new slot overlaps with one of your other confirmed bookings.',
            });
        }

        await conn.query(
            `DELETE FROM bookings
             WHERE user_id = ? AND slot_id = ? AND status = 'cancelled'`,
            [user_id, new_slot_id]
        );

        await conn.query(
            `UPDATE bookings
             SET slot_id = ?,
                 updated_at = datetime('now')
             WHERE id = ? AND user_id = ? AND status = 'confirmed'`,
            [new_slot_id, booking_id, user_id]
        );

        await conn.commit();

        // Must use conn.query here, not pool.query — the connection still holds the global
        // lock until conn.release() in `finally`, so pool.query would deadlock waiting on acquire().
        const [rows] = await conn.query(
            `SELECT
                b.id          AS booking_id,
                b.notes,
                b.booked_at,
                bs.id         AS slot_id,
                bs.title,
                bs.description,
                bs.slot_date,
                bs.start_time,
                bs.end_time,
                bs.location,
                bs.slot_type,
                bs.is_recurring,
                u.id          AS owner_id,
                u.name        AS owner_name,
                u.email       AS owner_email,
                me.name       AS user_name
            FROM bookings b
            JOIN booking_slots bs ON b.slot_id = bs.id
            JOIN users u ON bs.owner_id = u.id
            JOIN users me ON b.user_id = me.id
            WHERE b.id = ? AND b.user_id = ?`,
            [booking_id, user_id]
        );

        const refreshed = rows[0] || null;

        const notify = refreshed ? {
            to: refreshed.owner_email,
            subject: `Booking rescheduled: ${refreshed.title}`,
            body: [
                `Hi ${refreshed.owner_name},`,
                '',
                `${refreshed.user_name} has rescheduled their booking for "${refreshed.title}".`,
                '',
                `Old time: ${formatDate(oldSlot.slot_date)}, ${formatTime12(oldSlot.start_time)} - ${formatTime12(oldSlot.end_time)}`,
                `New time: ${formatDate(refreshed.slot_date)}, ${formatTime12(refreshed.start_time)} - ${formatTime12(refreshed.end_time)}`,
            ].join('\r\n'),
        } : null;

        res.json({
            message: 'Booking rescheduled.',
            booking: refreshed,
            notify,
        });
    } catch (err) {
        await tryRollback(conn);
        console.error('Error rescheduling booking:', err);
        res.status(500).json({ error: 'Failed to reschedule booking.' });
    } finally {
        conn.release();
    }
});

// DELETE /api/bookings/:bookingId
// Cancels the current user's booking (changes status to cancelled)
// The slot will then become available again for others to book.
router.delete('/:bookingId', requireLogin, requireUser, async (req, res) => {
    const user_id = req.user.id;
    const booking_id = Number(req.params.bookingId);

    if (!Number.isInteger(booking_id)) {
        return res.status(400).json({ error: 'Invalid booking id.' });
    }

    try {
        const [rows] = await pool.query(
            `SELECT b.*, bs.title, bs.slot_date, bs.start_time, bs.end_time,
                    bs.slot_type,
                    u.name  AS owner_name,
                    u.email AS owner_email,
                    me.name AS user_name
             FROM bookings b
             JOIN booking_slots bs ON b.slot_id = bs.id
             JOIN users u ON bs.owner_id = u.id
             JOIN users me ON b.user_id = me.id
             WHERE b.id = ? AND b.user_id = ?`,
            [booking_id, user_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        const booking = rows[0];

        if (booking.status === 'cancelled') {
            return res.status(400).json({ error: 'Booking is already cancelled.' });
        }

        if (booking.slot_type === 'group_meeting') {
            return res.status(403).json({
                error: 'Group meetings can only be cancelled by the organizer.',
            });
        }

        await pool.query(
            `UPDATE bookings SET status = 'cancelled' WHERE id = ? AND user_id = ?`,
            [booking_id, user_id]
        );

        // 'requested' slots are created exclusively for one student via the
        // meeting-request flow (1 student requests, prof accepts, slot is created
        // with max_bookings=1 and auto-booked for that student). When that student
        // cancels, the slot has no reason to exist — leaving it 'active' would
        // expose a bookable slot to other students, which is wrong.
        // Delete the slot itself; the FK on meeting_requests.created_slot_id is
        // ON DELETE SET NULL, and the booking row cascades away as well.
        const slotWasFullyRemoved = booking.slot_type === 'requested';
        if (slotWasFullyRemoved) {
            await pool.query(
                `DELETE FROM booking_slots WHERE id = ?`,
                [booking.slot_id]
            );
        }

        // added by Bonita — use \r\n for mailto line breaks and format time as 12h
        res.json({
            message: 'Booking cancelled.',
            deleted_booking_id: booking_id,
            notify: {
                to: booking.owner_email,
                subject: `Booking cancelled: ${booking.title}`,
                body: [
                    `Hi ${booking.owner_name},`,
                    '',
                    `${booking.user_name} has cancelled their booking for "${booking.title}".`,
                    '',
                    `Date: ${formatDate(booking.slot_date)}`,
                    `Time: ${formatTime12(booking.start_time)} - ${formatTime12(booking.end_time)}`,
                    '',
                    slotWasFullyRemoved
                        ? 'This slot has been removed from your calendar.'
                        : 'The slot is now available for others to book.',
                ].join('\r\n'),
            },
        });

    } catch (err) {
        console.error('Error cancelling booking:', err);
        res.status(500).json({ error: 'Failed to cancel booking.' });
    }
});

module.exports = router;
