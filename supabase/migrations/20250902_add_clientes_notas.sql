-- Tabela de notas/anotações por cliente consultor
CREATE TABLE IF NOT EXISTS public.clientes_notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes_consultor(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nota TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_notas_cliente ON public.clientes_notas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_clientes_notas_autor ON public.clientes_notas(autor_id);

ALTER TABLE public.clientes_notas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
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
END $$;
