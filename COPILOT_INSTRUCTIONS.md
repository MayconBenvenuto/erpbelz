# 🤖 GitHub Copilot Instructions - CRM Belz

## 📋 Visão Geral do Projeto

Este é um **CRM (Customer Relationship Management)** desenvolvido para a **Belz**, focado em gestão de propostas de planos de saúde. O sistema implementa controle de acesso baseado em roles, segurança robusta e interface moderna.

### 🎯 Objetivo Principal
Gerenciar propostas de planos de saúde com diferentes níveis de acesso para analistas (criadores) e gestores (monitores).

---

## 🏗️ Arquitetura do Projeto

### 📁 Estrutura de Pastas
```
emergent-crm-adm/
├── app/                          # Next.js App Router
│   ├── api/[[...path]]/          # API routes centralizadas
│   ├── globals.css               # Estilos globais + Montserrat
│   ├── layout.js                 # Layout raiz
│   └── page.js                   # Página principal do CRM
├── components/ui/                # Componentes Shadcn/UI
├── lib/
│   ├── security.js               # Funções de segurança
│   ├── supabase.js              # Cliente Supabase
│   └── utils.js                  # Utilitários gerais
├── hooks/                        # React hooks customizados
└── public/
    └── logo-belz.jpg            # Logo da empresa
```

### 🔧 Stack Tecnológica
- **Frontend**: Next.js 14.2.3 + React 18
- **UI**: Shadcn/UI + TailwindCSS + Lucide Icons
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: JWT + bcryptjs
- **Styling**: TailwindCSS + CSS Variables
- **Fonts**: Montserrat (Google Fonts)

---

## 🎨 Design System

### 🎨 Paleta de Cores (Belz)
```css
/* Cores principais da Belz */
--primary: #130E54;        /* Azul escuro Belz */
--secondary: #021d79;      /* Azul médio */
--background: #f6f6f6;     /* Cinza claro */
--card: #ffffff;           /* Branco para cards */
--muted: #6b7280;          /* Cinza médio para texto secundário */
```

### 📝 Tipografia
- **Font Primary**: Montserrat (Google Fonts)
- **Font Class**: `.font-montserrat`
- **Weights**: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)

### 🖼️ Layout
- **Sidebar**: Fixa à esquerda, 256px de largura
- **Header**: Dinâmico baseado na seção ativa
- **Content**: Área principal flexível com scroll independente

---

## 👥 Sistema de Roles e Permissões

### 🔐 Tipos de Usuário

#### **Analista** (Criador de Propostas)
```javascript
// Permissões do analista
const analistaPermissions = {
  propostas: {
    create: true,    // ✅ Criar propostas
    read: true,      // ✅ Visualizar propostas
    update: false,   // ❌ Editar propostas
    delete: false,   // ❌ Excluir propostas
    status: false    // ❌ Alterar status
  },
  dashboard: true,   // ✅ Ver dashboard
  usuarios: false,   // ❌ Gerenciar usuários
  relatorios: false  // ❌ Ver relatórios
}
```

#### **Gestor** (Monitor e Aprovador)
```javascript
// Permissões do gestor
const gestorPermissions = {
  propostas: {
    create: false,   // ❌ Criar propostas
    read: true,      // ✅ Visualizar propostas
    update: true,    // ✅ Editar propostas
    delete: true,    // ✅ Excluir propostas
    status: true     // ✅ Alterar status
  },
  dashboard: true,   // ✅ Ver dashboard
  usuarios: true,    // ✅ Gerenciar usuários
  relatorios: true   // ✅ Ver relatórios
}
```

---

## 🛡️ Segurança e Autenticação

### 🔒 Implementações de Segurança
```javascript
// lib/security.js - Funções principais
- hashPassword()           // Hash bcrypt com 12 rounds
- verifyPassword()         // Verificação de senha
- generateToken()          // JWT com 24h de expiração
- verifyToken()            // Validação JWT
- checkRateLimit()         // Limite de tentativas
- sanitizeInput()          // Sanitização XSS
- validateEmail()          // Validação de email
- validateCNPJ()           // Validação de CNPJ
- addSecurityHeaders()     // Headers de segurança
```

