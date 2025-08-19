-- CRM Propostas - Database Setup Script
-- Execute this script in your Supabase SQL Editor

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS sessoes CASCADE;
DROP TABLE IF EXISTS metas CASCADE;
DROP TABLE IF EXISTS propostas CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS atualizar_meta() CASCADE;
DROP FUNCTION IF EXISTS atualizar_meta_usuario(UUID, NUMERIC) CASCADE;

-- Create usuarios table
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  tipo_usuario TEXT CHECK (tipo_usuario IN ('gestor', 'analista')) NOT NULL,
  "criado_em" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create propostas table
CREATE TABLE propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj VARCHAR(18) NOT NULL,
  consultor TEXT NOT NULL,
  consultor_email TEXT NOT NULL,
  operadora TEXT CHECK (operadora IN (
    'unimed recife','unimed seguros','bradesco','amil','ampla','fox','hapvida',
    'medsenior','sulamerica','select'
  )) NOT NULL,
  "quantidade_vidas" INT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  "previsao_implantacao" DATE,
  status TEXT CHECK (status IN (
    'em análise','pendencias seguradora','boleto liberado','implantando',
    'pendente cliente','pleito seguradora','negado','implantado'
  )) NOT NULL,
  "criado_por" UUID REFERENCES usuarios(id),
  "criado_em" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessoes table (session monitoring)
CREATE TABLE sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "usuario_id" UUID REFERENCES usuarios(id),
  "data_login" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "data_logout" TIMESTAMP WITH TIME ZONE,
  "tempo_total" INTERVAL
);

-- Create metas table (user goals)
CREATE TABLE metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "usuario_id" UUID REFERENCES usuarios(id),
  "valor_meta" NUMERIC(12,2) DEFAULT 150000,
  "valor_alcancado" NUMERIC(12,2) DEFAULT 0,
  "atualizado_em" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access (for demo purposes)
-- In production, these should be more restrictive
CREATE POLICY "Allow all operations on usuarios" ON usuarios FOR ALL USING (true);
CREATE POLICY "Allow all operations on propostas" ON propostas FOR ALL USING (true);
CREATE POLICY "Allow all operations on sessoes" ON sessoes FOR ALL USING (true);
CREATE POLICY "Allow all operations on metas" ON metas FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX idx_propostas_created ON propostas("criado_em" DESC);
CREATE INDEX idx_propostas_status ON propostas(status);
CREATE INDEX idx_propostas_criado_por ON propostas("criado_por");
CREATE INDEX idx_sessoes_usuario ON sessoes("usuario_id");
CREATE INDEX idx_sessoes_login ON sessoes("data_login" DESC);
CREATE INDEX idx_metas_usuario ON metas("usuario_id");

-- Function to update user goals when proposal status changes to 'implantado'
CREATE OR REPLACE FUNCTION atualizar_meta()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update when status changes to 'implantado'
  IF NEW.status = 'implantado' AND (OLD.status IS NULL OR OLD.status != 'implantado') THEN
    -- Check if user has a meta record, create if not exists
    INSERT INTO metas ("usuario_id", "valor_meta", "valor_alcancado", "atualizado_em")
    VALUES (NEW."criado_por", 150000, NEW.valor, NOW())
    ON CONFLICT ("usuario_id") DO UPDATE SET
      "valor_alcancado" = metas."valor_alcancado" + NEW.valor,
      "atualizado_em" = NOW();
  -- If status changes from 'implantado' to something else, subtract the value
  ELSIF OLD.status = 'implantado' AND NEW.status != 'implantado' THEN
    UPDATE metas 
    SET "valor_alcancado" = GREATEST(0, "valor_alcancado" - OLD.valor),
        "atualizado_em" = NOW()
    WHERE "usuario_id" = OLD."criado_por";
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic meta updates
CREATE TRIGGER trg_atualizar_meta
AFTER INSERT OR UPDATE ON propostas
FOR EACH ROW
EXECUTE FUNCTION atualizar_meta();

-- Function to manually update user meta (called from API)
CREATE OR REPLACE FUNCTION atualizar_meta_usuario(p_usuario_id UUID, p_valor NUMERIC)
RETURNS void AS $$
BEGIN
  INSERT INTO metas ("usuario_id", "valor_meta", "valor_alcancado", "atualizado_em")
  VALUES (p_usuario_id, 150000, p_valor, NOW())
  ON CONFLICT ("usuario_id") DO UPDATE SET
    "valor_alcancado" = metas."valor_alcancado" + p_valor,
    "atualizado_em" = NOW();
END;
$$ LANGUAGE plpgsql;

-- Insert sample users (password is plain text for demo - use proper hashing in production)
INSERT INTO usuarios (id, nome, email, senha, tipo_usuario) VALUES
  (gen_random_uuid(), 'Admin Gestor', 'gestor@empresa.com', '123456', 'gestor'),
  (gen_random_uuid(), 'João Silva', 'joao@empresa.com', '123456', 'analista'),
  (gen_random_uuid(), 'Maria Santos', 'maria@empresa.com', '123456', 'analista');

-- Initialize metas for all usersge
INSERT INTO metas ("usuario_id", "valor_meta", "valor_alcancado")
SELECT id, 150000, 0 FROM usuarios;

-- Insert sample data for testing
WITH sample_users AS (
  SELECT id FROM usuarios WHERE tipo_usuario = 'analista' LIMIT 2
),
sample_proposals AS (
  SELECT 
    gen_random_uuid() as id,
    '12345678000195' as cnpj,
    'João Silva' as consultor,
  'joao.silva@empresa.com' as consultor_email,
    'unimed recife' as operadora,
    50 as quantidade_vidas,
    25000.00 as valor,
    '2024-02-15'::date as previsao_implantacao,
    'implantado' as status,
    (SELECT id FROM sample_users LIMIT 1) as criado_por
  UNION ALL
  SELECT 
    gen_random_uuid() as id,
    '98765432000187' as cnpj,
    'Maria Santos' as consultor,
  'maria.santos@empresa.com' as consultor_email,
    'bradesco' as operadora,
    30 as quantidade_vidas,
    18000.00 as valor,
    '2024-03-01'::date as previsao_implantacao,
    'em análise' as status,
    (SELECT id FROM sample_users OFFSET 1 LIMIT 1) as criado_por
)
INSERT INTO propostas (id, cnpj, consultor, consultor_email, operadora, "quantidade_vidas", valor, "previsao_implantacao", status, "criado_por")
SELECT * FROM sample_proposals;

-- Verify data
SELECT 'Users created:' as info, COUNT(*) as count FROM usuarios
UNION ALL
SELECT 'Proposals created:' as info, COUNT(*) as count FROM propostas
UNION ALL
SELECT 'Goals initialized:' as info, COUNT(*) as count FROM metas;

-- Show sample login credentials
SELECT 
  'Sample Login Credentials:' as info,
  nome as name,
  email,
  'Password: 123456' as password,
  tipo_usuario as role
FROM usuarios;