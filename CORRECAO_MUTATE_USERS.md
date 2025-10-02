# Correção Final - Erro "mutateUsers is not a function"

## Problema

```
Erro ao criar usuário: TypeError: mutateUsers is not a function
```

## Causa

O hook `useQuery` do React Query retorna `refetch`, não `mutate`. A função `mutate` é retornada por `useMutation`.

## Solução Aplicada

### Arquivo: `app/(protected)/usuarios/page.jsx`

#### Antes (ERRADO):

```javascript
const { data: users = [], mutate: mutateUsers } = useUsers()
await mutateUsers()
```

#### Depois (CORRETO):

```javascript
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'

const { data: users = [], refetch: refetchUsers } = useUsers()
const queryClient = useQueryClient()

// Nas funções:
await refetchUsers()
queryClient.invalidateQueries({ queryKey: queryKeys.users })
```

## Mudanças Implementadas

### 1. ✅ handleCreateUser

```javascript
// Revalidar lista de usuários
await refetchUsers()
queryClient.invalidateQueries({ queryKey: queryKeys.users })
```

### 2. ✅ handleUpdateUserGoal

```javascript
// Revalidar metas
await refetchGoals()
queryClient.invalidateQueries({ queryKey: queryKeys.userGoals })
```

### 3. ✅ handleDeleteUser

```javascript
// Revalidar lista de usuários
await refetchUsers()
queryClient.invalidateQueries({ queryKey: queryKeys.users })
```

## Como React Query Funciona

### useQuery (para buscas/GET)

Retorna:

- `data` - dados da query
- `isLoading` - estado de carregamento
- `refetch()` - função para refazer a busca
- `error` - erro se houver

### useMutation (para POST/PUT/DELETE)

Retorna:

- `mutate()` - função para executar a mutação
- `mutateAsync()` - versão async
- `isLoading` - estado
- `error` - erro se houver

### queryClient.invalidateQueries()

Marca queries como "stale" (desatualizadas), forçando um refetch na próxima vez que forem usadas.

## Benefícios da Correção

1. **Atualização Otimista**: `refetch()` busca novos dados
2. **Cache Inteligente**: `invalidateQueries()` marca cache como stale
3. **Sincronização**: Outros componentes que usam a mesma query são atualizados automaticamente
4. **Performance**: React Query gerencia cache e evita refetches desnecessários

## Testar Agora

### 1. Recarregar página (F5)

### 2. Ir em Usuários → Criar Usuário

Preencher:

- Nome: `Teste Final`
- Email: `teste.final@belz.com.br`
- Senha: `senha123456`
- Tipo: `analista_implantacao`

### 3. Salvar

**Resultado esperado:**

- ✅ Toast verde: "Usuário criado com sucesso!"
- ✅ Usuário aparece na lista imediatamente
- ✅ Sem erro no console

## Outras Funções Corrigidas

Todas as funções CRUD agora seguem o mesmo padrão:

1. **Criar Usuário** ✅
2. **Atualizar Meta** ✅
3. **Deletar Usuário** ✅

## Arquivos Modificados

- `app/(protected)/usuarios/page.jsx` - Correção completa das 3 funções

## Documentação

- React Query: https://tanstack.com/query/latest/docs/react/overview
- `useQuery`: https://tanstack.com/query/latest/docs/react/reference/useQuery
- `queryClient`: https://tanstack.com/query/latest/docs/react/reference/QueryClient

---

**Status:** ✅ PRONTO PARA TESTE

Todas as correções foram aplicadas. Recarregue a página e teste criar um usuário!
