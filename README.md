# Sistema de Gestão - Belz

![CI](https://github.com/MayconBenvenuto/admbelz/actions/workflows/ci.yml/badge.svg)
![CodeQL](https://github.com/MayconBenvenuto/admbelz/actions/workflows/codeql.yml/badge.svg)

> Segurança: Code Scanning (CodeQL) habilitado. Alertas podem ser vistos em Security > Code scanning alerts. Mantenha o workflow sem `continue-on-error` para quebrar o build em falhas de análise crítica se desejar no futuro.

## 🛠️ CI/CD Profissional e Segurança

Esta base inclui agora um pipeline mais robusto.

### Workflows

| Workflow | Objetivo | Frequência |
|----------|----------|------------|
| CI (`ci.yml`) | Lint, type-check, testes com coverage, build e artefatos | PR / push / manual |
| Auto PR (`auto-pr-testes-to-dev.yml`) | Abre PR de `testes` para `dev` e realiza merge automático se checks passarem | Push em `testes` |
| CodeQL (`codeql.yml`) | Análise SAST de vulnerabilidades | PR / push / semanal |
| Gitleaks (`gitleaks.yml`) | Varredura de segredos | PR / push main / manual |
| Alerta Propostas (`stale-proposals-alert.yml`) | Verificação de propostas estagnadas | Diário 09:00 BRT |

### Artefatos e Relatórios

| Item | Local |
|------|-------|
| Coverage testes | Artifact `coverage/` (Vitest) |
| Build Next | Artifact `next-build/` |
| Scan segredos | SARIF (Security tab) |
| CodeQL findings | Security > Code scanning |

### Futuras Melhorias Sugeridas

1. Adicionar job de migrações em container Postgres efêmero.
2. Gerar SBOM (cyclonedx-npm) e publicar como artifact.
3. Enforce conventional commits (commitlint action).
4. Medir tamanho de bundle (next build --analyze) e alertar regressões.
5. Adicionar limites de cobertura (ex. 70%).
6. Pipeline de deploy (preview em `dev`, produção em `main`).

### Dependabot

Configuração semanal para npm e GitHub Actions em `.github/dependabot.yml` mantendo dependências atualizadas com prefixos de commit padrão.

### Segurança (Pipeline)

Integração CodeQL + Gitleaks reforça análise estática e detecção de segredos antes do merge.

### Como Consumir Cobertura Localmente

```powershell
npm run test -- --coverage
Start-Process .\coverage\index.html
```

> Mantenha os secrets mínimos e rotacione chaves sensíveis periodicamente.

```sql
-- Atualização de sessões órfãs
UPDATE public.sessoes
SET ultimo_ping = data_logout
WHERE ultimo_ping IS NULL AND data_logout IS NOT NULL;

UPDATE public.sessoes
SET ultimo_ping = data_login
WHERE ultimo_ping IS NULL;

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_sessoes_ultimo_ping ON public.sessoes (ultimo_ping DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_sessoes_usuario_id ON public.sessoes (usuario_id);
```

Sistema de CRM desenvolvido para a Belz, focado na gestão de propostas de planos de saúde. Arquitetura atual: Next.js (App Router) servindo frontend e backend (rotas /api) no mesmo projeto, com Supabase (Postgres) e Shadcn/UI; segurança robusta e controle de acesso por perfis (analista/gestor).

## 🎯 Funcionalidades

### 👥 Sistema de Usuários

- **Analistas**: Criam e visualizam propostas
- **Consultores**: Acesso apenas à tela de Movimentação
- **Gestores**: Monitoram, alteram status e excluem propostas
- **Autenticação**: JWT + bcrypt com rate limiting

### 📊 Gestão de Propostas

- Validação automática de CNPJ (3 APIs em cascata)
- Status personalizados para pipeline de vendas
- Múltiplas operadoras de saúde suportadas
- Tooltip no CNPJ exibindo Razão Social (via /api/validate-cnpj)
- Coluna “Email do Consultor” visível para gestores
- Filtros persistentes com chips removíveis (Propostas e Dashboard)
- Campos enriquecidos: `horas_em_analise` e `dias_em_analise` retornados pelo endpoint `/api/proposals` para evitar recomputo no cliente
- Badges de envelhecimento (≥24h / ≥48h) e destaques visuais no board/Kanban
- Edição inline de status com spinner individual por linha e bloqueio durante PATCH
- Toasts de SLA: avisos em marcos (ex.: 8h, 24h, 48h) para acompanhamento proativo
- Alerta automático de propostas paradas (≥24h) via endpoint dedicado (ver seção "Alertas")

### 🔒 Segurança

- Headers de segurança implementados
- Sanitização de inputs contra XSS
- Rate limiting anti-bruteforce
- Logs sanitizados sem dados sensíveis

## 🔧 Como rodar

1. Clone o repositório

```powershell
git clone https://github.com/MayconBenvenuto/emergent-crm-adm.git
Set-Location emergent-crm-adm
```

1. Instale as dependências

```powershell
npm install
```

1. Configure as variáveis de ambiente

Aviso: nunca commite arquivos .env.

Copie o arquivo de exemplo e preencha os valores:

```powershell
Copy-Item .env.example .env
```

Configure as seguintes variáveis no arquivo `.env`:

```env
# Supabase (obrigatório)
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_de_servico

# Segurança (obrigatório)
JWT_SECRET=uma_chave_super_secreta_com_no_minimo_32_caracteres
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=86400000

# CORS (ajuste para seu domínio)
CORS_ORIGINS=http://localhost:3000,https://seudominio.com

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# E-mail (SMTP)
SMTP_HOST=smtp.seudominio.com
SMTP_PORT=587
SMTP_USER=usuario
SMTP_PASS=senha
EMAIL_FROM=comunicacao@belzseguros.com.br
EMAIL_FROM_NAME=CRM Belz
# TLS/SNI – defina quando o certificado do provedor for curinga (ex.: *.skymail.net.br)
SMTP_TLS_SERVERNAME=skymail.net.br
# NUNCA desabilite verificação de certificado em produção; use apenas para diagnóstico local
# SMTP_TLS_REJECT_UNAUTHORIZED=false

# Integrações
CNPJA_API_KEY=
NEXT_PUBLIC_BASE_URL=http://localhost:3000
CRM_APP_URL=http://localhost:3000
 
# Fallback de e-mail (opcional)
# Se não houver SMTP, defina a chave do Resend e o backend usará este provedor automaticamente
RESEND_API_KEY=
# Override geral de destino (staging)
EMAIL_OVERRIDE_TO=
```

1. Execute o projeto (Next.js serve o frontend e as rotas de API)

```powershell
npm run dev
```

Aplicação: <http://localhost:3000>. As rotas de API estão sob /api/* e são servidas pelo Next.

## 🔐 Segurança

### ✅ Implementados


- **Autenticação JWT** com expiração configurável
- **Hash de senhas** com bcrypt (12 rounds)
- **Rate limiting** por IP para login
- **Sanitização de entrada** contra XSS
- **CORS restritivo** por domínio
- **Headers de segurança** (CSP, HSTS, etc.)
- **Logs sanitizados** sem dados sensíveis
- **Validação de entrada** rigorosa
- **Timeouts de API** para evitar DoS
- **CORS** atualizado para permitir PATCH (PUT removido do projeto)

### E-mail e TLS

- Para erros de certificado do provedor (Hostname/IP does not match certificate's altnames), configure `SMTP_TLS_SERVERNAME` para o domínio do certificado (ex.: `skymail.net.br`).
- Evite usar `SMTP_TLS_REJECT_UNAUTHORIZED=false` em produção. Use apenas localmente para diagnóstico.
- Opcional: `RESEND_API_KEY` como fallback quando SMTP não estiver disponível.

### 🔒 Headers de Segurança


- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (produção)
- `Referrer-Policy: strict-origin-when-cross-origin`

### 🛡️ Proteções Implementadas


- **SQL Injection**: Queries parametrizadas via Supabase
- **XSS**: Sanitização de entrada e headers CSP
- **CSRF**: Tokens de sessão e CORS restritivo
- **Brute Force**: Rate limiting progressivo
- **Session Hijacking**: JWT com expiração

## 📊 Modelos de Dados

### Usuários

```sql
CREATE TABLE usuarios (
  id UUID PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL, -- Hashed com bcrypt
  tipo_usuario VARCHAR(50) NOT NULL -- 'gestor' | 'analista' | 'consultor'
);
```

### Propostas

```sql
CREATE TABLE propostas (
  id UUID PRIMARY KEY,
  cnpj VARCHAR(14) NOT NULL,
  consultor VARCHAR(255) NOT NULL,
  consultor_email VARCHAR(255) NOT NULL,
  operadora VARCHAR(255) NOT NULL,
  quantidade_vidas INTEGER,
  valor DECIMAL(15,2),
  status VARCHAR(50) DEFAULT 'em análise',
  criado_por UUID REFERENCES usuarios(id),
  criado_em TIMESTAMP DEFAULT NOW()
);
```

## 🚨 Alertas de Segurança

### ❌ NÃO FAÇA

- Commitar arquivos `.env`
- Usar senhas fracas
- Expor APIs sem autenticação
- Logar dados sensíveis
- Usar CORS `*` em produção

### ✅ SEMPRE FAÇA

- Use senhas fortes (mín. 12 caracteres)
- Configure CORS para domínios específicos
- Monitore logs de segurança
- Atualize dependências regularmente
- Use HTTPS em produção

## 🔧 Scripts

```powershell
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar produção
npm start

# Lint e formatação
npm run lint
npm run format

# Testes utilitários (e.g., validação de CNPJ, e-mails)
node .\tests\test_email_api.js
node .\tests\test_email_send.js
node .\test_cnpj_validation.js

# Migration
# Adicione a coluna obrigatória consultor_email em bases existentes:
# veja scripts/migrations/2025-08-18-add-consultor-email.sql

## 🔔 Alertas Automáticos

### Propostas Paradas (≥24h)

Endpoint: `GET /api/alerts/proposals/stale`

Identifica propostas com status `em análise` cujo tempo desde `criado_em` ≥ `STALE_PROPOSAL_ALERT_HOURS` (padrão 24) e dispara e‑mail para:

- Todos os usuários com `tipo_usuario = 'gestor'`
- E o e‑mail definido em `PRIMARY_GESTOR_EMAIL` (sempre incluído, mesmo se não existir usuário)

Características:

- Sem limite superior de idade: continua notificando enquanto permanecer `em análise`
- Idempotente por execução (não grava estado); para diminuir repetição ajuste a frequência do cron
- Pode ser chamado manualmente autenticado como gestor

Autorização:

1. Cron externo: enviar header `X-Cron-Key: <CRON_SECRET>` (quando definido)
2. Usuário gestor autenticado (cookie / Bearer)

Variáveis de ambiente:

- `STALE_PROPOSAL_ALERT_HOURS` (default 24)
- `PRIMARY_GESTOR_EMAIL`
- `CRON_SECRET` (opcional)

Resposta (exemplo abreviado):

```json
{"proposals_found":3,"alerted":true,"threshold_hours":24}
```

Agendamento sugerido: a cada hora. Ajuste conforme necessidade de ruído vs. rapidez.

## 📈 Dashboard Analítico (Gestor)

O dashboard para gestores foi reformulado para privilegiar métricas operacionais e previsivas em vez de gráficos de funil genéricos ou heatmaps de baixo valor.

### Conjunto Atual de Cards / Gráficos

- Status (ABS/% toggle): barras horizontais mostrando contagem e proporção de propostas por status.
- Top Operadoras (ABS/% + Conversão): distribuição de propostas e taxa de conversão (implantado / total) por operadora.
- Aging Buckets: distribuição por faixas de idade em análise (ex.: 0–7h, 8–23h, 24–47h, 48–71h, ≥72h).* Faixas podem ser ajustadas no código.
- SLA Assunção: tempo até primeira ação/assunção com métricas: média, p95, % ≤8h, % ≤24h.
- Evolução 7 Dias: sparkline de volume diário de novas propostas / implantações recentes.
- Value Buckets: segmentação de propostas por faixas de `valor` (configurável) para entender mix de ticket.
- Forecast Meta: projeção de atingimento mensal extrapolando média diária MTD (month-to-date) vs meta acumulada requerida.
- Ranking Analistas: ordenação por implantações (ou valor implantado) com destaques (medalhas, barra de conversão).

#### Movimentações (Solicitações) – Macros (Gestor)

- Movimentações Totais (todas as solicitações)
- Abertas / Em Execução (soma e breakdown)
- Concluídas (e canceladas)
- Atrasadas (SLA previsto ultrapassado e não concluída/cancelada) + % do total
- Status Movimentações (barras e % por grupo)
- SLA Assunção Movimentações (média horas da criação até primeiro status diferente de "aberta")

Removed / Substituídos:

- Funil de conversão estático → substituído pelos cards combinados (Status + Conversão por Operadora + Forecast)
- Heatmap de atividade → substituído por Aging + Evolução 7 Dias (mais diretamente acionáveis)

### Interações / UX

- Toggle ABS/% persiste na sessão (localStorage)
- Tooltips explicam fórmulas e limites (ex.: forecast = média diária * dias úteis restantes)
- Cálculos feitos client-side (sem novas consultas) usando dados já retornados de `/api/proposals`
- Operações O(n) linear sobre a lista de propostas (sem agregações redundantes)

### Forecast (Simplificação Atual)

Projeção linear: `proj = (valor_implantado_mtd / dias_passados) * dias_totais_mes`. Percentual de progresso = `valor_implantado_mtd / meta`. Ajustes futuros podem considerar sazonalidade ou pesos por dia da semana.

## Windows: preparar/remover cache do Next.js

```powershell
npm run windows:next-cache:setup
npm run windows:next-cache:remove
```


## 🎯 Metas (lógica de negócio)

- A meta do analista considera o somatório das propostas com status `implantado`.
- Transição de status aplica deltas na meta via RPC `atualizar_meta_usuario`:
  - De qualquer status → `implantado`: soma o valor da proposta.
  - De `implantado` → outro status: subtrai o valor da proposta.
- O endpoint `GET /api/goals` retorna o valor alcançado calculado dinamicamente a partir das propostas `implantado` por usuário, evitando duplicações.

## 🗃️ Migração opcional: backfill e índice (consultor_email)

Para melhorar a visibilidade de propostas antigas para analistas e a performance de consultas, aplique a migração em `scripts/migrations/2025-08-19-backfill-consultor-email-and-index.sql` no Supabase. Ela:

- Preenche `consultor_email` quando estiver vazio, usando o e-mail do criador
- Normaliza `consultor_email` para minúsculas
- Cria índice `idx_propostas_consultor_email` se não existir

## 🌐 Deploy

### Vercel (Recomendado)

```bash
# 1. Configure as variáveis de ambiente no painel da Vercel
# 2. Deploy
vercel --prod
```

## Variáveis de ambiente para produção

```env
NODE_ENV=production
CORS_ORIGINS=https://seudominio.com
JWT_SECRET=chave_ainda_mais_forte_para_producao
NEXT_PUBLIC_BASE_URL=https://seudominio.com
CRM_APP_URL=https://seudominio.com
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW=900000
```

## 📈 Monitoramento

O sistema inclui:

- **Logs de acesso** com IP e timestamp
- **Métricas de sessão** por usuário
- **Alertas de rate limiting**
- **Dashboard de segurança** para gestores
- **Alerta de propostas paradas** (≥24h)

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### 📘 Guias

- Guia do Copilot detalhado: `COPILOT_GUIDE.md`
- Instruções para o Copilot e padrões do projeto: `COPILOT_INSTRUCTIONS.md`
- Processos de contribuição: `CONTRIBUTING.md`

## 📄 Licença

Este projeto é privado e proprietário da Belz.

## 🆘 Suporte

Em caso de problemas de segurança, entre em contato imediatamente com a equipe de desenvolvimento.

## 🕒 Sessões e Heartbeat (Online/Offline)

Este projeto usa cookie de sessão HttpOnly e sessionStorage para controlar a sessão do usuário:

- Cookie `crm_auth` (HttpOnly, SameSite=Lax, sem Max-Age/Expires) é definido no login e removido no logout.
- No cliente, os dados da sessão (usuário, sessionId, last_activity e opcionalmente o token) são guardados no `sessionStorage` apenas durante a sessão do navegador.
- Recarregar a página mantém o login (bootstrap via `GET /api/auth/me`), mas ao fechar o navegador a sessão é perdida e será necessário novo login ao reabrir.
- Todas as chamadas `fetch` do cliente para `/api/*` usam `credentials: 'include'` para garantir o envio do cookie.

### Endpoints de sessão

- `GET /api/auth/me` → Retorna o usuário autenticado com base no cookie/token.
- `POST /api/sessions/ping` → Atualiza `ultimo_ping` da sessão do usuário para melhorar o cálculo de “online”.

### SQL (migration opcional) – coluna de heartbeat

```sql
ALTER TABLE public.sessoes
  ADD COLUMN IF NOT EXISTS ultimo_ping TIMESTAMPTZ;

-- Backfill básico

## 🛠️ CI/CD Profissional e Segurança

Esta base inclui agora um pipeline mais robusto.

### Workflows

| Workflow | Objetivo | Frequência |
|----------|----------|------------|
| CI (`ci.yml`) | Lint, type-check, testes com coverage, build e artefatos | PR / push / manual |
## 🛠️ CI/CD Profissional e Segurança

Esta base inclui agora um pipeline mais robusto:

### Workflows

| Workflow | Objetivo | Frequência |
|----------|----------|------------|
| CI (`ci.yml`) | Lint, type-check, testes com coverage, build e artefatos | PR / push / manual |
| Auto PR (`auto-pr-testes-to-dev.yml`) | Abre PR de `testes` para `dev` e realiza merge automático se checks passarem | Push em `testes` |
| CodeQL (`codeql.yml`) | Análise SAST de vulnerabilidades | PR / push / semanal |
| Gitleaks (`gitleaks.yml`) | Varredura de segredos | PR / push main / manual |
| Alerta Propostas (`stale-proposals-alert.yml`) | Verificação de propostas estagnadas | Diário 09:00 BRT |

### Artefatos e Relatórios

| Item | Local |
|------|-------|
| Coverage testes | Artifact `coverage/` (Vitest) |
| Build Next | Artifact `next-build/` |
| Scan segredos | SARIF (Security tab) |
| CodeQL findings | Security > Code scanning |

### Futuras Melhorias Sugeridas (CI/CD)

1. Adicionar job de migrações em container Postgres efêmero.
2. Gerar SBOM (cyclonedx-npm) e publicar como artifact.
3. Enforce conventional commits (commitlint action).
4. Medir tamanho de bundle (next build --analyze) e alertar regressões.
5. Adicionar limites de cobertura (ex. 70%).
6. Pipeline de deploy (preview em `dev`, produção em `main`).

### Dependabot

Configuração semanal para npm e GitHub Actions em `.github/dependabot.yml` mantendo dependências atualizadas.

### Segurança (Pipelines)

Integração CodeQL + Gitleaks reforça análise estática e detecção de segredos antes do merge.

### Reabrir Relatório de Cobertura

```powershell
Start-Process .\coverage\index.html
```

> Mantenha os secrets mínimos e rotacione chaves sensíveis periodicamente.

```sql
UPDATE public.sessoes
SET ultimo_ping = data_logout
WHERE ultimo_ping IS NULL AND data_logout IS NOT NULL;

UPDATE public.sessoes
SET ultimo_ping = data_login
WHERE ultimo_ping IS NULL;

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_sessoes_ultimo_ping ON public.sessoes (ultimo_ping DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_sessoes_usuario_id ON public.sessoes (usuario_id);
```

### Cálculo de usuários “online”

Um usuário é considerado online se possui sessão sem `data_logout` e com `ultimo_ping` recente (ex.: nos últimos 2 minutos). O cliente envia pings a cada ~60s.

—
Atualizado em: 29/08/2025

Observação: Este sistema contém dados sensíveis. Siga as melhores práticas de segurança e nunca exponha credenciais ou chaves de API.
