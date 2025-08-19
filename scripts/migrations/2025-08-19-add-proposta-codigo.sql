-- Migration: Add unique proposal code (codigo) with PRP0000 format
-- Idempotent: safe to run multiple times

-- 1) Add column if not exists
ALTER TABLE IF EXISTS public.propostas
ADD COLUMN IF NOT EXISTS codigo text;

-- 2) Create sequence for sequential codes if not exists
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

-- 3) Align sequence with current max numeric part in table
DO $$
DECLARE
  max_num bigint;
BEGIN
  SELECT COALESCE(MAX(CAST(RIGHT(codigo, 4) AS bigint)), -1) INTO max_num
  FROM public.propostas
  WHERE codigo ~ '^PRP[0-9]{4}$';

  PERFORM setval('public.propostas_codigo_seq', GREATEST(max_num + 1, 0));
END$$;

-- 4) Function to set codigo before insert
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

-- 5) Trigger
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

-- 6) Backfill null codigos
UPDATE public.propostas
SET codigo = 'PRP' || lpad(nextval('public.propostas_codigo_seq')::text, 4, '0')
WHERE codigo IS NULL OR codigo = '';

-- 7) Unique index and not null constraint (add if not exists)
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
