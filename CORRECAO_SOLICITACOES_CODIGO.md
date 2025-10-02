# Correção: Erro ao criar solicitações - campo "codigo" null

## Problema

Ao tentar criar uma solicitação de movimentação, ocorre o erro:

```
Erro POST solicitacoes {
  message: 'null value in column "codigo" of relation "solicitacoes" violates not-null constraint',
  stack: undefined
}
```

## Causa

O campo `codigo` da tabela `solicitacoes` requer um valor, mas não há trigger configurado no banco de dados para gerar automaticamente o código no formato `MVM0001`, `MVM0002`, etc.

## Solução

Foi criada uma migração que adiciona:

- Sequence `solicitacoes_codigo_seq` para numeração sequencial
- Função `set_solicitacao_codigo()` que gera códigos no formato MVM + 4 dígitos
- Trigger `trg_solicitacoes_set_codigo` que preenche automaticamente o campo antes de inserir
- Ajuste da sequence para evitar conflitos com códigos existentes

## Como aplicar a migração

### Opção 1: Via Supabase Dashboard (RECOMENDADO)

1. Acesse o Supabase Dashboard do seu projeto
2. Navegue para **SQL Editor** (menu lateral)
3. Clique em **New Query**
4. Copie todo o conteúdo do arquivo:
   ```
   supabase/migrations/20251002_add_solicitacoes_codigo_trigger.sql
   ```
5. Cole no editor SQL
6. Clique em **Run** para executar

### Opção 2: Via Supabase CLI

Se você tem a CLI do Supabase instalada:

```bash
npx supabase db push
```

### Opção 3: Via linha de comando (se tiver acesso direto ao banco)

```bash
psql "sua-connection-string" < supabase/migrations/20251002_add_solicitacoes_codigo_trigger.sql
```

## Verificação

Após aplicar a migração, você pode verificar se funcionou:

1. Tente criar uma nova solicitação
2. O código deve ser gerado automaticamente (ex: MVM0001, MVM0002, etc.)
3. Não deve mais ocorrer o erro de "null value in column codigo"

## Arquivos criados

- `supabase/migrations/20251002_add_solicitacoes_codigo_trigger.sql` - Migração SQL
- `scripts/apply-solicitacoes-migration.mjs` - Script helper (opcional)
- `scripts/apply-solicitacoes-codigo-migration.ps1` - Script PowerShell (opcional)

## Detalhes técnicos

A função criada:

```sql
CREATE OR REPLACE FUNCTION set_solicitacao_codigo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'MVM' || LPAD(nextval('solicitacoes_codigo_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

O trigger:

```sql
CREATE TRIGGER trg_solicitacoes_set_codigo
BEFORE INSERT ON solicitacoes
FOR EACH ROW EXECUTE FUNCTION set_solicitacao_codigo();
```

Isso garante que toda nova solicitação receba automaticamente um código único no formato `MVM0001`, `MVM0002`, etc.
