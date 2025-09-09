-- Tabela de arquivos anexados às propostas
-- Armazena metadados; arquivo físico vai para bucket implantacao_upload
-- Segurança: acessível somente via RLS (implementar políticas após validação)

CREATE TABLE IF NOT EXISTS propostas_arquivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID NOT NULL REFERENCES propostas(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL DEFAULT 'implantacao_upload',
  path TEXT NOT NULL,
  nome_original TEXT,
  mime TEXT,
  tamanho_bytes BIGINT,
  uploaded_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Index para buscas por proposta
CREATE INDEX IF NOT EXISTS idx_propostas_arquivos_proposta_id ON propostas_arquivos(proposta_id);

-- (Opcional) index por uploaded_by
CREATE INDEX IF NOT EXISTS idx_propostas_arquivos_uploaded_by ON propostas_arquivos(uploaded_by);
