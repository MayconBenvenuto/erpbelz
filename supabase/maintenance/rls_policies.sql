-- RLS ENABLEMENT SCRIPT
-- Objetivo: Ativar Row Level Security nas tabelas core. Sem policies => somente service_role (bypass) terá acesso.
-- IMPORTANTE: Como o app usa rotas backend com chave service role, nada deve quebrar.
-- Para permitir acesso direto via anon/outra role será necessário criar policies (exemplos comentados abaixo).

BEGIN;

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE propostas_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE propostas_notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE propostas_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes ENABLE ROW LEVEL SECURITY;

-- =============================
-- POLICIES EFETIVAS (gestor vê tudo, analista/consultor só seus registros)
-- Nota: Usa JWT custom (lib/security.js). Precisamos extrair claims via request.jwt.claims
-- Supabase injeta claims em current_setting('request.jwt.claims', true)::json
-- Nosso generateToken inclui: userId, email, tipo
-- A role do Postgres deve ser configurada para confiar no JWT. Este SQL assume que as rotas backend usam service_role (bypass) e somente acesso direto futuro usará essas regras.
-- Caso queira escopo imediato mesmo para service_role, remova bypass na aplicação.

-- Helper expressions (inline):
-- (current_setting('request.jwt.claims', true)::json->>'userId')  => UUID do usuário
-- (current_setting('request.jwt.claims', true)::json->>'tipo')    => 'gestor' | 'analista' | 'consultor'

-- PROPOSTAS
DROP POLICY IF EXISTS propostas_select_all ON propostas;
DROP POLICY IF EXISTS propostas_select_own ON propostas;
DROP POLICY IF EXISTS propostas_insert ON propostas;
DROP POLICY IF EXISTS propostas_update ON propostas;
DROP POLICY IF EXISTS propostas_delete ON propostas;

CREATE POLICY propostas_select_all ON propostas
	FOR SELECT USING ( (current_setting('request.jwt.claims', true)::json->>'tipo') = 'gestor' );

CREATE POLICY propostas_select_own ON propostas
	FOR SELECT USING (
		(current_setting('request.jwt.claims', true)::json->>'tipo') IN ('analista','consultor') AND 
		(criado_por::text = (current_setting('request.jwt.claims', true)::json->>'userId') OR atendido_por::text = (current_setting('request.jwt.claims', true)::json->>'userId'))
	);

CREATE POLICY propostas_insert ON propostas
	FOR INSERT WITH CHECK (
		(current_setting('request.jwt.claims', true)::json->>'tipo') IN ('analista','consultor','gestor')
	);

CREATE POLICY propostas_update ON propostas
	FOR UPDATE USING (
		(
			(current_setting('request.jwt.claims', true)::json->>'tipo') = 'gestor'
		) OR (
			(current_setting('request.jwt.claims', true)::json->>'tipo') IN ('analista','consultor') AND
			(criado_por::text = (current_setting('request.jwt.claims', true)::json->>'userId') OR atendido_por::text = (current_setting('request.jwt.claims', true)::json->>'userId'))
		)
	) WITH CHECK (
		(
			(current_setting('request.jwt.claims', true)::json->>'tipo') = 'gestor'
		) OR (
			(current_setting('request.jwt.claims', true)::json->>'tipo') IN ('analista','consultor') AND
			(criado_por::text = (current_setting('request.jwt.claims', true)::json->>'userId') OR atendido_por::text = (current_setting('request.jwt.claims', true)::json->>'userId'))
		)
	);

CREATE POLICY propostas_delete ON propostas
	FOR DELETE USING ( (current_setting('request.jwt.claims', true)::json->>'tipo') = 'gestor' );

-- SOLICITACOES (mesma lógica)
DROP POLICY IF EXISTS solicitacoes_select_all ON solicitacoes;
DROP POLICY IF EXISTS solicitacoes_select_own ON solicitacoes;
DROP POLICY IF EXISTS solicitacoes_insert ON solicitacoes;
DROP POLICY IF EXISTS solicitacoes_update ON solicitacoes;
DROP POLICY IF EXISTS solicitacoes_delete ON solicitacoes;

