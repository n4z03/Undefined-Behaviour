/*
Nazifa Ahmed (261112966)
run script from server folder by putting 
npm run populate
owner password for all seeded owners: comp307demo
book as a student: use a @mail.mcgill.ca account.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');
const pool = require('../db');

const OWNER_PASSWORD = 'comp307demo';

const SEED_DESC = 'Seeded by populating-script for local testing';

const ownersToSeed = [
  {
    name: 'Prof. Joseph Vybihal',
    email: 'joseph.vybihal@mcgill.ca',
    slots: [
      { dayOffset: 1, start: '10:00:00', end: '10:30:00', title: 'COMP 307 - Office hours' },
      { dayOffset: 3, start: '14:00:00', end: '14:30:00', title: 'COMP 307 - Project help' },
    ],
  },
  {
    name: 'Prof Jonathan Campbell',
    email: 'jonathan.campbell@mcgill.ca',
    slots: [
      { dayOffset: 2, start: '11:00:00', end: '12:00:00', title: 'COMP 202 - Q&A' },
      { dayOffset: 4, start: '15:30:00', end: '16:00:00', title: 'COMP 250 - Quick consult' },
    ],
  },
  {
    name: 'Prof Organic Chemistry Tutor',
    email: 'organic.chemistry.tutor@mcgill.ca',
    slots: [
      { dayOffset: 1, start: '13:00:00', end: '14:00:00', title: 'CHM 233 - Office hours' },
      { dayOffset: 2, start: '10:00:00', end: '11:00:00', title: 'CHM 345 - Review session', maxBookings: 2 },
    ],
  },
];

function ymdAddDays(ymd, days) {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function localYmd() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

async function ensureOwner(owner, passwordHash) {
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [owner.email]);
  if (existing && existing[0] && existing[0].id) {
    return existing[0].id;
  }

  const [ins] = await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'owner')`,
    [owner.name, owner.email, passwordHash]
  );
  return ins.insertId;
}

async function seedOwnerSlots(ownerId, owner) {
  const [del] = await pool.query(
    `DELETE FROM booking_slots WHERE owner_id = ? AND description = ?`,
    [ownerId, SEED_DESC]
  );
  if (del && del.affectedRows > 0) {
    console.log(`Cleared ${del.affectedRows} existing seeded slot(s) for ${owner.email}`);
  }

  const todayYmd = localYmd();
  for (const slot of owner.slots) {
    const slotDate = ymdAddDays(todayYmd, slot.dayOffset);
    const maxBookings = slot.maxBookings != null ? slot.maxBookings : 1;

    await pool.query(
      `INSERT INTO booking_slots (
        owner_id, title, description, slot_date, start_time, end_time, location,
        slot_type, status, max_bookings, is_recurring, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'office_hours', 'active', ?, 0, datetime('now'))`,
      [
        ownerId,
        slot.title,
        SEED_DESC,
        slotDate,
        slot.start,
        slot.end,
        'McGill - Trottier Building',
        maxBookings,
      ]
    );

    console.log(`Inserted ${slot.title} for ${owner.email} on ${slotDate} ${slot.start}-${slot.end}`);
  }
}

async function main() {
  const passwordHash = await bcrypt.hash(OWNER_PASSWORD, 10);

  for (const owner of ownersToSeed) {
    const ownerId = await ensureOwner(owner, passwordHash);
    console.log(`Using owner ${owner.email} (id=${ownerId})`);
    await seedOwnerSlots(ownerId, owner);
  }

  console.log('\nDone. Use any @mail.mcgill.ca student account to browse and book.');
  console.log(`Seeded owner password: ${OWNER_PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
