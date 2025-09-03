# 📋 DOCUMENTAÇÃO COMPLETA - SISTEMA CRM BELZ

## 📌 VISÃO GERAL DO PROJETO

### Descrição
Sistema de CRM completo desenvolvido para a empresa Belz, especializada em seguros de saúde. O sistema gerencia propostas, movimentações (solicitações), usuários e metas, com controle rigoroso de acesso baseado em perfis de usuário e arquitetura de segurança robusta.

### Arquitetura
- **Frontend + Backend**: Next.js 14.2.3 com App Router servindo tanto a interface quanto as APIs (/api/*)
- **Porta única**: 3000 (desenvolvimento) - sem proxy externo
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: JWT + bcryptjs com cookies HttpOnly
- **UI**: Shadcn/UI + TailwindCSS + Lucide Icons
- **Fonte**: Montserrat (Google Fonts)
- **Cores da marca**: #130E54, #021d79, #f6f6f6

---

## 🔧 STACK TECNOLÓGICO

### Dependências Principais
```json
{
  "next": "14.2.3",
  "react": "^18",
  "@supabase/supabase-js": "^2.55.0",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "tailwindcss": "^3.4.1",
  "lucide-react": "^0.516.0",
  "sonner": "^2.0.5",
  "recharts": "^2.15.4",
  "zod": "^3.25.67"
}
```

### UI Components (Shadcn/UI + Radix)
- @radix-ui/react-* (todos os componentes fundamentais)
- class-variance-authority
- clsx + tailwind-merge
- cmdk (command palette)
- framer-motion
- embla-carousel-react

### Ferramentas de Desenvolvimento
- TypeScript 5.6.2
- ESLint + Prettier
- Vitest 3.2.4 (testes)
- @vitest/coverage-v8 (cobertura)
- Concurrently (scripts paralelos)

---

## 🏗️ ESTRUTURA DO PROJETO

```
emergent-crm-adm/
├── 📁 app/                          # Next.js App Router
│   ├── globals.css                  # Estilos globais + CSS variables
│   ├── layout.js                    # Layout raiz com metadata
│   ├── page.js                      # Página principal (SPA)
│   ├── 📁 api/                      # Rotas de API
│   │   ├── [[...path]]/route.js     # Catch-all 404
│   │   ├── auth/route.js             # Login/logout/me
│   │   ├── proposals/route.js        # CRUD propostas
│   │   ├── users/route.js            # Gestão usuários
│   │   ├── goals/route.js            # Metas e estatísticas
│   │   ├── solicitacoes/route.js     # CRUD movimentações
│   │   ├── sessions/route.js         # Controle sessões
│   │   ├── reports/route.js          # Relatórios
│   │   ├── alerts/route.js           # Sistema de alertas
│   │   ├── validate-cnpj/route.js    # Validação CNPJ
│   │   ├── email-test/route.js       # Teste de e-mail
│   │   ├── clientes/route.js         # Gestão clientes
│   │   ├── health/route.js           # Health check
│   │   └── test/route.js             # Endpoints de teste
│   └── 📁 sections/                 # Componentes de seção
│       ├── Sidebar.jsx              # Menu lateral
│       ├── Header.jsx               # Cabeçalho
│       ├── MobileSidebar.jsx        # Menu mobile
│       ├── Dashboard.jsx            # Dashboard principal
│       ├── Proposals.jsx            # Gestão de propostas
│       ├── Movimentacao.jsx         # Gestão de movimentações
│       ├── Users.jsx                # Gestão de usuários
│       ├── Reports.jsx              # Relatórios
│       ├── CarteiraClientes.jsx     # Carteira de clientes
│       ├── ConsultorDashboard.jsx   # Dashboard do consultor
│       └── Implantacao.jsx          # Processo de implantação
├── 📁 components/                   # Componentes reutilizáveis
│   ├── keep-alive-ping.jsx         # Ping de manutenção de sessão
│   ├── 📁 auth/                     # Componentes de autenticação
│   ├── 📁 solicitacoes/             # Componentes de movimentação
│   │   ├── NovaSolicitacaoDialog.jsx
│   │   └── NovaSolicitacaoDialogBackup.jsx
│   ├── 📁 timeline/                 # Componentes de timeline
│   └── 📁 ui/                       # Shadcn/UI components
│       ├── button.jsx
│       ├── card.jsx
│       ├── dialog.jsx
│       ├── form.jsx
│       ├── input.jsx
│       ├── table.jsx
│       ├── toast.jsx
│       ├── sonner.jsx
│       └── [outros componentes]
├── 📁 lib/                          # Utilitários e configurações
│   ├── security.js                 # Funções de segurança
│   ├── supabase.js                 # Cliente Supabase
│   ├── supabase-client.js          # Cliente lado servidor
│   ├── constants.js                # Constantes do sistema
│   ├── email.js                    # Configuração de e-mail
│   ├── email-template.js           # Templates de e-mail
│   ├── rbac.js                     # Controle de acesso
│   ├── api-helpers.js              # Helpers para APIs
│   └── utils.js                    # Utilitários gerais
├── 📁 hooks/                        # React Hooks customizados
│   ├── use-mobile.jsx              # Hook para detecção mobile
│   └── use-toast.js                # Hook para toasts
├── 📁 scripts/                      # Scripts de automação
│   ├── supabase-introspect.mjs     # Introspecção do banco
│   ├── test-utils.mjs              # Utilitários de teste
│   ├── migrate-security.js         # Migração de segurança
│   ├── clone-test-to-prod.ps1      # Clone teste → produção
│   ├── 📁 migrations/              # Migrações SQL
│   └── 📁 windows/                 # Scripts Windows
├── 📁 tests/                        # Testes automatizados
│   ├── *.test.mjs                  # Testes Vitest
│   ├── test_email_api.js           # Teste de API e-mail
│   └── test_email_send.js          # Teste envio e-mail
├── 📁 supabase/                     # Configurações Supabase
│   ├── 📁 migrations/              # Migrações SQL
│   └── 📁 maintenance/             # Scripts de manutenção
├── 📁 backups/                      # Backups do banco
├── 📁 coverage/                     # Relatórios de cobertura
├── 📁 public/                       # Arquivos estáticos
│   ├── favicon.svg
│   ├── logo-belz.jpg
│   └── logo-belz-email.png
├── components.json                  # Configuração Shadcn/UI
├── next.config.js                  # Configuração Next.js
├── tailwind.config.js              # Configuração Tailwind
├── middleware.js                   # Middleware Next.js
├── package.json                    # Dependências e scripts
├── database_setup.sql              # Setup inicial do banco
└── 📄 Documentações/
    ├── README.md                   # Documentação principal
    ├── DOC_SUPABASE.md            # Documentação do banco
    ├── DOC_CORES_E_ESTILOS.md     # Sistema de cores
    ├── COPILOT_INSTRUCTIONS.md    # Instruções para Copilot
    ├── COPILOT_GUIDE.md           # Guia do Copilot
    ├── FUNCIONALIDADE_STATUS.md   # Status das funcionalidades
    ├── SISTEMA_ALERTAS.md         # Sistema de alertas
    ├── TIMELINE_DOCUMENTATION.md  # Documentação timeline
    └── CHANGELOG_CORES.md         # Changelog de cores
```

---

## 🛡️ SISTEMA DE SEGURANÇA

### Autenticação e Autorização
- **JWT Tokens**: Expiração de 24h, assinatura HMAC-SHA256
- **Cookies HttpOnly**: `crm_auth` com SameSite=Lax
- **Rate Limiting**: 100 requisições por 15 minutos por IP
- **bcryptjs**: Hash de senhas com 12 rounds

### Headers de Segurança
```javascript
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': 'default-src self; script-src self; ...',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload' // produção
}
```

### Sanitização e Validação
```javascript
// lib/security.js
sanitizeInput(input)     // Remove HTML, limita tamanho
validateEmail(email)     // Regex de validação
validateCNPJ(cnpj)      // Validação de formato
sanitizeForLog(data)    // Remove dados sensíveis dos logs
```

### Controle de Acesso (RBAC)
```javascript
// lib/rbac.js
hasPermission(user, action, resource)
canEditProposal(user, proposal)
canDeleteProposal(user, proposal)
canManageUsers(user)
```

---

## 👥 PERFIS DE USUÁRIO

### 1. Gestor
**Permissões Completas:**
- ✅ Criar, editar, excluir propostas
- ✅ Criar, editar, excluir movimentações
- ✅ Gerenciar usuários (CRUD completo)
- ✅ Visualizar todos os relatórios
- ✅ Acessar dashboard completo
- ✅ Receber alertas de propostas paradas

### 2. Gerente
**Gestão Operacional:**
- ✅ Criar, editar propostas (não excluir)
- ✅ Criar, editar movimentações (não excluir)
- ✅ Visualizar relatórios operacionais
- ✅ Acessar dashboard completo
- ❌ Gerenciar usuários

### 3. Analista de Implantação (`analista_implantacao`)
**Foco em Propostas:**
- ✅ Criar propostas
- ✅ Editar suas próprias propostas
- ✅ Alterar status das propostas que atende
- ✅ Dashboard pessoal
- ❌ Acessar movimentações
- ❌ Gerenciar usuários

### 4. Analista de Movimentação (`analista_movimentacao`)
**Foco em Movimentações:**
- ✅ Criar movimentações
- ✅ Editar suas próprias movimentações
- ✅ Alterar status das movimentações que atende
- ✅ Dashboard pessoal
- ❌ Acessar propostas
- ❌ Gerenciar usuários

### 5. Consultor
**Acesso Limitado:**
- ✅ Criar propostas e movimentações
- ✅ Visualizar apenas as próprias
- ❌ Alterar status após atribuição
- ❌ Acessar relatórios
- ❌ Dashboard completo

---

## 🗄️ MODELO DE DADOS

### Esquema Principal

#### 👤 usuarios
```sql
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL, -- bcrypt hash
  tipo_usuario TEXT CHECK (tipo_usuario IN (
    'gestor', 'gerente', 'analista_implantacao', 
    'analista_movimentacao', 'consultor'
  )) NOT NULL,
  status_presenca TEXT DEFAULT 'offline',
  ultimo_refresh TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ
);
```

#### 📄 propostas
```sql
CREATE TABLE propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR UNIQUE, -- Formato PRP0000 (sequencial)
  cnpj VARCHAR(18) NOT NULL,
  consultor TEXT NOT NULL,
  consultor_email TEXT NOT NULL,
  operadora TEXT CHECK (operadora IN (
    'unimed recife', 'unimed seguros', 'bradesco', 'amil', 
    'ampla', 'fox', 'hapvida', 'medsenior', 'sulamerica', 'select'
  )) NOT NULL,
  quantidade_vidas INT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  previsao_implantacao DATE,
  status TEXT CHECK (status IN (
    'recepcionado', 'análise', 'pendência', 'pleito seguradora',
    'boleto liberado', 'implantado', 'proposta declinada'
  )) NOT NULL DEFAULT 'recepcionado',
  criado_por UUID REFERENCES usuarios(id),
  atendido_por UUID REFERENCES usuarios(id),
  arquivado BOOLEAN DEFAULT false,
  
  -- Dados do cliente
  cliente_razao_social TEXT,
  cliente_nome_fantasia TEXT,
  cliente_nome TEXT,
  cliente_email TEXT,
  cliente_cidade TEXT,
  cliente_estado TEXT,
  cliente_segmento TEXT,
  cliente_quantidade_funcionarios INT,
  cliente_faturamento_anual NUMERIC,
  
  observacoes TEXT,
  observacoes_cliente TEXT,
  
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  atendido_em TIMESTAMPTZ
);
```

#### 📋 solicitacoes (Movimentações)
```sql
CREATE TABLE solicitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE, -- Identificador único
  tipo TEXT NOT NULL, -- Tipo principal
  subtipo TEXT, -- Subcategoria
  razao_social TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  apolice_da_belz BOOLEAN DEFAULT false,
  acesso_empresa TEXT DEFAULT '',
  operadora TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  
  -- Campos JSON para flexibilidade
  arquivos JSONB DEFAULT '[]'::jsonb, -- Lista de anexos
  dados JSONB DEFAULT '{}'::jsonb, -- Dados detalhados
  historico JSONB DEFAULT '[]'::jsonb, -- Log de eventos
  
  status TEXT DEFAULT 'aberta' CHECK (status IN (
    'aberta', 'em validação', 'em execução', 'concluída', 'cancelada'
  )),
  sla_previsto DATE,
  prioridade TEXT,
  
  atendido_por UUID REFERENCES usuarios(id),
  atendido_por_nome TEXT, -- Redundância para performance
  criado_por UUID REFERENCES usuarios(id),
  
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);
```

#### 🎯 metas
```sql
CREATE TABLE metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id),
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER NOT NULL,
  quantidade_implantacoes INTEGER DEFAULT 0,
  UNIQUE(usuario_id, mes, ano)
);
```

#### 🔐 sessoes
```sql
CREATE TABLE sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id),
  token TEXT NOT NULL, -- Hash do JWT
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  ultimo_refresh TIMESTAMPTZ,
  expirado_em TIMESTAMPTZ
);
```

#### 📊 Tabelas de Auditoria

##### propostas_auditoria
```sql
CREATE TABLE propostas_auditoria (
  id BIGSERIAL PRIMARY KEY,
  proposta_id UUID REFERENCES propostas(id),
  campo TEXT NOT NULL,
  valor_antigo TEXT,
  valor_novo TEXT,
  alterado_por UUID REFERENCES usuarios(id),
  alterado_em TIMESTAMPTZ DEFAULT NOW()
);
```

##### propostas_notas
```sql
CREATE TABLE propostas_notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID REFERENCES propostas(id),
  autor_id UUID REFERENCES usuarios(id),
  nota TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
```

##### propostas_tags
```sql
CREATE TABLE propostas_tags (
  proposta_id UUID REFERENCES propostas(id),
  tag TEXT NOT NULL,
  aplicado_em TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (proposta_id, tag)
);
```

### Views
```sql
-- View para usuários online
CREATE VIEW vw_usuarios_online AS
SELECT u.*, s.ultimo_refresh
FROM usuarios u
LEFT JOIN sessoes s ON u.id = s.usuario_id
WHERE s.expirado_em > NOW() OR s.expirado_em IS NULL;
```

### Funções e Triggers
```sql
-- Atualização automática de metas
CREATE OR REPLACE FUNCTION atualizar_meta()
RETURNS TRIGGER AS $$
BEGIN
  -- Lógica para atualizar metas quando status muda para 'implantado'
END;
$$ LANGUAGE plpgsql;

-- Função manual para ajuste de metas
CREATE OR REPLACE FUNCTION atualizar_meta_usuario(
  p_usuario_id UUID, 
  p_valor NUMERIC
)
RETURNS VOID AS $$
BEGIN
  -- Atualização manual de metas por usuário
END;
$$ LANGUAGE plpgsql;
```

---

## 🎨 SISTEMA DE CORES

### Cores da Marca Belz
```css
:root {
  --belz-primary: #130E54;
  --belz-secondary: #021d79;
  --belz-background: #f6f6f6;
}
```

### Status de Propostas
```javascript
const STATUS_COLORS = {
  'recepcionado': {
    bg: '#E3F2FD',    // Azul claro
    text: '#1565C0',   // Azul escuro
    border: '#2196F3'  // Azul médio
  },
  'análise': {
    bg: '#FFF8E1',     // Amarelo claro
    text: '#F57C00',   // Laranja escuro
    border: '#FF9800'  // Laranja
  },
  'pendência': {
    bg: '#FFF3E0',     // Laranja claro
    text: '#E65100',   // Laranja escuro
    border: '#FF9800'  // Laranja
  },
  'pleito seguradora': {
    bg: '#E8EAF6',     // Roxo claro
    text: '#3F51B5',   // Índigo
    border: '#3F51B5'  // Índigo
  },
  'boleto liberado': {
    bg: '#E8F5E8',     // Verde claro
    text: '#2E7D32',   // Verde escuro
    border: '#4CAF50'  // Verde
  },
  'implantado': {
    bg: '#E0F2F1',     // Verde água claro
    text: '#00695C',   // Verde água escuro
    border: '#009688'  // Verde água
  },
  'proposta declinada': {
    bg: '#FFEBEE',     // Vermelho claro
    text: '#C62828',   // Vermelho escuro
    border: '#F44336'  // Vermelho
  }
}
```

### Status de Movimentações
```javascript
const SOLICITACAO_STATUS_COLORS = {
  'aberta': {
    bg: '#E3F2FD',     // Azul claro
    text: '#1565C0',   // Azul escuro
    border: '#2196F3'  // Azul médio
  },
  'em validação': {
    bg: '#FFF8E1',     // Amarelo claro
    text: '#F57C00',   // Laranja escuro
    border: '#FF9800'  // Laranja
  },
  'em execução': {
    bg: '#E8EAF6',     // Roxo claro
    text: '#3F51B5',   // Índigo
    border: '#3F51B5'  // Índigo
  },
  'concluída': {
    bg: '#E0F2F1',     // Verde água claro
    text: '#00695C',   // Verde água escuro
    border: '#009688'  // Verde água
  },
  'cancelada': {
    bg: '#FFEBEE',     // Vermelho claro
    text: '#C62828',   // Vermelho escuro
    border: '#F44336'  // Vermelho
  }
}
```

---

## 🔌 APIS E ENDPOINTS

### Base URL
- **Desenvolvimento**: `http://localhost:3000/api`
- **Produção**: `https://seudominio.com/api`

### 🔐 Autenticação
```
POST /api/auth/login
Content-Type: application/json
{
  "email": "usuario@belzseguros.com.br",
  "password": "senhaSegura"
}

Response:
{
  "user": {
    "id": "uuid",
    "nome": "Nome do Usuário",
    "email": "email@belz.com",
    "tipo_usuario": "gestor"
  },
  "token": "jwt_token_here"
}
```

```
POST /api/auth/logout
Authorization: Bearer {token}

Response: { "message": "Logout realizado com sucesso" }
```

```
GET /api/auth/me
Cookie: crm_auth=jwt_token

Response:
{
  "user": {
    "id": "uuid",
    "nome": "Nome",
    "email": "email@belz.com",
    "tipo_usuario": "gestor"
  }
}
```

### 📄 Propostas
```
GET /api/proposals
Authorization: Bearer {token}
Query params: ?status=análise&operadora=unimed

Response:
{
  "propostas": [
    {
      "id": "uuid",
      "codigo": "PRP0001",
      "cnpj": "12345678000199",
      "consultor": "Nome Consultor",
      "consultor_email": "consultor@belz.com",
      "operadora": "unimed recife",
      "quantidade_vidas": 50,
      "valor": 25000.00,
      "status": "análise",
      "horas_em_analise": 25.5,
      "dias_em_analise": 1.06,
      "criado_em": "2025-01-01T10:00:00Z",
      "atendido_por": null,
      "cliente_nome": "Empresa XYZ"
    }
  ]
}
```

```
POST /api/proposals
Authorization: Bearer {token}
Content-Type: application/json
{
  "cnpj": "12345678000199",
  "consultor": "Nome Consultor",
  "operadora": "unimed recife",
  "quantidade_vidas": 50,
  "valor": 25000.00,
  "previsao_implantacao": "2025-06-01",
  "cliente_nome": "Empresa XYZ",
  "cliente_email": "contato@empresa.com"
}
```

```
PATCH /api/proposals/[id]
Authorization: Bearer {token}
Content-Type: application/json
{
  "status": "implantado",
  "observacoes": "Cliente implantado com sucesso"
}
```

```
DELETE /api/proposals/[id]
Authorization: Bearer {token}
# Apenas gestores podem excluir
```

### 📋 Movimentações (Solicitações)
```
GET /api/solicitacoes
Authorization: Bearer {token}
Query params: ?status=aberta&tipo=inclusao

Response:
{
  "solicitacoes": [
    {
      "id": "uuid",
      "codigo": "SOL0001",
      "tipo": "inclusão",
      "subtipo": "dependente",
      "razao_social": "Empresa ABC",
      "cnpj": "98765432000111",
      "status": "aberta",
      "sla_previsto": "2025-01-15",
      "atendido_por_nome": null,
      "criado_em": "2025-01-01T14:00:00Z"
    }
  ]
}
```

```
POST /api/solicitacoes
Authorization: Bearer {token}
Content-Type: application/json
{
  "tipo": "inclusão",
  "subtipo": "dependente",
  "razao_social": "Empresa ABC",
  "cnpj": "98765432000111",
  "observacoes": "Incluir esposa do funcionário João",
  "sla_previsto": "2025-01-15",
  "dados": {
    "nome_dependente": "Maria Silva",
    "parentesco": "esposa",
    "data_nascimento": "1990-05-15"
  }
}
```

### 👥 Usuários
```
GET /api/users
Authorization: Bearer {token}
# Apenas gestores

Response:
{
  "users": [
    {
      "id": "uuid",
      "nome": "Nome Usuário",
      "email": "usuario@belz.com",
      "tipo_usuario": "analista_implantacao",
      "status_presenca": "online",
      "criado_em": "2025-01-01T08:00:00Z"
    }
  ]
}
```

```
POST /api/users
Authorization: Bearer {token}
Content-Type: application/json
# Apenas gestores
{
  "nome": "Novo Usuário",
  "email": "novo@belz.com",
  "senha": "senhaSegura123",
  "tipo_usuario": "analista_implantacao"
}
```

### 🎯 Metas e Estatísticas
```
GET /api/goals
Authorization: Bearer {token}

Response:
{
  "user_goals": [
    {
      "usuario_id": "uuid",
      "nome": "Analista",
      "mes": 1,
      "ano": 2025,
      "quantidade_implantacoes": 5,
      "valor_alcancado": 125000.00,
      "meta_valor": 150000.00,
      "percentual": 83.33
    }
  ]
}
```

### 📊 Relatórios
```
GET /api/reports/proposals-summary
Authorization: Bearer {token}
# Apenas gestores e gerentes

Response:
{
  "total_propostas": 150,
  "por_status": {
    "análise": 45,
    "implantado": 32,
    "pendência": 18
  },
  "por_operadora": {
    "unimed recife": 35,
    "bradesco": 28
  },
  "valor_total": 2500000.00
}
```

### 🚨 Alertas
```
GET /api/alerts/proposals/stale
Authorization: Bearer {token} OR X-Cron-Key: {secret}
# Propostas paradas ≥24h

Response:
{
  "proposals_found": 3,
  "alerted": true,
  "threshold_hours": 24,
  "proposals": [
    {
      "codigo": "PRP0001",
      "consultor": "João Silva",
      "horas_em_analise": 25.5
    }
  ]
}
```

### 🔍 Utilitários
```
POST /api/validate-cnpj
Content-Type: application/json
{
  "cnpj": "12345678000199"
}

Response:
{
  "valid": true,
  "company_name": "EMPRESA EXEMPLO LTDA",
  "cnpj_formatted": "12.345.678/0001-99"
}
```

```
GET /api/health
Response:
{
  "status": "ok",
  "timestamp": "2025-01-01T12:00:00Z",
  "version": "0.1.0"
}
```

---

## 📱 INTERFACE DO USUÁRIO

### Layout Principal
```javascript
// Estrutura sidebar + conteúdo principal
<div className="min-h-screen bg-background flex">
  <aside className="w-64 bg-card border-r shadow-lg flex flex-col">
    {/* Sidebar com navegação */}
  </aside>
  <div className="flex-1 flex flex-col">
    <header>{/* Header com usuário logado */}</header>
    <main>{/* Conteúdo principal */}</main>
  </div>
