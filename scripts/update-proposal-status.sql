/*
Script para atualizar os status das propostas no Supabase
Execute este SQL no SQL Editor do Supabase Dashboard

⚠️ IMPORTANTE: Execute os comandos um por um para evitar problemas
*/

-- 1. Primeiro, vamos ver os status atuais
SELECT DISTINCT status, COUNT(*) 
FROM propostas 
GROUP BY status 
ORDER BY status;

-- 2. Remove a constraint antiga
ALTER TABLE propostas DROP CONSTRAINT IF EXISTS propostas_status_check;

-- 3. Atualiza os dados existentes para os novos nomes
UPDATE propostas SET status = 'recepcionado' WHERE status = 'em análise';
UPDATE propostas SET status = 'análise' WHERE status = 'implantando';
UPDATE propostas SET status = 'pendência' WHERE status = 'pendencias seguradora';
UPDATE propostas SET status = 'pendência' WHERE status = 'pendente cliente';
UPDATE propostas SET status = 'proposta declinada' WHERE status = 'negado';

-- 4. Adiciona a nova constraint com os status atualizados
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

-- 5. Verifica os status após a migração
SELECT DISTINCT status, COUNT(*) 
FROM propostas 
GROUP BY status 
ORDER BY status;

-- ✅ Migração concluída!
-- Os novos status estão prontos para uso.
