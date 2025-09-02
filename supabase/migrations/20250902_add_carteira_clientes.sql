-- Tabela de carteira de clientes dos consultores
CREATE TABLE IF NOT EXISTS public.clientes_consultor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultor_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  cnpj TEXT NOT NULL,
  razao_social TEXT,
  responsavel TEXT,
  cargo_responsavel TEXT,
  email_responsavel TEXT,
  whatsapp_responsavel TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices básicos
CREATE INDEX IF NOT EXISTS idx_clientes_consultor_consultor ON public.clientes_consultor(consultor_id);
CREATE INDEX IF NOT EXISTS idx_clientes_consultor_cnpj ON public.clientes_consultor(cnpj);

-- Índice único composto (evita duplicar mesmo CNPJ para mesmo consultor)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_clientes_consultor_consultor_cnpj ON public.clientes_consultor(consultor_id, cnpj);

-- Constraint de formato de CNPJ (somente 14 dígitos) adicionada se não existir (NOT VALID para permitir limpeza posterior)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clientes_consultor_cnpj_format_chk'
  ) THEN
    ALTER TABLE public.clientes_consultor
      ADD CONSTRAINT clientes_consultor_cnpj_format_chk CHECK (cnpj ~ '^[0-9]{14}$') NOT VALID;
  END IF;
END $$;

-- RLS
ALTER TABLE public.clientes_consultor ENABLE ROW LEVEL SECURITY;

-- Policies criadas condicionalmente (não existe IF NOT EXISTS direto para policy)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clientes_consultor' AND policyname='clientes_consultor_select_self'
  ) THEN
    EXECUTE 'CREATE POLICY clientes_consultor_select_self ON public.clientes_consultor FOR SELECT USING (consultor_id = auth.uid())';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clientes_consultor' AND policyname='clientes_consultor_insert_self'
  ) THEN
    EXECUTE 'CREATE POLICY clientes_consultor_insert_self ON public.clientes_consultor FOR INSERT WITH CHECK (consultor_id = auth.uid())';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clientes_consultor' AND policyname='clientes_consultor_update_self'
  ) THEN
    EXECUTE 'CREATE POLICY clientes_consultor_update_self ON public.clientes_consultor FOR UPDATE USING (consultor_id = auth.uid()) WITH CHECK (consultor_id = auth.uid())';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clientes_consultor' AND policyname='clientes_consultor_delete_self'
  ) THEN
    EXECUTE 'CREATE POLICY clientes_consultor_delete_self ON public.clientes_consultor FOR DELETE USING (consultor_id = auth.uid())';
  END IF;
END $$;

-- Nota: gestor opera via service role (bypass RLS); políticas protegem apenas chamadas com chave pública.
