// Comp 307 Project: Owner Features
// Sophia Casalme, 261149930 
// Code added by Nazifa Ahmed (261112966)

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
             ORDER BY s.slot_date ASC, s.start_time ASC`,
            [owner_id]
        );
        res.json({ slots: rows });
    } catch (err) {
        console.error("Error fetching owner slots:", err);
        res.status(500).json({ error: "Failed to fetch slots." });
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
                u.email
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