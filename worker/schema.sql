-- The live-data collector's tables. Apply with:
--   npx wrangler d1 execute vorax-live --remote --file schema.sql

-- One row per upload since Oct 23: `body` is a JSON array of its boards (up to 10), so an upload costs one row
-- write instead of two per board. No uid index: an upload sent twice is sorted out by the pull, by each board's uid.
-- No AUTOINCREMENT either, which would write sqlite_sequence on every insert. Since Oct 24 a board is stored without
-- its cards and tanks (src/validate.ts lean), and the nightly jobs empty the table once they've pulled it
-- (/v1/export/rotate: a new table, as DELETE costs a row write per row). Boards were stored one per row before Oct 23
-- (table snapshots, dropped Oct 23).
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
