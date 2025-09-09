-- Password reset flow support
-- Tabela para armazenar códigos de recuperação de senha e tokens de reset
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  reset_token_hash TEXT,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets (expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_resets_used ON password_resets (used_at);

COMMENT ON TABLE password_resets IS 'Fluxo de esqueci a senha: armazena códigos e tokens temporários';
COMMENT ON COLUMN password_resets.code_hash IS 'Hash (bcrypt) do código de 6 dígitos enviado por e-mail';
COMMENT ON COLUMN password_resets.reset_token_hash IS 'Hash (sha256) de token randômico emitido após verificação do código';
