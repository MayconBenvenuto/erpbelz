-- Adiciona campo de observações do cliente e tabelas para notas internas e tags
DO $$
BEGIN
  BEGIN
    ALTER TABLE propostas ADD COLUMN IF NOT EXISTS observacoes_cliente TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL; END;

  -- Notas internas (analistas/gestores). Consultor não insere.
  CREATE TABLE IF NOT EXISTS propostas_notas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposta_id UUID NOT NULL REFERENCES propostas(id) ON DELETE CASCADE,
    autor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nota TEXT NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_propostas_notas_proposta ON propostas_notas(proposta_id);

  -- Tags simples (string livre sanitizada) por proposta
  CREATE TABLE IF NOT EXISTS propostas_tags (
    proposta_id UUID NOT NULL REFERENCES propostas(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (proposta_id, tag)
  );
  CREATE INDEX IF NOT EXISTS idx_propostas_tags_tag ON propostas_tags(tag);
END $$;
