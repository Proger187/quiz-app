export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id       INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  options       TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation   TEXT DEFAULT '',
  order_index   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id      INTEGER NOT NULL REFERENCES tests(id),
  settings     TEXT NOT NULL,
  questions    TEXT DEFAULT '[]',
  answers      TEXT DEFAULT '[]',
  score        REAL,
  started_at   TEXT NOT NULL,
  completed_at TEXT
);

PRAGMA foreign_keys = ON;
`
