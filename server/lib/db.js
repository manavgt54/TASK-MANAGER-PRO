const Database = require('better-sqlite3');
const path = require('path');
let dbInstance;

function getDb() {
  if (!dbInstance) {
    const dbPath = path.join(__dirname, '..', 'data.sqlite');
    dbInstance = new Database(dbPath);
    dbInstance.pragma('journal_mode = WAL');
  }
  return dbInstance;
}

module.exports = { getDb };


