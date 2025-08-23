-- Create solicitacoes table with SLA and status timeline support (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='solicitacoes'
  ) THEN
    CREATE TABLE public.solicitacoes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tipo text NOT NULL,
      subtipo text NULL,
      razao_social text NOT NULL,
      cnpj text NOT NULL,
      apolice_da_belz boolean NOT NULL DEFAULT false,
      acesso_empresa text DEFAULT '',
      operadora text DEFAULT '',
      observacoes text DEFAULT '',
      arquivos jsonb NOT NULL DEFAULT '[]'::jsonb,
      dados jsonb NOT NULL DEFAULT '{}'::jsonb,
      status text NOT NULL DEFAULT 'aberta',
      sla_previsto date NULL,
      historico jsonb NOT NULL DEFAULT '[]'::jsonb, -- array de eventos {status, em: timestamptz, usuario_id}
      criado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
      criado_em timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_solicitacoes_criado_em ON public.solicitacoes(criado_em DESC);
    CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON public.solicitacoes(status);
    CREATE INDEX IF NOT EXISTS idx_solicitacoes_criado_por ON public.solicitacoes(criado_por);
  END IF;

  -- Add missing columns if table already existed (idempotent upgrades)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='solicitacoes') THEN
    -- status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='solicitacoes' AND column_name='status') THEN
      ALTER TABLE public.solicitacoes ADD COLUMN status text NOT NULL DEFAULT 'aberta';
    END IF;
    -- sla_previsto
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='solicitacoes' AND column_name='sla_previsto') THEN
      ALTER TABLE public.solicitacoes ADD COLUMN sla_previsto date NULL;
    END IF;
    -- historico
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='solicitacoes' AND column_name='historico') THEN
      ALTER TABLE public.solicitacoes ADD COLUMN historico jsonb NOT NULL DEFAULT '[]'::jsonb;
    END IF;
  END IF;
END$$;

COMMENT ON TABLE public.solicitacoes IS 'Solicitações de movimentação (inclusão, exclusão, cancelamento, outros) com SLA e histórico de status.';
COMMENT ON COLUMN public.solicitacoes.status IS 'Status atual da solicitação (workflow interno)';
COMMENT ON COLUMN public.solicitacoes.sla_previsto IS 'Data alvo para conclusão (SLA)';
COMMENT ON COLUMN public.solicitacoes.historico IS 'Eventos de status: array de objetos {status, em, usuario_id}';
