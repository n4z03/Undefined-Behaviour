// Comp 307 Project: Owner Features
// Sophia Casalme, 261149930 
// Code added by Nazifa Ahmed (261112966)
// Code added by Bonita Baladi (261097353)

/* Owner features: 
Create new booking slots with specific date, time, and details.
Manage slot visibility: start as private and toggle to “active” (public).
Delete existing slots and view participant information for each slot. 
Generate unique invitation URLs for specific slot groups. */

const express = require('express');
const router = express.Router();
const pool = require('../db');

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

/** Group meeting "Booked by": one name, or two, or first two + "..." when more voters exist. */
function formatGroupMeetingBookedBy(names) {
    if (!names || names.length === 0) return null;
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]}, ${names[1]}`;
    return `${names[0]}, ${names[1]}, ...`;
}

// Validate slot data before inserting or updating
function validateSlotInput(body, isPartial = false) {
    const errors = [];

    const allowedTypes = ["office_hours", "group_meeting", "requested"];
    const allowedStatuses = ["private", "active"];

    if (!isPartial || body.title !== undefined) {
        if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
          errors.push("Title is required.");
        }
      }
    
      if (!isPartial || body.slot_date !== undefined) {
        if (!body.slot_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.slot_date)) {
          errors.push("slot_date must be in YYYY-MM-DD format.");
        }
      }
    
      if (!isPartial || body.start_time !== undefined) {
        if (!body.start_time || !/^\d{2}:\d{2}(:\d{2})?$/.test(body.start_time)) {
          errors.push("start_time must be in HH:MM or HH:MM:SS format.");
        }
      }
    
      if (!isPartial || body.end_time !== undefined) {
        if (!body.end_time || !/^\d{2}:\d{2}(:\d{2})?$/.test(body.end_time)) {
          errors.push("end_time must be in HH:MM or HH:MM:SS format.");
        }
      }
    
      if (
        body.slot_type !== undefined &&
        !allowedTypes.includes(body.slot_type)
      ) {
        errors.push("Invalid slot_type.");
      }
    
      if (
        body.status !== undefined &&
        !allowedStatuses.includes(body.status)
      ) {
        errors.push("Invalid status.");
      }
    
      if (
        body.max_bookings !== undefined &&
        (!Number.isInteger(body.max_bookings) || body.max_bookings < 1)
      ) {
        errors.push("max_bookings must be an integer greater than 0.");
      }
    
      if (
        body.recurrence_weeks !== undefined &&
        body.recurrence_weeks !== null &&
        (!Number.isInteger(body.recurrence_weeks) || body.recurrence_weeks < 1)
      ) {
        errors.push("recurrence_weeks must be null or an integer greater than 0.");
      }
    
      if (
        body.start_time &&
        body.end_time &&
        body.start_time >= body.end_time
      ) {
        errors.push("start_time must be earlier than end_time.");
      }
    
      return errors;
}

// Helper: find all user's owned slots
async function getOwnedSlot(slot_id, owner_id) {
    const [rows] = await pool.query(
        `SELECT * FROM booking_slots WHERE id = ? AND owner_id = ?`,
        [slot_id, owner_id]
    );
    return rows[0] || null;
}

function normalizeTimeForSql(timeValue) {
    if (!timeValue) return null;
    const txt = String(timeValue).trim();
    if (/^\d{2}:\d{2}$/.test(txt)) return `${txt}:00`;
    return txt;
}

async function ownerHasOverlap(owner_id, slot_date, start_time, end_time, exclude_slot_id = null) {
    const start = normalizeTimeForSql(start_time);
    const end = normalizeTimeForSql(end_time);

    const params = [owner_id, slot_date, end, start];
    let excludeSql = '';
    if (exclude_slot_id != null) {
        excludeSql = ' AND id != ?';
        params.push(exclude_slot_id);
    }

    const [rows] = await pool.query(
        `SELECT id
         FROM booking_slots
         WHERE owner_id = ?
           AND slot_date = ?
           AND time(start_time) < time(?)
           AND time(end_time) > time(?)
           ${excludeSql}
         LIMIT 1`,
        params
    );
    return rows.length > 0;
}

// GET /api/ownerSlots/slots
// Returns all slots owned by the the logged-in owner 
router.get('/', requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;

    try {
	// Include confirmed booking count and the first booker (for "Booked by" in owner UI)
        const [rows] = await pool.query(
            `SELECT
                s.*,
                (SELECT COUNT(*) FROM bookings b
                 WHERE b.slot_id = s.id AND b.status = 'confirmed') AS current_bookings,
                (SELECT u.name FROM bookings b
                 INNER JOIN users u ON b.user_id = u.id
                 WHERE b.slot_id = s.id AND b.status = 'confirmed'
                 ORDER BY b.booked_at ASC LIMIT 1) AS booked_by_name,
                (SELECT u.email FROM bookings b
                 INNER JOIN users u ON b.user_id = u.id
                 WHERE b.slot_id = s.id AND b.status = 'confirmed'
                 ORDER BY b.booked_at ASC LIMIT 1) AS booked_by_email
             FROM booking_slots s
             WHERE s.owner_id = ?
               -- Voting-stage group_meeting slots live in the dedicated
               -- "Group Meetings" tab, not on the main calendar. Once confirmed
               -- the owner flips them to 'active' and they'll show up here.
               AND NOT (s.slot_type = 'group_meeting' AND s.status = 'private')
	    ORDER BY s.slot_date ASC, s.start_time ASC`,
            [owner_id]
        );

        const groupSlotIds = rows
            .filter((r) => r.slot_type === 'group_meeting')
            .map((r) => r.id);
        if (groupSlotIds.length > 0) {
            const ph = groupSlotIds.map(() => '?').join(', ');
            const [voterRows] = await pool.query(
                `SELECT b.slot_id AS slot_id, u.name AS name
                 FROM bookings b
                 INNER JOIN users u ON b.user_id = u.id
                 WHERE b.slot_id IN (${ph}) AND b.status = 'confirmed'
                 ORDER BY b.slot_id, b.booked_at ASC`,
                groupSlotIds
            );
            const bySlot = new Map();
            for (const vr of voterRows) {
                const sid = vr.slot_id;
                if (!bySlot.has(sid)) bySlot.set(sid, []);
                bySlot.get(sid).push(vr.name);
            }
            for (const row of rows) {
                if (row.slot_type !== 'group_meeting') continue;
                const names = bySlot.get(row.id) || [];
                row.booked_by_display = formatGroupMeetingBookedBy(names);
            }
        }

        res.json({ slots: rows });
    } catch (err) {
        console.error("Error fetching owner slots:", err);
        res.status(500).json({ error: "Failed to fetch slots." });
    }

});

// GET /api/ownerSlots/dashboard
// Returns the owner's own slots and slots they've booked as a participant
router.get('/dashboard', requireLogin, requireOwner, async (req, res) => {
  const owner_id = req.user.id;

  try {
      // Slots this owner created
      const [ownedSlots] = await pool.query(
          `SELECT
              s.*,
              (SELECT COUNT(*) FROM bookings b
               WHERE b.slot_id = s.id AND b.status = 'confirmed') AS current_bookings
           FROM booking_slots s
           WHERE s.owner_id = ?
           ORDER BY s.slot_date ASC, s.start_time ASC`,
          [owner_id]
      );

      // Slots this owner has booked as a participant 
      const [bookedSlots] = await pool.query(
        `SELECT
          bs.*,
          b.id AS booking_id,
          b.notes AS booking_notes,
          b.booked_at,
          u.name AS host_name,
          u.email AS host_email
        FROM bookings b
        JOIN booking_slots bs ON b.slot_id = bs.id
        JOIN users u ON bs.owner_id = u.id
        WHERE b.user_id = ? AND b.status = 'confirmed'
        ORDER BY bs.slot_date ASC, bs.start_time ASC`,
        [owner_id]
      );
      res.json({ owned_slots: ownedSlots, booked_slots: bookedSlots });
  } catch (err) {
      console.error("Error fetching dashboard:", err);
      res.status(500).json({ error: "Failed to load dashboard." });
  }

});

// POST /api/ownerSlots/:id/book
// Allow any logged-in user to book an owner's active slot
// An owner cannot book their own slot
router.post('/:id/book', requireLogin, async (req, res) => {
  const booker_id = req.user.id;
  const slot_id = Number(req.params.id);
  try {
    if (!Number.isInteger(slot_id)) {
      return res.status(400).json({ error: "Invalid slot id." });
    }
  
    // Fetch the active slot 
    const [slots] = await pool.query(
      `SELECT * FROM booking_slots WHERE id = ? AND status = 'active'`,
      [slot_id]
    );
    const slot = slots[0];

    if (!slot) {
      return res.status(404).json({ error: "Slot not found or not active." });
    }

    // Prevent self-booking
    if (slot.owner_id === booker_id) {
      return res.status(400).json({ error: "You cannot book your own slot." });
    }

    // Check slot capacity
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS count FROM bookings WHERE slot_id = ? AND status = 'confirmed'`,
      [slot_id]
      );
    if (countRows[0].count >= slot.max_bookings) {
      return res.status(409).json({ error: "Slot is fully booked." });
    }

    // Prevent double booking
    const [existing] = await pool.query(
      `SELECT id, status FROM bookings WHERE slot_id = ? AND user_id = ?`,
      [slot_id, booker_id]
    );

    const existingBooking = existing[0];

    if (existingBooking && existingBooking.status === 'confirmed') {
      return res.status(409).json({ error: "You have already booked this slot." });
    }

    let bookingId;

    if (existingBooking && existingBooking.status === 'cancelled') {
      await pool.query(
        `UPDATE bookings
         SET status = 'confirmed',
             notes = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [req.body.notes || null, existingBooking.id]
      );
    } else {
        const [result] = await pool.query(
          `INSERT INTO bookings (slot_id, user_id, notes) VALUES (?, ?, ?)`,
          [slot_id, booker_id, req.body.notes || null]
    );

    bookingId = result.insertId;
    }

    // Fetch slot owner and booker info for mailto
    const [slotOwnerRows] = await pool.query(
      `SELECT u.name, u.email, bs.title, bs.slot_date, bs.start_time, bs.end_time
      FROM booking_slots bs
      JOIN users u ON bs.owner_id = u.id
      WHERE bs.id = ?`,
      [slot_id]
    );
    const [bookerRows] = await pool.query(
      `SELECT name, email FROM users WHERE id = ?`,
    [booker_id]
    );

    const slotOwner = slotOwnerRows[0];
    const booker = bookerRows[0];

    res.status(201).json({
      message: "Slot booked successfully.",
      booking_id: bookingId,
      notify: slotOwner && booker ? {
        to: slotOwner.email,
        subject: `New booking: ${slotOwner.title}`,
        body: [
            `Hi ${slotOwner.name},`,
            '',
            `${booker.name} (${booker.email}) has booked your slot "${slotOwner.title}".`,
            '',
            `Date: ${slotOwner.slot_date}`,
            `Time: ${slotOwner.start_time} - ${slotOwner.end_time}`,
            '',
            'You can view this booking in your McBook dashboard.',
        ].join('\r\n'),
      } : null,
    });
  } catch (err) {
    console.error("Error booking slot:", err);
    res.status(500).json({ error: "Failed to book slot." });
  }
});

// GET /api/ownerSlots/slots/:id
// Returns a single slot by ID if it is owned by the logged-in owner
router.get('/:id', requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;
    const slot_id = Number(req.params.id);

    try {
        if (!Number.isInteger(slot_id)) {
            return res.status(400).json({ error: "Invalid slot id." });
        }
    
        const slot = await getOwnedSlot(slot_id, owner_id);
    
        if(!slot) {
            return res.status(404).json({ error: "Slot not found." });
        }
    
        res.json({ slot });
    } catch (err) {
        console.error("Error fetching slot:", err);
        res.status(500).json({ error: "Failed to fetch slot." });
    }
   
});

// POST /api/ownerSlots/slots
// Create a new booking slot (default private)
router.post('/', requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;
    
    try { 
        const {
            group_id = null, 
            parent_slot_id = null,
            title,
            description = null,
            slot_date,
            start_time,
            end_time,
            location = null,
            slot_type = "office_hours",
            status = "private",
            max_bookings = 1, 
            is_recurring = false,
            recurrence_weeks = null,
        } = req.body;
    
        const validationErrors = validateSlotInput({
            title, slot_date, start_time, end_time, slot_type, status, max_bookings, recurrence_weeks,
        });
    
        if(validationErrors.length > 0) {
            return res.status(400).json({ errors: validationErrors });
        }

        const hasOverlap = await ownerHasOverlap(owner_id, slot_date, start_time, end_time);
        if (hasOverlap) {
            return res.status(400).json({
                error: "This slot overlaps with one of your existing slots on that date.",
            });
        }
    
        if (group_id != null) {
            const [groupRows] = await pool.query(
                `SELECT id FROM slot_groups WHERE id = ? AND owner_id = ?`,
                [group_id, owner_id]
            );
    
            if (groupRows.length === 0) {
                return res.status(400).json({ error: "Invalid group_id for this owner." });
            }
        }
    
        if (parent_slot_id !== null) {
            const [parentRows] = await pool.query(
                `SELECT id FROM booking_slots WHERE id = ? AND owner_id = ?`,
                [parent_slot_id, owner_id]
            );
    
            if (parentRows.length === 0) {
                return res.status(400).json({ error: "Invalid parent_slot_id for this owner." });
            }
        }
    
        // Insert the new slot to the database
        const [result] = await pool.query(
            `INSERT INTO booking_slots (
                owner_id, group_id, parent_slot_id, title, description,
                slot_date, start_time, end_time, location, slot_type,
                status, max_bookings, is_recurring,
                recurrence_weeks
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [ owner_id, group_id, parent_slot_id, title.trim(),
                description, slot_date, start_time, end_time, 
                location, slot_type, status, max_bookings,
                Boolean(is_recurring), recurrence_weeks,
              ]
        );
    
        const slot = await getOwnedSlot(result.insertId, owner_id);
    
        res.status(201).json({
            message: "Slot created successfully.", slot,
        });
    } catch (err) {
        console.error("Error creating slot:", err);
        res.status(500).json({ error: "Failed to create slot." });
    }
    
});

