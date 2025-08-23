-- Recria constraint de status da tabela solicitacoes para suportar workflow novo
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'solicitacoes'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
      AND att.attname = 'status'
    LIMIT 1;

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.solicitacoes DROP CONSTRAINT %I', constraint_name);
    END IF;

    ALTER TABLE public.solicitacoes
      ADD CONSTRAINT solicitacoes_status_check
      CHECK (status IN (
        'aberta',
        'em validação',
        'em execução',
        'concluída',
        'cancelada'
      ));
END$$;

COMMENT ON CONSTRAINT solicitacoes_status_check ON public.solicitacoes IS 'Workflow: aberta, em validação, em execução, concluída, cancelada';
