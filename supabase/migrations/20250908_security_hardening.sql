-- Security Hardening (2025-09-08)
-- Objetivo:
-- 1) Garantir RLS habilitado nas tabelas clientes_consultor e clientes_notas
-- 2) Ajustar view vw_usuarios_online para security_invoker=true e security_barrier=true
-- Obs.: Blocos idempotentes para rodar em qualquer ambiente sem erro.

BEGIN;

-- 1) RLS nas tabelas carteira de clientes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='clientes_consultor'
  ) THEN
    RAISE NOTICE 'Tabela public.clientes_consultor não existe neste ambiente — ignorando.';
  ELSE
    -- Habilita RLS
    EXECUTE 'ALTER TABLE public.clientes_consultor ENABLE ROW LEVEL SECURITY';

    -- Policies básicas (apenas se não existirem)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clientes_consultor' AND policyname='clientes_consultor_select_self'
    ) THEN
      EXECUTE 'CREATE POLICY clientes_consultor_select_self ON public.clientes_consultor FOR SELECT USING (consultor_id = auth.uid() OR auth.role() = ''service_role'')';
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
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='clientes_notas'
  ) THEN
    RAISE NOTICE 'Tabela public.clientes_notas não existe neste ambiente — ignorando.';
  ELSE
    -- Habilita RLS
    EXECUTE 'ALTER TABLE public.clientes_notas ENABLE ROW LEVEL SECURITY';

    -- Policies (seleção por vínculo ao cliente; insert pelo autor; delete pelo autor)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename='clientes_notas' AND policyname='clientes_notas_select'
    ) THEN
      EXECUTE 'CREATE POLICY clientes_notas_select ON public.clientes_notas FOR SELECT USING ( EXISTS (SELECT 1 FROM public.clientes_consultor c WHERE c.id = cliente_id AND (c.consultor_id = auth.uid() OR auth.role() = ''service_role'')) )';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename='clientes_notas' AND policyname='clientes_notas_insert'
    ) THEN
      EXECUTE 'CREATE POLICY clientes_notas_insert ON public.clientes_notas FOR INSERT WITH CHECK ( autor_id = auth.uid() AND EXISTS (SELECT 1 FROM public.clientes_consultor c WHERE c.id = cliente_id AND c.consultor_id = auth.uid()) )';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename='clientes_notas' AND policyname='clientes_notas_delete'
    ) THEN
      EXECUTE 'CREATE POLICY clientes_notas_delete ON public.clientes_notas FOR DELETE USING ( autor_id = auth.uid() )';
    END IF;
  END IF;
END$$;

-- 2) View: vw_usuarios_online (usar permissões do invocador + evitar data leaks)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='vw_usuarios_online'
  ) THEN
    -- security_invoker e security_barrier somente em versões suportadas
    BEGIN
      EXECUTE 'ALTER VIEW public.vw_usuarios_online SET (security_invoker = true)';
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'ALTER VIEW ... security_invoker não suportado nesta versão — ignorando.';
    END;
    BEGIN
      EXECUTE 'ALTER VIEW public.vw_usuarios_online SET (security_barrier = true)';
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'ALTER VIEW ... security_barrier não suportado nesta versão — ignorando.';
    END;
  ELSE
    RAISE NOTICE 'View public.vw_usuarios_online não existe neste ambiente — ignorando.';
  END IF;
END$$;

COMMIT;