// PATCH /api/ownerSlots/slots/:id
// Edit an existing slot
router.patch('/:id', requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;
    const slot_id = Number(req.params.id);

    try {
        if (!Number.isInteger(slot_id)) {
            return res.status(400).json({ error: "Invalid slot id." });
        }

        // Confirm the slot exists and is owned by this user
        const existingSlot = await getOwnedSlot(slot_id, owner_id);

        if (!existingSlot) {
            return res.status(404).json({ error: "Slot not found." });
          }
      
          // Only these fields can be updated (status updated through /visibility)
          const allowedFields = [
            "group_id", "parent_slot_id", "title", "description",
            "slot_date", "start_time", "end_time", "location",
            "slot_type", "max_bookings", "is_recurring",
            "recurrence_weeks",
          ];
      
          const updates = {};
          for (const key of allowedFields) {
            if (req.body[key] !== undefined) {
              updates[key] = req.body[key];
            }
          }
      
          if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No valid fields provided for update." });
          }
      
          const merged = { ...existingSlot, ...updates };
          const validationErrors = validateSlotInput(merged, true);
      
          if (validationErrors.length > 0) {
            return res.status(400).json({ errors: validationErrors });
          }

          const hasOverlap = await ownerHasOverlap(
            owner_id,
            merged.slot_date,
            merged.start_time,
            merged.end_time,
            slot_id
          );
          if (hasOverlap) {
            return res.status(400).json({
              error: "This update would overlap with one of your existing slots on that date.",
            });
          }
      
          if (updates.group_id !== undefined && updates.group_id !== null) {
            const [groupRows] = await pool.query(
              `SELECT id
               FROM slot_groups
               WHERE id = ? AND owner_id = ?`,
              [updates.group_id, owner_id]
            );
      
            if (groupRows.length === 0) {
              return res.status(400).json({ error: "Invalid group_id for this owner." });
            }
          }
      
          if (updates.parent_slot_id !== undefined && updates.parent_slot_id !== null) {
            if (updates.parent_slot_id === slot_id) {
              return res.status(400).json({ error: "A slot cannot be its own parent." });
            }
      
            const [parentRows] = await pool.query(
              `SELECT id
               FROM booking_slots
               WHERE id = ? AND owner_id = ?`,
              [updates.parent_slot_id, owner_id]
            );
      
            if (parentRows.length === 0) {
              return res.status(400).json({ error: "Invalid parent_slot_id for this owner." });
            }
          }
      
          const fields = [];
          const values = [];
      
          for (const [key, value] of Object.entries(updates)) {
            fields.push(`${key} = ?`);
            values.push(value);
          }
      
          values.push(slot_id, owner_id);
      
          await pool.query(
            `UPDATE booking_slots
             SET ${fields.join(", ")}
             WHERE id = ? AND owner_id = ?`,
            values
          );
      
          const slot = await getOwnedSlot(slot_id, owner_id);
      
          res.json({
            message: "Slot updated successfully.",
            slot,
          });
        } catch (err) {
          console.error("Error updating slot:", err);
          res.status(500).json({ error: "Failed to update slot." });
        }
});