</div>
```

### Componentes Principais

#### 🏠 Dashboard
- **Gestor**: Cards com métricas completas, gráficos de conversão, ranking de analistas
- **Analista**: Metas pessoais, propostas atribuídas, estatísticas próprias
- **Consultor**: Visão básica das próprias propostas

#### 📄 Gestão de Propostas
- **Kanban Board**: Colunas por status com drag & drop
- **Tabela**: Visualização em lista com filtros
- **Formulários**: Criação e edição com validação
- **Filtros**: Por status, operadora, consultor, data

#### 📋 Gestão de Movimentações
- **Board Kanban**: Similar às propostas
- **Formulário dinâmico**: Campos adaptativos por tipo
- **Timeline**: Histórico de alterações
- **SLA Visual**: Indicadores de prazo

#### 👥 Gestão de Usuários
- **Tabela CRUD**: Criar, editar, desativar usuários
- **Controle de perfis**: Seleção de tipo de usuário
- **Status de presença**: Online/offline em tempo real

#### 📊 Relatórios
- **Gráficos**: Recharts para visualizações
- **Filtros temporais**: Períodos customizáveis
- **Exportação**: JSON/CSV (futuro)

### Padrões de UI

#### Cores de Status
```jsx
// Aplicação consistente de cores
const StatusBadge = ({ status, type = 'proposta' }) => {
  const colors = type === 'proposta' ? STATUS_COLORS : SOLICITACAO_STATUS_COLORS
  const statusColors = colors[status] || { bg: '#f6f6f6', text: '#333', border: '#e2e2e2' }
  
  return (
    <span 
      className="px-2 py-1 rounded text-xs font-medium"
      style={{
        backgroundColor: statusColors.bg,
        color: statusColors.text,
        border: `1px solid ${statusColors.border}`
      }}
    >
      {status}
    </span>
  )
}
```

#### Cards Padronizados
```jsx
// Estrutura de card padrão
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Icon className="h-5 w-5" />
      Título do Card
    </CardTitle>
    <CardDescription>
      Descrição opcional
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* Conteúdo do card */}
  </CardContent>
