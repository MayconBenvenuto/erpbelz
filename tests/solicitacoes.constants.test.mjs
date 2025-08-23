import { describe, it, expect } from 'vitest'
import { SOLICITACAO_STATUS } from '@/lib/constants'

describe('SOLICITACAO_STATUS', () => {
  it('deve conter workflow esperado', () => {
    expect(SOLICITACAO_STATUS).toEqual([
      'aberta', 'em validação', 'em execução', 'concluída', 'cancelada'
    ])
  })
})
