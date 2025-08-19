# CRM Belz API (NestJS)

Este subprojeto fornece uma API NestJS equivalente às rotas Next.js /api atuais, para migração gradual.

Endpoints principais:
- POST /auth/login, POST /auth/logout
- GET/POST /users (POST somente gestor)
- GET/POST /proposals, PATCH/DELETE /proposals/:id
- POST /proposals/stale-check (gestor)
- GET /sessions (gestor)
- GET /goals
- POST /validate-cnpj
- POST /email-test (gestor)

Como rodar (dev):

1. Configure variáveis de ambiente (o Nest carrega `.env` da raiz automaticamente):
   - NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - JWT_SECRET, BCRYPT_ROUNDS (opcional)
   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (se usar email)
   - CORS_ORIGINS (ex.: <http://localhost:3000>)
2. Instale deps e rode:

   - npm install
   - npm run dev (ou `yarn dev`)

Proxy do Next.js:

- O Next redireciona /api/* ao Nest em <http://localhost:3001> (ou `NEST_API_URL`).

Build:

- npm run build && npm start

Notas:

- Payloads e códigos de status são mantidos para compatibilidade com o frontend atual.
- RBAC: analista só gerencia suas propostas; gestor tem privilégios extras.