</Card>
```

#### Toasts e Feedback
```javascript
// Padrões de notificação
toast.success('✅ Operação realizada com sucesso!')
toast.error('❌ Erro na operação')
toast.info('ℹ️ Informação importante')
toast.warning('⚠️ Atenção necessária')
```

---

## ⚙️ CONFIGURAÇÃO E VARIÁVEIS

### Variáveis de Ambiente (.env)
```bash
# === OBRIGATÓRIAS ===

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=chave_anonima_supabase
SUPABASE_SERVICE_ROLE_KEY=chave_servico_supabase

# Segurança
JWT_SECRET=chave_super_secreta_minimo_32_caracteres
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=86400000

# URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000
CRM_APP_URL=http://localhost:3000

# === OPCIONAIS ===

# CORS
CORS_ORIGINS=http://localhost:3000,https://dominio.com

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# E-mail SMTP
SMTP_HOST=smtp.dominio.com
SMTP_PORT=587
SMTP_USER=usuario@dominio.com
SMTP_PASS=senha_smtp
EMAIL_FROM=comunicacao@belzseguros.com.br
EMAIL_FROM_NAME=CRM Belz
SMTP_TLS_SERVERNAME=dominio.com
# SMTP_TLS_REJECT_UNAUTHORIZED=false # Apenas dev/debug

