# Supabase – Estrutura e Referência Rápida

Este documento resume a estrutura do banco para o CRM Belz, com base no script `database_setup.sql`, migrations e introspecção via `scripts/supabase-introspect.mjs`.

## Tabelas (Visão Funcional)

### usuarios

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| nome | TEXT NOT NULL |  |
| email | TEXT UNIQUE NOT NULL | normalizado lower-case |
| senha | TEXT NOT NULL | hash bcrypt |
| tipo_usuario | TEXT NOT NULL | valores: gestor / analista / consultor |
| ultimo_refresh | TIMESTAMPTZ | controle de presença |
| status_presenca | TEXT | ex: 'online','offline' |
| atualizado_em | TIMESTAMPTZ | audit básico |
| criado_em | TIMESTAMPTZ DEFAULT now() |  |

### propostas

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | UUID PK |  |
| codigo | VARCHAR | sequencial PRP0000 (mostrado na UI / e-mails) |
| cnpj | VARCHAR(18) NOT NULL | sanitizado/validado |
| consultor | TEXT NOT NULL | nome exibido |
| consultor_email | TEXT NOT NULL | usado em filtros para analista |
| operadora | TEXT NOT NULL | valores definidos (vide constantes) |
| quantidade_vidas | INT NOT NULL |  |
| valor | NUMERIC(12,2) NOT NULL |  |
| previsao_implantacao | DATE |  |
| status | TEXT NOT NULL | ver `lib/constants.js` |
| criado_por | UUID | FK usuarios.id |
| arquivado | BOOLEAN DEFAULT false | soft-hide |
| atendido_por | UUID | usuário que assumiu |
| cliente_* | diversos | metadados do cliente (nome, fantasia, localização etc) |
| cliente_quantidade_funcionarios | INT |  |
| cliente_faturamento_anual | NUMERIC |  |
| observacoes / observacoes_cliente | TEXT |  |
| updated_at | TIMESTAMPTZ DEFAULT now() |  |
| criado_em | TIMESTAMPTZ DEFAULT now() |  |
| atendido_em | TIMESTAMPTZ |  |

Observações de acesso:

* Analista: vê linhas onde (criado_por = user.id) OU (consultor_email = user.email)
* Gestor: vê todas

\n### propostas_auditoria
Rastreia alterações campo-a-campo em propostas.

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | BIGINT PK | sequence |
| proposta_id | UUID | FK propostas.id |
| campo | TEXT NOT NULL | nome do campo alterado |
| valor_antigo | TEXT |  |
| valor_novo | TEXT |  |
| alterado_por | UUID | usuário |
| alterado_em | TIMESTAMPTZ DEFAULT now() |  |

\n### propostas_notas
Notas livres colaborativas por proposta.

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | UUID PK |  |
| proposta_id | UUID | FK |
| autor_id | UUID | FK usuarios |
| nota | TEXT NOT NULL | conteúdo |
| criado_em | TIMESTAMPTZ DEFAULT now() |  |

\n### propostas_tags
Tags simples (chave única proposta_id+tag).

| Coluna | Tipo | Notas |
|--------|------|-------|
| proposta_id | UUID NOT NULL | FK |
| tag | TEXT NOT NULL |  |
| aplicado_em | TIMESTAMPTZ DEFAULT now() |  |

\n### sessoes
Tokens ativos de sessão JWT (controle/log). Estrutura atual substitui o antigo modelo data_login/data_logout.

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | UUID PK |  |
| usuario_id | UUID | FK usuarios |
| token | TEXT NOT NULL | hash/ref token |
| criado_em | TIMESTAMPTZ DEFAULT now() |  |
| ultimo_refresh | TIMESTAMPTZ | refresh tracking |
| expirado_em | TIMESTAMPTZ | expiração calculada |

