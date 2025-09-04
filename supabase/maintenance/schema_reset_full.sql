-- CRM BELZ - FULL SCHEMA RESET SCRIPT
-- PERIGO: Destrutivo. Use somente em ambientes de homologação ou produção vazia.
-- Pré-requisitos: Snapshot / backup realizado antes da execução.
-- Execução recomendada: rodar inteiro em bloco único na console SQL do Supabase.

BEGIN;

-- 1. Drop dependent objects (views, triggers, functions) safely
DROP VIEW IF EXISTS vw_usuarios_online CASCADE;

-- 2. Drop tables in dependency order (children first) if exist
DROP TABLE IF EXISTS propostas_auditoria CASCADE;
DROP TABLE IF EXISTS propostas_notas CASCADE;
DROP TABLE IF EXISTS propostas_tags CASCADE;
DROP TABLE IF EXISTS solicitacoes CASCADE;
DROP TABLE IF EXISTS metas CASCADE;
DROP TABLE IF EXISTS sessoes CASCADE;
DROP TABLE IF EXISTS propostas CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- 3. Extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 4. Core tables
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  -- Inclui consultor já na criação
  tipo_usuario TEXT NOT NULL CHECK (tipo_usuario IN (
    'gestor',
    'gerente',
    'analista_implantacao',
    'analista_movimentacao',
    'consultor',
    'analista_cliente'
  )),
  ultimo_refresh TIMESTAMPTZ,
  status_presenca TEXT CHECK (status_presenca IN ('online','ausente')),
  atualizado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  ultimo_refresh TIMESTAMPTZ,
  expirado_em TIMESTAMPTZ
);

CREATE TABLE metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
  quantidade_implantacoes INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_implantacoes >= 0),
  UNIQUE (usuario_id, mes, ano)
);

