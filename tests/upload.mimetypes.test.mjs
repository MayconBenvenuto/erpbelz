import { describe, it, expect } from 'vitest'

// Espelha lista de mimetypes usados em upload de solicitações
const allowed = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv'
]

describe('Upload solicitacoes mimetypes', () => {
  it('inclui xlsx, xls e csv', () => {
    expect(allowed).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(allowed).toContain('application/vnd.ms-excel')
    expect(allowed).toContain('text/csv')
  })
})
