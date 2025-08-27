-- Adiciona colunas de atendimento (analista que assume proposta)
-- Safe migration: só cria se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='propostas' AND column_name='atendido_por'
    ) THEN
        ALTER TABLE public.propostas ADD COLUMN atendido_por uuid REFERENCES usuarios(id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='propostas' AND column_name='atendido_em'
    ) THEN
        ALTER TABLE public.propostas ADD COLUMN atendido_em timestamptz;
    END IF;
END $$;

-- Índice para consultas por atendido_por (ex: listar propostas assumidas por analista)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_propostas_atendido_por'
    ) THEN
        CREATE INDEX idx_propostas_atendido_por ON public.propostas (atendido_por);
    END IF;
END $$;
