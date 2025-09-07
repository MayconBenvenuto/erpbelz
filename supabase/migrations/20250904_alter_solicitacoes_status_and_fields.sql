-- Migração: alinhar tabela solicitacoes ao novo workflow e campos
-- Data: 2025-09-04
-- Objetivo:
-- 1. Garantir existência de colunas historico (jsonb) e sla_previsto (date)
-- 2. Ajustar constraint de status para novo conjunto ('aberta','em validação','em execução','concluída','cancelada')
-- 3. Migrar valores legados (em_andamento -> 'em execução', concluida -> 'concluída')
-- 4. Adicionar default apropriado e normalizar registros
-- 5. Recriar índice de status se necessário

BEGIN;

-- 1. Colunas
DO $$
DECLARE
  col_hist BOOLEAN := FALSE;
  col_sla BOOLEAN := FALSE;
BEGIN
  SELECT TRUE INTO col_hist FROM information_schema.columns WHERE table_name='solicitacoes' AND column_name='historico';
  IF NOT FOUND THEN col_hist := FALSE; END IF;
  IF NOT col_hist THEN
    ALTER TABLE solicitacoes ADD COLUMN historico JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;

  SELECT TRUE INTO col_sla FROM information_schema.columns WHERE table_name='solicitacoes' AND column_name='sla_previsto';
  IF NOT FOUND THEN col_sla := FALSE; END IF;
  IF NOT col_sla THEN
    ALTER TABLE solicitacoes ADD COLUMN sla_previsto DATE;
  END IF;
END $$;

-- 2. Remover quaisquer CHECK constraints existentes relacionados a status
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname='solicitacoes'
      AND c.contype='c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  ) LOOP
    EXECUTE format('ALTER TABLE solicitacoes DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- Forma mais direta: recriar usando expressão (drop if exists via nome conhecido)
ALTER TABLE solicitacoes DROP CONSTRAINT IF EXISTS solicitacoes_status_check;
ALTER TABLE solicitacoes ADD CONSTRAINT solicitacoes_status_check CHECK (status IN ('aberta','em validação','em execução','concluída','cancelada'));

-- 3. Migrar valores legados
UPDATE solicitacoes SET status='em execução' WHERE status='em_andamento';
UPDATE solicitacoes SET status='concluída'   WHERE status='concluida';

-- 4. Normalizar (corrigir capitalização inadvertida)
UPDATE solicitacoes SET status='aberta' WHERE LOWER(status)='aberta';
UPDATE solicitacoes SET status='em validação' WHERE LOWER(status)='em validação';
UPDATE solicitacoes SET status='em execução' WHERE LOWER(status)='em execução';
UPDATE solicitacoes SET status='concluída' WHERE LOWER(status)='concluída';
UPDATE solicitacoes SET status='cancelada' WHERE LOWER(status)='cancelada';

-- 5. Índice de status (recriar se ausente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname='idx_solicitacoes_status_new') THEN
    CREATE INDEX idx_solicitacoes_status_new ON solicitacoes(status);
  END IF;
END $$;

COMMIT;

-- Fim da migração