# E-mail Alternativo (Resend)
RESEND_API_KEY=chave_resend_opcional

# Validação CNPJ
CNPJA_API_KEY=chave_api_cnpja

# Alertas
STALE_PROPOSAL_ALERT_HOURS=24
PRIMARY_GESTOR_EMAIL=gestor@belzseguros.com.br
CRON_SECRET=chave_secreta_para_cron

# Override para staging
EMAIL_OVERRIDE_TO=teste@dominio.com
```

### Scripts NPM
```json
{
  "scripts": {
    "dev": "next dev --hostname 0.0.0.0 --port 3000",
    "build": "next build",
    "start": "next start",
    "test": "vitest run --reporter=dot",
    "test:full": "yarn lint && next build && vitest run --coverage --reporter=dot",
    "lint": "eslint .",
    "format": "prettier --write .",
    "supabase:introspect": "node ./scripts/supabase-introspect.mjs",
    "supabase:introspect:prod": "node ./scripts/supabase-introspect.mjs --prod",
    "windows:next-cache:setup": "powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/windows/setup-next-cache.ps1",
    "windows:next-cache:remove": "powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/windows/remove-next-cache.ps1"
  }
}
```

---

## 🧪 TESTES E QUALIDADE

### Estrutura de Testes
```
tests/
├── api-exports.test.mjs           # Testa exports das APIs
├── components-contract.test.mjs    # Contratos de componentes
├── proposals.patch-actions.test.mjs # Ações PATCH de propostas
├── solicitacoes.constants.test.mjs  # Constantes de movimentações
├── alerts.stale.test.mjs           # Sistema de alertas
├── upload.mimetypes.test.mjs       # Validação de arquivos
├── utils.test.mjs                  # Utilitários gerais
├── test_email_api.js               # API de e-mail
└── test_email_send.js              # Envio de e-mail
```

### Comandos de Teste
```powershell
# Executar todos os testes
npm run test

