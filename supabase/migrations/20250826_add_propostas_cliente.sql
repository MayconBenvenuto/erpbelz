-- Adiciona campos de cliente à tabela propostas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='propostas' AND column_name='cliente_nome'
    ) THEN
        ALTER TABLE public.propostas ADD COLUMN cliente_nome text;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='propostas' AND column_name='cliente_email'
    ) THEN
        ALTER TABLE public.propostas ADD COLUMN cliente_email text;
    END IF;
END $$;

-- Índice opcional para busca por cliente_email
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_propostas_cliente_email'
    ) THEN
        CREATE INDEX idx_propostas_cliente_email ON public.propostas (cliente_email);
    END IF;
END $$;
