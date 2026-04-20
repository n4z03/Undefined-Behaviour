-- Comp 307 Project: Database Schema --
-- Sophia Casalme, 261149930 -- 

-- Users table --
-- Who is using the system --
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('owner', 'user') NOT NULL
);

-- Slot groups table --
-- A group of slots -- 
CREATE TABLE IF NOT EXISTS slot_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE, 
    INDEX idx_owner_id (owner_id)
);

-- Booking slots table --
-- The actual time slots available -- 
CREATE TABLE IF NOT EXISTS booking_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    group_id INT NULL, 
    parent_slot_id INT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(255),
    slot_type ENUM('office_hours', 'group_meeting', 'requested') NOT NULL DEFAULT 'office_hours',
    status ENUM('private', 'active') NOT NULL DEFAULT 'private',
    max_bookings INT NOT NULL DEFAULT 1, 
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_weeks INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES slot_groups(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_slot_id) REFERENCES booking_slots(id) ON DELETE SET NULL,
    INDEX idx_owner_id (owner_id),
    INDEX idx_group_id (group_id),
    INDEX idx_status (status),
    INDEX idx_slot_date (slot_date),

    CHECK (start_time < end_time),
    CHECK (max_bookings > 0)
);

-- Bookings table --
-- Who reserved what -- 
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    slot_id INT NOT NULL,
    user_id INT NOT NULL,
    notes TEXT, 
    status ENUM('confirmed', 'cancelled') NOT NULL DEFAULT 'confirmed',
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (slot_id) REFERENCES booking_slots(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_slot (slot_id, user_id),
    INDEX idx_user_id (user_id)
);

-- Meeting requests table --
-- For Type 1 (request a meeting) -- 
CREATE TABLE IF NOT EXISTS meeting_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    user_id INT NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status ENUM('pending', 'accepted', 'declined') NOT NULL DEFAULT 'pending',
    created_slot_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_slot_id) REFERENCES booking_slots(id) ON DELETE SET NULL,

    INDEX idx_owner_id (owner_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status(status)
);

-- Owner invitations table -- 
-- Shareable booking links --
CREATE TABLE IF NOT EXISTS owner_invites (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    owner_id INT NOT NULL,
    group_id INT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    label VARCHAR(255),
    expires_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES slot_groups(id) ON DELETE CASCADE, 
    INDEX idx_token (token),
    INDEX idx_owner_id (owner_id),
    INDEX idx_group_id (group_id)
);