-- Add presence columns to usuarios and enhance sessoes for activity tracking
-- Up migration
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_logout_at TIMESTAMPTZ;

-- Indexes to query online users quickly
CREATE INDEX IF NOT EXISTS idx_usuarios_last_active ON usuarios(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_usuarios_last_logout ON usuarios(last_logout_at DESC);

-- Add ultimo_ping column to sessoes if not exists (already partially tracked in code but ensure schema)
ALTER TABLE sessoes
  ADD COLUMN IF NOT EXISTS ultimo_ping TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sessoes_ultimo_ping ON sessoes(ultimo_ping DESC);

-- View to compute online users (online if active within 2 minutes and no logout after last active)
CREATE OR REPLACE VIEW vw_usuarios_online AS
SELECT u.id, u.nome, u.email, u.tipo_usuario, u.last_active_at
FROM usuarios u
LEFT JOIN LATERAL (
  SELECT 1
) dummy ON true
WHERE u.last_active_at IS NOT NULL
  AND (NOW() - u.last_active_at) <= INTERVAL '2 minutes'
  AND (u.last_logout_at IS NULL OR u.last_logout_at < u.last_active_at);

-- Down migration (best effort)
-- To rollback manually:
-- ALTER TABLE usuarios DROP COLUMN IF EXISTS last_active_at;
-- ALTER TABLE usuarios DROP COLUMN IF EXISTS last_logout_at;
-- ALTER TABLE sessoes DROP COLUMN IF EXISTS ultimo_ping;
-- DROP VIEW IF EXISTS vw_usuarios_online;
