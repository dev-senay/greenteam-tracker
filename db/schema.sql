DROP TABLE IF EXISTS waterings, plants, users, groups CASCADE;

CREATE TABLE groups (
  id               SERIAL PRIMARY KEY,
  name_en          TEXT NOT NULL UNIQUE,
  name_am          TEXT NOT NULL,
  location         TEXT,
  telegram_chat_id TEXT
);

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  full_name     TEXT NOT NULL,
  email         TEXT UNIQUE,          -- students have none
  password_hash TEXT,                 -- students have none (for now)
  role          TEXT NOT NULL CHECK (role IN ('admin', 'leader', 'student')),
  group_id      INTEGER REFERENCES groups(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE plants (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  species    TEXT,
  owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id   INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  planted_on DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE waterings (
  id         SERIAL PRIMARY KEY,
  plant_id   INTEGER NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  watered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  health     TEXT NOT NULL CHECK (health IN ('healthy', 'needs_attention', 'critical')),
  note       TEXT,
  photo_url  TEXT
);

CREATE INDEX idx_plants_group      ON plants(group_id);
CREATE INDEX idx_plants_owner      ON plants(owner_id);
CREATE INDEX idx_waterings_plant   ON waterings(plant_id, watered_at DESC);