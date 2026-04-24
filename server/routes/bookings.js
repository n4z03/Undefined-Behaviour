// Nazifa Ahmed (261112966)

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
              AND bs.owner_id != ?
              AND NOT EXISTS (
                  SELECT 1 FROM bookings b2
                  WHERE b2.slot_id = bs.id
                    AND b2.user_id = ?
                    AND b2.status = 'confirmed'
              )
            GROUP BY bs.id
            HAVING COUNT(b.id) < bs.max_bookings
            ORDER BY bs.slot_date ASC, bs.start_time ASC`,
            [user_id, user_id]
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
            await conn.rollback();
            return res.status(404).json({ error: 'Slot not found or not active.' });
        }

        const slot = slotRows[0];

        if (slot.owner_id === user_id) {
            await conn.rollback();
            return res.status(400).json({ error: 'You cannot book your own slot.' });
        }

        // Check the user hasn't already booked this slot
        const [existingRows] = await conn.query(
            `SELECT id FROM bookings
             WHERE slot_id = ? AND user_id = ? AND status = 'confirmed'`,
            [slot_id, user_id]
        );

        if (existingRows.length > 0) {
            await conn.rollback();
            return res.status(400).json({ error: 'You have already booked this slot.' });
        }

        // Check capacity
        const [countRows] = await conn.query(
            `SELECT COUNT(*) AS count FROM bookings
             WHERE slot_id = ? AND status = 'confirmed'`,
            [slot_id]
        );

        if (countRows[0].count >= slot.max_bookings) {
            await conn.rollback();
            return res.status(400).json({ error: 'This slot is fully booked.' });
        }

        const [result] = await conn.query(
            `INSERT INTO bookings (slot_id, user_id, status) VALUES (?, ?, 'confirmed')`,
            [slot_id, user_id]
        );

        await conn.commit();

        const [userRows] = await pool.query(
            `SELECT name, email FROM users WHERE id = ?`,
            [user_id]
        );
        const booker = userRows[0];

        res.status(201).json({
            message: 'Slot booked successfully.',
            booking_id: result.insertId,
            notify: {
                to: slot.owner_email,
                subject: `New booking: ${slot.title}`,
                body: `Hi ${slot.owner_name},\n\n${booker.name} (${booker.email}) has booked your slot "${slot.title}" on ${slot.slot_date} from ${slot.start_time} to ${slot.end_time}.`,
            },
        });

    } catch (err) {
        await conn.rollback();
        console.error('Error booking slot:', err);
        res.status(500).json({ error: 'Failed to book slot.' });
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

        await pool.query(
            `UPDATE bookings SET status = 'cancelled' WHERE id = ? AND user_id = ?`,
            [booking_id, user_id]
        );

        res.json({
            message: 'Booking cancelled.',
            deleted_booking_id: booking_id,
            notify: {
                to: booking.owner_email,
                subject: `Booking cancelled: ${booking.title}`,
                body: `Hi ${booking.owner_name},\n\n${booking.user_name} has cancelled their booking for "${booking.title}" on ${booking.slot_date} from ${booking.start_time} to ${booking.end_time}.`,
            },
        });

    } catch (err) {
        console.error('Error cancelling booking:', err);
        res.status(500).json({ error: 'Failed to cancel booking.' });
    }
});

module.exports = router;