// PATCH /api/ownerSlots/slots/:id/visibility
// private <-> active. Deactivating (active -> private) cancels all confirmed
// bookings so they disappear from student calendars; same idea as delete + mailto.
router.patch('/:id/visibility', requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;
    const slot_id = Number(req.params.id);
    const { status } = req.body;

    try {
        if (!Number.isInteger(slot_id)) {
            return res.status(400).json({ error: "Invalid slot id." });
        }

        if (!["private", "active"].includes(status)){
            return res.status(400).json({ error: "Status must be 'private' or 'active'." });
        }

        const slot = await getOwnedSlot(slot_id, owner_id);

        if (!slot) {
            return res.status(404).json({ error: "Slot not found." });
        }

        let affectedUsers = [];

        if (status === "private" && slot.status === "active") {
            const [bookedUsers] = await pool.query(
                `SELECT DISTINCT u.id, u.name, u.email, b.booked_at
                 FROM bookings b
                 JOIN users u ON b.user_id = u.id
                 WHERE b.slot_id = ? AND b.status = 'confirmed'
                 ORDER BY b.booked_at ASC`,
                [slot_id]
            );
            affectedUsers = bookedUsers;
            if (bookedUsers.length > 0) {
                const conn = await pool.getConnection();
                try {
                    await conn.beginTransaction();
                    await conn.query(
                        `UPDATE bookings SET status = 'cancelled', updated_at = datetime('now')
                         WHERE slot_id = ? AND status = 'confirmed'`,
                        [slot_id]
                    );
                    await conn.query(
                        `UPDATE booking_slots SET status = ? WHERE id = ? AND owner_id = ?`,
                        [status, slot_id, owner_id]
                    );
                    await conn.commit();
                } catch (e) {
                    await conn.rollback();
                    throw e;
                } finally {
                    conn.release();
                }
                const updatedSlot = await getOwnedSlot(slot_id, owner_id);
                return res.json({
                    message: "Slot deactivated; student bookings were cancelled.",
                    slot: updatedSlot,
                    affectedUsers: bookedUsers,
                });
            }
        }

        await pool.query(
            `UPDATE booking_slots SET status = ? WHERE id = ? AND owner_id = ?`,
            [status, slot_id, owner_id]
        );

        const updatedSlot = await getOwnedSlot(slot_id, owner_id);

        res.json({
            message: `Slot visibility changed to '${status}'.`, slot: updatedSlot,
            affectedUsers,
        });
    } catch (err) {
        console.error("Error updating slot visibility:", err);
        res.status(500).json({ error: "Failed to update slot visibility." });
    }
});

