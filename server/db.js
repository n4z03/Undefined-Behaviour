// Sophia Casalme, 261149930
// code added by Nazifa Ahmed (261112966)
// timeout fix added by Bonita Baladi, 261097353

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'app.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('SQLite open error:', err.message);
  }
});

db.run('PRAGMA foreign_keys = ON');
db.run('PRAGMA busy_timeout = 5000');

let lockHeld = false;
const lockWaiters = [];

// Try to acquire the lock. If it's held, wait up to 10 seconds.
// If still not released after 10s, reject so the request fails
// gracefully instead of hanging forever.
function acquire() {
  if (!lockHeld) {
    lockHeld = true;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      // Remove this waiter from the queue so it doesn't resolve later
      const index = lockWaiters.indexOf(resolve);
      if (index !== -1) lockWaiters.splice(index, 1);
      reject(new Error('DB lock timeout: could not acquire lock within 10 seconds. A previous request may have been interrupted. Please try again.'));
    }, 10000);

    lockWaiters.push(() => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function releaseLock() {
  if (lockWaiters.length > 0) {
    const next = lockWaiters.shift();
    next();
  } else {
    lockHeld = false;
  }
}

function runQuery(dbHandle, sql, params = []) {
  const trimmed = sql.trim().toUpperCase();
  const isSelect = trimmed.startsWith('SELECT') || trimmed.startsWith('WITH');

  return new Promise((resolve, reject) => {
    if (isSelect) {
      dbHandle.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve([rows]);
      });
    } else {
      dbHandle.run(sql, params, function (err) {
        if (err) reject(err);
        else {
          resolve([
            {
              insertId: this.lastID,
              affectedRows: this.changes,
            },
          ]);
        }
      });
    }
  });
}

const pool = {
  async query(sql, params) {
    await acquire();
    try {
      return await runQuery(db, sql, params || []);
    } finally {
      releaseLock();
    }
  },

  async getConnection() {
    await acquire();
    let released = false;
    return {
      async query(sql, params) {
        return runQuery(db, sql, params || []);
      },
      async beginTransaction() {
        return runQuery(db, 'BEGIN IMMEDIATE', []);
      },
      async commit() {
        return runQuery(db, 'COMMIT', []);
      },
      async rollback() {
        return runQuery(db, 'ROLLBACK', []);
      },
      release() {
        if (!released) {
          released = true;
          releaseLock();
        }
      },
    };
  },
};

module.exports = pool;
