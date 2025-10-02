-- Migração para corrigir estrutura da tabela metas
-- Adiciona campos valor_meta e valor_alcancado que são usados pela API

-- Se a tabela metas usar o modelo antigo (mes/ano/quantidade_implantacoes),
-- precisamos migrar para o modelo atual (valor_meta/valor_alcancado)

-- Primeiro, verificar se as colunas já existem antes de adicionar
DO $$ 
BEGIN
    -- Adicionar valor_meta se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'metas' AND column_name = 'valor_meta'
    ) THEN
        ALTER TABLE metas ADD COLUMN valor_meta NUMERIC DEFAULT 100000;
    END IF;

    -- Adicionar valor_alcancado se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'metas' AND column_name = 'valor_alcancado'
    ) THEN
        ALTER TABLE metas ADD COLUMN valor_alcancado NUMERIC DEFAULT 0;
    END IF;

    -- Adicionar atualizado_em se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'metas' AND column_name = 'atualizado_em'
    ) THEN
        ALTER TABLE metas ADD COLUMN atualizado_em TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Remover campos antigos se existirem (mes, ano, quantidade_implantacoes)
-- CUIDADO: Isso pode perder dados históricos. Comente se quiser preservar.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'metas' AND column_name = 'mes'
    ) THEN
        ALTER TABLE metas DROP COLUMN IF EXISTS mes;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'metas' AND column_name = 'ano'
    ) THEN
        ALTER TABLE metas DROP COLUMN IF EXISTS ano;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'metas' AND column_name = 'quantidade_implantacoes'
    ) THEN
        ALTER TABLE metas DROP COLUMN IF EXISTS quantidade_implantacoes;
    END IF;
END $$;

-- Criar índice para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_metas_usuario_id ON metas(usuario_id);

-- Adicionar constraint para garantir que usuario_id seja único (uma meta por usuário)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'metas_usuario_id_key'
    ) THEN
        ALTER TABLE metas ADD CONSTRAINT metas_usuario_id_key UNIQUE (usuario_id);
    END IF;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN metas.valor_meta IS 'Meta/target de valor a ser alcançado pelo usuário';
COMMENT ON COLUMN metas.valor_alcancado IS 'Valor alcançado calculado a partir das propostas implantadas';
COMMENT ON COLUMN metas.atualizado_em IS 'Timestamp da última atualização da meta';
