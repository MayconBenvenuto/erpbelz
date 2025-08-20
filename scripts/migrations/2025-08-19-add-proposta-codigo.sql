<<<<<<< HEAD
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
=======

ALTER TABLE IF EXISTS public.propostas
ADD COLUMN IF NOT EXISTS codigo text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S' AND n.nspname = 'public' AND c.relname = 'propostas_codigo_seq'
  ) THEN
    CREATE SEQUENCE public.propostas_codigo_seq
      INCREMENT 1
      MINVALUE 0
      START 0
      OWNED BY NONE;
  END IF;
END$$;

DO $$
DECLARE
  max_num bigint;
BEGIN
  SELECT COALESCE(MAX(CAST(RIGHT(codigo, 4) AS bigint)), -1) INTO max_num
  FROM public.propostas
  WHERE codigo ~ '^PRP[0-9]{4}$';

  PERFORM setval('public.propostas_codigo_seq', GREATEST(max_num + 1, 0));
END$$;

CREATE OR REPLACE FUNCTION public.set_proposta_codigo()
RETURNS TRIGGER AS $$
DECLARE
  next_num bigint;
  new_code text;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    next_num := nextval('public.propostas_codigo_seq');
    new_code := 'PRP' || lpad(next_num::text, 4, '0');

    -- Ensure uniqueness even under race conditions
    WHILE EXISTS (SELECT 1 FROM public.propostas WHERE codigo = new_code) LOOP
      next_num := nextval('public.propostas_codigo_seq');
      new_code := 'PRP' || lpad(next_num::text, 4, '0');
    END LOOP;

    NEW.codigo := new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_propostas_set_codigo'
  ) THEN
    CREATE TRIGGER trg_propostas_set_codigo
    BEFORE INSERT ON public.propostas
    FOR EACH ROW
    EXECUTE FUNCTION public.set_proposta_codigo();
  END IF;
END$$;

UPDATE public.propostas
SET codigo = 'PRP' || lpad(nextval('public.propostas_codigo_seq')::text, 4, '0')
WHERE codigo IS NULL OR codigo = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'propostas_codigo_key' AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX propostas_codigo_key ON public.propostas(codigo);
  END IF;
  -- Add NOT NULL if column has no nulls
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'propostas' AND column_name = 'codigo' AND is_nullable = 'YES'
  ) THEN
    BEGIN
      ALTER TABLE public.propostas
      ALTER COLUMN codigo SET NOT NULL;
    EXCEPTION WHEN others THEN
      -- ignore if fails (e.g., due to existing nulls)
      NULL;
    END;
  END IF;
END$$;
>>>>>>> main
