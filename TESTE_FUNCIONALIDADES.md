# ✅ Checklist de Testes - Correções Aplicadas

## Status das Correções

- ✅ Código corrigido em todos os arquivos
- ✅ Migração da tabela `metas` aplicada manualmente
- ⏳ Testes a realizar

## Testes Obrigatórios

### 1. ✅ Testar Cadastro de Usuário (PRINCIPAL)

**Passos:**

1. Fazer login como gestor
2. Acessar seção **Usuários**
3. Clicar em **"Criar Usuário"** ou botão similar
4. Preencher o formulário:
   - Nome: `Teste Analista`
   - Email: `teste@belz.com.br`
   - Senha: `teste123456`
   - Tipo: `analista_implantacao`
5. Clicar em **Salvar/Criar**

**Resultado Esperado:**

- ✅ Toast de sucesso: "Usuário criado com sucesso!"
- ✅ Usuário aparece na lista imediatamente
- ✅ Sem erros no console do navegador

**Se falhar:**

- Verificar console do navegador (F12)
- Verificar Network tab para ver resposta da API
- Verificar se token está sendo enviado no header

---

### 2. ✅ Testar Definir Meta para Usuário

**Passos:**

1. Na lista de usuários, localizar o usuário criado
2. Clicar em **"Definir Meta"** ou ícone de edição
3. Inserir valor: `150000` (R$ 150.000,00)
4. Salvar

**Resultado Esperado:**

- ✅ Toast de sucesso: "Meta atualizada com sucesso!"
- ✅ Valor da meta aparece na lista
- ✅ Progresso mostra 0% (pois não há propostas implantadas ainda)

---

### 3. ✅ Testar Dashboard do Gestor

**Passos:**

1. Acessar seção **Dashboard**
2. Verificar se todos os cards têm dados (não arrays vazios)

**Verificar:**

- ✅ KPI de "Propostas" mostra número correto
- ✅ KPI de "Implantadas" mostra número correto
- ✅ Gráfico de evolução aparece (últimos 7 dias)
- ✅ Top operadoras mostra dados
- ✅ Lista de usuários online aparece na aba "Equipe"
- ✅ Filtros funcionam (testar filtro por período)

---

### 4. ✅ Testar Seção de Propostas

**Passos:**

1. Acessar seção **Propostas**
2. Tentar criar uma nova proposta

**Verificar:**

- ✅ Lista de propostas carrega
- ✅ Ao criar proposta, modal/form aparece
- ✅ Ao atribuir proposta, lista de analistas aparece (incluindo o novo usuário criado)
- ✅ Mudança de status funciona
- ✅ Toast de confirmação aparece

---

### 5. ✅ Testar Seção de Relatórios

**Passos:**

1. Acessar seção **Relatórios**
2. Clicar no botão de **Refresh/Atualizar**

**Verificar:**

- ✅ Dados de propostas aparecem
- ✅ Dados de usuários aparecem
- ✅ Botão de refresh funciona (spinner + toast de sucesso)
- ✅ Exportações funcionam (se disponível)

---

### 6. ✅ Testar Exclusão de Usuário

**Passos:**

1. Na seção **Usuários**
2. Tentar excluir o usuário de teste criado
3. Confirmar exclusão

**Verificar:**

- ✅ Modal de confirmação aparece
- ✅ Toast de sucesso após exclusão
- ✅ Usuário desaparece da lista
- ✅ Não é possível excluir o próprio usuário (gestor)
- ✅ Não é possível excluir outro gestor

---

## Testes Adicionais (Opcional)

### 7. Testar Sistema de Metas Integrado

**Cenário completo:**

1. Criar usuário analista
2. Definir meta de R$ 100.000,00
3. Criar proposta de R$ 30.000,00 atribuída ao analista
4. Mudar status da proposta para **"implantado"**
5. Verificar no Dashboard > Equipe se o progresso do analista atualizou para 30%

---

### 8. Testar Permissões por Role

**Login como analista (se possível):**

- ❌ Não deve ver botão "Criar Usuário"
- ❌ Não deve ver botão "Deletar Usuário"
- ✅ Deve ver apenas suas próprias propostas
- ✅ Deve poder assumir propostas sem responsável

---

## Debug - Se algo não funcionar

### Console do Navegador (F12)

```javascript
// Verificar se há erros
// Procurar por mensagens em vermelho

// Testar manualmente a API (no console)
fetch('/api/users', {
  headers: {
    Authorization: 'Bearer ' + localStorage.getItem('token'),
  },
})
  .then((r) => r.json())
  .then(console.log)
```

### Network Tab

- Verificar se requisição para `/api/users` retorna 200
- Verificar se payload está correto
- Verificar se response tem os dados esperados

### Erros Comuns

**"Apenas gestores podem criar usuários"**

- Problema: Token inválido ou expirado
- Solução: Fazer logout e login novamente

**"Erro ao criar usuário"**

- Verificar se email já existe
- Verificar se senha tem pelo menos 6 caracteres
- Verificar logs do servidor

**Dados não aparecem no Dashboard**

- Problema: Hooks não carregando dados
- Solução já aplicada, recarregar página (F5)

**Meta não atualiza**

- Verificar se migração foi aplicada: `SELECT column_name FROM information_schema.columns WHERE table_name = 'metas';`
- Deve retornar: `id, usuario_id, valor_meta, valor_alcancado, atualizado_em`

---

## ✅ Confirmação Final

Após todos os testes, marque aqui:

- [ ] Cadastro de usuário funciona
- [ ] Definir meta funciona
- [ ] Dashboard carrega todos os dados
- [ ] Propostas funcionam normalmente
- [ ] Relatórios carregam dados
- [ ] Exclusão de usuário funciona
- [ ] Sistema de metas atualiza automaticamente

**Se todos os itens estiverem marcados:** ✅ **TUDO FUNCIONANDO!**

---

## Arquivos que Foram Modificados

Para referência futura:

1. `app/(protected)/usuarios/page.jsx` - CRUD de usuários implementado
2. `app/(protected)/dashboard/page.jsx` - Carregamento de dados corrigido
3. `app/(protected)/propostas/page.jsx` - Integração com users/goals
4. `app/(protected)/relatorios/page.jsx` - Dados e refresh implementados
5. `hooks/use-api.js` - Alias useGoals adicionado
6. `supabase/migrations/20251002_fix_metas_structure.sql` - Estrutura de metas corrigida

---

## Suporte

Se encontrar algum problema:

1. Verificar console do navegador (F12)
2. Verificar Network tab para erros de API
3. Verificar se está logado como gestor
4. Limpar cache do navegador (Ctrl + Shift + Delete)
5. Fazer logout e login novamente

Documentação completa em: `CORRECOES_02_OUT_2025.md`
