// Gera dinamicamente o documento OpenAPI 3.1 básico do sistema
// Mantido simples para evitar dependências extras; expandir conforme necessário.
import { NextResponse } from 'next/server'
import { OPERADORAS, STATUS_OPTIONS, SOLICITACAO_STATUS } from '@/lib/constants'

export const runtime = 'edge'

function buildSpec() {
  const servers = [
    {
      url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      description: 'Servidor Principal',
    },
  ]

  return {
    openapi: '3.1.0',
    info: {
      title: 'Belz ERP / CRM API',
      version: '1.0.0',
      description:
        'Documentação pública das rotas da API do sistema de gestão Belz. Todas as rotas usam JWT Bearer quando indicado.',
      contact: { name: 'Equipe Belz', email: 'suporte@belz.local' },
    },
    servers,
    tags: [
      { name: 'Auth', description: 'Autenticação e sessão' },
      { name: 'Propostas', description: 'Gestão de propostas comerciais' },
      { name: 'Solicitações', description: 'Workflow de movimentações / tickets' },
      { name: 'Metas', description: 'Metas e acompanhamento' },
      { name: 'Util', description: 'Utilidades e saúde' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 3 },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            sessionId: { type: 'string' },
            token: { type: 'string', description: 'JWT válido por 24h' },
            requirePasswordReset: { type: 'boolean' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nome: { type: 'string' },
            email: { type: 'string', format: 'email' },
            tipo_usuario: {
              type: 'string',
              enum: [
                'gestor',
                'gerente',
                'analista_implantacao',
                'analista_movimentacao',
                'consultor',
                'analista_cliente',
              ],
            },
            must_change_password: { type: 'boolean' },
          },
        },
        Proposta: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            codigo: { type: 'string' },
            cnpj: { type: 'string' },
            operadora: { type: 'string', enum: OPERADORAS },
            consultor: { type: 'string' },
            consultor_email: { type: 'string', format: 'email' },
            quantidade_vidas: { type: 'integer' },
            valor: { type: 'number' },
            status: { type: 'string', enum: STATUS_OPTIONS },
            previsao_implantacao: { type: 'string', format: 'date' },
            criado_por: { type: 'string', format: 'uuid' },
            atendido_por: { type: 'string', format: 'uuid', nullable: true },
            criado_em: { type: 'string', format: 'date-time' },
          },
        },
        PropostaCreate: {
          type: 'object',
          required: ['cnpj', 'operadora', 'quantidade_vidas', 'valor', 'status', 'criado_por'],
          properties: {
            cnpj: { type: 'string' },
            consultor: { type: 'string' },
            consultor_email: { type: 'string', format: 'email' },
            cliente_nome: { type: 'string' },
            cliente_email: { type: 'string', format: 'email' },
            operadora: { type: 'string', enum: OPERADORAS },
            quantidade_vidas: { type: 'integer' },
            valor: { type: 'number' },
            previsao_implantacao: { type: 'string', format: 'date' },
            status: { type: 'string', enum: STATUS_OPTIONS },
            criado_por: { type: 'string', format: 'uuid' },
          },
        },
        PropostaPatchAnalista: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: STATUS_OPTIONS },
            claim: { type: 'boolean', description: 'Assumir proposta se ainda sem atendido_por' },
          },
        },
        PropostaPatchGestor: {
          allOf: [
            { $ref: '#/components/schemas/PropostaPatchAnalista' },
            {
              type: 'object',
              properties: {
                quantidade_vidas: { type: 'integer' },
                valor: { type: 'number' },
                previsao_implantacao: { type: 'string', format: 'date' },
                operadora: { type: 'string', enum: OPERADORAS },
                consultor: { type: 'string' },
                consultor_email: { type: 'string', format: 'email' },
                observacoes_cliente: { type: 'string' },
              },
            },
          ],
        },
        Solicitacao: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            codigo: { type: 'string' },
            tipo: { type: 'string' },
            subtipo: { type: 'string', nullable: true },
            razao_social: { type: 'string' },
            cnpj: { type: 'string' },
            apolice_da_belz: { type: 'boolean' },
            acesso_empresa: { type: 'string' },
            operadora: { type: 'string' },
            observacoes: { type: 'string' },
            arquivos: { type: 'array', items: { type: 'object' } },
            dados: { type: 'object' },
            historico: { type: 'array', items: { type: 'object' } },
            status: { type: 'string', enum: SOLICITACAO_STATUS },
            sla_previsto: { type: 'string', format: 'date' },
            prioridade: { type: 'string' },
            atendido_por: { type: 'string', format: 'uuid', nullable: true },
            criado_por: { type: 'string', format: 'uuid' },
            criado_em: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    paths: {
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login',
          operationId: 'login',
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
            },
          },
          responses: {
            200: {
              description: 'Autenticado',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } },
              },
            },
            401: { description: 'Credenciais inválidas' },
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Usuário atual',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Ok',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { user: { $ref: '#/components/schemas/User' } },
                  },
                },
              },
            },
            401: { description: 'Não autenticado' },
          },
        },
      },
      '/api/proposals': {
        get: {
          tags: ['Propostas'],
          summary: 'Lista propostas',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
            { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1 } },
            { name: 'fields', in: 'query', schema: { type: 'string', enum: ['list'] } },
            {
              name: 'code',
              in: 'query',
              schema: { type: 'string' },
              description: 'Busca direta por código PRP',
            },
          ],
          responses: {
            200: {
              description: 'Lista ou objeto paginado',
              content: {
                'application/json': {
                  schema: {
                    oneOf: [
                      { type: 'array', items: { $ref: '#/components/schemas/Proposta' } },
                      {
                        type: 'object',
                        properties: {
                          data: { type: 'array', items: { $ref: '#/components/schemas/Proposta' } },
                          page: { type: 'integer' },
                          pageSize: { type: 'integer' },
                          total: { type: 'integer' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            403: { description: 'Sem permissão' },
          },
        },
        post: {
          tags: ['Propostas'],
          summary: 'Cria proposta',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/PropostaCreate' } },
            },
          },
          responses: {
            200: {
              description: 'Criada',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/Proposta' } },
              },
            },
            400: { description: 'Validação' },
            403: { description: 'Sem permissão' },
          },
        },
      },
      '/api/proposals/{id}': {
        get: {
          tags: ['Propostas'],
          summary: 'Detalhe proposta',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: {
              description: 'Ok',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/Proposta' } },
              },
            },
            404: { description: 'Não encontrada' },
          },
        },
        patch: {
          tags: ['Propostas'],
          summary: 'Atualiza/claim',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { $ref: '#/components/schemas/PropostaPatchAnalista' },
                    { $ref: '#/components/schemas/PropostaPatchGestor' },
                  ],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Atualizada',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/Proposta' } },
              },
            },
            403: { description: 'Sem permissão' },
          },
        },
        delete: {
          tags: ['Propostas'],
          summary: 'Remove proposta (gestor)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Removida' },
            403: { description: 'Sem permissão' },
          },
        },
      },
      '/api/solicitacoes': {
        get: {
          tags: ['Solicitações'],
          summary: 'Lista solicitações',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'pageSize', in: 'query', schema: { type: 'integer' } },
            { name: 'fields', in: 'query', schema: { type: 'string', enum: ['list'] } },
            { name: 'atrasadas', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            200: {
              description: 'Objeto paginado',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Solicitacao' } },
                      page: { type: 'integer' },
                      pageSize: { type: 'integer' },
                      total: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Solicitações'],
          summary: 'Cria solicitação',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['tipo', 'razao_social', 'cnpj', 'apolice_da_belz'],
                  properties: {
                    tipo: { type: 'string' },
                    subtipo: { type: 'string' },
                    razao_social: { type: 'string' },
                    cnpj: { type: 'string' },
                    apolice_da_belz: { type: 'boolean' },
                    operadora: { type: 'string' },
                    observacoes: { type: 'string' },
                    sla_previsto: { type: 'string', format: 'date' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Criada',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/Solicitacao' } },
              },
            },
          },
        },
      },
      '/api/auth/change-password': {
        post: {
          tags: ['Auth'],
          summary: 'Troca senha autenticado',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { atual: { type: 'string' }, nova: { type: 'string', minLength: 8 } },
                  required: ['nova'],
                },
              },
            },
          },
          responses: {
            200: { description: 'Senha alterada' },
            400: { description: 'Validação' },
            401: { description: 'Não autenticado' },
          },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout e invalida sessão',
          security: [{ bearerAuth: [] }],
          requestBody: { required: false },
          responses: { 200: { description: 'Sessão finalizada' } },
        },
      },
      '/api/auth/renew': {
        get: {
          tags: ['Auth'],
          summary: 'Renova JWT (gera novo token)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Novo token' },
            401: { description: 'Não autenticado' },
          },
        },
      },
      '/api/auth/ping': {
        get: {
          tags: ['Auth'],
          summary: 'Ping simples (health auth)',
          responses: { 200: { description: 'OK' } },
        },
      },
      '/api/auth/forgot-password/request': {
        post: {
          tags: ['Auth'],
          summary: 'Inicia fluxo esqueci senha',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: { email: { type: 'string', format: 'email' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Se existir usuário, código enviado' },
            429: { description: 'Rate limit' },
          },
        },
      },
      '/api/auth/forgot-password/verify': {
        post: {
          tags: ['Auth'],
          summary: 'Verifica código e gera resetToken',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'code'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    code: { type: 'string', pattern: '^[0-9]{6}$' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Código válido' }, 400: { description: 'Inválido' } },
        },
      },
      '/api/auth/forgot-password/reset': {
        post: {
          tags: ['Auth'],
          summary: 'Redefine senha com resetToken',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'code', 'resetToken', 'novaSenha'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    code: { type: 'string' },
                    resetToken: { type: 'string' },
                    novaSenha: { type: 'string', minLength: 8 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Senha redefinida' },
            400: { description: 'Dados inválidos' },
          },
        },
      },
      '/api/sessions': {
        get: {
          tags: ['Auth'],
          summary: 'Lista sessões ativas do usuário (gestor vê todas)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Lista de sessões' },
            401: { description: 'Não autenticado' },
          },
        },
      },
      '/api/sessions/ping': {
        post: {
          tags: ['Auth'],
          summary: 'Heartbeat de sessão',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['sessionId'],
                  properties: { sessionId: { type: 'string', format: 'uuid' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Atualizado' },
            400: { description: 'Faltando sessionId' },
            401: { description: 'Não autenticado' },
          },
        },
      },
      '/api/users': {
        get: {
          tags: ['Auth'],
          summary: 'Lista usuários (dados básicos)',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Lista' }, 401: { description: 'Não autenticado' } },
        },
        post: {
          tags: ['Auth'],
          summary: 'Cria usuário (gestor)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['nome', 'email', 'senha', 'tipo_usuario'],
                  properties: {
                    nome: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    senha: { type: 'string', minLength: 6 },
                    tipo_usuario: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Criado' }, 403: { description: 'Apenas gestor' } },
        },
        delete: {
          tags: ['Auth'],
          summary: 'Exclui usuário (gestor)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Excluído' }, 403: { description: 'Apenas gestor' } },
        },
      },
      '/api/proposals/files': {
        get: {
          tags: ['Propostas'],
          summary: 'Lista arquivos de uma proposta',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'proposta_id',
              in: 'query',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Ok' } },
        },
        post: {
          tags: ['Propostas'],
          summary: 'Registra metadados de arquivo',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['proposta_id', 'path'],
                  properties: {
                    proposta_id: { type: 'string', format: 'uuid' },
                    path: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Registrado' } },
        },
      },
      '/api/proposals/notes': {
        get: {
          tags: ['Propostas'],
          summary: 'Lista notas',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'proposta_id',
              in: 'query',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Ok' } },
        },
        post: {
          tags: ['Propostas'],
          summary: 'Cria nota',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['proposta_id', 'nota'],
                  properties: {
                    proposta_id: { type: 'string', format: 'uuid' },
                    nota: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Criada' },
            403: { description: 'Sem permissão (consultor)' },
          },
        },
      },
      '/api/proposals/tags': {
        get: {
          tags: ['Propostas'],
          summary: 'Lista tags',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'proposta_id',
              in: 'query',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Ok' } },
        },
        post: {
          tags: ['Propostas'],
          summary: 'Adiciona tag',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['proposta_id', 'tag'],
                  properties: {
                    proposta_id: { type: 'string', format: 'uuid' },
                    tag: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Adicionada' } },
        },
        delete: {
          tags: ['Propostas'],
          summary: 'Remove tag',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'proposta_id',
              in: 'query',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
            { name: 'tag', in: 'query', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Removida' } },
        },
      },
      '/api/proposals/upload-url': {
        post: {
          tags: ['Propostas'],
          summary: 'Gera URL assinada upload',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['filename', 'mime', 'size'],
                  properties: {
                    filename: { type: 'string' },
                    mime: { type: 'string' },
                    size: { type: 'integer' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'URL gerada' } },
        },
      },
      '/api/proposals/upload': {
        post: {
          tags: ['Propostas'],
          summary: 'Upload direto (multipart/form-data)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Arquivo enviado' },
            415: { description: 'Tipo não permitido' },
          },
        },
      },
      '/api/proposals/free-head': {
        get: {
          tags: ['Propostas'],
          summary: 'Cabeçalhos de propostas livres (SLA)',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Lista' } },
        },
      },
      '/api/proposals/events': {
        get: {
          tags: ['Propostas'],
          summary: 'Stream SSE de eventos de propostas',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Stream iniciado' } },
        },
      },
      '/api/proposals/stale-check': {
        post: {
          tags: ['Propostas'],
          summary: 'Dispara alerta propostas 48h',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Processado' } },
        },
      },
      '/api/proposals/summary': {
        get: {
          tags: ['Propostas'],
          summary: 'Resumo SLA médio e pendentes',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Resumo' } },
        },
      },
      '/api/alerts/stale-proposals': {
        get: {
          tags: ['Util'],
          summary: 'Status propostas >48h e >72h (gestor)',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Ok' } },
        },
        post: {
          tags: ['Util'],
          summary: 'Trigger manual stale-check (gestor)',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Executado' } },
        },
      },
      '/api/alerts/proposals/stale': {
        get: {
          tags: ['Util'],
          summary: 'Envia email propostas com horas limite (gestor)',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Ok' } },
        },
      },
      '/api/alerts/solicitacoes/sla': {
        get: {
          tags: ['Util'],
          summary: 'Rota desativada (retorna 410)',
          responses: { 410: { description: 'Desativada' } },
        },
      },
      '/api/solicitacoes/stale-check': {
        post: {
          tags: ['Solicitações'],
          summary: 'Verificação staleness solicitacoes (gestor?)',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Ok' } },
        },
      },
      '/api/solicitacoes/upload-url': {
        post: {
          tags: ['Solicitações'],
          summary: 'Gera URL assinada upload arquivo',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Gerada' } },
        },
      },
      '/api/solicitacoes/upload': {
        post: {
          tags: ['Solicitações'],
          summary: 'Upload direto arquivo (multipart/form-data)',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Enviado' } },
        },
      },
      '/api/goals': {
        get: {
          tags: ['Metas'],
          summary: 'Lista metas (gestor vê todas, outros só próprias)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Lista de metas',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        usuario_id: { type: 'string', format: 'uuid' },
                        valor_meta: { type: 'number' },
                        valor_alcancado: { type: 'number' },
                        atualizado_em: { type: 'string', format: 'date-time', nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Metas'],
          summary: 'Recalcula progresso (gestor)',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Recalculado' }, 403: { description: 'Apenas gestor' } },
        },
        patch: {
          tags: ['Metas'],
          summary: 'Define/atualiza meta para usuário (gestor)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['usuario_id', 'valor_meta'],
                  properties: {
                    usuario_id: { type: 'string', format: 'uuid' },
                    valor_meta: { type: 'number' },
                    valor_alcancado: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Atualizada' }, 403: { description: 'Apenas gestor' } },
        },
      },
      '/api/health': {
        get: {
          tags: ['Util'],
          summary: 'Health check',
          responses: {
            200: { description: 'OK' },
            503: { description: 'Dependência indisponível' },
          },
        },
      },
      '/api/validate-cnpj': {
        post: {
          tags: ['Util'],
          summary: 'Valida CNPJ e retorna dados externos',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['cnpj'],
                  properties: { cnpj: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Resultado da validação' },
            400: { description: 'Entrada inválida' },
          },
        },
      },
      '/api/sessions/ping': {
        post: {
          tags: ['Auth'],
          summary: 'Atualiza heartbeat da sessão',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Atualizado' },
            401: { description: 'Não autenticado' },
          },
        },
      },
    },
  }
}

export async function GET() {
  return NextResponse.json(buildSpec())
}
