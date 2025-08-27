-- Verificações rápidas pós reset
SELECT 'usuarios' tabela, count(*) qt FROM usuarios UNION ALL
SELECT 'propostas', count(*) FROM propostas UNION ALL
SELECT 'solicitacoes', count(*) FROM solicitacoes UNION ALL
SELECT 'metas', count(*) FROM metas;

-- Checar sequences
SELECT 'solicitacoes_codigo_seq' seq, last_value FROM solicitacoes_codigo_seq;

-- Checar índices (amostra)
SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('propostas','solicitacoes') ORDER BY 1;

-- Testar trigger de codigo solicitacao (inserindo campos NOT NULL necessários)
INSERT INTO solicitacoes (tipo, razao_social, cnpj, apolice_da_belz) VALUES ('teste','Empresa Teste LTDA','00.000.000/0000-00', false) RETURNING id, codigo, razao_social;
DELETE FROM solicitacoes WHERE tipo='teste';

-- Testar geração de código de propostas (PRP)
INSERT INTO propostas (cnpj, consultor, consultor_email, operadora, quantidade_vidas, valor, status)
VALUES ('00.000.000/0000-00','Teste','teste@exemplo.com','unimed recife',1,0,'em análise')
RETURNING id, codigo;
DELETE FROM propostas WHERE consultor='Teste' AND quantidade_vidas=1 AND valor=0;
