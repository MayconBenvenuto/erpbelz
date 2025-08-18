# Guia do Copilot – emergent-crm-adm

Este guia resume como o GitHub Copilot deve atuar neste repositório para manter segurança, consistência e produtividade.

## Princípios

- Segurança primeiro: autenticação, autorização e sanitização sempre.
- Consistência de UI/UX: use Shadcn/UI e Tailwind.
- Tipagem e validação: use Zod nos payloads API.
- Manutenibilidade: código simples, nomes claros e logs sanitizados.

## Onde ficar de olho

- Rotas API: `app/api/**/route.js` (App Router)
- Helpers: `lib/api-helpers.js`, `lib/security.js`
- E-mails: `lib/email.js`, `lib/email-template.js`
- UI: `components/ui/*`

## Padrões obrigatórios nas rotas API

1. Autenticação e autorização

- Use `const auth = await requireAuth(request)`;
- Para gestores, checar `ensureGestor(auth.user)`.

1. CORS + headers de segurança

- Extraia origin: `const origin = request.headers.get('origin')`;
- Envolva as respostas com `handleCORS(NextResponse.json(...), origin)`.

1. Validação com Zod

- Crie schemas `z.object({...})` e valide com `safeParse`;
- Retorne 400 com `issues` em caso de erro.

1. Logs e erros

- Nunca logar dados sensíveis; use `sanitizeForLog`.
- Mensagens de erro genéricas para cliente; detalhes só em log sanitizado.

## Segurança

- Hash de senha com bcrypt (ver `hashPassword/verifyPassword`).
- JWT via `generateToken/verifyToken`.
- Rate limit com `checkRateLimit` nas rotas sensíveis (login, etc.).
- Sanitização de entrada com `sanitizeInput`.

## Integrações externas

- CNPJ: endpoint `/api/validate-cnpj` com cache em memória e fallback de provedores.
- E-mail (SMTP): `sendEmail` com `EMAIL_FROM` e opções TLS configuráveis.

## Variáveis de ambiente

Veja `.env.example`. Principais:

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Segurança: `JWT_SECRET`, `BCRYPT_ROUNDS`, `SESSION_TIMEOUT`, `RATE_LIMIT_*`.
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `EMAIL_FROM`.
- Apps: `NEXT_PUBLIC_BASE_URL`, `CRM_APP_URL`.
- Integração CNPJ: `CNPJA_API_KEY`.

## Snippets úteis (excertos)

Validação com Zod:

```js
const schema = z.object({ name: z.string().min(2) })
const body = await request.json()
const parsed = schema.safeParse(body)
if (!parsed.success) return handleCORS(NextResponse.json({ error: 'Dados inválidos', issues: parsed.error.issues }, { status: 400 }), origin)
```

Autenticação, CORS e resposta segura:

```js
const origin = request.headers.get('origin')
const auth = await requireAuth(request)
if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
return handleCORS(NextResponse.json({ ok: true }), origin)
```

E-mail com template:

```js
await sendEmail({ to, subject, text, html: renderBrandedEmail({ title, ctaText, ctaUrl, contentHtml }) })
```

—

Atualizado em: 18/08/2025