# Testes com cobertura
npm run test:full

# Teste específico
npx vitest run tests/api-exports.test.mjs

# Teste de e-mail
node .\tests\test_email_api.js
node .\tests\test_email_send.js

# Validação CNPJ
node .\test_cnpj_validation.js
```

### Cobertura de Código
- **Framework**: Vitest + @vitest/coverage-v8
- **Relatório**: HTML em `coverage/index.html`
- **Limites**: Configurados em `vitest.config.mjs`

---

## 🚀 DEPLOY E PRODUÇÃO

### Preparação para Deploy
1. **Build local**: `npm run build`
2. **Testes completos**: `npm run test:full`
3. **Verificar variáveis**: Todas as obrigatórias definidas
4. **Backup do banco**: `npm run db:backup` (Windows)

### Plataformas Recomendadas
- **Vercel** (recomendado para Next.js)
- **Railway**
- **Render**
- **DigitalOcean App Platform**

### Variáveis de Produção
```bash
NODE_ENV=production
CORS_ORIGINS=https://seudominio.com
JWT_SECRET=chave_ainda_mais_forte_64_caracteres_minimo
NEXT_PUBLIC_BASE_URL=https://seudominio.com
CRM_APP_URL=https://seudominio.com
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW=900000
```

### SSL e Segurança
- **HTTPS obrigatório** em produção
- **Headers de segurança** automáticos
- **HSTS** ativado automaticamente
- **Rate limiting** mais restritivo

---

## 📊 MONITORAMENTO E ALERTAS

### Sistema de Alertas
```javascript
// Alertas automáticos implementados
{
  "propostas_paradas": {
    "threshold": "24 horas",
    "destinatarios": ["gestores", "PRIMARY_GESTOR_EMAIL"],
    "frequencia": "por_execucao",
    "endpoint": "/api/alerts/proposals/stale"
  }
}
```

### Métricas Monitoradas
- **Sessões ativas** por usuário
- **Propostas por status** em tempo real
- **SLA de atendimento** (primeiro toque)
- **Taxa de conversão** por operadora
- **Performance de analistas**

### Logs de Segurança
```javascript
// Eventos logados automaticamente
{
  "login_attempts": "tentativas de login (sucesso/falha)",
  "rate_limiting": "IPs bloqueados por excesso de requisições",
  "unauthorized_access": "tentativas de acesso não autorizado",
  "data_changes": "alterações em propostas/usuários",
  "session_management": "criação/expiração de sessões"
}
```

---

## 🔧 MANUTENÇÃO E OPERAÇÃO

### Scripts de Manutenção
```powershell
# Windows PowerShell
.\scripts\windows\backup-db.ps1     # Backup do banco
.\scripts\windows\restore-db.ps1    # Restaurar backup
.\scripts\windows\setup-next-cache.ps1    # Configurar cache
.\scripts\windows\remove-next-cache.ps1   # Limpar cache
```

### Migrações de Banco
```sql
-- Localização: scripts/migrations/
2025-08-18-add-consultor-email.sql          # Adicionar email consultor
2025-08-19-backfill-consultor-email-and-index.sql  # Backfill + índice
2025-08-21-add-session-heartbeat.sql        # Heartbeat de sessão
```

### Introspecção do Banco
```bash
# Gerar documentação atualizada do schema
npm run supabase:introspect

