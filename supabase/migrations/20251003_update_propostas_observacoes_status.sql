-- Migration: Adicionar campo observacoes e atualizar status em propostas
-- Data: 2025-10-03
-- Descrição: 
--   1. Adiciona coluna observacoes (text nullable) para comentários internos
--   2. Atualiza constraint de status para incluir 'pendente assinatura ds/proposta'
--   3. Deprecia campo previsao_implantacao (mantém por compatibilidade, será removido futuramente)

-- Adicionar coluna observacoes
ALTER TABLE propostas 
ADD COLUMN IF NOT EXISTS observacoes TEXT;

COMMENT ON COLUMN propostas.observacoes IS 'Observações internas sobre a proposta (max 2000 caracteres recomendado no frontend)';

-- Adicionar coluna cliente_telefone
ALTER TABLE propostas
ADD COLUMN IF NOT EXISTS cliente_telefone VARCHAR(20);

COMMENT ON COLUMN propostas.cliente_telefone IS 'Telefone do cliente formatado no padrão brasileiro (11) 98765-4321';

-- Atualizar constraint de status para incluir novo valor
-- Primeiro, remover constraint existente se houver
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'propostas_status_check' 
    AND conrelid = 'propostas'::regclass
  ) THEN
    ALTER TABLE propostas DROP CONSTRAINT propostas_status_check;
  END IF;
END $$;

-- Adicionar nova constraint com status atualizado
ALTER TABLE propostas 
ADD CONSTRAINT propostas_status_check 
CHECK (status IN (
  'recepcionado',
  'pendente assinatura ds/proposta',
  'análise',
  'pendência',
  'pleito seguradora',
  'boleto liberado',
  'implantado',
  'proposta declinada'
));

-- Comentário sobre depreciação de previsao_implantacao
-- Mantém a coluna por compatibilidade mas não será mais usada ativamente
COMMENT ON COLUMN propostas.previsao_implantacao IS 'DEPRECATED: Campo mantido por compatibilidade. Não usar em novos desenvolvimentos.';

-- Criar índice para observacoes (para buscas futuras)
CREATE INDEX IF NOT EXISTS idx_propostas_observacoes_not_null 
ON propostas(observacoes) 
WHERE observacoes IS NOT NULL;

-- Atualizar auditoria caso necessário
COMMENT ON TABLE propostas IS 'Propostas comerciais. Atualizado em 2025-10-03: adicionado campo observacoes, cliente_telefone e novo status pendente assinatura ds/proposta';
