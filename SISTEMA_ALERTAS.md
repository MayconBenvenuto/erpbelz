# Sistema de Alertas - Propostas Estagnadas

## Visão Geral

O sistema monitora automaticamente propostas que permanecem no status "em análise" por mais de 48 horas e envia notificações por e-mail para os gestores.

## Como Funciona

### 1. Detecção Automática
- **Critério**: Propostas com status "em análise" há mais de 48h
- **Janela de notificação**: Entre 48h e 72h (evita spam de notificações repetidas)
- **Execução**: Disparo manual ou via serviço externo de cron

### 2. Destinatários
- **Padrão**: Todos os usuários com `tipo_usuario = 'gestor'`
- **Override**: Configure `GESTOR_NOTIFY_EMAIL` no ambiente para um e-mail específico

### 3. Conteúdo da Notificação
- Lista de propostas estagnadas
- Código, empresa, operadora, valor
- Data de criação e tempo parado
- Link direto para o CRM

## Configuração

### Variáveis de Ambiente

```bash
# Opcional: e-mail específico para receber alertas (substitui busca por gestores)
GESTOR_NOTIFY_EMAIL=mayconbenvenuto@belzseguros.com.br

# Para uso em cron externo/manual
SYSTEM_TOKEN=<token_jwt_do_sistema>
APP_URL=https://admbelz.vercel.app
```

// Configure variáveis somente no ambiente de deploy / serviço de cron usado.

## Endpoints da API

### 1. Verificação e Envio de Alertas

```http
POST /api/proposals/stale-check
```

- **Autenticação**: Required (gestor)
- **Função**: Identifica propostas estagnadas e envia e-mails
- **Resposta**: `{ ok: true, notified: N, recipients: [...] }`

### 2. Status dos Alertas

```http
GET /api/alerts/stale-proposals
```

- **Autenticação**: Required (gestor)
- **Função**: Mostra status atual sem enviar e-mails
- **Resposta**: Contadores e lista detalhada

### 3. Trigger Manual

```http
POST /api/alerts/stale-propostas
```

- **Autenticação**: Required (gestor)
- **Função**: Executa verificação manualmente via interface

## Interface no Sistema

### Localização

- **Tela**: Relatórios e Monitoramento (gestor apenas)
- **Seção**: "Sistema de Alertas - Propostas Estagnadas"

### Funcionalidades

- **Contadores**: Propostas 48h+, críticas 72h+, último check
- **Verificar Agora**: Executa checagem manual imediata
- **Atualizar Status**: Recarrega contadores sem enviar e-mails
- **Detalhes**: Lista expansível com propostas identificadas

## Logs e Monitoramento

// Use cron-job.org, EasyCron ou scheduler da plataforma para agendamento automático.

### Logs da Aplicação

```javascript
// Logs do servidor (console)
console.log('[ALERTS] Verificação executada', { notified: N })
console.error('[ALERTS] Erro na verificação', { error })
```

## Configuração Manual

### 1. Cron Local

```bash
# Crontab para execução local às 9:00
0 9 * * * curl -X POST -H "Authorization: Bearer $TOKEN" $APP_URL/api/proposals/stale-check
```

### 2. Webhooks Externos

- Configure webhook no Vercel/Heroku para chamar `/api/proposals/stale-check`
- Use serviços como cron-job.org ou EasyCron

## Customização

### Alterar Critérios

```javascript
// Em /api/proposals/stale-check/route.js
const ago48 = new Date(now - 48 * 60 * 60 * 1000) // Alterar 48 para outro valor
const ago72 = new Date(now - 72 * 60 * 60 * 1000) // Janela de notificação
```

### Template do E-mail

```javascript
// Em /api/proposals/stale-check/route.js
const subject = `[Sistema] Propostas estagnadas há 48h` // Customizar assunto
// Modificar conteúdo HTML/texto conforme necessário
```

// Horário de execução definido pelo seu serviço de agendamento externo.

## Troubleshooting

### Alertas Não São Enviados

1. Verifique se há gestores cadastrados: `SELECT * FROM usuarios WHERE tipo_usuario = 'gestor'`
2. Confirme configuração de e-mail (SMTP) no ambiente
3. Verifique logs do servidor (console) ou middleware de envio

### E-mails Não Chegam

1. Verifique spam/lixo eletrônico
2. Confirme configuração SMTP_* no .env
3. Teste envio manual via interface do gestor

### Execução Agendada Falha

1. Verifique token e URL configurados no serviço de cron externo
2. Teste manual via `curl` com o mesmo token
3. Verifique se o serviço externo não está bloqueado por firewall

## Status Atual

✅ **Implementado:**

- Endpoint de verificação (`/api/proposals/stale-check`)
- Interface de monitoramento para gestores
- Endpoint de status/trigger manual

✅ **Funcional:**

- Detecção de propostas estagnadas
- Envio de e-mails com template brandizado
- Controle de janela de notificação (evita spam)
- Trigger manual via interface
