import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Formatação de moeda BRL
let _currencyFormatterBRL = null
export function formatCurrency(value) {
  if (!_currencyFormatterBRL) {
    _currencyFormatterBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  }
  const num = typeof value === 'number' ? value : parseFloat(value || 0)
  return _currencyFormatterBRL.format(isNaN(num) ? 0 : num)
}

// Formatação de CNPJ 00.000.000/0000-00
export function formatCNPJ(cnpj) {
  if (!cnpj) return ''
  const onlyDigits = String(cnpj).replace(/\D/g, '')
  if (onlyDigits.length !== 14) return cnpj
  return onlyDigits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

// Mapeia status para variantes de Badge do shadcn
export function getStatusBadgeVariant(status) {
  const s = String(status || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
  switch (s) {
    case 'em analise':
      return 'secondary'
    case 'pendencias seguradora':
      return 'outline'
    case 'boleto liberado':
      return 'default'
    case 'implantando':
      return 'secondary'
    case 'pendente cliente':
      return 'outline'
    case 'pleito seguradora':
      return 'destructive'
    case 'negado':
      return 'destructive'
    case 'implantado':
      return 'default'
    default:
      return 'secondary'
  }
}

// Mapeia status para classes Tailwind de cor (psicologia das cores)
// - em análise: azul (informação/serenidade)
// - pendencias seguradora: amber (atenção/aguardando)
// - boleto liberado: amarelo (alerta positivo de ação disponível)
// - implantando: ciano (progresso/ação em curso)
// - pendente cliente: laranja (atenção necessária)
// - pleito seguradora: violeta (negociação/disputa)
// - negado: vermelho (erro/negativo)
// - implantado: verde (sucesso/concluído)
export function getStatusBadgeClasses(status) {
  const s = String(status || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()

  switch (s) {
    case 'em analise':
      return 'bg-primary text-primary-foreground border-transparent hover:bg-primary/90'
    case 'pendencias seguradora':
      return 'bg-amber-500 text-white border-transparent hover:bg-amber-600'
    case 'boleto liberado':
      return 'bg-yellow-400 text-black border-transparent hover:bg-yellow-500'
    case 'implantando':
      return 'bg-cyan-500 text-white border-transparent hover:bg-cyan-600'
    case 'pendente cliente':
      return 'bg-orange-500 text-white border-transparent hover:bg-orange-600'
    case 'pleito seguradora':
      return 'bg-violet-500 text-white border-transparent hover:bg-violet-600'
    case 'negado':
      return 'bg-red-500 text-white border-transparent hover:bg-red-600'
    case 'implantado':
      return 'bg-green-500 text-white border-transparent hover:bg-green-600'
    default:
      return 'bg-gray-300 text-gray-900 border-transparent hover:bg-gray-400'
  }
}
