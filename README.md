# Sistema de Gestão - Belz (ERP)

## 📚 Documentação

- **[Cores e Estilos](DOC_CORES_E_ESTILOS.md)** - Sistema de cores dos status e como alterar
- **[Banco de Dados](DOC_SUPABASE.md)** - Estrutura e configurações do Supabase

### 🌐 Documentação Pública da API

Disponível sem autenticação em:

```text
/api-docs
```

Spec JSON bruto:

```text
/openapi.json
```

Edite/expanda em `app/openapi.json/route.js`.

// Pipelines CI (GitHub Actions) usam Yarn. Para gerar cobertura local:

```powershell
yarn test --coverage
Start-Process .\coverage\index.html
```

> Rotacione chaves sensíveis periodicamente; mantenha apenas variáveis necessárias.

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

Sistema ERP desenvolvido para a Belz, focado na gestão de propostas (implantação) e movimentações (solicitações). Arquitetura: Next.js (App Router) servindo frontend + rotas /api no mesmo projeto, com Supabase (Postgres) e Shadcn/UI; segurança robusta e controle de acesso por perfis (gestor, gerente, analistas especializados e consultor). Virtualização customizada substitui dependências externas para listas grandes.

## 🎯 Funcionalidades

### 👥 Sistema de Usuários (Roles Atuais)

| Role                  | Cria Propostas | Cria Movimentações | Edita Status (Próprias)        | Edita Status (Todas) | Gerencia Usuários | Exclui Propostas | Dashboards    |
| --------------------- | -------------- | ------------------ | ------------------------------ | -------------------- | ----------------- | ---------------- | ------------- |
| gestor                | ✅             | ✅                 | ✅                             | ✅                   | ✅                | ✅               | ✅            |
| gerente               | ✅             | ✅                 | ✅ (atribuídas / operacionais) | ✅ (operacionais)    | ❌                | ❌               | ✅            |
| analista_implantacao  | ✅ (suas)      | ❌                 | ✅ (suas)                      | ❌                   | ❌                | ❌               | ✅ (limitado) |
| analista_movimentacao | ❌             | ✅ (suas)          | ✅ (suas mov.)                 | ❌                   | ❌                | ❌               | ✅ (limitado) |
| consultor             | ✅ (suas)      | ✅ (suas)          | ❌                             | ❌                   | ❌                | ❌               | ❌            |
| analista_cliente      | ❌             | ❌                 | ❌                             | ❌                   | ❌                | ❌               | ✅ (limitado) |

Notas:

- analista_cliente: não enxerga abas de Propostas nem Movimentação; TEM acesso à Carteira de Clientes (escopo próprio — atua como consultor para cadastro/gestão de seus clientes). Acesso também a dashboard (próprio) e seções gerais futuras (ex.: Portal Cliente) sem dados sensíveis.

Autenticação: cookie de sessão + JWT interno com rate limiting.

### 📊 Gestão de Propostas & Movimentações

- Validação automática de CNPJ (3 APIs em cascata)
- Status personalizados para pipeline de vendas
- Múltiplas operadoras de saúde suportadas
- Tooltip no CNPJ exibindo Razão Social (via /api/validate-cnpj)
- Exibição de "Solicitado por" (nome + e-mail em tooltip) em propostas e movimentações não atribuídas
- Coluna “Email do Consultor” visível para gestores
- Filtros persistentes com chips removíveis (Propostas e Dashboard)
- Campos enriquecidos: `horas_em_analise` e `dias_em_analise` retornados pelo endpoint `/api/proposals` para evitar recomputo no cliente
- Badges de envelhecimento (≥24h / ≥48h) e destaques visuais no board/Kanban
- Edição inline de status com spinner individual por linha e bloqueio durante PATCH
- Formulário de nova movimentação: CNPJ é o primeiro campo; valida automaticamente ao atingir 14 dígitos; razão social auto-preenchida e bloqueada após validação.
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

1. Instale as dependências (Yarn padrão)

