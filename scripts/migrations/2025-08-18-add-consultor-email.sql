-- Migration: Add consultor_email to propostas
-- Run this in Supabase SQL Editor

ALTER TABLE propostas
ADD COLUMN IF NOT EXISTS consultor_email TEXT NOT NULL DEFAULT '';

-- Optional: backfill empty emails here if needed, then drop default
-- UPDATE propostas SET consultor_email = 'placeholder@empresa.com' WHERE consultor_email = '';

ALTER TABLE propostas
ALTER COLUMN consultor_email DROP DEFAULT;

-- Basic format check via constraint (simple regex)
ALTER TABLE propostas
ADD CONSTRAINT propostas_consultor_email_check CHECK (consultor_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$');

COMMENT ON COLUMN propostas.consultor_email IS 'Email do consultor responsável pela proposta';
