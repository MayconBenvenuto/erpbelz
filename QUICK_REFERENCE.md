# ⚡ Quick Reference - CRM Belz

## Project Type
Health insurance CRM with role-based access (Analysts create, Managers monitor)

## Key Commands
```bash
npm run dev    # Start development server
npm run build  # Build for production
```

## User Roles
- **Analista**: Create/view proposals only
- **Gestor**: Monitor/manage all proposals, users, reports

## Essential Patterns

### Permission Check
```javascript
{currentUser.tipo_usuario === 'gestor' && <ManagerComponent />}
{currentUser.tipo_usuario !== 'gestor' && <AnalystComponent />}
```

### Security
```javascript
const sanitized = sanitizeInput(input);
if (!checkRateLimit(ip)) return error;
console.error(sanitizeForLog(error));
```

### API
```javascript
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify(sanitizeInput(data))
});
```

### Toast Feedback
```javascript
toast.success('✅ Success message');
toast.error('❌ Error message');
```

## UI Components
- Use Shadcn/UI only
- Sidebar layout (w-64)
- Belz colors: #130E54, #021d79, #f6f6f6
- Montserrat font

## Security Rules
1. Always sanitize inputs
2. Check permissions before actions
3. Rate limit sensitive endpoints
4. No hardcoded credentials
5. Sanitize logs

## Status Options
```javascript
['em análise', 'pendencias seguradora', 'boleto liberado', 'implantando', 'pendente cliente', 'pleito seguradora', 'negado', 'implantado']
```

## Insurance Companies
```javascript
['unimed recife', 'unimed seguros', 'bradesco', 'amil', 'ampla', 'fox', 'hapvida', 'medsenior', 'sulamerica', 'select']
```

## Database Tables
- `usuarios` (id, nome, email, senha_hash, tipo_usuario)
- `propostas` (id, cnpj, consultor, operadora, quantidade_vidas, valor, status)
- `sessoes` (id, usuario_id, session_id, ativa)
- `metas_usuario` (id, usuario_id, meta_propostas, mes_ano)

## Key Files
- `app/page.js` - Main CRM interface
- `app/api/[[...path]]/route.js` - API routes
- `lib/security.js` - Security functions
- `.env` - Environment variables

Remember: Security first, role-based permissions, consistent UI, toast feedback!
