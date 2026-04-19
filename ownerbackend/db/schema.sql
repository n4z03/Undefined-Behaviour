-- Comp 307 Project: Database Schema --
-- 

-- Users table --
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('owner', 'user') NOT NULL
);

-- Booking slots table --
CREATE TABLE IF NOT EXISTS booking_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(255),
    slot_type ENUM('office_hours', 'group_meeting', 'meeting_request') NOT NULL DEFAULT 'office_hours',
    status ENUM('private', 'active') NOT NULL DEFAULT 'private',
    max_bookings INT NOT NULL DEFAULT 1, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_owner_id (owner_id),
    INDEX idx_status (status),
    INDEX idx_slot_date (slot_date)
);

-- Bookings table --
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
    UNIQUE KEY unique_slot_booking (slot_id),
    INDEX idx_user_id (user_id)
);

-- Owner invitations table -- 
CREATE TABLE IF NOT EXISTS owner_invites (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    owner_id INT NOT NULL UNIQUE,
    token VARCHAR(64) NOT NULL UNIQUE,
    label VARCHAR(255),
    expires_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_owner_id (owner_id)
);