-- Add arquivado flag to propostas and audit table for changes
DO $$
BEGIN
  -- arquivado column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='propostas' AND column_name='arquivado'
  ) THEN
    ALTER TABLE public.propostas ADD COLUMN arquivado boolean NOT NULL DEFAULT false;
  END IF;

  -- audit table
  CREATE TABLE IF NOT EXISTS public.propostas_auditoria (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
    alterado_por uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
    changes jsonb NOT NULL,
    criado_em timestamptz NOT NULL DEFAULT now()
  );

  -- index for faster lookups
  CREATE INDEX IF NOT EXISTS idx_propostas_auditoria_proposta_id ON public.propostas_auditoria(proposta_id);
  CREATE INDEX IF NOT EXISTS idx_propostas_auditoria_criado_em ON public.propostas_auditoria(criado_em DESC);
END$$;