\n### solicitacoes
Workflow de solicitações (tickets) com histórico JSON.

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | UUID PK |  |
| codigo | TEXT NOT NULL | identificador humano |
| tipo | TEXT NOT NULL | categoria principal |
| subtipo | TEXT | subcategoria |
| razao_social | TEXT NOT NULL |  |
| cnpj | TEXT NOT NULL |  |
| apolice_da_belz | BOOLEAN DEFAULT false |  |
| acesso_empresa | TEXT DEFAULT '' |  |
| operadora | TEXT DEFAULT '' |  |
| observacoes | TEXT DEFAULT '' |  |
| arquivos | JSONB DEFAULT '[]'::jsonb | lista anexos |
| dados | JSONB DEFAULT '{}'::jsonb | payload detalhado |
| status | TEXT DEFAULT 'aberta' | workflow |
| sla_previsto | DATE |  |
| historico | JSONB DEFAULT '[]'::jsonb | eventos |
| prioridade | TEXT |  |
| atendido_por | UUID | FK usuarios |
| atendido_por_nome | TEXT | redundância |
| criado_por | UUID | FK usuarios |
| criado_em | TIMESTAMPTZ DEFAULT now() |  |
| atualizado_em | TIMESTAMPTZ DEFAULT now() | trigger/manual |

\n### metas
Modelo atual (produção) contabiliza metas mensais por usuário.

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | UUID PK |  |
| usuario_id | UUID | FK usuarios |
| mes | INT NOT NULL | 1-12 |
| ano | INT NOT NULL | yyyy |
| quantidade_implantacoes | INT DEFAULT 0 | acumulado mês |

Diferença: versão inicial (documentada antes) usava valor_meta/valor_alcancado; considerar migração/limpeza de documentação histórica.

\n### View: vw_usuarios_online
Fornece status de usuários online (detalhes no Supabase; não materializada aqui).

## Funções/Triggers

* atualizar_meta(): Trigger em `propostas` para somar/subtrair `valor_alcancado` quando status muda para 'implantado'.
* atualizar_meta_usuario(p_usuario_id UUID, p_valor NUMERIC): Atualiza metas manualmente via API.

\n## Índices (Principais)

Implementados (parcial — ver migrations):

* propostas: (criado_em DESC), (status), (criado_por), (codigo UNIQUE / sequencial) e índice planejado para consultor_email
* sessoes: (usuario_id), (criado_em DESC)
* metas: (usuario_id)
* propostas_auditoria: (proposta_id), (alterado_em DESC)

Sugeridos:

* propostas(consultor_email) se ainda não criado
* solicitacoes(status), solicitacoes(codigo) para busca rápida

### Migração de backfill e índice (consultor_email)

Arquivo: `scripts/migrations/2025-08-19-backfill-consultor-email-and-index.sql`

O que faz:

* Preenche `consultor_email` com base em `usuarios.email` quando vazio
* Normaliza `consultor_email` para minúsculas
* Cria índice `idx_propostas_consultor_email` se não existir

Como aplicar:

* Execute o SQL no editor do Supabase (schema público) ou via psql conectado ao banco.

## Políticas RLS (demo)

* No `database_setup.sql` estão liberadas para ALL (usar policies restritivas em produção).

## Introspecção

Comando base: `yarn supabase:introspect`

Flags disponíveis:

* `--prod` usa variáveis PROD_*
* `--no-doc` não altera este arquivo
* `--out=arquivo` output alternativo

O script agora usa RPCs SECURITY DEFINER (`list_public_tables`, `list_public_table_columns`, `list_public_routines`, `list_public_views`) para contornar restrições de `information_schema`.

## Contratos da API

* Auth: POST /auth/login, /auth/logout – JWT 24h. `Authorization: Bearer <token>` obrigatório.
* Propostas:
  * GET /proposals – gestor: todas; analista: (criado_por = id) OR (consultor_email = email); consultor: sem acesso no app.
  * POST /proposals – analista: força criado_por = id e preenche consultor_email se vazio; consultor: proibido.
  * PATCH /proposals/:id – analista só altera se for criador; consultor: proibido.
  * DELETE /proposals/:id – apenas gestor.
* Users:
  * GET /users – lista básica
  * POST /users – apenas gestor, cria usuário com senha bcrypt e inicia meta.

## Dicas Operacionais

