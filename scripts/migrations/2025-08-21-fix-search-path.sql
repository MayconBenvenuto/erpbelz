-- Fix search_path for functions flagged by Supabase linter (Function Search Path Mutable)
-- Safe default: SET search_path to public, pg_temp

-- atualizar_meta
CREATE OR REPLACE FUNCTION public.atualizar_meta()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'implantado' AND (OLD.status IS NULL OR OLD.status != 'implantado') THEN
    INSERT INTO metas ("usuario_id", "valor_meta", "valor_alcancado", "atualizado_em")
    VALUES (NEW."criado_por", 150000, NEW.valor, NOW())
    ON CONFLICT ("usuario_id") DO UPDATE SET
      "valor_alcancado" = metas."valor_alcancado" + NEW.valor,
      "atualizado_em" = NOW();
  ELSIF OLD.status = 'implantado' AND NEW.status != 'implantado' THEN
    UPDATE metas 
    SET "valor_alcancado" = GREATEST(0, "valor_alcancado" - OLD.valor),
        "atualizado_em" = NOW()
    WHERE "usuario_id" = OLD."criado_por";
  END IF;
  RETURN NEW;
END;
$$;

-- atualizar_meta_usuario
CREATE OR REPLACE FUNCTION public.atualizar_meta_usuario(p_usuario_id UUID, p_valor NUMERIC)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO metas ("usuario_id", "valor_meta", "valor_alcancado", "atualizado_em")
  VALUES (p_usuario_id, 150000, p_valor, NOW())
  ON CONFLICT ("usuario_id") DO UPDATE SET
    "valor_alcancado" = metas."valor_alcancado" + p_valor,
    "atualizado_em" = NOW();
END;
$$;

-- update_updated_at_column (generic trigger helper)
-- Important: do not change the function body (unknown in this repo). Only set the search_path if it exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column' AND p.pronargs = 0
  ) THEN
    EXECUTE 'ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp';
  END IF;
END $$;
