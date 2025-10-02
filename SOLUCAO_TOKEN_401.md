# Solução para Problema de Token

## Problema Identificado

O token estava sendo salvo no `sessionStorage` pelo `AuthProvider`, mas o código estava tentando buscar do `localStorage`.

## Correções Aplicadas

### 1. ✅ Arquivo: `app/(app)/usuarios/page.jsx`

Todas as funções agora buscam o token corretamente:

```javascript
// Antes (ERRADO)
const token = localStorage.getItem('token')

// Depois (CORRETO)
const authToken = token || sessionStorage.getItem('erp_token') || sessionStorage.getItem('crm_token')

if (!authToken) {
  toast.error('Sessão expirada. Por favor, faça login novamente.')
  return
}
```

**Funções corrigidas:**
- `handleCreateUser` ✅
- `handleUpdateUserGoal` ✅  
- `handleDeleteUser` ✅

### 2. ✅ Arquivo: `app/api/auth/login/route.js`

Adicionado import faltante:

```javascript
import crypto from 'node:crypto'
```

## Como Resolver Agora

### Opção 1: Logout e Login Novamente (RECOMENDADO)

1. Faça **logout** do sistema
2. Feche todas as abas do navegador
3. Abra novamente e faça **login**
4. Tente criar um usuário

### Opção 2: Limpar Session/LocalStorage Manualmente

No console do navegador (F12), execute:

```javascript
// Limpar todos os storages
sessionStorage.clear()
localStorage.clear()

// Recarregar página
location.reload()

// Fazer login novamente
```

### Opção 3: Hard Refresh

1. Pressione `Ctrl + Shift + Delete` (Chrome/Edge)
2. Selecione "Cookies e dados de sites"
3. Limpar dados
4. Recarregar página e fazer login

## Verificar se Está Funcionando

Após fazer login novamente, abra o console (F12) e execute:

```javascript
// Deve retornar um token JWT longo
console.log('ERP Token:', sessionStorage.getItem('erp_token'))

// OU
console.log('CRM Token:', sessionStorage.getItem('crm_token'))

// Exemplo de token válido (bem longo):
// "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI..."
```

Se aparecer um token longo (começando com "eyJ..."), significa que está correto!

## Testar Criar Usuário

Após login e verificação do token:

1. Ir em **Usuários**
2. Clicar em **Criar Usuário**
3. Preencher:
   - Nome: `Teste Usuario`
   - Email: `teste@teste.com.br`
   - Senha: `teste123456`
   - Tipo: `analista_implantacao`
4. Salvar

**Resultado esperado:**
- ✅ Toast verde: "Usuário criado com sucesso!"
- ✅ Usuário aparece na lista
- ✅ Sem erro 401 no Network tab

## Se Ainda Não Funcionar

### Debug Adicional

1. **Console do navegador (F12)**:
   ```javascript
   // Ver se tem token
   console.log('Token ERP:', sessionStorage.getItem('erp_token'))
   console.log('Token CRM:', sessionStorage.getItem('crm_token'))
   
   // Testar API manualmente
   fetch('/api/users', {
     headers: {
       'Authorization': 'Bearer ' + sessionStorage.getItem('erp_token')
     }
   }).then(r => r.json()).then(console.log)
   ```

2. **Network Tab**:
   - Filtrar por "users"
   - Ver request headers: deve ter `Authorization: Bearer eyJ...`
   - Ver response: se 401, problema no token; se 200, ok

3. **Verificar .env.local**:
   ```bash
   # Deve ter:
   JWT_SECRET=sua_chave_secreta_de_32_caracteres_ou_mais
   ```

### Problema com JWT_SECRET

Se o JWT_SECRET não existir ou for diferente entre login e validação:

```bash
# No arquivo .env.local, garantir que existe:
JWT_SECRET=belz-crm-super-secret-key-2025-production-do-not-share
```

Reiniciar o servidor:
```bash
# Parar: Ctrl + C
# Iniciar novamente:
npm run dev
```

## Resumo das Mudanças

| Arquivo | Mudança | Status |
|---------|---------|--------|
| `app/(app)/usuarios/page.jsx` | Buscar token do sessionStorage | ✅ |
| `app/api/auth/login/route.js` | Adicionar import crypto | ✅ |
| AuthProvider | Já estava correto (usa sessionStorage) | ✅ |

## Próximos Testes

Após login com sucesso:

- [ ] Criar usuário
- [ ] Editar meta de usuário
- [ ] Deletar usuário
- [ ] Dashboard carrega dados
- [ ] Propostas carregam
- [ ] Relatórios funcionam

Tudo deve funcionar agora! 🎉
