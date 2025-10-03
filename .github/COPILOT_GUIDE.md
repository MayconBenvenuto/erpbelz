# Copilot Guide – emergent-crm-adm

Este guia complementa o COPILOT_INSTRUCTIONS.md com detalhes práticos sobre arquitetura, fluxos críticos, segurança, testes e deploy.

## Visão rápida

- Stack: Next.js 14 (App Router), React 18, shadcn/ui, Supabase (supabase-js v2), Zod, Tailwind, ESLint v8, Vitest.
- Padrão: UI modular (app/sections/_), rotas de API por recurso (app/api/_), helpers em lib/\*.
- Auth: JWT no frontend (localStorage) + checagem server-side (requireAuth). RBAC: gestor/analista.

## Estrutura principal

- app/page.js: Entrypoint da UI. Renderiza Login (quando currentUser=null) e tabs (Propostas, Dashboard, Usuários, Relatórios).
- app/sections/\*: Sidebar, Header, Proposals, Dashboard, Users, Reports.
- app/api/\*: Rotas de recursos
  - auth/login (POST)
  - auth/logout (POST)
  - proposals (GET, POST)
  - proposals/[id] (PATCH, DELETE)
  - users (GET, POST)
  - goals (GET)
  - sessions (GET)
  - validate-cnpj (POST)
  - [[...path]] (fallback 404 amigável)
- lib/api-helpers.js: Supabase client, CORS, requireAuth (normaliza payload), ensureGestor.
- lib/utils.js: utilitários (cn, formatCurrency, formatCNPJ, getStatusBadgeVariant).
- lib/constants.js: listas (OPERADORAS, STATUS_OPTIONS).

## Regras de negócio e RBAC

- Propostas
  - Analista vê e gerencia apenas suas propostas.
  - Gestor vê e gerencia todas as propostas.
  - Alterar status:
    - Gestor: qualquer proposta.
  - Analista: apenas propostas que ele criou (checado no backend em PATCH /api/proposals/[id]).
  - Exclusão: UI desabilitada; backend permite somente gestor (DELETE protegido).
  - Metas: quando status muda para "implantado", chama RPC atualizar_meta_usuario com valor da proposta.
- Usuários
  - GET: autenticado.
  - POST: apenas gestor (com hash de senha por bcrypt, 12 rounds; cria metas padrão).
- Sessões
  - GET: apenas gestor.
- Login/Logout
  - login retorna { user, token, sessionId } e persiste em localStorage.
  - logout atualiza a sessão (tempo total) e limpa storage.

## Contratos resumidos

- Auth/login POST { email, password } → 200 { user:{id,nome,email,tipo_usuario}, token, sessionId }
- Proposals GET (autenticado) → 200 [proposta]
- Proposals POST { cnpj, consultor, operadora, quantidade_vidas, valor:number, previsao_implantacao?, status }
- Proposals/[id] PATCH { status, criado_por?, valor? } → 200 proposta atualizada (com metas se implantado)
- Users POST { nome, email, senha, tipo_usuario } → 200 user
- validate-cnpj POST { cnpj } → 200 { valid:boolean, data?, error? } com cache em memória

## Ambiente/variáveis

Definir via Vercel (Preview e Production) e .env local (não comitar):

- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- JWT_SECRET (>= 32 chars), BCRYPT_ROUNDS=12, SESSION_TIMEOUT=86400000
- CORS_ORIGINS (separe por vírgula; evite "\*" em produção)
- RATE_LIMIT_WINDOW=900000, RATE_LIMIT_MAX_REQUESTS=100
- CNPJA_API_KEY (opcional, melhora a confiabilidade de validação de CNPJ)

Observações:

- NEXT*PUBLIC*\* fica exposto no browser; chaves sensíveis apenas no server.
- requireAuth normaliza o token decodificado para { id, email, tipo_usuario }.

## CORS e segurança

- Preferir CORS das rotas (handleCORS) em lib/api-helpers.
- Em produção, restrinja CORS_ORIGINS aos domínios da aplicação.
- Headers adicionais definidos em next.config.js; avalie remover Access-Control-Allow-Origin global em prod para evitar redundância com as rotas.
- Sanitização, rate limiting e headers de segurança já incluídos.

## UI/UX

- Proposals: campo "Valor do Plano" usa máscara pt-BR (ex.: 1.500,00) e converte para number ao enviar.
- Validação de CNPJ: cascata (ReceitaWS → BrasilAPI → CNPJA), com cache em memória por 10 min.
- Toaster (sonner) já integrado.

## Testes

- Framework: Vitest.
- Config: vitest.config.mjs (aliases compatíveis).
- Suites:
  - tests/utils.test.mjs (formatadores e mapeamentos)
  - tests/api-exports.test.mjs (exports das rotas; mock supabase)
  - tests/components-contract.test.mjs (importação/forma das seções)
- Dica: rotas que importam supabase-js precisam de mock nos testes (vide api-exports.test.mjs).

## Scripts

- dev: `pnpm dev`
- lint: `pnpm lint` (ESLint v8)
- build: `pnpm build` (corrigir EINVAL em OneDrive apagando `.next`)
- test: `pnpm test` / `pnpm test:watch`

## Deploy

- Vercel CLI: `vercel`, `vercel --prod`
- Configure envs via `vercel env add`.
- Se usar OneDrive localmente, limpar `.next` em caso de EINVAL.

## Padrões e dicas para o Copilot

- Não reformatar arquivos inteiros sem necessidade; foque em diffs mínimos.
- Manter RBAC estrito no backend (gestor vs analista), mesmo que o frontend oculte botões.
- Toda chamada à API interna deve incluir Authorization: Bearer `${token}` quando autenticado.
- Em mudanças de contrato público, adicionar testes correspondentes.
- Evitar expor chaves em logs; usar `sanitizeForLog` quando necessário.

## Backlog/ideias

- Migrar auth para cookies HttpOnly/sessions no server.
- Ajustar CORS para apenas rotas da API em prod.
- Testes de integração para PATCH /api/proposals/[id] (gestor vs analista).
- Feature de filtros/sort no GET /api/propostas.

---

Este arquivo é complementar. Para instruções iniciais e convenções existentes, veja também `COPILOT_INSTRUCTIONS.md`.
