-- Backfill consultor_email e criação de índice
-- Contexto: garantir que propostas antigas tenham consultor_email preenchido
-- e otimizar buscas por consultor_email para analistas.

BEGIN;

-- 1) Backfill consultor_email com base no usuário criador (criado_por)
UPDATE public.propostas p
SET consultor_email = u.email
FROM public.usuarios u
WHERE p.criado_por = u.id
  AND (p.consultor_email IS NULL OR p.consultor_email = '');

-- 2) Normalização: salvar e comparar e-mails em minúsculas para consistência
UPDATE public.propostas
SET consultor_email = LOWER(consultor_email)
WHERE consultor_email IS NOT NULL
  AND consultor_email <> LOWER(consultor_email);

-- 3) Índice para acelerar filtro por consultor_email
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'idx_propostas_consultor_email'
  ) THEN
    CREATE INDEX idx_propostas_consultor_email 
      ON public.propostas (consultor_email);
  END IF;
END $$;

COMMIT;
