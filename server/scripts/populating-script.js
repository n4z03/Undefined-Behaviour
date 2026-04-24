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

/** Cancel-test booking is on this day at 10:00 (Vybihal’s first slot). */
const DEMO_BOOKED_SLOT_DATE = '2026-04-23';

/** Student user with a pre-made booking (for testing cancel in "My Appointments"). */
const DEMO_STUDENT = {
  name: 'Cancel Test Student',
  email: 'cancel.demo@mail.mcgill.ca',
};

const ownersToSeed = [
  {
    name: 'Prof. Joseph Vybihal',
    email: 'joseph.vybihal@mcgill.ca',
    slots: [
      { slotDate: DEMO_BOOKED_SLOT_DATE, start: '10:00:00', end: '10:30:00', title: 'COMP 307 - Office hours' },
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

async function ensureStudent(email, name, passwordHash) {
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing && existing[0] && existing[0].id) {
    return existing[0].id;
  }
  const [ins] = await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'user')`,
    [name, email, passwordHash]
  );
  return ins.insertId;
}

/**
 * One confirmed booking on the first seeded slot (Prof. Vybihal) so you can test cancel in the UI.
 */
async function seedDemoStudentBooking(passwordHash) {
  const userId = await ensureStudent(DEMO_STUDENT.email, DEMO_STUDENT.name, passwordHash);

  const firstOwnerEmail = ownersToSeed[0].email;
  const [slots] = await pool.query(
    `SELECT s.id FROM booking_slots s
     JOIN users u ON s.owner_id = u.id
     WHERE u.email = ? AND s.description = ?
     AND s.slot_date = ? AND s.start_time = '10:00:00'
     LIMIT 1`,
    [firstOwnerEmail, SEED_DESC, DEMO_BOOKED_SLOT_DATE]
  );
  if (!slots.length) {
    console.log('No seeded slots found; skipping demo booking.');
    return;
  }
  const slotId = slots[0].id;

  const [existing] = await pool.query(
    'SELECT id, status FROM bookings WHERE slot_id = ? AND user_id = ?',
    [slotId, userId]
  );
  if (existing.length) {
    const bid = existing[0].id;
    if (existing[0].status !== 'confirmed') {
      await pool.query(`UPDATE bookings SET status = 'confirmed' WHERE id = ?`, [bid]);
      console.log(`Reset demo booking id=${bid} to confirmed for ${DEMO_STUDENT.email}.`);
    } else {
      console.log(`Demo booking already present (id=${bid}) for ${DEMO_STUDENT.email} on slot_id=${slotId}.`);
    }
    return;
  }

  const [b] = await pool.query(
    `INSERT INTO bookings (slot_id, user_id, status) VALUES (?, ?, 'confirmed')`,
    [slotId, userId]
  );
  console.log(
    `Inserted demo booking id=${b.insertId} for ${DEMO_STUDENT.email} on slot_id=${slotId} (book + cancel test).`
  );
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
    const slotDate =
      slot.slotDate != null
        ? slot.slotDate
        : ymdAddDays(todayYmd, slot.dayOffset);
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

  await seedDemoStudentBooking(passwordHash);

  console.log('\nDone. Use any @mail.mcgill.ca student account to browse and book.');
  console.log(`Seeded owner password: ${OWNER_PASSWORD}`);
  console.log(
    `Cancel test: ${DEMO_BOOKED_SLOT_DATE} 10:00 — sign in as ${DEMO_STUDENT.email} (same password) → My Appointments → cancel.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
