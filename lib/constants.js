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
  'recepcionado',
  'análise',
  'pendência',
  'pleito seguradora',
  'boleto liberado',
  'implantado',
  'proposta declinada',
]

// Cores dos status conforme psicologia das cores (HEX específicos)
export const STATUS_COLORS = {
  'recepcionado': {
    bg: '#E3F2FD',
    text: '#1565C0',
    border: '#2196F3'
  },
  'análise': {
    bg: '#FFF8E1', 
    text: '#F57C00',
    border: '#FF9800'
  },
  'pendência': {
    bg: '#FFF3E0',
    text: '#E65100', 
    border: '#FF9800'
  },
  'pleito seguradora': {
    bg: '#E8EAF6',
    text: '#3F51B5',
    border: '#3F51B5'
  },
  'boleto liberado': {
    bg: '#E8F5E8',
    text: '#2E7D32',
    border: '#4CAF50'
  },
  'implantado': {
    bg: '#E0F2F1',
    text: '#00695C',
    border: '#009688'
  },
  'proposta declinada': {
    bg: '#FFEBEE',
    text: '#C62828',
    border: '#F44336'
  }
}

// Workflow de status de solicitações de movimentação
export const SOLICITACAO_STATUS = [
  'aberta',          // criada
  'em validação',    // documentos conferindo
  'em execução',     // ação em andamento
  'concluída',       // finalizada com sucesso
  'cancelada'        // interrompida
]

// Cores dos status de solicitações (seguindo mesmo padrão das propostas)
export const SOLICITACAO_STATUS_COLORS = {
  'aberta': {
    bg: '#E3F2FD',
    text: '#1565C0',
    border: '#2196F3'
  },
  'em validação': {
    bg: '#FFF8E1', 
    text: '#F57C00',
    border: '#FF9800'
  },
  'em execução': {
    bg: '#E8EAF6',
    text: '#3F51B5',
    border: '#3F51B5'
  },
  'concluída': {
    bg: '#E0F2F1',
    text: '#00695C',
    border: '#009688'
  },
  'cancelada': {
    bg: '#FFEBEE',
    text: '#C62828',
    border: '#F44336'
  }
}