### 🛡️ Headers de Segurança
```javascript
// Headers implementados
'X-Content-Type-Options': 'nosniff'
'X-Frame-Options': 'DENY'
'X-XSS-Protection': '1; mode=block'
'Referrer-Policy': 'strict-origin-when-cross-origin'
'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' // Produção
```

### 🔐 Rate Limiting
- **Login**: Máximo 100 tentativas por 15 minutos por IP
- **APIs**: Limitação configurável via ENV
- **Storage**: Map em memória (usar Redis em produção)

---

## 🗄️ Estrutura do Banco de Dados

### 📊 Tabelas Principais

#### **usuarios**
```sql
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  tipo_usuario VARCHAR(50) NOT NULL CHECK (tipo_usuario IN ('analista', 'gestor')),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **propostas**
```sql
CREATE TABLE propostas (
  id SERIAL PRIMARY KEY,
  cnpj VARCHAR(18) NOT NULL,
  consultor VARCHAR(255) NOT NULL,
  operadora VARCHAR(100) NOT NULL,
  quantidade_vidas INTEGER NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  previsao_implantacao DATE,
  status VARCHAR(50) DEFAULT 'em análise',
  criado_por INTEGER REFERENCES usuarios(id),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **sessoes**
```sql
CREATE TABLE sessoes (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id),
  session_id VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  inicio_sessao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ultima_atividade TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ativa BOOLEAN DEFAULT true
);
```

#### **metas_usuario**
```sql
CREATE TABLE metas_usuario (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id),
  meta_propostas INTEGER NOT NULL,
  propostas_fechadas INTEGER DEFAULT 0,
  mes_ano VARCHAR(7) NOT NULL, -- YYYY-MM
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 API Endpoints

### 🛣️ Rotas Principais (`/api/[[...path]]`)

#### **Autenticação**
```javascript
POST /api/auth/login
Body: { email: string, password: string }
Response: { user: object, sessionId: string, token: string }
```

#### **Propostas**
```javascript
// Listar propostas
GET /api/proposals
Response: [{ id, cnpj, consultor, operadora, quantidade_vidas, valor, status, ... }]

// Criar proposta (apenas analistas)
POST /api/proposals
Body: { cnpj, consultor, operadora, quantidade_vidas, valor, previsao_implantacao }

// Atualizar status (apenas gestores)
PUT /api/proposals/:id/status
Body: { status: string }

// Deletar proposta (apenas gestores)
DELETE /api/proposals/:id
```

#### **Usuários** (apenas gestores)
```javascript
// Listar usuários
GET /api/users

// Criar usuário
POST /api/users
Body: { nome, email, senha, tipo_usuario }
```

#### **Validação CNPJ**
```javascript
POST /api/validate-cnpj
Body: { cnpj: string }
Response: { valid: boolean, data?: object, error?: string }
```

#### **Sessões e Relatórios**
```javascript
GET /api/sessions      // Listar sessões ativas
GET /api/goals         // Metas e progresso dos usuários
```

---

## 📊 Funcionalidades Principais

### 📝 Gestão de Propostas

#### **Status Disponíveis**
```javascript
const statusOptions = [
  'em análise',
  'pendencias seguradora', 
  'boleto liberado',
  'implantando',
  'pendente cliente',
  'pleito seguradora',
  'negado',
  'implantado'
];
```

#### **Operadoras Suportadas**
```javascript
const operadoras = [
  'unimed recife',
  'unimed seguros', 
  'bradesco',
  'amil',
  'ampla',
  'fox',
  'hapvida',
  'medsenior',
  'sulamerica',
  'select'
];
```

### 🔍 Validação de CNPJ (Cascata)
```javascript
// Ordem de tentativa das APIs
1. ReceitaWS      (https://receitaws.com.br/v1/cnpj/{cnpj})
2. BrasilAPI      (https://brasilapi.com.br/api/cnpj/v1/{cnpj})
3. CNPJA          (https://api.cnpja.com/office/{cnpj})

// Retorno padronizado
{
  valid: boolean,
  data: {
    cnpj: string,
    razao_social: string,
    nome_fantasia: string,
    situacao_cadastral: string,
    cnae_fiscal_descricao: string,
    logradouro: string,
    numero: string,
    bairro: string,
    municipio: string,
    uf: string,
    cep: string,
    telefone: string,
    email: string,
    source: 'ReceitaWS' | 'BrasilAPI' | 'CNPJA'
  }
}
```

### 📈 Dashboard e Métricas
- **Cards de resumo**: Total de propostas, por status, valores
- **Gráficos**: Distribuição por operadora e status
- **Progresso**: Metas individuais vs atingido
- **Auto-refresh**: Atualização automática dos dados

### 👥 Gestão de Usuários (Gestor)
- **Criação**: Novos analistas e gestores
- **Listagem**: Todos os usuários do sistema
- **Tipos**: Analista (criador) / Gestor (monitor)

### 📊 Relatórios e Monitoramento (Gestor)
- **Sessões ativas**: Usuários online e última atividade
- **Logs de acesso**: Histórico de logins e IPs
- **Metas**: Progresso individual e da equipe

---

## 💻 Padrões de Código

### ⚛️ React Patterns

#### **Hooks Customizados**
```javascript
// Exemplo: useAutoRefresh
const useAutoRefresh = (callback, interval = 30000) => {
  useEffect(() => {
    const timer = setInterval(callback, interval);
    return () => clearInterval(timer);
  }, [callback, interval]);
};
```

#### **State Management**
```javascript
// Estados principais do CRM
const [currentUser, setCurrentUser] = useState(null);
const [activeTab, setActiveTab] = useState('propostas');
const [proposals, setProposals] = useState([]);
const [users, setUsers] = useState([]);
const [sessions, setSessions] = useState([]);
const [userGoals, setUserGoals] = useState([]);
```

#### **Conditional Rendering**
```javascript
// Baseado em permissões
{currentUser.tipo_usuario === 'gestor' && (
  <Button onClick={handleDeleteProposal}>Excluir</Button>
)}

{currentUser.tipo_usuario !== 'gestor' && (
  <Button onClick={handleCreateProposal}>Nova Proposta</Button>
)}
```

### 🎨 CSS Patterns

#### **Layout Classes**
```css
/* Sidebar fixo */
.sidebar {
  @apply w-64 bg-card border-r shadow-lg flex flex-col;
}

/* Content area flexível */
.content-area {
  @apply flex-1 flex flex-col;
}

/* Cards padrão */
.card-standard {
  @apply bg-card border rounded-lg shadow-sm;
}
```

#### **Responsive Design**
```css
/* Mobile first approach */
.responsive-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4;
}
```

### 🔒 Security Patterns

#### **Input Sanitization**
```javascript
// Sempre sanitizar inputs
const sanitizedInput = sanitizeInput(userInput);
const isValidEmail = validateEmail(email);
const isValidCNPJ = validateCNPJFormat(cnpj);
```

#### **API Error Handling**
```javascript
try {
  const response = await fetch('/api/endpoint', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(sanitizedData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    toast.error(error.message || 'Erro na operação');
    return;
  }
  
  const result = await response.json();
  toast.success('Operação realizada com sucesso!');
} catch (error) {
  console.error('Erro:', sanitizeForLog(error));
  toast.error('Erro de conexão com o servidor');
}
```

---

## 🌍 Variáveis de Ambiente

### 📄 .env (Configuração Local)
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Security Configuration
JWT_SECRET=secure_32_character_secret_key_here
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=86400000

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 📄 .env.example (Template)
```bash
# ⚠️ CONFIGURE COM SUAS PRÓPRIAS CHAVES

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Security Configuration
JWT_SECRET=uma_chave_super_secreta_com_no_minimo_32_caracteres
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=86400000

# CORS Configuration  
CORS_ORIGINS=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🚀 Scripts de Desenvolvimento

### 📦 package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev --hostname 0.0.0.0 --port 3000",
    "build": "next build",
    "start": "next start"
  }
}
```

### 🛠️ Comandos Úteis
```bash
# Desenvolvimento
npm run dev

# Build produção
npm run build

# Iniciar produção
npm run start

# Instalar dependências
npm install
```

---

## 🧪 Testing Patterns

### 🔍 Validação Manual
```javascript
// Testar permissões
// 1. Login como analista - verificar se pode criar propostas
// 2. Login como gestor - verificar se pode alterar status
// 3. Testar rate limiting - muitas tentativas de login
// 4. Testar validação CNPJ - CNPJ válido e inválido
// 5. Testar responsividade - mobile e desktop
```

### 🐛 Debug Patterns
```javascript
// Logs seguros (sem dados sensíveis)
console.log('Operação:', sanitizeForLog(operation));
console.error('Erro:', sanitizeForLog(error));

// Toast notifications
toast.success('✅ Operação realizada com sucesso!');
toast.error('❌ Erro na operação');
toast.info('ℹ️ Informação importante');
```

---

## 🔄 Deployment

### 🌐 GitHub Deployment
```bash
# Verificar arquivos sensíveis
git status
cat .gitignore

# Commit seguro
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
```

### ⚠️ Checklist de Segurança
- [ ] Arquivo .env não commitado
- [ ] Credenciais rotacionadas se expostas
- [ ] Headers de segurança configurados
- [ ] Rate limiting ativo
- [ ] Logs sanitizados
- [ ] CORS restritivo configurado

---

## 📚 Recursos e Referências

### 📖 Documentação
- **Next.js**: https://nextjs.org/docs
- **Shadcn/UI**: https://ui.shadcn.com
- **TailwindCSS**: https://tailwindcss.com/docs
- **Supabase**: https://supabase.com/docs

### 🎨 Design Resources
- **Lucide Icons**: https://lucide.dev
- **Montserrat Font**: https://fonts.google.com/specimen/Montserrat
- **Color Palette**: Belz brand colors (#130E54, #021d79, #f6f6f6)

### 🔒 Security Resources
- **JWT**: https://jwt.io
- **bcrypt**: https://github.com/kelektiv/node.bcrypt.js
- **OWASP**: https://owasp.org/www-project-top-ten/

---

## 🤖 GitHub Copilot Guidelines

### ✅ Quando Sugerir Código
1. **Seguir padrões estabelecidos** no projeto
2. **Implementar segurança** por padrão
3. **Usar componentes Shadcn/UI** existentes
4. **Respeitar permissões** de usuário
5. **Sanitizar inputs** sempre
6. **Usar toast notifications** para feedback
7. **Implementar loading states** em operações assíncronas

### ❌ Evitar
1. **Hardcoded credentials** ou secrets
2. **SQL direto** (usar Supabase client)
3. **Inline styles** (usar TailwindCSS)
4. **Console.log** em produção (usar toast)
5. **Permissões inconsistentes**
6. **XSS vulnerabilities**
7. **Dados não sanitizados**

### 🎯 Prioridades
1. **Segurança** sempre em primeiro lugar
2. **UX consistente** com o design system
3. **Performance** e otimização
4. **Manutenibilidade** do código
5. **Documentação** clara

---

## 📝 Conclusão

Este CRM da Belz é um sistema robusto e seguro para gestão de propostas de planos de saúde. Ao desenvolver novas funcionalidades ou fazer manutenções, sempre priorize:

1. **Segurança** - Autenticação, autorização e sanitização
2. **Usabilidade** - Interface intuitiva e responsiva  
3. **Performance** - Código otimizado e carregamento rápido
4. **Manutenibilidade** - Código limpo e bem documentado

**Mantenha sempre o foco na experiência do usuário e na segurança dos dados!** 🚀

---

*Última atualização: 18 de agosto de 2025*
*Versão: 1.0.0*
*Autor: GitHub Copilot Assistant*
