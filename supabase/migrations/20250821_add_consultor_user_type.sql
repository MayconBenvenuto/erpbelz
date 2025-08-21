-- Add 'consultor' to usuarios.tipo_usuario CHECK constraint (idempotent)
-- Safe to run multiple times; drops existing CHECK on tipo_usuario and recreates with the 3 roles
DO $$
DECLARE
    constraint_name text;
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

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.usuarios DROP CONSTRAINT %I', constraint_name);
    END IF;

    -- Recreate with the three allowed roles
    ALTER TABLE public.usuarios
      ADD CONSTRAINT usuarios_tipo_usuario_check
      CHECK (tipo_usuario IN ('gestor','analista','consultor'));
END$$;

COMMENT ON CONSTRAINT usuarios_tipo_usuario_check ON public.usuarios IS 'Tipos válidos: gestor, analista, consultor';
