-- ─────────────────────────────────────────────────────────────────────────────
-- Origen Campus Aguascalientes — Schema PostgreSQL (Supabase)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS asistencia (
  id           SERIAL PRIMARY KEY,
  fecha        DATE    NOT NULL,
  adultos      INT     DEFAULT 0,
  voluntarios  INT     DEFAULT 0,
  ninos        INT     DEFAULT 0,
  bebes        INT     DEFAULT 0,
  nuevos       INT     DEFAULT 0,
  total        INT     DEFAULT 0,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ofrendas (
  id               SERIAL PRIMARY KEY,
  fecha            DATE    NOT NULL,
  efectivo         DECIMAL DEFAULT 0,
  terminal         DECIMAL DEFAULT 0,
  total_ofrenda    DECIMAL DEFAULT 0,
  ofrendas         INT     DEFAULT 0,
  participacion    DECIMAL DEFAULT 0,
  ofrenda_especial DECIMAL DEFAULT 0,
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gastos (
  id         SERIAL PRIMARY KEY,
  fecha      DATE    NOT NULL,
  concepto   TEXT    NOT NULL,
  categoria  TEXT    NOT NULL,
  monto      DECIMAL NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eventos (
  id         SERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL,
  fecha      DATE NOT NULL,
  tipo       TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
