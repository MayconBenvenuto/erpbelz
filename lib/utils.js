import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Formatação de moeda BRL
export function formatCurrency(value) {
  const num = typeof value === 'number' ? value : parseFloat(value || 0)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(num)
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
  const variants = {
    'em análise': 'secondary',
    'pendencias seguradora': 'outline',
    'boleto liberado': 'default',
    'implantando': 'secondary',
    'pendente cliente': 'outline',
    'pleito seguradora': 'destructive',
    'negado': 'destructive',
    'implantado': 'default'
  }
  return variants[status] || 'secondary'
}