// GET /api/slots/:id/participants
// Returns list of users who have booked the slot
router.get('/:id/participants', requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;
    const slot_id = Number(req.params.id);

    try {
        if (!Number.isInteger(slot_id)) {
            return res.status(400).json({ error: "Invalid slot id." });
        }

        const slot = await getOwnedSlot(slot_id, owner_id);

        if (!slot) {
            return res.status(404).json({ error: "Slot not found." });
        }
        
        const [participants] = await pool.query(
            `SELECT 
                b.id AS booking_id,
                b.status AS booking_status,
                b.notes,
                b.booked_at,
                b.updated_at,
                u.id AS user_id,
                u.name,
                u.email,
                u.role
            FROM bookings b JOIN users u ON b.user_id = u.id WHERE b.slot_id = ? 
            ORDER BY b.booked_at ASC`,
            [slot_id]
        );

        res.json({ slot, participants,});
    } catch (err) {
        console.error("Error fetching participants:", err);
        res.status(500).json({ error: "Failed to fetch participants." });
    }

});

// DELETE /api/ownerSlots/:id/book
// Allows a logged-in user (including owners) to cancel a booking they made.
// Returns host info so the frontend can generate a mailto cancellation notice.
router.delete('/:id/book', requireLogin, async (req, res) => {
  const booker_id = req.user.id;
  const slot_id = Number(req.params.id);

  if (!Number.isInteger(slot_id)) {
      return res.status(400).json({ error: "Invalid slot id." });
  }

  try {
      // Find the confirmed booking
      const [bookings] = await pool.query(
          `SELECT 
            b.id AS booking_id, 
            bs.title, 
            bs.slot_date, 
            bs.start_time, 
            bs.end_time,
            bs.slot_type,
            u.name AS host_name, 
            u.email AS host_email,
            me.name AS booker_name
           FROM bookings b
           JOIN booking_slots bs ON b.slot_id = bs.id
           JOIN users u ON bs.owner_id = u.id
           JOIN users me ON b.user_id = me.id
           WHERE b.slot_id = ? AND b.user_id = ? AND b.status = 'confirmed'`,
          [slot_id, booker_id]
      );

      if (bookings.length === 0) {
          return res.status(404).json({ error: "No confirmed booking found for this slot." });
      }

      const booking = bookings[0];

      if (booking.slot_type === 'group_meeting' && req.user.role === 'user') {
          return res.status(403).json({
              error: 'Group meetings can only be cancelled by the organizer.',
          });
      }

      // Cancel the booking
      await pool.query(
          `UPDATE bookings SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
           WHERE slot_id = ? AND user_id = ? AND status = 'confirmed'`,
          [slot_id, booker_id]
      );

      // Return host info for mailto — same pattern as other cancellation routes
      res.json({
          message: "Booking cancelled.",
          cancelledSlot: {
            slot_id,
            title: booking.title,
            slot_date: booking.slot_date,
            start_time: booking.start_time,
            end_time: booking.end_time,
          },
          host: {
            name: booking.host_name,
            email: booking.host_email,
          }, 
      });
    } catch (err) {
      console.error("Error cancelling booking:", err);
      res.status(500).json({ error: "Failed to cancel booking." });
    }
});

