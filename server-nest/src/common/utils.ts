export function formatCurrency(value: any) {
  const num = typeof value === 'number' ? value : parseFloat(value || 0)
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
}

export function formatCNPJ(cnpj?: string) {
  if (!cnpj) return ''
  const onlyDigits = String(cnpj).replace(/\D/g, '')
  if (onlyDigits.length !== 14) return cnpj as string
  return onlyDigits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}
