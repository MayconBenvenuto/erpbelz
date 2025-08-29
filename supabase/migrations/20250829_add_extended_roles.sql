-- Migration: add extended RBAC roles (gestor, gerente, analista_implantacao, analista_movimentacao, consultor)
-- Date: 2025-08-29
-- Idempotent & safe (re-runnable) as much as possible.
-- DISCLAIMER: Revise mapping logic for legacy 'analista' users before running in production.

BEGIN;

-- 1. Drop old CHECK constraint (name may differ in some environments).
-- Attempt common naming; ignore if absent.
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_tipo_usuario_check;
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_tipo_usuario_check1;

-- 2. Create new CHECK constraint with expanded set.
ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_tipo_usuario_check
  CHECK (tipo_usuario IN (
    'gestor',
    'gerente',
    'analista_implantacao',
    'analista_movimentacao',
    'consultor'
  ));

-- 3. Data migration: map legacy values.
-- Existing 'analista' rows become 'analista_implantacao' by default (adjust as needed).
UPDATE usuarios SET tipo_usuario = 'analista_implantacao' WHERE tipo_usuario = 'analista';

-- (Optional) If there were legacy 'consultor' already they are kept; if any unexpected values remain, raise notice.
DO $$
DECLARE
  v_cnt int;
BEGIN
  SELECT COUNT(*) INTO v_cnt FROM usuarios WHERE tipo_usuario NOT IN ('gestor','gerente','analista_implantacao','analista_movimentacao','consultor');
  IF v_cnt > 0 THEN
    RAISE NOTICE 'Ainda existem % usuários com tipo_usuario fora do novo conjunto. Ajuste manualmente.', v_cnt;
  END IF;
END $$;

COMMIT;

-- ROLLBACK (manual):
-- BEGIN; ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_tipo_usuario_check; 
-- ALTER TABLE usuarios ADD CONSTRAINT usuarios_tipo_usuario_check CHECK (tipo_usuario IN ('gestor','analista')); COMMIT;
