-- Comp 307 Project: SQLite schema (converted from MySQL db/schema.sql)
-- code added by Nazifa Ahmed (261112966)
-- Load: sqlite3 ../data/app.db < db/schema.sqlite.sql (from repo root) or path as appropriate.

PRAGMA foreign_keys = ON;

-- Users
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'user'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Slot groups
CREATE TABLE IF NOT EXISTS slot_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_slot_groups_owner_id ON slot_groups(owner_id);

-- Booking slots
CREATE TABLE IF NOT EXISTS booking_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    group_id INTEGER,
    parent_slot_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    slot_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    location TEXT,
    slot_type TEXT NOT NULL DEFAULT 'office_hours'
        CHECK (slot_type IN ('office_hours', 'group_meeting', 'requested')),
    status TEXT NOT NULL DEFAULT 'private'
        CHECK (status IN ('private', 'active')),
    max_bookings INTEGER NOT NULL DEFAULT 1,
    is_recurring INTEGER NOT NULL DEFAULT 0 CHECK (is_recurring IN (0, 1)),
    recurrence_weeks INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES slot_groups(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_slot_id) REFERENCES booking_slots(id) ON DELETE SET NULL,
    CHECK (start_time < end_time),
    CHECK (max_bookings > 0)
);

CREATE INDEX IF NOT EXISTS idx_booking_slots_owner_id ON booking_slots(owner_id);
CREATE INDEX IF NOT EXISTS idx_booking_slots_group_id ON booking_slots(group_id);
CREATE INDEX IF NOT EXISTS idx_booking_slots_status ON booking_slots(status);
CREATE INDEX IF NOT EXISTS idx_booking_slots_slot_date ON booking_slots(slot_date);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed'
        CHECK (status IN ('confirmed', 'cancelled')),
    booked_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (slot_id) REFERENCES booking_slots(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (slot_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);

-- Meeting requests
CREATE TABLE IF NOT EXISTS meeting_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'declined')),
    created_slot_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_slot_id) REFERENCES booking_slots(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_meeting_requests_owner_id ON meeting_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_user_id ON meeting_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_status ON meeting_requests(status);

-- Owner invites
CREATE TABLE IF NOT EXISTS owner_invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    group_id INTEGER,
    token TEXT NOT NULL UNIQUE,
    label TEXT,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES slot_groups(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_owner_invites_token ON owner_invites(token);
CREATE INDEX IF NOT EXISTS idx_owner_invites_owner_id ON owner_invites(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_invites_group_id ON owner_invites(group_id);
