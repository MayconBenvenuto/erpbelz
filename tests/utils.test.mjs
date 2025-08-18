import { describe, it, expect } from 'vitest'
import { formatCurrency, formatCNPJ, getStatusBadgeVariant } from '@/lib/utils'

describe('utils', () => {
  it('formatCurrency deve formatar BRL', () => {
    expect(formatCurrency(1234.56)).toBe('R$ 1.234,56')
  })

  it('formatCNPJ deve aplicar máscara válida', () => {
    expect(formatCNPJ('11222333000181')).toBe('11.222.333/0001-81')
  })

  it('getStatusBadgeVariant deve mapear status', () => {
    expect(getStatusBadgeVariant('implantado')).toBe('default')
  })
})