```powershell
yarn install --frozen-lockfile
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
EMAIL_FROM_NAME=ERP Belz
# TLS/SNI – defina quando o certificado do provedor for curinga (ex.: *.skymail.net.br)
SMTP_TLS_SERVERNAME=skymail.net.br
# NUNCA desabilite verificação de certificado em produção; use apenas para diagnóstico local
# SMTP_TLS_REJECT_UNAUTHORIZED=false

# Integrações
CNPJA_API_KEY=
NEXT_PUBLIC_BASE_URL=http://localhost:3000
ERP_APP_URL=http://localhost:3000

# Fallback de e-mail (opcional)
# Se não houver SMTP, defina a chave do Resend e o backend usará este provedor automaticamente
RESEND_API_KEY=
# Override geral de destino (staging)
EMAIL_OVERRIDE_TO=
```

1. Execute o projeto (Next.js serve frontend + rotas /api)

```powershell
yarn dev
```

Aplicação: <http://localhost:3000>. As rotas de API estão sob /api/\* e são servidas pelo Next.

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

### Propostas (simplificado – ver `DOC_SUPABASE.md` para schema completo)

```sql
CREATE TABLE propostas (
  id UUID PRIMARY KEY,
  codigo VARCHAR NOT NULL,            -- PRP0000 (sequencial, único, usado em e-mails/UI)
  cnpj VARCHAR(18) NOT NULL,
  consultor TEXT NOT NULL,
  consultor_email TEXT NOT NULL,
  operadora TEXT NOT NULL,            -- valores em OPERADORAS (lib/constants.js)
  quantidade_vidas INT,
  valor NUMERIC(12,2),
  previsao_implantacao DATE,
  status TEXT NOT NULL,               -- valores em STATUS_OPTIONS
  criado_por UUID REFERENCES usuarios(id),
  atendido_por UUID,                  -- quem assumiu
  criado_em TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

Status atuais (fonte da verdade: `lib/constants.js`):

`recepcionado`, `análise`, `pendência`, `pleito seguradora`, `boleto liberado`, `implantado`, `proposta declinada`.

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

````powershell
# Desenvolvimento
yarn dev

# Build para produção
yarn build

# Iniciar produção
yarn start

# Lint e formatação
yarn lint
yarn format

# Testes utilitários (e.g., validação de CNPJ, e-mails)
yarn test
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
- Idempotente por execução (não grava estado)
- Disparo manual, autenticado como gestor (sem cron)

Autorização: Usuário gestor autenticado (cookie / Bearer). Cron não é suportado.

Variáveis de ambiente:

- `STALE_PROPOSAL_ALERT_HOURS` (default 24)
- `PRIMARY_GESTOR_EMAIL`

Resposta (exemplo abreviado):

```json
{"proposals_found":3,"alerted":true,"threshold_hours":24}
````

Agendamento: não aplicável (sem cron). Execute manualmente quando necessário (gestor).

## 📈 Dashboard do Gestor (novo)

O dashboard do gestor foi redesenhado para fornecer uma visão macro e micro por seção com navegação por abas e métricas acionáveis.

Abas e conteúdos:

- Geral
  - KPIs: Total de propostas, Implantadas (com % de conversão), Pipeline (valor total), Valor Implantado (% do total)
  - Evolução (7 dias): linhas de Propostas Criadas x Assumidas por dia
  - Top Operadoras: pizza das 5 mais frequentes
  - Status das Propostas: barras por status (cores padronizadas)
  - Distribuição por Valor: buckets 0–2k, 2–5k, 5–10k, 10k+

- Propostas
  - KPIs: Em Andamento, Sem Responsável, Ticket Médio, Conversão (barra de progresso)
  - Ranking de Analistas (pipeline): top 5 com mais propostas em andamento
  - Cards de status com cores padronizadas (STATUS_COLORS)

- Movimentação
  - KPIs: Solicitações Totais, SLA Vencido (abertas), Idade Média (dias), Concluídas
  - Status das Solicitações: barras por status (SOLICITACAO_STATUS_COLORS)
  - Resumo rápido por status

- Equipe
  - KPIs: Usuários cadastrados, Online (derivado), Maior Workload (nome), Implantações 30d (soma top 5)
  - Top Workload (em andamento) e Top Implantações (30d), com indicador de presença

Outras características:

- Alerta proativo: lista de propostas sem responsável há >24h (SLA de triagem) em destaque.
- Padrões de UI: `shadcn/ui` (Cards, Tabs, Badge, Progress) e gráficos via `recharts` usando wrapper `components/ui/chart`.
- Cores: `STATUS_COLORS` e `SOLICITACAO_STATUS_COLORS` garantem consistência visual entre Propostas e Movimentação.
- Desempenho: cálculos client‑side com operações lineares sobre os dados já carregados do `/api`.