// DELETE /api/ownerSlots/slots/:id
// Deletes a slot and returns a list of confirmed users who were affected 
router.delete("/:id", requireLogin, requireOwner, async (req, res) => {
    const owner_id = req.user.id;
    const slot_id = Number(req.params.id);

    try {
        if (!Number.isInteger(slot_id)) {
            return res.status(400).json({ error: "Invalid slot id." });
        }

        const slot = await getOwnedSlot(slot_id, owner_id);

        if (!slot) {
            return res.status(404).json({ error: "Slot not found." });
        }

        // Store affected users before deleting, so the owner can follow up if needed
        const [bookedUsers] = await pool.query(
            `SELECT DISTINCT u.id, u.name, u.email, b.booked_at
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            WHERE b.slot_id = ? AND b.status = 'confirmed'
            ORDER BY b.booked_at ASC`,
            [slot_id]
        );

        await pool.query(
            `DELETE FROM booking_slots WHERE id = ? AND owner_id = ?`,
            [slot_id, owner_id]
        );

        res.json({
            message: "Slot deleted successfully.",
            deletedSlotId: slot_id,
            affectedUsers: bookedUsers,
        });
    } catch (err) {
        console.error("Error deleting slot:", err);
        res.status(500).json({ error: "Failed to delete slot." });
    }

});

module.exports = router;
