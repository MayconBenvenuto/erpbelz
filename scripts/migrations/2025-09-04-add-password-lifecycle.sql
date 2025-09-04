-- Migration: Add password lifecycle columns to usuarios
DO $$
BEGIN
  -- Add must_change_password if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='usuarios' AND column_name='must_change_password'
  ) THEN
    ALTER TABLE public.usuarios ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT true;
  END IF;

  -- Add senha_alterada_em if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='usuarios' AND column_name='senha_alterada_em'
  ) THEN
    ALTER TABLE public.usuarios ADD COLUMN senha_alterada_em TIMESTAMPTZ;
  END IF;
END$$;

COMMENT ON COLUMN public.usuarios.must_change_password IS 'Se true, usuário precisa definir nova senha no próximo login';
COMMENT ON COLUMN public.usuarios.senha_alterada_em IS 'Timestamp da última mudança de senha definitiva pelo próprio usuário';
