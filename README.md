# � CRM Belz - Sistema de Gestão de Propostas

## � Sobre o Projeto

Sistema de CRM desenvolvido para a **Belz** focado na gestão de propostas de planos de saúde. Implementa controle de acesso baseado em roles, interface moderna com sidebar lateral e medidas robustas de segurança.

## 🎯 Funcionalidades Principais

### 👥 Sistema de Usuários
- **Analistas**: Criam e visualizam propostas
- **Gestores**: Monitoram, alteram status e excluem propostas
- **Autenticação**: JWT + bcrypt com rate limiting

### 📊 Gestão de Propostas
- Validação automática de CNPJ (3 APIs em cascata)
- Status personalizados para pipeline de vendas
- Múltiplas operadoras de saúde suportadas
- Dashboard com métricas e gráficos

### 🔒 Segurança
- Headers de segurança implementados
- Sanitização de inputs contra XSS
- Rate limiting anti-bruteforce
- Logs sanitizados sem dados sensíveis

## 🔧 Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/MayconBenvenuto/emergent-crm-adm.git
cd emergent-crm-adm
```

### 2. Instale as dependências
```bash
npm install
# ou
yarn install
```

### 3. Configure as variáveis de ambiente

**⚠️ CRÍTICO: Nunca commite arquivos .env**

Copie o arquivo de exemplo:
```bash
cp .env.example .env
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

# CORS (ajuste para seu domínio)
CORS_ORIGINS=http://localhost:3000,https://seudominio.com

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Execute o projeto
```bash
npm run dev
# ou
yarn dev
```

## 🔐 Recursos de Segurança

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

## 📊 Estrutura de Dados

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

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar produção
npm start

# Instalar dependências de segurança
npm install bcryptjs jsonwebtoken
```

## 🌐 Deploy Seguro

### Vercel (Recomendado)
```bash
# 1. Configure as variáveis de ambiente no painel da Vercel
# 2. Deploy
vercel --prod
```

### Variáveis de Ambiente para Produção
```env
NODE_ENV=production
CORS_ORIGINS=https://seudominio.com
JWT_SECRET=chave_ainda_mais_forte_para_producao
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

### 📘 Guia do Copilot e Convenções

- Guia complementar para o uso do GitHub Copilot e visão da arquitetura: veja `.github/COPILOT_GUIDE.md`.
- Instruções principais para o Copilot e padrões do projeto: veja `COPILOT_INSTRUCTIONS.md`.

## 📄 Licença

Este projeto é privado e proprietário da Belz.

## 🆘 Suporte

Em caso de problemas de segurança, entre em contato imediatamente com a equipe de desenvolvimento.

---

**⚠️ LEMBRETE DE SEGURANÇA**: Este sistema contém dados sensíveis. Sempre siga as melhores práticas de segurança e nunca exponha credenciais ou chaves de API.