## Windows: preparar/remover cache do Next.js

```powershell
yarn windows:next-cache:setup
yarn windows:next-cache:remove
```

## 🎯 Metas (modelo atualizado)

Novo modelo (2025-09) utiliza tabela `metas` mensal por usuário. Versão antiga baseada em `valor_meta/valor_alcancado` permanece para compatibilidade em migrações anteriores; a visão funcional atual usa recomputo dinâmico.

```sql
CREATE TABLE metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INT NOT NULL,
  quantidade_implantacoes INT DEFAULT 0
);
```

Regras de atualização:

1. Backend ajusta `quantidade_implantacoes` quando há transição de status envolvendo `implantado` (to/from) – delta controlado em trigger / lógica de API.
2. `GET /api/goals` retorna metas consolidadas e recalcula progresso real somando propostas com status `implantado` (evita drift se trigger falhar).
3. `PATCH /api/goals` (gestor) permite ajustar meta alvo (quando ainda existir colunas antigas de valor, são ignoradas na visão atual).
4. `POST /api/goals` força recálculo de progresso armazenado.

Importante: não persistir cálculos derivados no frontend; sempre consumir `/api/goals` para consistência.

## 🗃️ Migração opcional: backfill e índice (consultor_email)

Para melhorar a visibilidade de propostas antigas para analistas e a performance de consultas, aplique a migração em `scripts/migrations/2025-08-19-backfill-consultor-email-and-index.sql` no Supabase. Ela:

- Preenche `consultor_email` quando estiver vazio, usando o e-mail do criador
- Normaliza `consultor_email` para minúsculas
- Cria índice `idx_propostas_consultor_email` se não existir

## 🌐 Deploy

Recomendado: Vercel (configurar variáveis no painel e usar deploy padrão) ou outra plataforma Node. Não há pipeline automatizado versionado neste momento.

## Variáveis de ambiente para produção

```env
NODE_ENV=production
CORS_ORIGINS=https://seudominio.com
JWT_SECRET=chave_ainda_mais_forte_para_producao
NEXT_PUBLIC_BASE_URL=https://seudominio.com
ERP_APP_URL=https://seudominio.com
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

Fluxo sugerido:

1. Branch a partir de `testes`.
2. Commits pequenos e descritivos.
3. PR para revisão.

Guias:

- `COPILOT_GUIDE.md`
- `COPILOT_INSTRUCTIONS.md`
- (Opcional se existir) `CONTRIBUTING.md`

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

### Cálculo de usuários “online”

Um usuário é considerado online se possui sessão sem `data_logout` e com `ultimo_ping` recente (ex.: nos últimos 2 minutos). O cliente envia pings a cada ~60s.

—
Atualizado em: 29/08/2025

Observação: Este sistema contém dados sensíveis. Siga as melhores práticas de segurança e nunca exponha credenciais ou chaves de API.

## 🧩 Virtualização de Listas

Foi removida a dependência de bibliotecas externas de virtualização. A tela de Propostas utiliza um componente interno `VirtualList` (altura fixa por item, overscan configurável) para reduzir custo de renderização em grandes volumes. Diretrizes:

- Evite reintroduzir `react-window` ou similares sem justificativa de benchmark.
- Ao adicionar novas colunas pesadas, medir impacto antes/depois (Chrome Performance).
- Para alturas variáveis futuras, criar estratégia de medição incremental (resize observer) em outro componente ao invés de acoplar no atual.

## 🔄 CI / Qualidade

GitHub Actions padronizado em Yarn (--frozen-lockfile). Não adicionar `package-lock.json`. Passos típicos:
1. Instalação: `yarn install --frozen-lockfile`
2. Lint/Test: `yarn lint` / `yarn test`
3. (Futuro) Build: `yarn build`

Falhas comuns:
- Erro de lock: remover qualquer `package-lock.json` residual.
- Dependência dev somente local: sempre commitar `yarn.lock`.

## 📌 Roadmap Curto (Sugerido)

- CSP mais restritivo (remover fontes wildcard se possível)
- Testes de integração adicionais para fluxo de movimentações
- Normalização de logs de auditoria em propostas (excluir campos calculados)
- Health check mais completo (latência de query simples + tempo de hash bcrypt simulada)

—
Atualizado em: 03/09/2025
```
