# 🤝 Guia de Contribuição - CRM Belz

## 📋 Antes de Contribuir

### Pré-requisitos
- Conhecimento em Next.js, React e TailwindCSS
- Experiência com autenticação JWT e bcrypt
- Familiaridade com Supabase
- Entendimento de práticas de segurança web

### Setup do Ambiente
1. Fork e clone o repositório
2. Instale as dependências: `npm install`
3. Configure o `.env` baseado no `.env.example`
4. Execute: `npm run dev`

## 🔒 Diretrizes de Segurança

### ⚠️ CRÍTICO - Sempre Implementar
```javascript
// ✅ Sanitização de entrada
const sanitized = sanitizeInput(userInput);

// ✅ Verificação de permissões
if (currentUser.tipo_usuario !== 'gestor') {
  return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
}

// ✅ Rate limiting em APIs sensíveis
if (!checkRateLimit(`action:${clientIP}`)) {
  return NextResponse.json({ error: 'Muitas tentativas' }, { status: 429 });
}

// ✅ Logs sanitizados
console.error('Erro:', sanitizeForLog(error));
```

### 🚫 Nunca Fazer
- Hardcoded credentials ou secrets
- SQL direto (usar Supabase client)
- Bypass de autenticação/autorização
- Logs com dados sensíveis
- Endpoints sem rate limiting

## 🎨 Padrões de UI/UX

### Componentes Obrigatórios
```javascript
// Usar apenas Shadcn/UI
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

// Toast para feedback
toast.success('✅ Operação realizada com sucesso!');
toast.error('❌ Erro na operação');
```

### Layout Sidebar
```javascript
// Manter estrutura sidebar + conteúdo
<div className="min-h-screen bg-background flex">
  <aside className="w-64 bg-card border-r shadow-lg flex flex-col">
    {/* Sidebar */}
  </aside>
  <div className="flex-1 flex flex-col">
    {/* Conteúdo principal */}
  </div>
</div>
```

### Cores da Belz
```css
/* Usar apenas essas cores */
--primary: #130E54;    /* Azul escuro Belz */
--secondary: #021d79;  /* Azul médio */
--background: #f6f6f6; /* Cinza claro */
```

## 👥 Sistema de Roles

### Permissões por Tipo
```javascript
// ANALISTA (tipo_usuario !== 'gestor')
permissions: {
  propostas: { create: true, read: true, update: false, delete: false },
  dashboard: true,
  usuarios: false,
  relatorios: false
}

// GESTOR (tipo_usuario === 'gestor')
permissions: {
  propostas: { create: false, read: true, update: true, delete: true },
  dashboard: true,
  usuarios: true,
  relatorios: true
}
```

### Implementação de Permissões
```javascript
// Frontend - Condicional por role
{currentUser.tipo_usuario === 'gestor' && (
  <Button onClick={handleGestorAction}>Ação do Gestor</Button>
)}

// Backend - Verificação obrigatória
if (currentUser.tipo_usuario !== 'gestor') {
  return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
}
```

## 🔌 Padrões de API

### Estrutura de Endpoint
```javascript
// app/api/[[...path]]/route.js
export async function POST(request, { params }) {
  const { path = [] } = params;
  const route = `/${path.join('/')}`;
  
  try {
    // 1. Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`${route}:${clientIP}`)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    
    // 2. Autenticação (se necessário)
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    // 3. Sanitização
    const body = await request.json();
    const sanitizedData = sanitizeInput(body);
    
    // 4. Lógica do endpoint
    // ... implementação
    
    // 5. Response com headers de segurança
    return handleCORS(NextResponse.json(result));
    
  } catch (error) {
    console.error('Erro:', sanitizeForLog(error));
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
```

### Validação de CNPJ
```javascript
// Usar a função existente que tenta 3 APIs
const result = await validateCNPJWithAPI(cnpj);
if (!result.valid) {
  return toast.error(result.error);
}
```

## 📊 Banco de Dados

