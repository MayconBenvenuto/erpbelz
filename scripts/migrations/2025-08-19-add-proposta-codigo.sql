-- Migration: Add sequential proposal code (PRP0000) to propostas
-- Safe to re-run (IF NOT EXISTS guards where possible)

-- 1) Create sequence for proposal codes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S' AND c.relname = 'prp_codigo_seq'
  ) THEN
    CREATE SEQUENCE prp_codigo_seq START WITH 1 INCREMENT BY 1;
  END IF;
END$$;

-- 2) Add column codigo (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'propostas' AND column_name = 'codigo'
  ) THEN
    ALTER TABLE propostas ADD COLUMN codigo VARCHAR(32);
  END IF;
END$$;

-- 3) Set default for new rows
ALTER TABLE propostas
  ALTER COLUMN codigo SET DEFAULT ('PRP' || lpad(nextval('prp_codigo_seq')::text, 4, '0'));

-- 4) Backfill existing rows
UPDATE propostas
SET codigo = 'PRP' || lpad(nextval('prp_codigo_seq')::text, 4, '0')
WHERE codigo IS NULL;

-- 5) Add constraint and unique index
ALTER TABLE propostas
  ALTER COLUMN codigo SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'propostas_codigo_format_check'
  ) THEN
    ALTER TABLE propostas
      ADD CONSTRAINT propostas_codigo_format_check CHECK (codigo ~ '^PRP[0-9]{4,}$');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'propostas_codigo_key'
  ) THEN
    ALTER TABLE propostas ADD CONSTRAINT propostas_codigo_key UNIQUE (codigo);
  END IF;
END$$;

-- 6) Helpful index for ordering by creation with code
CREATE INDEX IF NOT EXISTS idx_propostas_codigo ON propostas(codigo);