# Ambiente de produção
npm run supabase:introspect:prod

# Sem atualizar documentação
npm run supabase:introspect:prod:no-doc
```

### Backup e Restauração
```powershell
# Backup automático
npm run db:backup

# Localização dos backups
backups/
├── belz-crm_20250821_112341.dump
└── belz-crm_20250821_113358.dump
```

---

## 🛠️ RESOLUÇÃO DE PROBLEMAS

### Problemas Comuns

#### 1. Erro de JWT_SECRET
**Sintoma**: "JWT_SECRET inválido/efêmero em runtime"
**Solução**: 
```bash
# Definir segredo forte (mínimo 32 caracteres)
JWT_SECRET=abcdef1234567890abcdef1234567890abcdef
```

#### 2. Erro de CORS
**Sintoma**: Requisições bloqueadas no browser
**Solução**:
```bash
# Configurar domínios permitidos
CORS_ORIGINS=http://localhost:3000,https://seudominio.com
```

#### 3. Propostas não aparecem para analista
**Sintoma**: Analista não vê propostas que deveria ver
**Solução**:
```sql
-- Verificar consultor_email
SELECT id, codigo, consultor, consultor_email, criado_por 
FROM propostas 
WHERE consultor_email = 'email@analista.com';

-- Executar backfill se necessário
-- scripts/migrations/2025-08-19-backfill-consultor-email-and-index.sql
```

#### 4. Erro de conexão Supabase
**Sintoma**: "Failed to connect to Supabase"
**Solução**:
```bash
# Verificar URLs e chaves
NEXT_PUBLIC_SUPABASE_URL=https://projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_servico
```

#### 5. Rate Limiting muito restritivo
**Sintoma**: "Too many requests"
**Solução**:
```bash
# Ajustar limites
RATE_LIMIT_WINDOW=900000  # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100  # 100 requests
```

### Debug de E-mail
```bash
# Testar configuração SMTP
node .\tests\test_email_api.js

