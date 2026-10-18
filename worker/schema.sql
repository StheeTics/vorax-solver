-- The live-data collector's tables. Apply with:
--   npx wrangler d1 execute vorax-live --remote --file schema.sql

-- One row per board a Solver read and shared. `body` is the validated snapshot as JSON; boards of one
-- game share its run id. `client` is a salted daily hash, never an address.
CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL UNIQUE,
  received TEXT NOT NULL,
  client TEXT NOT NULL,
  body TEXT NOT NULL
);

-- Boards stored per client per day, for the daily limit.
CREATE TABLE IF NOT EXISTS quota (
  key TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  n INTEGER NOT NULL
);
