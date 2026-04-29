/*
 * Nazifa Ahmed (261112966)
 * Note: This file uses AI to generate the demo data. 
 * Seeds the database with realistic demo data covering EVERY feature in
 * the app, so the demo can exercise the full flow end-to-end.
 *
 * Accounts:
 * demoprof@mcgill.ca           password: 123456  (owner)
 * demostudent@mail.mcgill.ca   password: 123456  (student)
 * 

 *
 * Run from the server/ folder:
 *   npm run init-db && npm run clear && npm run seed
 *   (or just:  npm run demo)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../db');

const PASSWORD = '123456';

function ymd(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function addWeeks(dateStr, weeks) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + weeks * 7);
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

async function insertSlot(ownerId, opts) {
  const {
    title, description, date, start, end, location,
    type, status, maxBookings, groupId,
    isRecurring, recurrenceWeeks, parentSlotId,
  } = opts;
  const [r] = await pool.query(
    `INSERT INTO booking_slots
       (owner_id, group_id, parent_slot_id, title, description, slot_date,
        start_time, end_time, location, slot_type, status, max_bookings,
        is_recurring, recurrence_weeks, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      ownerId,
      groupId || null,
      parentSlotId || null,
      title,
      description || null,
      date,
      start,
      end,
      location || 'Trottier Building, McGill',
      type || 'office_hours',
      status || 'active',
      maxBookings || 1,
      isRecurring ? 1 : 0,
      recurrenceWeeks || null,
    ]
  );
  return r.insertId;
}

async function insertBooking(slotId, userId, notes) {
  const [r] = await pool.query(
    `INSERT OR IGNORE INTO bookings (slot_id, user_id, notes, status)
     VALUES (?, ?, ?, 'confirmed')`,
    [slotId, userId, notes || null]
  );
  return r.insertId;
}

function requestSubject(date, start, end, subject) {
  return `[${date} ${start} - ${end}] ${subject}`.trim();
}

async function insertRequest(ownerId, userId, date, start, end, subject, message, status) {
  const fullSubject = requestSubject(date, start, end, subject);
  const [r] = await pool.query(
    `INSERT INTO meeting_requests (owner_id, user_id, subject, message, status)
     VALUES (?, ?, ?, ?, ?)`,
    [ownerId, userId, fullSubject, message, status || 'pending']
  );
  return r.insertId;
}

async function insertRecurringSlot(ownerId, opts) {
  const { title, description, date, start, end, location, weeks, status, maxBookings } = opts;
  const parentId = await insertSlot(ownerId, {
    title, description, date, start, end, location,
    type: 'office_hours',
    status: status || 'active',
    maxBookings: maxBookings || 1,
    isRecurring: true,
    recurrenceWeeks: weeks,
    parentSlotId: null,
  });
  const childIds = [];
  for (let w = 1; w <= weeks; w++) {
    const childId = await insertSlot(ownerId, {
      title, description,
      date: addWeeks(date, w),
      start, end, location,
      type: 'office_hours',
      status: status || 'active',
      maxBookings: maxBookings || 1,
      isRecurring: true,
      recurrenceWeeks: null,
      parentSlotId: parentId,
    });
    childIds.push(childId);
  }
  return { parentId, childIds };
}
async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);

  console.log('Seeding demo data...\n');

  const profId    = await insertUser('Joseph Vybihal', 'demoprof@mcgill.ca',         hash, 'owner');
  const studentId = await insertUser('Victor Z',       'demostudent@mail.mcgill.ca', hash, 'user');
  console.log(`Created main accounts:  demoprof (id=${profId})  demostudent (id=${studentId})`);
  const prof2Id = await insertUser('Prof. Sarah Okafor',  'sarah.okafor@mcgill.ca',  hash, 'owner');
  const prof3Id = await insertUser('Prof. Michael Tran',  'michael.tran@mcgill.ca',  hash, 'owner');
  const prof4Id = await insertUser('Prof. Leila Nassiri', 'leila.nassiri@mcgill.ca', hash, 'owner');
  console.log('Created supporting professors.');

  const s2Id = await insertUser('Priya Sharma',  'priya.sharma@mail.mcgill.ca',  hash, 'user');
  const s3Id = await insertUser('Omar Khalil',   'omar.khalil@mail.mcgill.ca',   hash, 'user');
  const s4Id = await insertUser('Sofia Leblanc', 'sofia.leblanc@mail.mcgill.ca', hash, 'user');
  console.log('Created supporting students.\n');

  console.log('--- One-time slots for demoprof ---');

  const slot1 = await insertSlot(profId, {
    title: 'COMP 307 - Office Hours',
    description: 'Weekly office hours for Web Development course.',
    date: ymd(2), start: '10:00:00', end: '10:30:00',
    location: 'McConnell Engineering, Room 320',
    status: 'active',
  });
  const slot2 = await insertSlot(profId, {
    title: 'COMP 307 - Office Hours',
    description: 'Weekly office hours for Web Development course.',
    date: ymd(4), start: '10:00:00', end: '10:30:00',
    location: 'McConnell Engineering, Room 320',
    status: 'active',
  });
  const slot3 = await insertSlot(profId, {
    title: 'COMP 307 - Project Help',
    description: 'Bring your project questions.',
    date: ymd(3), start: '14:00:00', end: '14:30:00',
    location: 'McConnell Engineering, Room 320',
    status: 'active',
  });

  const slot4 = await insertSlot(profId, {
    title: 'COMP 307 - Assignment Review',
    description: 'Assignment 3 review session (group, up to 3 students).',
    date: ymd(5), start: '15:00:00', end: '15:30:00',
    status: 'active', maxBookings: 3,
  });

  const slot5 = await insertSlot(profId, {
    title: 'COMP 307 - Exam Prep',
    description: 'Final exam preparation session (up to 5 students).',
    date: ymd(7), start: '09:00:00', end: '10:00:00',
    status: 'active', maxBookings: 5,
  });

  const slotDraft = await insertSlot(profId, {
    title: 'Research Mentoring (Draft)',
    description: 'Research mentoring session — not yet published.',
    date: ymd(10), start: '11:00:00', end: '12:00:00',
    status: 'private',
  });

  const slotPast = await insertSlot(profId, {
    title: 'COMP 307 - Office Hours',
    description: 'Last week office hours.',
    date: ymd(-5), start: '10:00:00', end: '10:30:00',
    status: 'active',
  });
  console.log(`  Created ${[slot1, slot2, slot3, slot4, slot5, slotDraft, slotPast].length} one-time slots ` +
              `(5 active, 1 draft, 1 past).`);

  console.log('\n--- Recurring slot for demoprof ---');
  const recurring = await insertRecurringSlot(profId, {
    title: 'COMP 307 - Tuesday Office Hours (Weekly)',
    description: 'Recurring Tuesday office hours, every week for 3 weeks.',
    date: ymd(2), start: '16:00:00', end: '16:30:00',
    location: 'McConnell Engineering, Room 320',
    weeks: 3,
    status: 'active',
  });
  console.log(`  Parent slot ${recurring.parentId}, ${recurring.childIds.length} child occurrences.`);

  console.log('\n--- Bookings ---');
  await insertBooking(slot1,    studentId, 'Need help with Assignment 3.');
  await insertBooking(slotPast, studentId, 'Reviewed midterm feedback.');
  await insertBooking(recurring.parentId, studentId, 'Recurring weekly meeting.');
  await insertBooking(slot3, s2Id, 'Questions about final project.');
  await insertBooking(slot4, s2Id);
  await insertBooking(slot4, s3Id, 'Assignment 3 clarification.');
  await insertBooking(slot5, s3Id);
  await insertBooking(slot5, s4Id);
  console.log('  demostudent has 3 bookings (1 upcoming, 1 past, 1 recurring).');
  console.log('  Supporting students fill out the multi-booking slots.');

  console.log('\n--- Supporting professors slots ---');

  const oSlot1 = await insertSlot(prof2Id, {
    title: 'COMP 202 - Q&A Session',
    date: ymd(1), start: '11:00:00', end: '11:30:00', status: 'active',
  });
  await insertSlot(prof2Id, {
    title: 'COMP 202 - Office Hours',
    date: ymd(3), start: '13:00:00', end: '14:00:00',
    status: 'active', maxBookings: 2,
  });
  await insertBooking(oSlot1, studentId);

  await insertSlot(prof3Id, {
    title: 'COMP 250 - Data Structures Help',
    date: ymd(2), start: '15:00:00', end: '15:30:00', status: 'active',
  });
  await insertSlot(prof3Id, {
    title: 'COMP 250 - Office Hours',
    date: ymd(6), start: '10:00:00', end: '11:00:00',
    status: 'active', maxBookings: 3,
  });

  await insertSlot(prof4Id, {
    title: 'MATH 223 - Linear Algebra Review',
    date: ymd(1), start: '14:00:00', end: '14:30:00', status: 'active',
  });
  await insertSlot(prof4Id, {
    title: 'MATH 223 - Exam Prep',
    date: ymd(8), start: '09:30:00', end: '10:30:00',
    status: 'active', maxBookings: 6,
  });
  console.log('  6 slots across 3 supporting profs (1 already booked by demostudent).');

  console.log('\n--- Meeting requests ---');
  await insertRequest(
    profId, studentId,
    ymd(4), '13:00:00', '13:30:00',
    'COMP 307 Assignment 3 help',
    "Hi Professor, I'm stuck on the database section of assignment 3. " +
      "Could we go over it together? I'm available most afternoons this week.",
    'pending'
  );
  await insertRequest(
    profId, s2Id,
    ymd(5), '11:00:00', '11:20:00',
    'Final project scope advice',
    'Hello, I would like to discuss my final project proposal before I start ' +
      'implementing. Could you spare 20 minutes this week?',
    'pending'
  );
  const acceptedSlotDate  = ymd(2);
  const acceptedSlotStart = '13:30:00';
  const acceptedSlotEnd   = '14:00:00';
  const acceptedSlotId = await insertSlot(prof2Id, {
    title: `Meeting with Victor Z`,
    description: requestSubject(acceptedSlotDate, acceptedSlotStart, acceptedSlotEnd,
      'COMP 202 midterm review'),
    date: acceptedSlotDate, start: acceptedSlotStart, end: acceptedSlotEnd,
    type: 'requested', status: 'active', maxBookings: 1,
  });
  await insertBooking(acceptedSlotId, studentId);
  const acceptedRequestId = await insertRequest(
    prof2Id, studentId,
    acceptedSlotDate, acceptedSlotStart, acceptedSlotEnd,
    'COMP 202 midterm review',
    'Could we go over my midterm? I would like to understand where I lost marks.',
    'accepted'
  );
  await pool.query(
    `UPDATE meeting_requests SET created_slot_id = ? WHERE id = ?`,
    [acceptedSlotId, acceptedRequestId]
  );

  await insertRequest(
    prof3Id, studentId,
    ymd(6), '16:00:00', '16:30:00',
    'Extra office hours before finals',
    'I am struggling with tree structures. Is there any chance of an extra ' +
      'session before the final?',
    'declined'
  );
  await insertRequest(
    profId, s3Id,
    ymd(6), '10:00:00', '10:30:00',
    'COMP 307 deployment question',
    'Could we briefly chat about my deployment setup? I keep getting a 502 from nginx.',
    'pending'
  );
  console.log('  3 pending (2 incoming for demoprof), 1 accepted, 1 declined.');
  console.log('  All requests use the [YYYY-MM-DD HH:MM - HH:MM] subject format,');
  console.log('  so demoprof can really click "Accept" on the pending ones.');

  console.log('\n--- Group meetings ---');
  const [g1] = await pool.query(
    `INSERT INTO slot_groups (owner_id, name, description) VALUES (?, ?, ?)`,
    [profId, 'COMP 307 Project Review',
     'Vote for the time that works best for your group presentation review.']
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
  await insertBooking(gSlot1a, studentId);
  await insertBooking(gSlot1c, studentId);
  await insertBooking(gSlot1a, s2Id);
  await insertBooking(gSlot1b, s2Id);
  await insertBooking(gSlot1b, s3Id);
  await insertBooking(gSlot1c, s3Id);
  await insertBooking(gSlot1c, s4Id);
  console.log(`  [voting open] Group ${groupId1} "COMP 307 Project Review": 3 options, votes in.`);

  const [g2] = await pool.query(
    `INSERT INTO slot_groups (owner_id, name, description) VALUES (?, ?, ?)`,
    [profId, 'COMP 307 Final Exam Q&A',
     'Group Q&A session before the final exam. Time confirmed.']
  );
  const groupId2 = g2.insertId;

  const gSlot2a = await insertSlot(profId, {
    title: 'COMP 307 Final Exam Q&A',
    date: ymd(9), start: '10:00:00', end: '11:00:00',
    type: 'group_meeting', status: 'active',
    maxBookings: 999, groupId: groupId2,
  });
  await insertSlot(profId, {
    title: 'COMP 307 Final Exam Q&A',
    date: ymd(10), start: '15:00:00', end: '16:00:00',
    type: 'group_meeting', status: 'private',
    maxBookings: 999, groupId: groupId2,
  });
  await insertBooking(gSlot2a, studentId);
  await insertBooking(gSlot2a, s2Id);
  await insertBooking(gSlot2a, s3Id);
  console.log(`  [confirmed]   Group ${groupId2} "COMP 307 Final Exam Q&A": ${ymd(9)} 10:00.`);

  const [g3] = await pool.query(
    `INSERT INTO slot_groups (owner_id, name, description) VALUES (?, ?, ?)`,
    [profId, 'COMP 307 Capstone Standups',
     'Weekly capstone standup. Confirmed and repeating for 3 weeks.']
  );
  const groupId3 = g3.insertId;
  const standupStart = '13:00:00';
  const standupEnd   = '13:30:00';
  const standupBaseDate = ymd(3);
  const gSlot3Parent = await insertSlot(profId, {
    title: 'COMP 307 Capstone Standups',
    date: standupBaseDate, start: standupStart, end: standupEnd,
    type: 'group_meeting', status: 'active',
    maxBookings: 999, groupId: groupId3,
    isRecurring: true, recurrenceWeeks: 2,
  });
  const standupVoters = [studentId, s2Id, s3Id];
  for (const uid of standupVoters) await insertBooking(gSlot3Parent, uid);
  for (let w = 1; w <= 2; w++) {
    const childId = await insertSlot(profId, {
      title: 'COMP 307 Capstone Standups',
      date: addWeeks(standupBaseDate, w), start: standupStart, end: standupEnd,
      type: 'group_meeting', status: 'active',
      maxBookings: 999, groupId: groupId3,
      isRecurring: true, parentSlotId: gSlot3Parent,
    });
    for (const uid of standupVoters) await insertBooking(childId, uid);
  }
  console.log(`  [recurring]   Group ${groupId3} "Capstone Standups": ${standupBaseDate} 13:00, ` +
              `repeating for 2 more weeks.`);

  console.log('\n--- Owner invites ---');
  const generalToken = token();
  await pool.query(
    `INSERT INTO owner_invites (owner_id, token, label) VALUES (?, ?, ?)`,
    [profId, generalToken, 'COMP 307 general invite']
  );
  console.log(`  General invite token: ${generalToken}`);

  const groupInviteToken = token();
  await pool.query(
    `INSERT INTO owner_invites (owner_id, group_id, token, label) VALUES (?, ?, ?, ?)`,
    [profId, groupId1, groupInviteToken, 'COMP 307 Project Review invite']
  );
  console.log(`  Group invite token  : ${groupInviteToken} (group ${groupId1})`);

  console.log('\n' + '═'.repeat(64));
  console.log('Demo seed complete!\n');
  console.log('  PROFESSOR LOGIN');
  console.log('    Email   : demoprof@mcgill.ca');
  console.log('    Password: 123456');
  console.log('    Has     : 5 active one-time slots, 1 draft, 1 past,');
  console.log('              1 recurring (parent + 3 child occurrences),');
  console.log('              3 incoming pending requests (acceptable!),');
  console.log('              3 group meetings (voting / confirmed / recurring),');
  console.log('              2 invite links (general + group-scoped)\n');

  console.log('  STUDENT LOGIN');
  console.log('    Email   : demostudent@mail.mcgill.ca');
  console.log('    Password: 123456');
  console.log('    Has     : multiple upcoming + past appointments,');
  console.log('              1 booked recurring slot,');
  console.log('              1 voting-open group meeting,');
  console.log('              1 confirmed group meeting,');
  console.log('              1 confirmed RECURRING group meeting,');
  console.log('              browse-slots populated with 3 other professors,');
  console.log('              1 pending / 1 accepted / 1 declined outgoing request\n');

  console.log('  ALL other accounts also use password: 123456');
  console.log('═'.repeat(64));
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