# Testar envio real
node .\tests\test_email_send.js

# Para certificados wildcard
SMTP_TLS_SERVERNAME=dominio_do_certificado.com
```

### Logs Úteis
```javascript
// Console.log seguro (dados sanitizados)
console.log('Operação:', sanitizeForLog(dadosOperacao))

// Nunca logar tokens ou senhas
console.log('JWT Token:', '[REDACTED]')
console.log('Password:', '[REDACTED]')
```

---

## 📈 ROADMAP E MELHORIAS FUTURAS

### Curto Prazo (1-3 meses)
- [ ] **Dashboard mobile responsivo**
- [ ] **Exportação de relatórios** (PDF/Excel)
- [ ] **Notificações push** no browser
- [ ] **Filtros avançados** com múltiplos critérios
- [ ] **Bulk operations** (ações em lote)

### Médio Prazo (3-6 meses)
- [ ] **API GraphQL** para consultas complexas
- [ ] **Webhooks** para integrações externas
- [ ] **Auditoria completa** com timeline visual
- [ ] **Permissões granulares** por recurso
- [ ] **Cache Redis** para performance

### Longo Prazo (6+ meses)
- [ ] **Mobile app** (React Native)
- [ ] **IA para predições** de conversão
- [ ] **Integração CRM externo** (Pipedrive, HubSpot)
- [ ] **Multi-tenancy** para outras empresas
- [ ] **API pública** documentada

### Melhorias de Arquitetura
- [ ] **Microserviços** para escala
- [ ] **Event sourcing** para auditoria
- [ ] **CQRS** para performance de leitura
- [ ] **Docker containers** para deploy
- [ ] **Kubernetes** para orquestração

---

## 📚 REFERÊNCIAS E RECURSOS

### Documentação Técnica
- **[Next.js Documentation](https://nextjs.org/docs)** - Framework principal
- **[Supabase Documentation](https://supabase.io/docs)** - Backend e banco
- **[Shadcn/UI](https://ui.shadcn.com/)** - Componentes UI
- **[TailwindCSS](https://tailwindcss.com/docs)** - Styling
- **[Lucide Icons](https://lucide.dev/)** - Ícones

### Segurança
- **[OWASP Top 10](https://owasp.org/www-project-top-ten/)** - Melhores práticas
- **[JWT Best Practices](https://tools.ietf.org/html/rfc7519)** - JSON Web Tokens
- **[bcrypt](https://github.com/kelektiv/node.bcrypt.js)** - Hash de senhas

### Performance
- **[Web Vitals](https://web.dev/vitals/)** - Métricas Core Web Vitals
- **[Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)** - Otimização

### Deploy
- **[Vercel Deployment](https://vercel.com/docs)** - Deploy automático
- **[Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)** - Configuração

---

## 👥 EQUIPE E CONTATOS

### Desenvolvimento
- **Desenvolvedor Principal**: Maycon Benvenuto
- **Repositório**: emergent-crm-adm
- **Branch Principal**: main
- **Branch de Testes**: testes

### Empresa Cliente
- **Empresa**: Belz Seguros
- **Domínio**: belzseguros.com.br
- **Foco**: Seguros de saúde empresarial

### Suporte Técnico
- **Ambiente**: Supabase + Next.js
- **Hospedagem**: A definir (Vercel recomendado)
- **Monitoramento**: Logs internos + Vercel Analytics

---

## 📄 LICENÇA E TERMOS

### Propriedade Intelectual
- **Proprietário**: Belz Seguros
- **Tipo**: Software proprietário
- **Uso**: Restrito à organização Belz
- **Distribuição**: Proibida sem autorização

### Confidencialidade
- **Dados sensíveis**: Protegidos por lei
- **LGPD**: Compliance obrigatório
- **Backup**: Dados criptografados
- **Acesso**: Apenas pessoal autorizado

### Responsabilidades
- **Segurança**: Implementada conforme OWASP
- **Disponibilidade**: SLA definido com hospedagem
- **Manutenção**: Atualizações regulares de segurança
- **Suporte**: Documentação completa fornecida

---

## 🔍 ANEXOS

### A. Estrutura de Pastas Detalhada
```
emergent-crm-adm/
├── 📁 .next/                    # Build artifacts (auto-gerado)
├── 📁 node_modules/             # Dependências (auto-gerado)
├── 📁 .git/                     # Controle de versão
├── .env                         # Variáveis de ambiente (não commitado)
├── .env.example                 # Exemplo de configuração
├── .eslintrc.json              # Configuração ESLint
├── .gitignore                  # Arquivos ignorados pelo Git
├── .prettierrc                 # Configuração Prettier
└── yarn.lock                   # Lock file das dependências
```

### B. Comandos Úteis
```powershell
# Desenvolvimento
npm install                      # Instalar dependências
npm run dev                     # Servidor desenvolvimento
npm run build                   # Build produção
npm run start                   # Servidor produção

