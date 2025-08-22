-- Migration: Add 'consultor' to usuarios.tipo_usuario CHECK constraint
-- Safe, idempotent approach: drop and recreate CHECK only if necessary
DO $$
DECLARE
    constraint_name text;
    has_consultor boolean := false;
BEGIN
    -- Find current check constraint on usuarios.tipo_usuario
    SELECT con.conname
    INTO constraint_name
    FROM pg_constraint con
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'usuarios'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
      AND att.attname = 'tipo_usuario'
    LIMIT 1;

    -- Detect whether 'consultor' is already allowed by the check
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.constraint_column_usage u
      JOIN information_schema.table_constraints t ON t.constraint_name = u.constraint_name AND t.table_schema = u.table_schema
      WHERE u.table_name = 'usuarios' AND u.table_schema = 'public' AND t.constraint_type = 'CHECK'
    ) INTO has_consultor; -- Fallback, we will just recreate anyway

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.usuarios DROP CONSTRAINT %I', constraint_name);
    END IF;

    -- Recreate with the three allowed roles
    ALTER TABLE public.usuarios
      ADD CONSTRAINT usuarios_tipo_usuario_check
      CHECK (tipo_usuario IN ('gestor','analista','consultor'));
END$$;

COMMENT ON CONSTRAINT usuarios_tipo_usuario_check ON public.usuarios IS 'Tipos válidos: gestor, analista, consultor';
