-- Adiciona colunas url e categoria à tabela propostas_arquivos
-- Data: 2025-10-02
-- Correção para permitir salvar URL pública e categoria dos arquivos

-- Adicionar coluna url se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='propostas_arquivos' 
      AND column_name='url'
  ) THEN
    ALTER TABLE public.propostas_arquivos ADD COLUMN url TEXT;
    COMMENT ON COLUMN public.propostas_arquivos.url IS 'URL pública ou assinada para acesso ao arquivo';
  END IF;
END $$;

-- Adicionar coluna categoria se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='propostas_arquivos' 
      AND column_name='categoria'
  ) THEN
    ALTER TABLE public.propostas_arquivos ADD COLUMN categoria TEXT;
    COMMENT ON COLUMN public.propostas_arquivos.categoria IS 'Categoria do documento (e.g., proposta_comercial, contrato, etc)';
  END IF;
END $$;

-- Criar índice para busca por categoria (opcional, útil para filtros futuros)
CREATE INDEX IF NOT EXISTS idx_propostas_arquivos_categoria ON public.propostas_arquivos(categoria);

-- Nota: Execute o script de introspecção após aplicar para atualizar DOC_SUPABASE.md
