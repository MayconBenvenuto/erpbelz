// Constantes compartilhadas do sistema
// Operadoras de planos disponíveis
export const OPERADORAS = [
  'unimed recife',
  'unimed seguros',
  'bradesco',
  'amil',
  'ampla',
  'fox',
  'hapvida',
  'medsenior',
  'sulamerica',
  'select',
]

// Opções de status de propostas
export const STATUS_OPTIONS = [
  'em análise',
  'pendencias seguradora',
  'boleto liberado',
  'implantando',
  'pendente cliente',
  'pleito seguradora',
  'negado',
  'implantado',
]

// Workflow de status de solicitações de movimentação
export const SOLICITACAO_STATUS = [
  'aberta',          // criada
  'em validação',    // documentos conferindo
  'em execução',     // ação em andamento
  'concluída',       // finalizada com sucesso
  'cancelada'        // interrompida
]
