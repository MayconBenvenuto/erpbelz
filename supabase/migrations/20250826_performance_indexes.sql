-- Índices de performance adicionados em 2025-08-26
-- Objetivo: acelerar filtros frequentes em /api/proposals (status, atendido_por, criado_em, codigo)

-- Index para ordenar por codigo asc (já usado como coluna de ordenação primária)
CREATE INDEX IF NOT EXISTS idx_propostas_codigo ON propostas (codigo);

-- Index composto para consultas que verificam status + atendido_por
CREATE INDEX IF NOT EXISTS idx_propostas_status_atendido ON propostas (status, atendido_por);

-- Index parcial para propostas livres aguardando analista (status em análise e sem atendido_por)
CREATE INDEX IF NOT EXISTS idx_propostas_livres_parcial ON propostas (criado_em) WHERE status = 'em análise' AND atendido_por IS NULL;

-- Index para filtrar por criado_por (metas e dashboards) e status
CREATE INDEX IF NOT EXISTS idx_propostas_criadopor_status ON propostas (criado_por, status);

-- Index sobre operadora para heatmap / top operadoras
CREATE INDEX IF NOT EXISTS idx_propostas_operadora ON propostas (operadora);

-- Estatísticas rápidas: função opcional para retornar contagem agregada leve (pode ser usada futuramente)
-- CREATE OR REPLACE FUNCTION public.propostas_stats_light()
-- RETURNS TABLE(total bigint, livres bigint, implantadas bigint)
-- LANGUAGE sql STABLE AS $$
--   SELECT
--     COUNT(*) AS total,
--     COUNT(*) FILTER (WHERE status = 'em análise' AND atendido_por IS NULL) AS livres,
--     COUNT(*) FILTER (WHERE status = 'implantado') AS implantadas
--   FROM propostas;
-- $$;

-- Comentário: índices criados com IF NOT EXISTS para idempotência em ambientes de CI.