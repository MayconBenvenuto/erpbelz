-- Migration: Update proposal status constraint with new status names
-- Date: 2025-09-01
-- Description: Updates status constraint to use new names requested by Matheus

BEGIN;

-- Drop the existing check constraint
ALTER TABLE propostas DROP CONSTRAINT IF EXISTS propostas_status_check;

-- Add new check constraint with updated status names
ALTER TABLE propostas 
  ADD CONSTRAINT propostas_status_check 
  CHECK (status IN (
    'recepcionado',
    'análise', 
    'pendência',
    'pleito seguradora',
    'boleto liberado',
    'implantado',
    'proposta declinada'
  ));

-- Update existing data to use new status names
UPDATE propostas SET status = 'recepcionado' WHERE status = 'em análise';
UPDATE propostas SET status = 'análise' WHERE status = 'implantando';
UPDATE propostas SET status = 'pendência' WHERE status = 'pendencias seguradora';
UPDATE propostas SET status = 'pendência' WHERE status = 'pendente cliente';
UPDATE propostas SET status = 'proposta declinada' WHERE status = 'negado';

COMMIT;

-- ROLLBACK commands (if needed):
-- BEGIN;
-- ALTER TABLE propostas DROP CONSTRAINT IF EXISTS propostas_status_check;
-- UPDATE propostas SET status = 'em análise' WHERE status = 'recepcionado';
-- UPDATE propostas SET status = 'implantando' WHERE status = 'análise';
-- UPDATE propostas SET status = 'pendencias seguradora' WHERE status = 'pendência';
-- UPDATE propostas SET status = 'negado' WHERE status = 'proposta declinada';
-- ALTER TABLE propostas ADD CONSTRAINT propostas_status_check CHECK (status IN ('em análise','pendencias seguradora','boleto liberado','implantando','pendente cliente','pleito seguradora','negado','implantado'));
-- COMMIT;
