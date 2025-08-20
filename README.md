# CRM Belz – Sistema de Gestão de Propostas

Sistema de CRM desenvolvido para a Belz, focado na gestão de propostas de planos de saúde. Arquitetura atual: Next.js (App Router) servindo frontend e backend (rotas /api) no mesmo projeto, com Supabase (Postgres) e Shadcn/UI; segurança robusta e controle de acesso por perfis (analista/gestor).

## 🎯 Funcionalidades

### 👥 Sistema de Usuários

- **Analistas**: Criam e visualizam propostas
- **Gestores**: Monitoram, alteram status e excluem propostas
- **Autenticação**: JWT + bcrypt com rate limiting

### 📊 Gestão de Propostas

- Validação automática de CNPJ (3 APIs em cascata)
- Status personalizados para pipeline de vendas
- Múltiplas operadoras de saúde suportadas
- Dashboard com métricas e gráficos
- Tooltip no CNPJ exibindo Razão Social (via /api/validate-cnpj)
- Coluna “Email do Consultor” visível para gestores
- Filtros persistentes com chips removíveis (Propostas e Dashboard)

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
  tipo_usuario VARCHAR(50) NOT NULL -- 'gestor' ou 'analista'
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

# Windows: preparar/remover cache do Next.js
npm run windows:next-cache:setup
npm run windows:next-cache:remove
```

## � Metas (lógica de negócio)

- A meta do analista considera o somatório das propostas com status `implantado`.
- Transição de status aplica deltas na meta via RPC `atualizar_meta_usuario`:
  - De qualquer status → `implantado`: soma o valor da proposta.
  - De `implantado` → outro status: subtrai o valor da proposta.
- O endpoint `GET /api/goals` retorna o valor alcançado calculado dinamicamente a partir das propostas `implantado` por usuário, evitando duplicações.

## �🗃️ Migração opcional: backfill e índice (consultor_email)

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

### Variáveis de ambiente para produção

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

—
Atualizado em: 20/08/2025

Observação: Este sistema contém dados sensíveis. Siga as melhores práticas de segurança e nunca exponha credenciais ou chaves de API.
