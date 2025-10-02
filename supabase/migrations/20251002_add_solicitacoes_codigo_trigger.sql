-- Migração: adicionar trigger para gerar código automático em solicitacoes
-- Data: 2025-10-02
-- Objetivo:
-- 1. Criar sequence para numeração de códigos MVM
-- 2. Criar função que gera código no formato MVM0001, MVM0002, etc.
-- 3. Criar trigger BEFORE INSERT que preenche o campo codigo automaticamente
-- 4. Ajustar sequence para evitar colisões com códigos existentes
-- 5. Garantir que o campo codigo seja NOT NULL após migração

BEGIN;

-- 1. Criar sequence se não existir
CREATE SEQUENCE IF NOT EXISTS solicitacoes_codigo_seq START 1;

-- 2. Criar função que gera o código automático
CREATE OR REPLACE FUNCTION set_solicitacao_codigo() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'MVM' || LPAD(nextval('solicitacoes_codigo_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar trigger BEFORE INSERT
DROP TRIGGER IF EXISTS trg_solicitacoes_set_codigo ON solicitacoes;
CREATE TRIGGER trg_solicitacoes_set_codigo
BEFORE INSERT ON solicitacoes
FOR EACH ROW EXECUTE FUNCTION set_solicitacao_codigo();

-- 4. Ajustar sequence baseado em códigos existentes
DO $$
DECLARE 
  max_num BIGINT; 
BEGIN
  -- Encontrar o maior número existente nos códigos MVM
  SELECT COALESCE(MAX(CAST(substring(codigo from 4) AS bigint)), 0) 
  INTO max_num 
  FROM solicitacoes 
  WHERE codigo ~ '^MVM[0-9]+$';
  
  -- Ajustar sequence para começar do próximo número
  PERFORM setval('solicitacoes_codigo_seq', GREATEST(max_num + 1, 1), false);
END$$;

-- 5. Preencher códigos NULL em registros existentes (se houver)
DO $$
DECLARE
  r RECORD;
  novo_codigo TEXT;
BEGIN
  FOR r IN SELECT id FROM solicitacoes WHERE codigo IS NULL OR codigo = '' ORDER BY criado_em
  LOOP
    novo_codigo := 'MVM' || LPAD(nextval('solicitacoes_codigo_seq')::TEXT, 4, '0');
    UPDATE solicitacoes SET codigo = novo_codigo WHERE id = r.id;
  END LOOP;
END$$;

-- 6. Tornar campo codigo NOT NULL (após preencher os vazios)
ALTER TABLE solicitacoes ALTER COLUMN codigo SET NOT NULL;

COMMIT;

-- Fim da migração
