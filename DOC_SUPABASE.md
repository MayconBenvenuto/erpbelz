# Supabase – Estrutura e Referência Rápida

Este documento resume a estrutura do banco para o CRM Belz, com base no script `database_setup.sql`, migrations e introspecção via `scripts/supabase-introspect.mjs`.

## Tabelas

### usuarios

- id UUID PK (default gen_random_uuid)
- nome TEXT NOT NULL
- email TEXT UNIQUE NOT NULL
- senha TEXT NOT NULL (hash bcrypt em produção; pode existir plaintext legado)
- tipo_usuario TEXT NOT NULL ('gestor' | 'analista')
- criado_em TIMESTAMPTZ DEFAULT now()

### propostas

- id UUID PK (default gen_random_uuid)
- cnpj VARCHAR(18) NOT NULL
- consultor TEXT NOT NULL
- consultor_email TEXT NOT NULL (migrado em 2025-08-18)
- operadora TEXT NOT NULL (enum textual de operadoras previstas)
- quantidade_vidas INT NOT NULL
- valor NUMERIC(12,2) NOT NULL
- previsao_implantacao DATE
- status TEXT NOT NULL (valores em `lib/constants.js`)
- criado_por UUID REFERENCES usuarios(id)
- criado_em TIMESTAMPTZ DEFAULT now()

Observações:

- Para analistas, o backend filtra por (criado_por = user.id) OU (consultor_email = user.email).
- Em criações por analista, `consultor_email` é preenchido automaticamente com o e-mail do usuário se estiver vazio.

### sessoes

- id UUID PK
- usuario_id UUID REFERENCES usuarios(id)
- data_login TIMESTAMPTZ DEFAULT now()
- data_logout TIMESTAMPTZ
- tempo_total INTERVAL

### metas

- id UUID PK
- usuario_id UUID REFERENCES usuarios(id)
- valor_meta NUMERIC(12,2) DEFAULT 150000
- valor_alcancado NUMERIC(12,2) DEFAULT 0
- atualizado_em TIMESTAMPTZ DEFAULT now()

## Funções/Triggers

- atualizar_meta(): Trigger em `propostas` para somar/subtrair `valor_alcancado` quando status muda para 'implantado'.
- atualizar_meta_usuario(p_usuario_id UUID, p_valor NUMERIC): Atualiza metas manualmente via API.

## Índices

- propostas(criado_em DESC), propostas(status), propostas(criado_por)
- sessoes(usuario_id), sessoes(data_login DESC)
- metas(usuario_id)

Sugeridos (opcional):

- propostas(consultor_email) para acelerar filtros por e-mail.

### Migração de backfill e índice (consultor_email)

Arquivo: `scripts/migrations/2025-08-19-backfill-consultor-email-and-index.sql`

O que faz:

- Preenche `consultor_email` com base em `usuarios.email` quando vazio
- Normaliza `consultor_email` para minúsculas
- Cria índice `idx_propostas_consultor_email` se não existir

Como aplicar:

- Execute o SQL no editor do Supabase (schema público) ou via psql conectado ao banco.

## Políticas RLS (demo)

- No `database_setup.sql` estão liberadas para ALL (usar policies restritivas em produção).

## Introspecção

- Rodar: `yarn supabase:introspect`.
- Requer `.env` com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou ANON).
- Saída mostra colunas, contagem, amostras (até 3) e verificação básica de RPCs.

## Contratos da API

- Auth: POST /auth/login, /auth/logout – JWT 24h. `Authorization: Bearer <token>` obrigatório.
- Propostas:
  - GET /proposals – gestor: todas; analista: (criado_por = id) OR (consultor_email = email).
  - POST /proposals – analista: força criado_por = id e preenche consultor_email se vazio.
  - PATCH /proposals/:id – analista só altera se for criador ou consultor por e-mail.
  - DELETE /proposals/:id – apenas gestor.
- Users:
  - GET /users – lista básica
  - POST /users – apenas gestor, cria usuário com senha bcrypt e inicia meta.

## Dicas Operacionais

- Variáveis necessárias: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (preferível), JWT_SECRET, BCRYPT_ROUNDS.
- O Nest carrega .env da raiz automaticamente (server-nest/src/main.ts).
- Next proxy: /api/* → Nest (ver `next.config.js`/`middleware.js`).

## Checklist de Debug

- Login OK? Verificar JWT_SECRET e usuários em `usuarios`.
- Propostas sumidas para analista? Confirmar `consultor_email` e `criado_por` das linhas.
- Trigger de metas: verificar se `status` alterou para 'implantado' e valores.