CREATE POLICY solicitacoes_select_all ON solicitacoes
	FOR SELECT USING ( (current_setting('request.jwt.claims', true)::json->>'tipo') = 'gestor' );

CREATE POLICY solicitacoes_select_own ON solicitacoes
	FOR SELECT USING (
		(current_setting('request.jwt.claims', true)::json->>'tipo') IN ('analista','consultor') AND 
		(criado_por::text = (current_setting('request.jwt.claims', true)::json->>'userId') OR atendido_por::text = (current_setting('request.jwt.claims', true)::json->>'userId'))
	);

CREATE POLICY solicitacoes_insert ON solicitacoes
	FOR INSERT WITH CHECK (
		(current_setting('request.jwt.claims', true)::json->>'tipo') IN ('analista','consultor','gestor')
	);

CREATE POLICY solicitacoes_update ON solicitacoes
	FOR UPDATE USING (
		(
			(current_setting('request.jwt.claims', true)::json->>'tipo') = 'gestor'
		) OR (
			(current_setting('request.jwt.claims', true)::json->>'tipo') IN ('analista','consultor') AND
			(criado_por::text = (current_setting('request.jwt.claims', true)::json->>'userId') OR atendido_por::text = (current_setting('request.jwt.claims', true)::json->>'userId'))
		)
	) WITH CHECK (
		(
			(current_setting('request.jwt.claims', true)::json->>'tipo') = 'gestor'
		) OR (
			(current_setting('request.jwt.claims', true)::json->>'tipo') IN ('analista','consultor') AND
			(criado_por::text = (current_setting('request.jwt.claims', true)::json->>'userId') OR atendido_por::text = (current_setting('request.jwt.claims', true)::json->>'userId'))
		)
	);

CREATE POLICY solicitacoes_delete ON solicitacoes
	FOR DELETE USING ( (current_setting('request.jwt.claims', true)::json->>'tipo') = 'gestor' );

COMMIT;

-- =============================
-- EXEMPLOS FUTUROS DE POLICIES
-- (Somente se migrar para Supabase Auth ou incluir claims compatíveis no JWT)
-- =============================
-- Assumindo claims padrão: auth.uid() retorna UUID do usuário autenticado Supabase.
-- Caso use JWT customizado, adapte para (current_setting('request.jwt.claims', true)::json->>'sub')

-- SELECT próprias propostas (autor ou atendente)
-- CREATE POLICY select_own_propostas ON propostas
--   FOR SELECT USING (
--     (criado_por = auth.uid()) OR (atendido_por = auth.uid())
--   );

-- UPDATE status somente se autor ou gestor
-- CREATE POLICY update_status_propostas ON propostas
--   FOR UPDATE USING (
--     (criado_por = auth.uid()) OR (EXISTS (
--       SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.tipo_usuario = 'gestor'
--     ))
--   ) WITH CHECK (
--     (criado_por = auth.uid()) OR (EXISTS (
--       SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.tipo_usuario = 'gestor'
--     ))
--   );

-- INSERT propostas (analista apenas)
-- CREATE POLICY insert_propostas_analista ON propostas
--   FOR INSERT WITH CHECK (
--     EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.tipo_usuario = 'analista')
--   );

-- DELETE somente gestor
-- CREATE POLICY delete_propostas_gestor ON propostas
--   FOR DELETE USING (
--     EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.tipo_usuario = 'gestor')
--   );

-- Similar para solicitacoes
-- CREATE POLICY select_own_solicitacoes ON solicitacoes
--   FOR SELECT USING (
--     (criado_por = auth.uid()) OR (atendido_por = auth.uid())
--   );

-- Caso queira leitura global para gestores:
-- CREATE POLICY gestor_read_all_propostas ON propostas
--   FOR SELECT USING (
--     EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.tipo_usuario = 'gestor')
--   );

-- NOTA: Ao criar policies reais, teste sempre com psql usando role anon vs service_role.
