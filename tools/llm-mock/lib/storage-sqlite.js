let db = null;
let available = false;
try {
  const Database = require('better-sqlite3');
  available = true;
  module.exports.init = function(dbPath) {
    if (db) return;
    db = new Database(dbPath);
    db.exec(`CREATE TABLE IF NOT EXISTS usage_events (id TEXT PRIMARY KEY, data TEXT);`);
    db.exec(`CREATE TABLE IF NOT EXISTS billing_records (id TEXT PRIMARY KEY, data TEXT);`);
  };
  module.exports.persistUsageEvent = function(u) {
    if (!db) return;
    const stmt = db.prepare('INSERT OR REPLACE INTO usage_events (id, data) VALUES (?, ?)');
    stmt.run(u.id, JSON.stringify(u));
  };
  module.exports.persistBillingRecord = function(r) {
    if (!db) return;
    const stmt = db.prepare('INSERT OR REPLACE INTO billing_records (id, data) VALUES (?, ?)');
    stmt.run(r.id, JSON.stringify(r));
  };
  module.exports.close = function() { if (db) db.close(); db = null; };
} catch (e) {
  // optional dependency not installed or failed to load
  module.exports.init = function() {};
  module.exports.persistUsageEvent = function() {};
  module.exports.persistBillingRecord = function() {};
  module.exports.close = function() {};
}
module.exports.available = available;