* Variáveis necessárias: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (preferível), JWT_SECRET, BCRYPT_ROUNDS.
* O Nest carrega .env da raiz automaticamente (server-nest/src/main.ts).
* Next proxy: /api/* → Nest (ver `next.config.js`/`middleware.js`).

## Checklist de Debug

* Login OK? Verificar JWT_SECRET e usuários em `usuarios`.
* Propostas sumidas para analista? Confirmar `consultor_email` e `criado_por` das linhas.
* Trigger de metas: verificar se `status` alterou para 'implantado' e valores.

<!-- AUTO_DB_SCHEMA:START -->
<!-- Gerado por supabase-introspect.mjs (limpo) em 2025-08-27T11:10:00.000Z -->

## Esquema (Introspecção Atual)

### metas (linhas: 0)

| Coluna | Tipo | Not Null | Default |
|--------|------|----------|---------|
| id | uuid | não | gen_random_uuid() |
| usuario_id | uuid | não |  |
| mes | integer | sim |  |
| ano | integer | sim |  |
| quantidade_implantacoes | integer | sim | 0 |

### propostas (linhas: 1)

| Coluna | Tipo | Not Null | Default |
|--------|------|----------|---------|
| id | uuid | não | gen_random_uuid() |
| codigo | character varying | não |  |
| cnpj | character varying | sim |  |
| consultor | text | sim |  |
| consultor_email | text | sim |  |
| operadora | text | sim |  |
| quantidade_vidas | integer | sim |  |
| valor | numeric | sim |  |
| previsao_implantacao | date | não |  |
| status | text | sim |  |
| criado_por | uuid | não |  |
| arquivado | boolean | não | false |
| atendido_por | uuid | não |  |
| cliente_razao_social | text | não |  |
| cliente_nome_fantasia | text | não |  |
| cliente_cidade | text | não |  |
| cliente_estado | text | não |  |
| cliente_segmento | text | não |  |
| cliente_quantidade_funcionarios | integer | não |  |
| cliente_faturamento_anual | numeric | não |  |
| observacoes | text | não |  |
| updated_at | timestamp with time zone | não | now() |
| criado_em | timestamp with time zone | não | now() |
| atendido_em | timestamp with time zone | não |  |
| observacoes_cliente | text | não |  |
| cliente_nome | text | não |  |
| cliente_email | text | não |  |

**Amostra (1):**
`{"id":"539c32f5-ed16-469d-83c5-0d83b6f82ebb","codigo":"PRP0002","cnpj":"32997318000185","consultor":"Bruno Leão","consultor_email":"brunoleao@belzseguros.com.br","operadora":"unimed seguros","quantidade_vidas":45,"valor":29000,"previsao_implantacao":"2025-12-12","status":"em análise","criado_por":"808619d6-23b0-4719-9ebf-79ba5bba4b1f","arquivado":false,"atendido_por":"c0b234bb-ca46-4591-abe7-fc6913c41417","cliente_razao_social":null,"cliente_nome_fantasia":null,"cliente_cidade":null,"cliente_estado":null,"cliente_segmento":null,"cliente_quantidade_funcionarios":null,"cliente_faturamento_anual":null,"observacoes":null,"updated_at":"2025-08-27T03:08:47.274114+00:00","criado_em":"2025-08-27T03:08:26.014488+00:00","atendido_em":"2025-08-27T03:08:47.165+00:00","observacoes_cliente":null,"cliente_nome":"GNV PRIME","cliente_email":"gnvprime@gmail.com"}`

### propostas_auditoria (linhas: 0)

| Coluna | Tipo | Not Null | Default |
|--------|------|----------|---------|
| id | bigint | sim | nextval('propostas_auditoria_id_seq'::regclass) |
| proposta_id | uuid | não |  |
| campo | text | sim |  |
| valor_antigo | text | não |  |
| valor_novo | text | não |  |
| alterado_por | uuid | não |  |
| alterado_em | timestamp with time zone | não | now() |

### propostas_notas (linhas: 0)

| Coluna | Tipo | Not Null | Default |
|--------|------|----------|---------|
| id | uuid | sim | gen_random_uuid() |
| proposta_id | uuid | não |  |
| autor_id | uuid | não |  |
| nota | text | sim |  |
| criado_em | timestamp with time zone | não | now() |

### propostas_tags (linhas: 0)

| Coluna | Tipo | Not Null | Default |
|--------|------|----------|---------|
| proposta_id | uuid | sim |  |
| tag | text | sim |  |
| aplicado_em | timestamp with time zone | não | now() |

### sessoes (linhas: 0)

| Coluna | Tipo | Not Null | Default |
|--------|------|----------|---------|
| id | uuid | sim | gen_random_uuid() |
| usuario_id | uuid | não |  |
| token | text | sim |  |
| criado_em | timestamp with time zone | não | now() |
| ultimo_refresh | timestamp with time zone | não |  |
| expirado_em | timestamp with time zone | não |  |

### solicitacoes (linhas: 0)

| Coluna | Tipo | Not Null | Default |
|--------|------|----------|---------|
| id | uuid | sim | gen_random_uuid() |
| codigo | text | sim |  |
| tipo | text | sim |  |
| subtipo | text | não |  |
| razao_social | text | sim |  |
| cnpj | text | sim |  |
| apolice_da_belz | boolean | sim | false |
| acesso_empresa | text | não | '' |
| operadora | text | não | '' |
| observacoes | text | não | '' |
| arquivos | jsonb | sim | [] |
| dados | jsonb | sim | {} |
| status | text | sim | aberta |
| sla_previsto | date | não |  |
| historico | jsonb | sim | [] |
| prioridade | text | não |  |
| atendido_por | uuid | não |  |
| atendido_por_nome | text | não |  |
| criado_por | uuid | não |  |
| criado_em | timestamp with time zone | não | now() |
| atualizado_em | timestamp with time zone | não | now() |

### usuarios (linhas: 7)

| Coluna | Tipo | Not Null | Default |
|--------|------|----------|---------|
| id | uuid | sim | gen_random_uuid() |
| nome | text | sim |  |
| email | text | sim |  |
| senha | text | sim |  |
| tipo_usuario | text | sim |  |
| ultimo_refresh | timestamp with time zone | não |  |
| status_presenca | text | não |  |
| atualizado_em | timestamp with time zone | não |  |
| criado_em | timestamp with time zone | não | now() |

**Amostra (3):**
`{"id":"5b5dab34-683a-4dd0-8933-04ce9f684880","nome":"Admin","email":"gestor@belzseguros.com.br","senha":"$2a$12$HrThZK2ci0xWAL3p8oAFRuB73vonnjLsTQ8i9p4VI7aHhJkNShqxO","tipo_usuario":"gestor","ultimo_refresh":null,"status_presenca":null,"atualizado_em":null,"criado_em":"2025-08-27T02:53:48.665676+00:00"}`
`{"id":"c0b234bb-ca46-4591-abe7-fc6913c41417","nome":"Matheus Lins","email":"matheusanalista@belzseguros.com.br","senha":"$2a$12$i.zPmD2Kx2ky4ycn8Yp/PeqkUJtJjAQ8SO7EGFXaR95rm571WmWN2","tipo_usuario":"analista","ultimo_refresh":null,"status_presenca":null,"atualizado_em":null,"criado_em":"2025-08-27T03:00:05.94176+00:00"}`
`{"id":"64ca4189-cad7-4176-9356-ce7339dec378","nome":"Matheus Lins","email":"matheusconsultor@belzseguros.com.br","senha":"$2a$12$/BG8EJDReepuXi9bBAJEK.c70N9UZ30Y5bO2p5E.YHT9ajtpTVK7C","tipo_usuario":"consultor","ultimo_refresh":null,"status_presenca":null,"atualizado_em":null,"criado_em":"2025-08-27T03:04:10.338539+00:00"}`

### Funções RPC

* atualizar_meta: exists
* atualizar_meta_usuario: exists

> Nota: Se algo não aparecer, conferir se RPCs de introspecção foram aplicadas e se a execução usou a chave correta.

<!-- AUTO_DB_SCHEMA:END -->
