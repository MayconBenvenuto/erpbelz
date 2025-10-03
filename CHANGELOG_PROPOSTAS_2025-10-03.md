# Changelog - Atualização do Módulo de Propostas

## Data: 2025-10-03

### ✨ Novas Funcionalidades

#### 1. Campo de Observações

- **Adicionado**: Campo `observacoes` (TEXT, nullable) na tabela `propostas`
- **Frontend**: Textarea com contador de caracteres (máx. 2000)
- **Validação**: Schema zod com limite de 2000 caracteres
- **Exibição**:
  - Cards de proposta mostram observações quando preenchidas
  - Modal de detalhes exibe observações em destaque
  - Formulário de edição permite alterar observações

#### 2. Novo Status "Pendente Assinatura DS/Proposta"

- **Posição**: Entre "recepcionado" e "análise"
- **Fluxo**: recepcionado → **pendente assinatura ds/proposta** → análise
- **Cores** (seguindo padrão do sistema):
  - Fundo: `#F3E5F5` (roxo muito claro)
  - Texto: `#7B1FA2` (roxo escuro)
  - Borda: `#9C27B0` (roxo médio)
- **Constraint**: Atualizada no banco de dados para aceitar o novo valor

### 🗑️ Depreciações

#### Campo `previsao_implantacao`

- **Status**: DEPRECATED
- **Ação**: Removido de todos os formulários e exibições
- **Banco de Dados**: Mantido por compatibilidade com dados existentes
- **Migration**: Comentário adicionado indicando depreciação
- **Impacto**:
  - ✅ Propostas antigas com o campo continuam funcionando
  - ✅ Novas propostas não incluem este campo
  - ✅ API não valida mais este campo em novos registros

### 🔧 Alterações Técnicas

#### Backend (API)

- **`app/api/proposals/route.js`**:
  - Removido validação de `previsao_implantacao` do schema zod
  - Adicionado validação de `observacoes` (opcional, max 2000)
  - Atualizado `DEFAULT_LIST_COLUMNS` para incluir `observacoes`
  - Removidas funções `isoDateRegex` e `validateFutureOrToday` (não utilizadas)

- **`app/api/proposals/[id]/route.js`**:
  - Removido `previsao_implantacao` do schema de PATCH
  - Adicionado `observacoes` ao schema de PATCH
  - Atualizado lista de campos auditáveis
  - Removidas validações de data não utilizadas

- **`app/api/proposals/[id]/audit/route.js`**:
  - Atualizado whitelist de campos auditáveis
  - Adicionado `observacoes` e `observacoes_cliente`

#### Frontend (UI)

- **`components/propostas/NovaPropostaDialog.jsx`**:
  - Adicionado import de `Textarea` do shadcn/ui
  - Substituído campo de data por campo de observações
  - Removido `previsao_implantacao` do estado inicial
  - Adicionado contador de caracteres para observações

- **`components/propostas/ProposalCard.jsx`**:
  - Removida exibição de previsão de implantação
  - Adicionada exibição de observações (quando preenchidas)
  - Removidos imports não utilizados (`Calendar`, função `formatDate`)

- **`app/sections/Proposals.jsx`**:
  - Adicionado import de `Textarea`
  - Atualizado formulário de edição (removido previsão, adicionado observações)
  - Atualizado modal de detalhes para exibir observações
  - Removido `previsao_implantacao` de todos os estados

#### Constantes

- **`lib/constants.js`**:
  - Adicionado `'pendente assinatura ds/proposta'` em `STATUS_OPTIONS`
  - Adicionadas cores do novo status em `STATUS_COLORS`

#### Banco de Dados

- **Migration**: `supabase/migrations/20251003_update_propostas_observacoes_status.sql`
  - Adiciona coluna `observacoes` (TEXT, nullable)
  - Atualiza constraint de status para incluir novo valor
  - Adiciona comentário de depreciação em `previsao_implantacao`
  - Cria índice para observações não nulas

### 📚 Documentação

- **`DOC_SUPABASE.md`**: Atualizado com novo campo e status
- **`DOC_CORES_E_ESTILOS.md`**: Documentadas cores do novo status
- **`CHANGELOG_PROPOSTAS_2025-10-03.md`**: Este arquivo

### ✅ Checklist de Implementação

- [x] Atualizar `lib/constants.js` com novo status e cor
- [x] Migration Supabase: adicionar coluna observacoes
- [x] Migration Supabase: atualizar enum de status
- [x] Migration Supabase: depreciar previsao_implantacao
- [x] Atualizar validação zod em `app/api/proposals/route.js`
- [x] Atualizar API `[id]/route.js` e `audit/route.js`
- [x] Adicionar campo Textarea no formulário de criação
- [x] Remover input de previsão do formulário
- [x] Atualizar componentes de visualização
- [x] Atualizar filtros e badges na listagem
- [x] Atualizar documentação técnica
- [ ] Executar migration no banco de dados
- [ ] Executar `node scripts/supabase-introspect.mjs`
- [ ] Atualizar testes unitários
- [ ] Executar `pnpm test:full`

### 🚀 Próximos Passos

1. **Aplicar Migration**:

   ```bash
   # Conectar ao Supabase e executar:
   supabase/migrations/20251003_update_propostas_observacoes_status.sql
   ```

2. **Atualizar Schema Cache**:

   ```bash
   node scripts/supabase-introspect.mjs
   ```

3. **Testes**:

   ```bash
   pnpm test:full
   ```

4. **Validar em ambiente de teste**:
   - Criar nova proposta com observações
   - Testar transição para novo status
   - Verificar backward compatibility com propostas antigas

### ⚠️ Avisos Importantes

- **Backward Compatibility**: Propostas existentes com `previsao_implantacao` continuam funcionando
- **Cache**: Invalidar cache de propostas após deploy (`React Query`)
- **RBAC**: Novo status segue as mesmas regras de permissão dos status existentes
- **Sanitização**: Campo `observacoes` deve ser sanitizado antes de persistir (já implementado no backend)

### 🔍 Breaking Changes

Nenhum breaking change. Todas as alterações são backward-compatible:

- Campo depreciado mantido no banco
- Novo status é opcional no fluxo
- Frontend atualizado mas API aceita ambos os formatos
