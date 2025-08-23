-- Sequência e código sequencial para solicitacoes (MVM0000) + campos de atendimento (versão corrigida)
-- Primeiro: função (idempotente) usada pelo trigger.
CREATE OR REPLACE FUNCTION public.set_solicitacao_codigo() RETURNS trigger AS $F$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'MVM' || lpad(nextval('public.solicitacoes_codigo_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$F$ LANGUAGE plpgsql;

DO $$
DECLARE
  has_seq int;
  max_num bigint;
  has_format_constraint boolean;
  has_unique_constraint boolean;
  has_trigger boolean;
BEGIN
  -- Sequência (cria se não existir)
  SELECT COUNT(*) INTO has_seq FROM pg_class WHERE relkind='S' AND relname='solicitacoes_codigo_seq';
  IF has_seq = 0 THEN
    EXECUTE 'CREATE SEQUENCE public.solicitacoes_codigo_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1';
  END IF;

  -- Adiciona coluna codigo se ausente
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='solicitacoes' AND column_name='codigo'
  ) THEN
    ALTER TABLE public.solicitacoes ADD COLUMN codigo text;
  END IF;

  -- Define default (idempotente)
  ALTER TABLE public.solicitacoes ALTER COLUMN codigo SET DEFAULT ('MVM' || lpad(nextval('public.solicitacoes_codigo_seq')::text, 4, '0'));

  -- Ajusta sequência para não colidir e preenche códigos faltantes
  SELECT COALESCE(MAX(CAST(substring(codigo from 4) AS bigint)), 0) INTO max_num
  FROM public.solicitacoes
  WHERE codigo ~ '^MVM[0-9]+$';

  PERFORM setval('public.solicitacoes_codigo_seq', GREATEST(max_num + 1, 1), false);

  UPDATE public.solicitacoes
  SET codigo = 'MVM' || lpad(nextval('public.solicitacoes_codigo_seq')::text, 4, '0')
  WHERE (codigo IS NULL OR codigo = '');

  -- NOT NULL
  ALTER TABLE public.solicitacoes ALTER COLUMN codigo SET NOT NULL;

  -- Constraint de formato
  SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='solicitacoes_codigo_format_check') INTO has_format_constraint;
  IF NOT has_format_constraint THEN
    EXECUTE 'ALTER TABLE public.solicitacoes ADD CONSTRAINT solicitacoes_codigo_format_check CHECK (codigo ~ ''^MVM[0-9]{4,}$'')';
  END IF;

  -- Unique constraint
  SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='solicitacoes_codigo_key') INTO has_unique_constraint;
  IF NOT has_unique_constraint THEN
    EXECUTE 'ALTER TABLE public.solicitacoes ADD CONSTRAINT solicitacoes_codigo_key UNIQUE (codigo)';
  END IF;

  -- Índice (idempotente)
  CREATE INDEX IF NOT EXISTS idx_solicitacoes_codigo ON public.solicitacoes(codigo);

  -- Trigger (cria se não existir)
  SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_solicitacoes_set_codigo') INTO has_trigger;
  IF NOT has_trigger THEN
    EXECUTE 'CREATE TRIGGER trg_solicitacoes_set_codigo BEFORE INSERT ON public.solicitacoes FOR EACH ROW EXECUTE FUNCTION public.set_solicitacao_codigo()';
  END IF;

  -- Campos de atendimento
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='solicitacoes' AND column_name='atendido_por') THEN
    ALTER TABLE public.solicitacoes ADD COLUMN atendido_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='solicitacoes' AND column_name='atendido_por_nome') THEN
    ALTER TABLE public.solicitacoes ADD COLUMN atendido_por_nome text;
  END IF;
  CREATE INDEX IF NOT EXISTS idx_solicitacoes_atendido_por ON public.solicitacoes(atendido_por);
END $$;

COMMENT ON COLUMN public.solicitacoes.codigo IS 'Código sequencial MVM0000';
COMMENT ON COLUMN public.solicitacoes.atendido_por IS 'Analista responsável';
COMMENT ON COLUMN public.solicitacoes.atendido_por_nome IS 'Snapshot do nome do analista responsável';
