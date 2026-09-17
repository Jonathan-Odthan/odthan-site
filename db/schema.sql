-- ODTHAN — schema PostgreSQL
-- Applique ce fichier une seule fois sur ta base (Vercel Postgres / Neon / Supabase...):
--   psql "$DATABASE_URL" -f db/schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Réglages du site (numéro WhatsApp, textes modifiables) ----------
CREATE TABLE IF NOT EXISTS site_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO site_settings (key, value) VALUES
  ('whatsapp_number', '+50955561461')
ON CONFLICT (key) DO NOTHING;

-- ---------- Comptes admin ----------
CREATE TABLE IF NOT EXISTS admin_users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','editor')),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Messages du formulaire de contact ----------
CREATE TABLE IF NOT EXISTS leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  whatsapp    TEXT,
  email       TEXT NOT NULL,
  city        TEXT,
  department  TEXT,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','closed')),
  source_ip   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Formulaire "Kòmanse biznis mwen" ----------
CREATE TABLE IF NOT EXISTS business_starts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL,
  whatsapp       TEXT,
  email          TEXT NOT NULL,
  city           TEXT,
  department     TEXT,
  business_name  TEXT,
  industry       TEXT,
  description    TEXT NOT NULL,
  budget         TEXT,
  needs          TEXT,
  website_yn     BOOLEAN DEFAULT false,
  shop_yn        BOOLEAN DEFAULT false,
  facebook_yn    BOOLEAN DEFAULT false,
  instagram_yn   BOOLEAN DEFAULT false,
  seo_yn         BOOLEAN DEFAULT false,
  extra          TEXT,
  status         TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','closed')),
  source_ip      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Réservations ----------
CREATE TABLE IF NOT EXISTS bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service        TEXT NOT NULL,
  consult_type   TEXT NOT NULL CHECK (consult_type IN ('online','person')),
  slot_date      DATE NOT NULL,
  slot_time      TIME NOT NULL,
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL,
  whatsapp       TEXT,
  email          TEXT NOT NULL,
  city           TEXT,
  department     TEXT,
  message        TEXT,
  status         TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed')),
  source_ip      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Empêche deux réservations actives sur le même créneau
-- (fuseau horaire géré côté application: America/Port-au-Prince)
CREATE UNIQUE INDEX IF NOT EXISTS bookings_unique_active_slot
  ON bookings (slot_date, slot_time)
  WHERE status = 'confirmed';

-- ---------- Rate limiting (persistant, car les fonctions serverless sont sans état) ----------
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key   TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count        INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket_key, window_start)
);

-- ---------- Journal d'audit ----------
CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  actor       TEXT,
  action      TEXT NOT NULL,
  detail      JSONB,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_starts_created ON business_starts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);
