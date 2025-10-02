# Correção: Erro ao Salvar Documentos de Propostas

## Problema Identificado

Ao cadastrar uma nova proposta com documentos anexados, os arquivos são enviados corretamente para o bucket `implantacao_upload` do Supabase Storage, mas o sistema exibe o erro:

> ⚠️ "Proposta criada, mas houve problema ao registrar alguns documentos"

Os documentos não ficam visíveis na interface porque os metadados não são salvos no banco de dados.

### Causa Raiz

A tabela `propostas_arquivos` não possui as colunas `url` e `categoria` que o código está tentando inserir ao salvar os metadados dos arquivos.

**Estrutura atual:**
- id
- proposta_id
- bucket
- path
- nome_original
- mime
- tamanho_bytes
- uploaded_by
- criado_em

**Colunas faltantes:**
- `url` (TEXT) - URL pública ou assinada do arquivo
- `categoria` (TEXT) - Categoria do documento (proposta_comercial, contrato, etc)

## Solução

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Cole o conteúdo do arquivo `supabase/migrations/20251002_add_propostas_arquivos_url_categoria.sql`:

```sql
-- Adicionar coluna url se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='propostas_arquivos' 
      AND column_name='url'
  ) THEN
    ALTER TABLE public.propostas_arquivos ADD COLUMN url TEXT;
    COMMENT ON COLUMN public.propostas_arquivos.url IS 'URL pública ou assinada para acesso ao arquivo';
  END IF;
END $$;

-- Adicionar coluna categoria se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='propostas_arquivos' 
      AND column_name='categoria'
  ) THEN
    ALTER TABLE public.propostas_arquivos ADD COLUMN categoria TEXT;
    COMMENT ON COLUMN public.propostas_arquivos.categoria IS 'Categoria do documento (e.g., proposta_comercial, contrato, etc)';
  END IF;
END $$;

-- Criar índice para busca por categoria
CREATE INDEX IF NOT EXISTS idx_propostas_arquivos_categoria ON public.propostas_arquivos(categoria);
```

5. Clique em **Run** ou pressione `Ctrl+Enter`
6. Verifique se apareceu "Success. No rows returned"

### Opção 2: Via Script (Alternativo)

Execute o script de migração automatizado:

```bash
node scripts/apply-migration-url-categoria.mjs
```

**Requisitos:**
- Arquivo `.env` configurado com:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Verificação

Após aplicar a migration:

1. No Supabase Dashboard, vá em **Database** > **Tables** > `propostas_arquivos`
2. Verifique se as novas colunas `url` e `categoria` aparecem na estrutura
3. Teste o upload de documentos em uma nova proposta
4. Verifique se os documentos aparecem corretamente na interface

## Arquivos Modificados

### Nova Migration
- `supabase/migrations/20251002_add_propostas_arquivos_url_categoria.sql`

### Script de Aplicação
- `scripts/apply-migration-url-categoria.mjs`

## Fluxo Após Correção

1. Usuário cria nova proposta e anexa documentos
2. Documentos são enviados para `implantacao_upload` bucket
3. Metadados são salvos em `propostas_arquivos` com as colunas:
   - `proposta_id` - ID da proposta
   - `bucket` - Nome do bucket
   - `path` - Caminho completo do arquivo
   - `nome_original` - Nome original do arquivo
   - `mime` - Tipo MIME
   - `tamanho_bytes` - Tamanho em bytes
   - `url` - URL pública/assinada ✅ (nova)
   - `categoria` - Categoria do documento ✅ (nova)
   - `uploaded_by` - ID do usuário que fez upload
   - `criado_em` - Data de criação
4. Documentos ficam visíveis na interface
5. Toast de sucesso: "✅ Proposta criada com sucesso!"

## Troubleshooting

### Erro: "column does not exist"
- A migration ainda não foi aplicada
- Siga a Opção 1 (Supabase Dashboard)

### Erro: "permission denied"
- Verifique se está usando a `SUPABASE_SERVICE_ROLE_KEY` correta
- Confirme que o usuário tem permissões de ALTER TABLE

### Documentos antigos não aparecem
- Documentos enviados antes da correção precisam ter seus metadados registrados manualmente
- OU o sistema tentará buscar os arquivos diretamente do Storage usando a função de fallback na API

## Próximos Passos

1. ✅ Aplicar a migration
2. ✅ Testar upload de documentos
3. 📝 Atualizar `DOC_SUPABASE.md` executando: `node scripts/supabase-introspect.mjs`
4. 🔄 Fazer backup do banco após validação

---
**Data da Correção:** 02/10/2025  
**Autor:** GitHub Copilot  
**Issue:** Erro ao registrar documentos em novas propostas
