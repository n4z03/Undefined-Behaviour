/*
 * Nazifa Ahmed (261112966)
 * Run from the server/ folder:
 * node scripts/init-db.js
 * Or w npm:
 * npm run init-db
 */

const fs   = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const sqlite3 = require('sqlite3').verbose();

const dbPath     = process.env.SQLITE_PATH || path.join(__dirname, '..', '..', 'data', 'app.db');
const schemaPath = path.join(__dirname, '..', '..', 'db', 'schema.sqlite.sql');

// Ensure the data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Created directory: ${dataDir}`);
}

console.log(`Database : ${dbPath}`);
console.log(`Schema   : ${schemaPath}\n`);

const schema = fs.readFileSync(schemaPath, 'utf8');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not open database:', err.message);
    process.exit(1);
  }
});

// exec runs the full SQL script (multiple statements separated by semicolons)
db.exec(schema, (err) => {
  if (err) {
    console.error('Schema apply failed:', err.message);
    db.close();
    process.exit(1);
  }
  console.log('Database initialised / schema up to date.');
  db.close(() => process.exit(0));
});
