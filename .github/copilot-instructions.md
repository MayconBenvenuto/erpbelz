# GitHub Copilot Instructions - ERP Belz

## Visão rápida

- Next.js 14.2 (App Router) serve UI e rotas /api no mesmo projeto; Supabase/Postgres é acessado via `lib/api-helpers.js`.
- UI usa shadcn + Tailwind; status e cores vêm exclusivamente de `lib/constants.js`.
- Fluxos principais: Propostas, Movimentação, Carteira e Dashboards vivem em `app/(protected)/*` e compartilham layout com sidebar/header.

## Pastas essenciais

- `app/(protected)/layout.jsx` injeta `AuthProvider`, `QueryProvider`, `Sidebar` e aplica redirecionamento automático quando não autenticado.
- `app/api/**` concentra endpoints; cada rota define `export const runtime = 'nodejs'` quando precisa de dependências nativas (ex.: zod, perf_hooks).
- `components/auth/AuthProvider.jsx` guarda sessão em sessionStorage e sincroniza com `/api/auth/*`; registre novos fluxos de login/logout aqui.
- `components/lazy-sections.jsx` gerencia carregamento assíncrono das telas pesadas e prefetch dos chunks.

## Autenticação e RBAC

- Use `requireAuth`, `handleCORS`, `cacheJson`, `supabase` de `lib/api-helpers.js`; não misturar com wrappers legados de `lib/security.js`.
- Valide permissões com `hasPermission` de `lib/rbac.js`; papéis disponíveis: gestor, gerente, analista_implantacao, analista_movimentacao, consultor, analista_cliente.
- `lib/auth-interceptor.js` + `hooks/use-auth-fetch.js` interceptam 401: qualquer chamada fetch nova deve passar por esse wrapper ou repetir o padrão de interceptação.
- Sessão viva é mantida por `components/keep-alive-ping.jsx` chamando `/api/health`; evite remover para não derrubar sessões longas.

## APIs e Supabase

- Todas as rotas chamam `requireAuth` e `handleCORS` logo no início, retornando `handleCORS(NextResponse.json(...))` com mensagens localizadas.
- Construções de query usam `supabase.from(...).select(...)` com filtros baseados no papel (ver `app/api/proposals/route.js` para exemplo completo).
- Cache privado: responda via `cacheJson(request, origin, payload, { maxAge, swr })` para manter ETag consistente.
- Atualizações de metas e side effects moram em RPCs Supabase (`atualizar_meta_usuario` etc.); nunca recalcular manualmente no frontend.

## Frontend

- Estados visuais e filtros usam React Query (`components/query-provider.jsx`) e `useAuth` para recuperar usuário atual.
- Formulários usam `react-hook-form` + `zod`; campos de CNPJ passam por validação em cascata e exibem tooltips (ver `app/(protected)/propostas`).
- Status e badges devem usar `STATUS_OPTIONS`, `STATUS_COLORS`, `SOLICITACAO_STATUS`, `SOLICITACAO_STATUS_COLORS`; não hardcode cores.
- Dashboards utilizam `components/ui/chart` com Recharts; KPIs e alertas (>24h sem responsável) já seguem contratos em `app/sections/Dashboard.jsx`.

## Workflows de desenvolvimento

- Node >=20 e Yarn 1.22 são obrigatórios (ver `package.json`).
- Executar local: `yarn install --frozen-lockfile` seguido de `yarn dev`; API e UI rodam juntas em http://localhost:3000.
- Testes rápidos: `yarn test` roda Vitest sobre `tests/*.mjs`; `yarn test:full` inclui eslint e build.
- Scripts auxiliares: `node scripts/supabase-introspect.mjs` atualiza `DOC_SUPABASE.md`; em Windows use `yarn windows:next-cache:*` para preparar/limpar cache.

## Convenções críticas

- Sanitização: sempre chamar `sanitizeInput`, `validateEmail`, `validateCNPJ` conforme necessidade e nunca logar tokens (use `sanitizeForLog`).
- Emails transacionais usam `lib/email.js` + `lib/email-template.js` e devem citar apenas `codigo` PRP/MVM.
- Gravar arquivos em Supabase Storage via rotas `app/api/proposals/files` ou `solicitacoes/upload`; siga contratos dos testes `tests/upload.mimetypes.test.mjs`.
- Documentação de cores/status deve permanecer em `DOC_CORES_E_ESTILOS.md`; se alterar schema, rode introspect e atualize README.
