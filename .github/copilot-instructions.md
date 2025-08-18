# GitHub Copilot Instructions - CRM Belz

## Project Overview
This is a CRM system for Belz company focused on health insurance proposal management with role-based access control and modern security practices.

## Tech Stack
- **Framework**: Next.js 14.2.3 with App Router
- **UI**: Shadcn/UI + TailwindCSS + Lucide Icons
- **Database**: Supabase (PostgreSQL)
- **Auth**: JWT + bcryptjs
- **Fonts**: Montserrat from Google Fonts
- **Colors**: Belz brand colors (#130E54, #021d79, #f6f6f6)

## User Roles & Permissions

### Analyst (analista)
- ✅ Create proposals
- ✅ View proposals
- ❌ Edit proposal status
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

### Users Table
```sql
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  tipo_usuario VARCHAR(50) CHECK (tipo_usuario IN ('analista', 'gestor'))
);
```

### Proposals Table
```sql
CREATE TABLE propostas (
  id SERIAL PRIMARY KEY,
  cnpj VARCHAR(18) NOT NULL,
  consultor VARCHAR(255) NOT NULL,
  operadora VARCHAR(100) NOT NULL,
  quantidade_vidas INTEGER NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'em análise',
  criado_por INTEGER REFERENCES usuarios(id)
);
```

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
JWT_SECRET=secure_32_character_secret
BCRYPT_ROUNDS=12
CORS_ORIGINS=http://localhost:3000
```

When generating code for this project, always prioritize security, follow the established patterns, and maintain consistency with the existing codebase.
