-- The live-data collector's tables. Apply with:
--   npx wrangler d1 execute vorax-live --remote --file schema.sql

-- One row per board a Solver read and shared, up to Oct 23 (since then: batches). `body` is the validated
-- snapshot as JSON; boards of one game share its run id. `client` is a salted daily hash, never an address.
CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL UNIQUE,
  received TEXT NOT NULL,
  client TEXT NOT NULL,
  body TEXT NOT NULL
);
-- No index for the dashboard's per-day counts: an index costs a row write per board, and the free plan allows
-- 100,000 writes a day (creating one on Oct 22 used half of that day's and stopped the uploads).

-- One row per upload since Oct 23: `body` is a JSON array of its boards (up to 10), so an upload costs one row
-- write instead of two per board. No uid index: an upload sent twice is sorted out by the pull, by each board's uid.
-- No AUTOINCREMENT either, which would write sqlite_sequence on every insert.
CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY,
  received TEXT NOT NULL,
  body TEXT NOT NULL
);

-- Each daily player code once per day it sent boards, for the dashboard's players per day: a write the first
-- time a player uploads that day, and none after.
CREATE TABLE IF NOT EXISTS players (
  day TEXT NOT NULL,
  client TEXT NOT NULL,
  PRIMARY KEY (day, client)
) WITHOUT ROWID;

-- The dashboard's numbers the 2-hourly workflow worked out from the boards (scripts/live/summary.ts):
-- one row, replaced each time. Players per day are added on each request instead (players).
CREATE TABLE IF NOT EXISTS summary (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  updated TEXT NOT NULL,
  body TEXT NOT NULL
);

-- The daily limit per client (table quota, a row rewritten on every upload) was dropped on Oct 23 for the rate
-- limit (wrangler.jsonc).

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

-- Training data (src/training.ts): one row per card wanted for the reader, its GitHub issue and how many
-- screenshots it has. key: phase:name, or phase:?letters of an unrecognised card's title.
CREATE TABLE IF NOT EXISTS training (
  key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  issue INTEGER,
  shots INTEGER NOT NULL DEFAULT 0,
  created TEXT NOT NULL
);