CREATE TABLE propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(16), -- será padronizado para PRP0001 via sequence/trigger
  cnpj VARCHAR(18) NOT NULL,
  consultor TEXT NOT NULL,
  consultor_email TEXT NOT NULL,
  operadora TEXT NOT NULL,
  quantidade_vidas INT NOT NULL CHECK (quantidade_vidas > 0),
  valor NUMERIC(12,2) NOT NULL CHECK (valor >= 0),
  previsao_implantacao DATE,
  status TEXT NOT NULL,
  criado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  arquivado BOOLEAN DEFAULT FALSE,
  atendido_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  cliente_razao_social TEXT,
  cliente_nome_fantasia TEXT,
  cliente_cidade TEXT,
  cliente_estado TEXT,
  cliente_segmento TEXT,
  cliente_quantidade_funcionarios INT,
  cliente_faturamento_anual NUMERIC(14,2),
  observacoes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE propostas_auditoria (
  id BIGSERIAL PRIMARY KEY,
  proposta_id UUID REFERENCES propostas(id) ON DELETE CASCADE,
  campo TEXT NOT NULL,
  valor_antigo TEXT,
  valor_novo TEXT,
  alterado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  alterado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE propostas_notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID REFERENCES propostas(id) ON DELETE CASCADE,
  autor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  nota TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE propostas_tags (
  proposta_id UUID REFERENCES propostas(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  aplicado_em TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (proposta_id, tag)
);

-- Sequence & trigger para codigo de propostas (PRP0001)
CREATE SEQUENCE IF NOT EXISTS propostas_codigo_seq START 1;

CREATE OR REPLACE FUNCTION set_proposta_codigo() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'PRP' || LPAD(nextval('propostas_codigo_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_propostas_set_codigo ON propostas;
CREATE TRIGGER trg_propostas_set_codigo
BEFORE INSERT ON propostas
FOR EACH ROW EXECUTE FUNCTION set_proposta_codigo();

-- Ajuste de sequência para dados existentes
DO $$
DECLARE max_num BIGINT; BEGIN
  SELECT COALESCE(MAX(CAST(substring(codigo from 4) AS bigint)),0) INTO max_num FROM propostas WHERE codigo ~ '^PRP[0-9]+$';
  PERFORM setval('propostas_codigo_seq', GREATEST(max_num+1,1), false);
END$$;

ALTER TABLE propostas ADD CONSTRAINT propostas_codigo_format_check CHECK (codigo ~ '^PRP[0-9]{4,}$');
CREATE UNIQUE INDEX IF NOT EXISTS idx_propostas_codigo_unique ON propostas(codigo);

-- solicitacoes (schema completo com SLA, historico e dados auxiliares)
CREATE TABLE solicitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT, -- será preenchido via sequence + trigger/default
  tipo TEXT NOT NULL,
  subtipo TEXT,
  razao_social TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  apolice_da_belz BOOLEAN NOT NULL DEFAULT FALSE,
  acesso_empresa TEXT DEFAULT '',
  operadora TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  arquivos JSONB NOT NULL DEFAULT '[]'::jsonb,
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','em_andamento','concluida','cancelada')),
  sla_previsto DATE,
  historico JSONB NOT NULL DEFAULT '[]'::jsonb,
  prioridade TEXT CHECK (prioridade IN ('baixa','media','alta')),
  atendido_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  atendido_por_nome TEXT,
  criado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_criado_em ON solicitacoes(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_criado_por ON solicitacoes(criado_por);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_atendido_por ON solicitacoes(atendido_por);

-- 5. Sequences para códigos (se necessário)
CREATE SEQUENCE IF NOT EXISTS solicitacoes_codigo_seq START 1;

-- 6. Functions & triggers
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_propostas_updated_at ON propostas;
CREATE TRIGGER trg_propostas_updated_at
BEFORE UPDATE ON propostas
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- Atualiza metas ao implantar proposta
CREATE OR REPLACE FUNCTION fn_atualizar_meta_implantacoes()
RETURNS TRIGGER AS $$
DECLARE
  mes_atual INT;
  ano_atual INT;
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF OLD.status <> 'implantado' AND NEW.status = 'implantado' THEN
      mes_atual := EXTRACT(MONTH FROM NOW());
      ano_atual := EXTRACT(YEAR FROM NOW());
      INSERT INTO metas (usuario_id, mes, ano, quantidade_implantacoes)
        VALUES (COALESCE(NEW.atendido_por, NEW.criado_por), mes_atual, ano_atual, 1)
      ON CONFLICT (usuario_id, mes, ano)
        DO UPDATE SET quantidade_implantacoes = metas.quantidade_implantacoes + 1;
    ELSIF OLD.status = 'implantado' AND NEW.status <> 'implantado' THEN
      mes_atual := EXTRACT(MONTH FROM NOW());
      ano_atual := EXTRACT(YEAR FROM NOW());
      UPDATE metas
        SET quantidade_implantacoes = GREATEST(0, quantidade_implantacoes - 1)
        WHERE usuario_id = COALESCE(NEW.atendido_por, NEW.criado_por)
          AND mes = mes_atual AND ano = ano_atual;
    END IF;
  END IF;
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizar_meta ON propostas;
CREATE TRIGGER trg_atualizar_meta
AFTER UPDATE ON propostas
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_meta_implantacoes();

-- Código sequencial solicitacoes (prefixo MVM) + constraints
CREATE OR REPLACE FUNCTION set_solicitacao_codigo() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'MVM' || LPAD(nextval('solicitacoes_codigo_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_solicitacoes_set_codigo ON solicitacoes;
CREATE TRIGGER trg_solicitacoes_set_codigo
BEFORE INSERT ON solicitacoes
FOR EACH ROW EXECUTE FUNCTION set_solicitacao_codigo();

-- Ajusta sequência para evitar colisões (executa sempre de forma segura)
DO $$
DECLARE max_num BIGINT; BEGIN
  SELECT COALESCE(MAX(CAST(substring(codigo from 4) AS bigint)),0) INTO max_num FROM solicitacoes WHERE codigo ~ '^MVM[0-9]+$';
  PERFORM setval('solicitacoes_codigo_seq', GREATEST(max_num+1,1), false);
END$$;

ALTER TABLE solicitacoes ALTER COLUMN codigo SET NOT NULL;
ALTER TABLE solicitacoes ADD CONSTRAINT solicitacoes_codigo_format_check CHECK (codigo ~ '^MVM[0-9]{4,}$');
ALTER TABLE solicitacoes ADD CONSTRAINT solicitacoes_codigo_key UNIQUE (codigo);

-- 7. Views
CREATE OR REPLACE VIEW vw_usuarios_online AS
SELECT u.id, u.nome, u.email, u.tipo_usuario, u.status_presenca, u.ultimo_refresh
FROM usuarios u
WHERE u.status_presenca = 'online';

-- 8. Indexes e performance
CREATE INDEX IF NOT EXISTS idx_propostas_status ON propostas(status);
CREATE INDEX IF NOT EXISTS idx_propostas_operadora ON propostas(operadora);
CREATE INDEX IF NOT EXISTS idx_propostas_criado_por_status ON propostas(criado_por, status);
CREATE INDEX IF NOT EXISTS idx_propostas_atendido_por_status ON propostas(atendido_por, status);
CREATE INDEX IF NOT EXISTS idx_propostas_codigo ON propostas(codigo);
CREATE INDEX IF NOT EXISTS idx_propostas_implantado_partial ON propostas(status) WHERE status = 'implantado';
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_codigo ON solicitacoes(codigo);

-- 9. Constraints adicionais ou futuros (placeholder)
-- Ex: ALTER TABLE propostas ADD CONSTRAINT chk_status_valido CHECK (...);

COMMIT;

-- 10. Seeds opcionais (execute separadamente se desejar dados iniciais)
-- BEGIN;
-- INSERT INTO usuarios (nome,email,senha,tipo_usuario) VALUES
--   ('Gestor', 'gestor@belz.com', '<HASH_BCRYPT>', 'gestor'),
--   ('Analista', 'analista@belz.com', '<HASH_BCRYPT>', 'analista');
-- COMMIT;
