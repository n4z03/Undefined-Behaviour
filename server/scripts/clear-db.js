/*
 * Nazifa Ahmed (261112966)
 * Wipes all application data from app.db so the demo starts fresh.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../db');

async function main() {
  console.log('Clearing database...\n');

  const tables = [
    'bookings',
    'meeting_requests',
    'owner_invites',
    'booking_slots',
    'slot_groups',
    'users',
  ];

  for (const table of tables) {
    const [result] = await pool.query(`DELETE FROM ${table}`);
    console.log(`  ${table}: ${result.affectedRows} row(s) deleted`);
  }

  // Reset all autoincrement counters so IDs start from 1 again
  await pool.query(`DELETE FROM sqlite_sequence`);
  console.log('\nAutoincrement counters reset.');
  console.log('\nDatabase cleared. Run the seed script next.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Clear failed:', err);
  process.exit(1);
});
