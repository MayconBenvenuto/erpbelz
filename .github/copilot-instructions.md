# GitHub Copilot Instructions - CRM Belz

## Project Overview
This is a CRM system for Belz company focused on health insurance proposal management with role-based access control and modern security practices.

Current architecture:
- Frontend + Backend: Next.js (App Router) at port 3000, serving both UI and /api/* routes (no external proxy)

Recent updates (2025-08-27):
- Sequential proposal code (codigo) PRP0000 format (unique, indexed); lists ordered asc by codigo; emails reference only codigo.
- Inline status editing with per-row loading/disable.
- Meta progress now backed by table metas (mes, ano, quantidade_implantacoes) instead of accumulating valor.
- Added audit (propostas_auditoria), notes (propostas_notas) and tags (propostas_tags) tables.
- Added solicitacoes workflow table (tickets) with JSON campos (arquivos, dados, historico) and SLA fields.
- Added sessoes table storing auth sessions tokens + expirado_em.
- Added view vw_usuarios_online (derived presence status) used for reports/monitoring.
- Reports exclude gestor from monitoring; refresh button shows spinner/disable.

## Tech Stack
- **Frontend/Backend**: Next.js 14.2.3 with App Router (/api routes)
- **UI**: Shadcn/UI + TailwindCSS + Lucide Icons
- **Database**: Supabase (PostgreSQL)
- **Auth**: JWT + bcryptjs
- **Fonts**: Montserrat from Google Fonts
- **Colors**: Belz brand colors (#130E54, #021d79, #f6f6f6)

## User Roles & Permissions

### Analyst (analista)
- ✅ Create proposals
- ✅ View proposals
- ✅ Edit proposal status (only their own proposals)
- ❌ Delete proposals
- ❌ Manage users

### Manager (gestor)
- ❌ Create proposals
- ✅ View all proposals
- ✅ Edit proposal status
- ✅ Delete proposals
- ✅ Manage users
- ✅ View reports

## Key Security Patterns

### Always Implement
```javascript
// Input sanitization
const sanitizedInput = sanitizeInput(userInput);

// Permission checks
if (currentUser.tipo_usuario !== 'gestor') {
  return toast.error('Acesso negado');
}

// Error handling with toast
try {
  // operation
  toast.success('Operação realizada com sucesso!');
} catch (error) {
  console.error('Erro:', sanitizeForLog(error));
  toast.error('Erro na operação');
}
```

### Security Functions (lib/security.js)
- `hashPassword()` - bcrypt with 12 rounds
- `verifyPassword()` - password verification
- `generateToken()` - JWT with 24h expiration
- `verifyToken()` - JWT validation
- `sanitizeInput()` - XSS prevention
- `validateEmail()` - email validation
- `validateCNPJ()` - CNPJ format validation
- `addSecurityHeaders()` - security headers

## UI Patterns

### Layout Structure
```javascript
// Sidebar layout (current)
<div className="min-h-screen bg-background flex">
  <aside className="w-64 bg-card border-r shadow-lg flex flex-col">
    {/* Sidebar content */}
  </aside>
  <div className="flex-1 flex flex-col">
    {/* Main content */}
  </div>
</div>
```

### Conditional Rendering by Role
```javascript
// Show only for managers
{currentUser.tipo_usuario === 'gestor' && (
  <Button onClick={handleAction}>Manager Action</Button>
)}

// Show only for analysts
{currentUser.tipo_usuario !== 'gestor' && (
  <Button onClick={handleCreate}>Create Proposal</Button>
)}
```

### Toast Notifications
```javascript
import { toast } from 'sonner';

// Success
toast.success('✅ Operação realizada com sucesso!');

// Error
toast.error('❌ Erro na operação');

