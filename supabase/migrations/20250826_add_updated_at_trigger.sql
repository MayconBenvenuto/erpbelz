-- Adiciona coluna updated_at e trigger de atualização automática
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_propostas_updated_at ON propostas;
CREATE TRIGGER trg_propostas_updated_at
BEFORE UPDATE ON propostas
FOR EACH ROW EXECUTE FUNCTION set_updated_at();