### Queries via Supabase
```javascript
// ✅ Usar Supabase client
const { data, error } = await supabase
  .from('propostas')
  .select('*')
  .eq('criado_por', userId);

// ❌ Nunca usar SQL direto
// const query = `SELECT * FROM propostas WHERE id = ${id}`; // VULNERÁVEL!
```

### RLS (Row Level Security)
```sql
-- Exemplo de política RLS
CREATE POLICY "Analistas veem apenas suas propostas" ON propostas
  FOR SELECT USING (criado_por = auth.uid());

CREATE POLICY "Gestores veem todas as propostas" ON propostas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND tipo_usuario = 'gestor'
    )
  );
```

## 📝 Convenções de Código

### Nomenclatura
```javascript
// Funções - camelCase
const handleCreateProposal = () => {};

// Componentes - PascalCase
const ProposalCard = () => {};

// Constantes - UPPER_SNAKE_CASE
const STATUS_OPTIONS = ['em análise', 'pendente'];

// Variáveis - camelCase
const isLoading = false;
```

### Estados React
```javascript
// Agrupar estados relacionados
const [proposalForm, setProposalForm] = useState({
  cnpj: '',
  consultor: '',
  operadora: '',
  quantidade_vidas: '',
  valor: '',
  status: 'em análise'
});

// Loading states
const [isLoading, setIsLoading] = useState(false);
```

## 🧪 Testes

### Testes Manuais Obrigatórios
```javascript
// Checklist antes do commit
☐ Login como analista - pode criar propostas?
☐ Login como gestor - pode alterar status?
☐ Rate limiting funcionando?
☐ CNPJ inválido retorna erro?
☐ Dados sensíveis não aparecem nos logs?
☐ Headers de segurança presentes?
☐ CORS restritivo funcionando?
☐ Responsividade em mobile?
```

### Cenários de Teste
```javascript
// 1. Permissões
// - Analista tenta acessar área de gestores
// - Gestor tenta criar proposta

// 2. Segurança
// - Tentativas de XSS nos inputs
// - Muitas tentativas de login
// - CNPJ com caracteres especiais

// 3. UX
// - Navegação pela sidebar
// - Toast notifications aparecem
// - Loading states funcionam
```

## 📦 Pull Request

### Checklist PR
- [ ] Código segue padrões de segurança
- [ ] Permissões de role implementadas corretamente
- [ ] UI consistente com design system
- [ ] Toast notifications implementadas
- [ ] Logs sanitizados
- [ ] Testes manuais realizados
- [ ] Sem credentials hardcoded
- [ ] Headers de segurança preservados

### Template de PR
```markdown
## 📋 Descrição
Breve descrição das mudanças

## 🔒 Checklist de Segurança
- [ ] Input sanitization implementada
- [ ] Verificação de permissões
- [ ] Rate limiting (se aplicável)
- [ ] Logs sanitizados
- [ ] Headers de segurança

## 🧪 Testes Realizados
- [ ] Login como analista
- [ ] Login como gestor
- [ ] Cenários de erro
- [ ] Responsividade

## 📸 Screenshots
(Adicionar prints se mudanças visuais)
```

## 🚨 Incidentes de Segurança

### Procedimento
1. **Pare imediatamente** o que está fazendo
2. **Documente** o problema encontrado
3. **Notifique** a equipe de segurança
4. **Não commite** código vulnerável
5. **Aguarde** revisão de segurança

### Exemplos de Incidentes
- Credentials expostos em código
- Bypass de autenticação descoberto
- Dados sensíveis em logs
- XSS ou injection vulnerabilities

## 📞 Suporte

### Dúvidas Técnicas
- Consulte primeiro o `COPILOT_INSTRUCTIONS.md`
- Verifique os padrões estabelecidos no código
- Entre em contato com a equipe de desenvolvimento

### Problemas de Segurança
- Reporte imediatamente
- Não publique detalhes publicamente
- Aguarde aprovação antes de implementar correções

---

**⚠️ Lembre-se: Segurança e UX consistente são prioridades máximas neste projeto!**
