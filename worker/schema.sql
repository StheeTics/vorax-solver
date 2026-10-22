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
-- the dashboard's boards and players per day, counted without reading the boards
CREATE INDEX IF NOT EXISTS snapshots_day_client ON snapshots (received, client);

-- The dashboard's numbers the repo's hourly workflow worked out from the boards (scripts/live/summary.ts):
-- one row, replaced each time. Counts by the daily player code are added on each request instead.
CREATE TABLE IF NOT EXISTS summary (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  updated TEXT NOT NULL,
  body TEXT NOT NULL
);

-- Boards stored per client per day, for the daily limit.
CREATE TABLE IF NOT EXISTS quota (
  key TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  n INTEGER NOT NULL
);

-- One row per instrument panel icon a player named in the Solver ("Which instrument did you pick?"):
-- `body` is {uid, name, pattern}, the pattern 576 grey levels of the icon, never a screenshot.
CREATE TABLE IF NOT EXISTS icons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL UNIQUE,
  received TEXT NOT NULL,
  client TEXT NOT NULL,
  body TEXT NOT NULL
);

-- One row per card the Solver couldn't name ("not recognised"), so it can be added for everyone: `body` is
-- {uid, phase, text, picture}, the text its printed title as read, the picture a small JPEG of the card alone.
CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL UNIQUE,
  received TEXT NOT NULL,
  client TEXT NOT NULL,
  body TEXT NOT NULL
);
