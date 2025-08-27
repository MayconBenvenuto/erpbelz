-- Introspection helper RPCs
-- Cria funções para listar tabelas, colunas e rotinas no schema public
-- Segurança: SECURITY DEFINER para permitir acesso a information_schema via PostgREST

CREATE OR REPLACE FUNCTION list_public_tables()
RETURNS TABLE(table_name text)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema='public'
    AND table_type='BASE TABLE'
    AND table_name NOT LIKE 'pg_%'
  ORDER BY table_name;
$$;

CREATE OR REPLACE FUNCTION list_public_table_columns()
RETURNS TABLE(table_name text, column_name text, data_type text, is_nullable text, column_default text)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT table_name, column_name, data_type, is_nullable, COALESCE(column_default::text,'')
  FROM information_schema.columns
  WHERE table_schema='public'
  ORDER BY table_name, ordinal_position;
$$;

CREATE OR REPLACE FUNCTION list_public_routines()
RETURNS TABLE(routine_name text, data_type text)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT routine_name, data_type
  FROM information_schema.routines
  WHERE routine_schema='public'
  ORDER BY routine_name;
$$;

-- Views públicas
CREATE OR REPLACE FUNCTION list_public_views()
RETURNS TABLE(view_name text)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT table_name AS view_name
  FROM information_schema.views
  WHERE table_schema='public'
    AND table_name NOT LIKE 'pg_%'
  ORDER BY table_name;
$$;

-- (Opcional) permissões se necessário para roles padrão supabase
-- GRANT EXECUTE ON FUNCTION list_public_tables() TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION list_public_table_columns() TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION list_public_routines() TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION list_public_views() TO anon, authenticated;
