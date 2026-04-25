/*
 * Nazifa Ahmed (261112966)
 *
 * Seeds the database with realistic demo data centred on two main accounts:
 *
 *   demoprof@mcgill.ca        password: 123456  (owner)
 *   demostudent@mail.mcgill.ca password: 123456  (student)
 *
 * Also creates several supporting professors and students so the Browse Slots
 * and Requests pages look populated.
 *
 * Run from the server/ folder:
 *
 *   node scripts/seed-demo.js
 *
 * Assumes the DB has already been cleared (run clear-db.js first).
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../db');

const PASSWORD = '123456';

// ─── Helpers ───────────────────────────────────────────────────────────────

function ymd(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function token() {
  return crypto.randomBytes(12).toString('hex');
}

async function insertUser(name, email, hash, role) {
  const [r] = await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
    [name, email, hash, role]
  );
  return r.insertId;
}

async function insertSlot(ownerId, { title, description, date, start, end, location, type, status, maxBookings, groupId }) {
  const [r] = await pool.query(
    `INSERT INTO booking_slots
       (owner_id, group_id, title, description, slot_date, start_time, end_time,
        location, slot_type, status, max_bookings, is_recurring, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))`,
    [
      ownerId,
      groupId || null,
      title,
      description || null,
      date,
      start,
      end,
      location || 'Trottier Building, McGill',
      type || 'office_hours',
      status || 'active',
      maxBookings || 1,
    ]
  );
  return r.insertId;
}

async function insertBooking(slotId, userId, notes) {
  const [r] = await pool.query(
    `INSERT OR IGNORE INTO bookings (slot_id, user_id, notes, status) VALUES (?, ?, ?, 'confirmed')`,
    [slotId, userId, notes || null]
  );
  return r.insertId;
}

async function insertRequest(ownerId, userId, subject, message, status) {
  const [r] = await pool.query(
    `INSERT INTO meeting_requests (owner_id, user_id, subject, message, status) VALUES (?, ?, ?, ?, ?)`,
    [ownerId, userId, subject, message, status || 'pending']
  );
  return r.insertId;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);

  console.log('Seeding demo data...\n');

  // ── 1. Primary demo accounts ────────────────────────────────────────────
  const profId = await insertUser('Dr. Alex Dupont', 'demoprof@mcgill.ca', hash, 'owner');
  const studentId = await insertUser('Jamie Chen', 'demostudent@mail.mcgill.ca', hash, 'user');
  console.log(`Created main accounts:  demoprof@mcgill.ca (id=${profId})  demostudent@mail.mcgill.ca (id=${studentId})`);

  // ── 2. Supporting professors ─────────────────────────────────────────────
  const prof2Id = await insertUser('Prof. Sarah Okafor', 'sarah.okafor@mcgill.ca', hash, 'owner');
  const prof3Id = await insertUser('Prof. Michael Tran', 'michael.tran@mcgill.ca', hash, 'owner');
  const prof4Id = await insertUser('Prof. Leila Nassiri', 'leila.nassiri@mcgill.ca', hash, 'owner');
  console.log('Created supporting professors.');

  // ── 3. Supporting students ───────────────────────────────────────────────
  const s2Id = await insertUser('Priya Sharma', 'priya.sharma@mail.mcgill.ca', hash, 'user');
  const s3Id = await insertUser('Omar Khalil', 'omar.khalil@mail.mcgill.ca', hash, 'user');
  const s4Id = await insertUser('Sofia Leblanc', 'sofia.leblanc@mail.mcgill.ca', hash, 'user');
  console.log('Created supporting students.\n');

  // ── 4. Demo prof's office hour slots (mix of active / private) ───────────
  console.log('--- Slots for demoprof@mcgill.ca ---');

  // Future active slots students can book
  const slot1 = await insertSlot(profId, {
    title: 'COMP 307 - Office Hours',
    description: 'Weekly office hours for Web Development course.',
    date: ymd(2), start: '10:00:00', end: '10:30:00',
    location: 'McConnell Engineering, Room 320',
    status: 'active',
  });
  console.log(`  Slot ${slot1}: COMP 307 Office Hours (${ymd(2)} 10:00)`);

  const slot2 = await insertSlot(profId, {
    title: 'COMP 307 - Office Hours',
    description: 'Weekly office hours for Web Development course.',
    date: ymd(4), start: '10:00:00', end: '10:30:00',
    location: 'McConnell Engineering, Room 320',
    status: 'active',
  });
  console.log(`  Slot ${slot2}: COMP 307 Office Hours (${ymd(4)} 10:00)`);

  const slot3 = await insertSlot(profId, {
    title: 'COMP 307 - Project Help',
    description: 'Bring your project questions.',
    date: ymd(3), start: '14:00:00', end: '14:30:00',
    location: 'McConnell Engineering, Room 320',
    status: 'active',
  });
  console.log(`  Slot ${slot3}: COMP 307 Project Help (${ymd(3)} 14:00)`);

  const slot4 = await insertSlot(profId, {
    title: 'COMP 307 - Assignment Review',
    description: 'Assignment 3 review session.',
    date: ymd(5), start: '15:00:00', end: '15:30:00',
    status: 'active',
    maxBookings: 3,
  });
  console.log(`  Slot ${slot4}: Assignment Review (${ymd(5)} 15:00, max 3)`);

  const slot5 = await insertSlot(profId, {
    title: 'COMP 307 - Exam Prep',
    description: 'Final exam preparation session.',
    date: ymd(7), start: '09:00:00', end: '10:00:00',
    status: 'active',
    maxBookings: 5,
  });
  console.log(`  Slot ${slot5}: Exam Prep (${ymd(7)} 09:00, max 5)`);

  // A private (draft) slot
  const slotDraft = await insertSlot(profId, {
    title: 'Research Mentoring (Draft)',
    description: 'Research mentoring session — not yet published.',
    date: ymd(10), start: '11:00:00', end: '12:00:00',
    status: 'private',
  });
  console.log(`  Slot ${slotDraft}: Research Mentoring DRAFT (${ymd(10)})`);

  // A past slot with a booking (shows in "My Appointments" as historical)
  const slotPast = await insertSlot(profId, {
    title: 'COMP 307 - Office Hours',
    description: 'Last week office hours.',
    date: ymd(-5), start: '10:00:00', end: '10:30:00',
    status: 'active',
  });
  console.log(`  Slot ${slotPast}: Past slot (${ymd(-5)} 10:00)`);

  // ── 5. demostudent books into the demo prof's slots ──────────────────────
  console.log('\n--- Bookings for demostudent ---');

  await insertBooking(slot1, studentId, 'Need help with Assignment 3.');
  console.log(`  Booked slot ${slot1} (upcoming office hours)`);

  await insertBooking(slotPast, studentId, 'Reviewed midterm feedback.');
  console.log(`  Booked slot ${slotPast} (past appointment)`);

  // Other students also book some slots (makes the UI look realistic)
  await insertBooking(slot3, s2Id, 'Questions about final project.');
  await insertBooking(slot4, s2Id);
  await insertBooking(slot4, s3Id, 'Assignment 3 clarification.');
  await insertBooking(slot5, s3Id);
  await insertBooking(slot5, s4Id);
  console.log('  Supporting students booked additional slots.');

  // ── 6. Slots from supporting professors (Browse Slots page) ──────────────
  console.log('\n--- Slots for supporting professors ---');

  const oSlot1 = await insertSlot(prof2Id, {
    title: 'COMP 202 - Q&A Session',
    date: ymd(1), start: '11:00:00', end: '11:30:00',
    status: 'active',
  });
  const oSlot2 = await insertSlot(prof2Id, {
    title: 'COMP 202 - Office Hours',
    date: ymd(3), start: '13:00:00', end: '14:00:00',
    status: 'active', maxBookings: 2,
  });
  await insertBooking(oSlot1, studentId);
  console.log(`  Prof Okafor: 2 slots (demostudent booked slot ${oSlot1})`);

  await insertSlot(prof3Id, {
    title: 'COMP 250 - Data Structures Help',
    date: ymd(2), start: '15:00:00', end: '15:30:00',
    status: 'active',
  });
  await insertSlot(prof3Id, {
    title: 'COMP 250 - Office Hours',
    date: ymd(6), start: '10:00:00', end: '11:00:00',
    status: 'active', maxBookings: 3,
  });
  console.log('  Prof Tran: 2 slots');

  await insertSlot(prof4Id, {
    title: 'MATH 223 - Linear Algebra Review',
    date: ymd(1), start: '14:00:00', end: '14:30:00',
    status: 'active',
  });
  await insertSlot(prof4Id, {
    title: 'MATH 223 - Exam Prep',
    date: ymd(8), start: '09:30:00', end: '10:30:00',
    status: 'active', maxBookings: 6,
  });
  console.log('  Prof Nassiri: 2 slots');

  // ── 7. Meeting requests ───────────────────────────────────────────────────
  console.log('\n--- Meeting requests ---');

  // demostudent → demoprof (pending — shows on both dashboards)
  await insertRequest(
    profId, studentId,
    'Request: COMP 307 Assignment 3 help',
    'Hi Dr. Dupont, I\'m stuck on the database section of assignment 3. Could we schedule a time to go over it? I\'m available most afternoons this week.',
    'pending'
  );
  console.log('  demostudent → demoprof: pending request (assignment help)');

  // Another student → demoprof (pending)
  await insertRequest(
    profId, s2Id,
    'Request: Final project scope advice',
    'Hello, I would like to discuss my final project proposal before I start implementing. Could you spare 20 minutes this week?',
    'pending'
  );
  console.log('  Priya → demoprof: pending request (project proposal)');

  // demostudent → Prof Okafor (accepted)
  await insertRequest(
    prof2Id, studentId,
    'Request: COMP 202 midterm review',
    'Could we go over my midterm? I would like to understand where I lost marks.',
    'accepted'
  );
  console.log('  demostudent → Prof Okafor: accepted request');

  // demostudent → Prof Tran (declined)
  await insertRequest(
    prof3Id, studentId,
    'Request: Extra office hours before finals',
    'I am struggling with tree structures. Is there any chance of an extra session before the final?',
    'declined'
  );
  console.log('  demostudent → Prof Tran: declined request');

  // ── 8. Group meetings ────────────────────────────────────────────────────
  console.log('\n--- Group meetings ---');

  // Group meeting 1: voting open
  const [g1] = await pool.query(
    `INSERT INTO slot_groups (owner_id, name, description) VALUES (?, ?, ?)`,
    [profId, 'COMP 307 Project Review', 'Vote for the time that works best for your group presentation review.']
  );
  const groupId1 = g1.insertId;

  const gSlot1a = await insertSlot(profId, {
    title: 'COMP 307 Project Review',
    date: ymd(6), start: '09:00:00', end: '09:30:00',
    type: 'group_meeting', status: 'private',
    maxBookings: 999, groupId: groupId1,
  });
  const gSlot1b = await insertSlot(profId, {
    title: 'COMP 307 Project Review',
    date: ymd(7), start: '14:00:00', end: '14:30:00',
    type: 'group_meeting', status: 'private',
    maxBookings: 999, groupId: groupId1,
  });
  const gSlot1c = await insertSlot(profId, {
    title: 'COMP 307 Project Review',
    date: ymd(8), start: '11:00:00', end: '11:30:00',
    type: 'group_meeting', status: 'private',
    maxBookings: 999, groupId: groupId1,
  });

  // demostudent voted for two options
  await insertBooking(gSlot1a, studentId);
  await insertBooking(gSlot1c, studentId);
  // Other students voted
  await insertBooking(gSlot1a, s2Id);
  await insertBooking(gSlot1b, s2Id);
  await insertBooking(gSlot1b, s3Id);
  await insertBooking(gSlot1c, s3Id);
  await insertBooking(gSlot1c, s4Id);

  console.log(`  Group ${groupId1} "COMP 307 Project Review": 3 time options, votes in`);

  // Group meeting 2: already confirmed
  const [g2] = await pool.query(
    `INSERT INTO slot_groups (owner_id, name, description) VALUES (?, ?, ?)`,
    [profId, 'COMP 307 Final Exam Q&A', 'Group Q&A session before the final exam. Time confirmed.']
  );
  const groupId2 = g2.insertId;

  const gSlot2a = await insertSlot(profId, {
    title: 'COMP 307 Final Exam Q&A',
    date: ymd(9), start: '10:00:00', end: '11:00:00',
    type: 'group_meeting', status: 'active',   // confirmed winner
    maxBookings: 999, groupId: groupId2,
  });
  const gSlot2b = await insertSlot(profId, {
    title: 'COMP 307 Final Exam Q&A',
    date: ymd(10), start: '15:00:00', end: '16:00:00',
    type: 'group_meeting', status: 'private',
    maxBookings: 999, groupId: groupId2,
  });

  await insertBooking(gSlot2a, studentId);
  await insertBooking(gSlot2a, s2Id);
  await insertBooking(gSlot2a, s3Id);
  await insertBooking(gSlot2b, s4Id);

  console.log(`  Group ${groupId2} "COMP 307 Final Exam Q&A": confirmed on ${ymd(9)} 10:00`);

  // ── 9. Invite link for demoprof ──────────────────────────────────────────
  const inviteToken = token();
  await pool.query(
    `INSERT INTO owner_invites (owner_id, token, label) VALUES (?, ?, ?)`,
    [profId, inviteToken, 'COMP 307 general invite']
  );
  console.log(`\n  Invite token for demoprof: ${inviteToken}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('Demo seed complete!\n');
  console.log('  PROFESSOR LOGIN');
  console.log('    Email   : demoprof@mcgill.ca');
  console.log('    Password: 123456');
  console.log('    Shows   : 5 active slots, 1 draft, 2 group meetings,');
  console.log('              2 pending meeting requests\n');
  console.log('  STUDENT LOGIN');
  console.log('    Email   : demostudent@mail.mcgill.ca');
  console.log('    Password: 123456');
  console.log('    Shows   : 2 upcoming appointments, 1 past appointment,');
  console.log('              4 available slots to browse, 1 group meeting to vote on,');
  console.log('              1 pending / 1 accepted / 1 declined request\n');
  console.log('  ALL other accounts also use password: 123456');
  console.log('═'.repeat(60));
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