// Info
toast.info('ℹ️ Informação importante');
```

## Component Patterns

### Standard Card
```javascript
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Table with Actions
```javascript
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column</TableHead>
      {currentUser.tipo_usuario === 'gestor' && <TableHead>Actions</TableHead>}
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.data}</TableCell>
        {currentUser.tipo_usuario === 'gestor' && (
          <TableCell>
            <Button onClick={() => handleAction(item.id)}>Action</Button>
          </TableCell>
        )}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

## API Patterns

Important: All client calls go to /api/* served by Next.js (no proxy).

Key endpoints:
- GET /api/proposals → ordered by codigo asc when available; gestor sees all; analyst sees own only.
- PATCH /api/proposals/:id → updates status; applies metas delta only on transitions (to/from “implantado”); sends email showing only the PRP codigo.

### Standard API Call
```javascript
const handleApiCall = async () => {
  setIsLoading(true);
  
  try {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(sanitizeInput(data))
    });
    
    if (!response.ok) {
      const error = await response.json();
      toast.error(error.message || 'Erro na operação');
      return;
    }
    
    const result = await response.json();
    toast.success('Operação realizada com sucesso!');
    
    // Update state
    setData(result);
    
  } catch (error) {
    console.error('Erro:', sanitizeForLog(error));
    toast.error('Erro de conexão com o servidor');
  } finally {
    setIsLoading(false);
  }
};
```

## Database Schema

### Users Table (UUID)
```sql
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  tipo_usuario TEXT CHECK (tipo_usuario IN ('gestor','analista')) NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
```

### Proposals Table (propostas)
Essential columns (full list in DOC_SUPABASE.md auto section):
id (uuid, PK), codigo (text, sequential PRP format), cnpj, consultor, consultor_email, operadora, quantidade_vidas, valor, previsao_implantacao, status, criado_por, arquivado (boolean default false), atendido_por, diversos campos cliente_* (dados cadastrais), timestamps (criado_em, updated_at, atendido_em) e observacoes.

### Audit Table (propostas_auditoria)
Rastreia mudanças campo a campo: proposta_id, campo, valor_antigo, valor_novo, alterado_por, alterado_em.

### Proposal Notes (propostas_notas)
Notas livres por proposta: nota, autor_id, criado_em.

### Proposal Tags (propostas_tags)
Par simples (proposta_id, tag) com aplicado_em.

### Metas Table (metas)
Modelo mensal por usuário: usuario_id, mes, ano, quantidade_implantacoes (integer default 0).
Usada para dashboard e cálculo de progresso; alteração de status para/from 'implantado' deve refletir metas (delta controlado no backend).

### Sessions Table (sessoes)
Tokens ativos: usuario_id, token, criado_em, ultimo_refresh, expirado_em. Use para invalidar / refresh logic. Nunca logar token completo em console.

### Solicitacoes Table (solicitacoes)
Tickets operacionais: codigo, tipo, subtipo, razao_social, cnpj, apolice_da_belz (bool), acesso_empresa, operadora, observacoes, arquivos(jsonb), dados(jsonb), historico(jsonb), status, sla_previsto, prioridade, atendido_por(+nome), criado_por, criado_em, atualizado_em.
Histórico e arquivos são arrays/objetos; sempre sanitize antes de armazenar.

### Usuarios Table (usuarios)
id, nome, email (unique), senha (bcrypt), tipo_usuario ('gestor'|'analista'|possível 'consultor' legado), status_presenca, ultimo_refresh, criado_em, atualizado_em.

### Online Users View (vw_usuarios_online)
View derivada para presença; NÃO escrever diretamente. Use apenas SELECT.

### RPCs Importantes
atualizar_meta, atualizar_meta_usuario (existência verificada antes de chamar). Novas funções de introspecção (list_public_tables, list_public_table_columns, list_public_routines, list_public_views) são SECURITY DEFINER e não devem ser expostas ao cliente.

## Constants

### Status Options
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

### Insurance Companies
```javascript
const operadoras = [
  'unimed recife', 'unimed seguros', 'bradesco', 'amil', 'ampla',
  'fox', 'hapvida', 'medsenior', 'sulamerica', 'select'
];
```

## Styling Guidelines

### Use TailwindCSS Classes
```javascript
// Primary button
<Button className="bg-primary text-primary-foreground hover:bg-primary/90">

// Card styling
<Card className="bg-card border shadow-sm">

// Sidebar active state
className={`px-4 py-3 rounded-lg transition-colors ${
  activeTab === 'propostas' 
    ? 'bg-primary text-primary-foreground' 
    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
}`}
```

### Responsive Design
```javascript
// Grid responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

// Hide on mobile
<Button className="hidden sm:flex">

// Mobile sidebar
<aside className="w-64 bg-card border-r shadow-lg flex flex-col">
```

## DO's and DON'Ts

### ✅ DO
- Always sanitize user inputs
- Check user permissions before actions
- Use toast notifications for feedback
- Implement loading states
- Use Shadcn/UI components
- Follow the sidebar layout pattern
- Use the established color scheme
- Implement proper error handling

### ❌ DON'T
- Hardcode credentials or secrets
- Use inline styles (use TailwindCSS)
- Allow actions without permission checks
- Use console.log in production (use toast)
- Create insecure API endpoints
- Break the established design patterns
- Forget input validation
- Skip error handling

## File Structure

### Key Files
- `app/page.js` - Main CRM interface
- `app/api/[[...path]]/route.js` - Centralized API routes
- `lib/security.js` - Security functions
- `lib/supabase.js` - Database client
- `components/ui/` - UI components

### Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
JWT_SECRET=secure_32_character_secret
BCRYPT_ROUNDS=12
CORS_ORIGINS=http://localhost:3000
```

Next.js auto-loads .env files. Ensure JWT_SECRET and Supabase keys are present.

Email/TLS notes:
- Configure SMTP_TLS_SERVERNAME for providers with wildcard certificates (e.g., skymail.net.br)
- Do not disable certificate verification in production; use only for local diagnostics
- Optional fallback: RESEND_API_KEY

When generating code for this project, always prioritize security, follow the established patterns, and maintain consistency with the existing codebase.
\n+Schema source of truth: mantenha consultas alinhadas com DOC_SUPABASE.md (bloco AUTO_DB_SCHEMA) gerado pelo script scripts/supabase-introspect.mjs. Evite duplicar DDL manual; se a estrutura mudar, rode o script para atualizar documentação.