# Qualidade
npm run lint                    # Verificar código
npm run format                  # Formatar código
npm run test                    # Executar testes
npm run test:full              # Testes + lint + build

# Banco de dados
npm run supabase:introspect     # Atualizar schema docs
npm run db:backup              # Backup Windows
npm run db:restore             # Restaurar Windows

# Cache (Windows)
npm run windows:next-cache:setup    # Configurar cache
npm run windows:next-cache:remove   # Limpar cache
```

### C. Checklist de Deploy
- [ ] Variáveis de ambiente configuradas
- [ ] JWT_SECRET forte (64+ caracteres)
- [ ] CORS_ORIGINS configurado para produção
- [ ] HTTPS configurado
- [ ] Backup do banco realizado
- [ ] Testes passando
- [ ] Build sem erros
- [ ] Logs de segurança funcionando
- [ ] Rate limiting configurado
- [ ] E-mail funcionando
- [ ] Alertas configurados

---

**Documento gerado em**: 3 de setembro de 2025  
**Versão do Sistema**: 0.1.0  
**Última atualização**: Setembro 2025  
**Status**: Documentação Completa ✅

---

*Esta documentação cobre todos os aspectos técnicos, funcionais e operacionais do Sistema CRM Belz. Para dúvidas específicas ou atualizações, consulte os arquivos de documentação individuais no repositório.*
