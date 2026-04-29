// Bonita Baladi, 261097353
// Added by Sophia Casalme, 261149930 - let owners export slots they've booked

// Bonus Feature - Calender export .ics

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

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

// Format a JS Date to iCalendar UTC timestamp: YYYYMMDDTHHmmssZ
function toICSDate(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// Combine a YYYY-MM-DD date string and HH:MM:SS time string into a Date object
function toDate(dateStr, timeStr) {
    return new Date(`${dateStr}T${timeStr}`);
}

// Escape special characters in ICS text fields
function escapeICS(str) {
    if (!str) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

// Build a single VEVENT block from a booking row
function buildVEvent(booking, uid) {
    const start = toDate(booking.slot_date, booking.start_time);
    const end = toDate(booking.slot_date, booking.end_time);

    const lines = [
        'BEGIN:VEVENT',
        `UID:${uid}@mcbook-comp307`,
        `DTSTAMP:${toICSDate(new Date())}`,
        `DTSTART:${toICSDate(start)}`,
        `DTEND:${toICSDate(end)}`,
        `SUMMARY:${escapeICS(booking.title)}`,
        `DESCRIPTION:${escapeICS(booking.description || '')}`,
        `LOCATION:${escapeICS(booking.location || '')}`,
        `STATUS:CONFIRMED`,
        'END:VEVENT',
    ];

    return lines.join('\r\n');
}

// Wrap VEVENT blocks in a VCALENDAR envelope
function buildICS(vevents, calendarName) {
    const header = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//MCBook COMP307//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${escapeICS(calendarName)}`,
    ].join('\r\n');

    const footer = 'END:VCALENDAR';

    return [header, ...vevents, footer].join('\r\n');
}

// ─────────────────────────────────────────────
// GET /api/calendar/export
// Returns a .ics file containing all confirmed
// bookings for the logged-in user (all types).
// ─────────────────────────────────────────────
router.get('/export', requireLogin, async (req, res) => {
    const user_id = req.user.id;

    try {
        // Fetch all confirmed bookings for this user across all slot types
        const [bookings] = await pool.query(
            `SELECT
                b.id AS booking_id,
                bs.title,
                bs.description,
                bs.slot_date,
                bs.start_time,
                bs.end_time,
                bs.location,
                bs.slot_type,
                u.name AS owner_name,
                u.email AS owner_email
             FROM bookings b
             JOIN booking_slots bs ON b.slot_id = bs.id
             JOIN users u ON bs.owner_id = u.id
             WHERE b.user_id = ? AND b.status = 'confirmed'
             ORDER BY bs.slot_date ASC, bs.start_time ASC`,
            [user_id]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ error: 'No confirmed bookings found to export.' });
        }

        // Build one VEVENT per booking
        const vevents = bookings.map((booking) =>
            buildVEvent(booking, `booking-${booking.booking_id}`)
        );

        const icsContent = buildICS(vevents, 'My MCBook Appointments');

        // Send as a downloadable .ics file
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="mcbook-appointments.ics"');
        res.send(icsContent);

    } catch (err) {
        console.error('Error exporting calendar:', err);
        res.status(500).json({ error: 'Failed to export calendar.' });
    }
});

// ─────────────────────────────────────────────
// GET /api/calendar/export/owner
// ─────────────────────────────────────────────
router.get('/export/owner', requireLogin, async (req, res) => {
    const owner_id = req.user.id;

    if (req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Owner access only.' });
    }

    try {
        const [ownedSlots] = await pool.query(
            `SELECT DISTINCT
                bs.id AS slot_id,
                bs.title,
                bs.description,
                bs.slot_date,
                bs.start_time,
                bs.end_time,
                bs.location,
                bs.slot_type
             FROM booking_slots bs
             JOIN bookings b ON b.slot_id = bs.id AND b.status = 'confirmed'
             WHERE bs.owner_id = ?
             ORDER BY bs.slot_date ASC, bs.start_time ASC`,
            [owner_id]
        );

        // slots the owner has joined as a participant (sophia)
        const [joinedSlots] = await pool.query(
            `SELECT
                bs.id AS slot_id,
                bs.title,
                bs.description,
                bs.slot_date,
                bs.start_time,
                bs.end_time,
                bs.location,
                bs.slot_type
             FROM bookings b
             JOIN booking_slots bs ON b.slot_id = bs.id
             WHERE b.user_id = ? AND b.status = 'confirmed'`,
            [owner_id]
        );
 
        // Merge and deduplicate by slot_id
        const seen = new Set()
        const allSlots = [...ownedSlots, ...joinedSlots].filter((s) => {
            if (seen.has(s.slot_id)) return false
            seen.add(s.slot_id)
            return true
        })

        if (allSlots.length === 0) {
            return res.status(404).json({ error: 'No booked slots found to export.' });
        }

        const vevents = allSlots.map((slot) =>
            buildVEvent(slot, `slot-${slot.slot_id}`)
        );

        const icsContent = buildICS(vevents, 'My MCBook Schedule');

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="mcbook-schedule.ics"');
        res.send(icsContent);

    } catch (err) {
        console.error('Error exporting owner calendar:', err);
        res.status(500).json({ error: 'Failed to export calendar.' });
    }
});

// ─────────────────────────────────────────────
// GET /api/calendar/export/:bookingId
// Returns a .ics file for a single confirmed booking (student)
// or a single booked slot (owner).
// added by Bonita (261097353) — Bug 4 fix: widened query so owners can also export
// a single slot by slot_id, not just students by booking_id
// ─────────────────────────────────────────────
router.get('/export/:bookingId', requireLogin, async (req, res) => {
    const user_id = req.user.id;
    const id = Number(req.params.bookingId);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: 'Invalid booking id.' });
    }

    try {
        let rows;

        if (req.user.role === 'owner') {
            // added by Bonita (261097353) — owner path: look up by slot id
            [rows] = await pool.query(
                `SELECT
                    bs.id AS booking_id,
                    bs.title,
                    bs.description,
                    bs.slot_date,
                    bs.start_time,
                    bs.end_time,
                    bs.location,
                    bs.slot_type
                 FROM booking_slots bs
                 WHERE bs.id = ? 
                    AND (
                        bs.owner_id = ? 
                        OR EXISTS (
                            SELECT 1 FROM bookings b
                            WHERE b.slot_id = bs.id
                                AND b.user_id = ?
                                AND b.status = 'confirmed'
                        )
                    ) 
                 LIMIT 1`,
                [id, user_id, user_id]
            );
        } else {
            // student path: look up by booking id (unchanged)
            [rows] = await pool.query(
                `SELECT
                    b.id AS booking_id,
                    bs.title,
                    bs.description,
                    bs.slot_date,
                    bs.start_time,
                    bs.end_time,
                    bs.location,
                    bs.slot_type,
                    u.name  AS owner_name,
                    u.email AS owner_email
                 FROM bookings b
                 JOIN booking_slots bs ON b.slot_id = bs.id
                 JOIN users u ON bs.owner_id = u.id
                 WHERE b.id = ? AND b.user_id = ? AND b.status = 'confirmed'`,
                [id, user_id]
            );
        }

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        const booking = rows[0];
        const vevent = buildVEvent(booking, `booking-${booking.booking_id}`);
        const icsContent = buildICS([vevent], booking.title);

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${booking.title.replace(/\s+/g, '-')}.ics"`);
        res.send(icsContent);

    } catch (err) {
        console.error('Error exporting single booking:', err);
        res.status(500).json({ error: 'Failed to export booking.' });
    }
});

module.exports = router;
