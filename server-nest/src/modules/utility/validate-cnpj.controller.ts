import { Body, Controller, Post } from '@nestjs/common'

const cache = new Map<string, { ts: number; value: any }>()
const CACHE_TTL_MS = 10 * 60 * 1000

@Controller('validate-cnpj')
export class ValidateCnpjController {
  @Post()
  async validate(@Body() body: any) {
    const cnpj = body?.cnpj as string
    const now = Date.now()
    const key = (cnpj || '').replace(/[^\d]/g, '')
    const cached = cache.get(key)
    if (cached && now - cached.ts < CACHE_TTL_MS) return cached.value

    const result = await this.validateCNPJWithAPI(cnpj)
    cache.set(key, { ts: now, value: result })
    return result
  }

  private async validateCNPJWithAPI(cnpj: string) {
    const cleanCNPJ = (cnpj || '').replace(/[^\d]/g, '')
    if (cleanCNPJ.length !== 14) {
      return { valid: false, error: 'Formato de CNPJ inválido' }
    }

    try {
      const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cleanCNPJ}`, { headers: { 'User-Agent': 'CRM-Propostas/1.0' } })
      if (response.ok) {
        const data: any = await response.json()
        if (data.status === 'OK') {
          return { valid: true, data: { cnpj: cleanCNPJ, razao_social: data.nome, nome_fantasia: data.fantasia || 'Não informado', situacao_cadastral: data.situacao, descricao_situacao_cadastral: data.situacao, cnae_fiscal_descricao: data.atividade_principal?.[0]?.text, logradouro: data.logradouro, numero: data.numero, bairro: data.bairro, municipio: data.municipio, uf: data.uf, cep: data.cep, telefone: data.telefone, email: data.email, source: 'ReceitaWS' } }
        }
      }
    } catch {}

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`)
      if (response.ok) {
        const data: any = await response.json()
        return { valid: true, data: { ...(data as Record<string, any>), source: 'BrasilAPI' } }
      }
    } catch {}

    try {
      const headers: any = { 'User-Agent': 'CRM-Propostas/1.0', Accept: 'application/json' }
      const apiKey = process.env.CNPJA_API_KEY
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
      const response = await fetch(`https://api.cnpja.com/office/${cleanCNPJ}`, { headers })
      if (response.ok) {
        const data: any = await response.json()
        return { valid: true, data: { cnpj: cleanCNPJ, razao_social: data.company?.name, nome_fantasia: data.alias || 'Não informado', situacao_cadastral: data.status?.text, descricao_situacao_cadastral: data.status?.text, cnae_fiscal_descricao: data.mainActivity?.text, logradouro: data.address?.street, numero: data.address?.number, bairro: data.address?.district, municipio: data.address?.city, uf: data.address?.state, cep: data.address?.zip, telefone: data.phones?.[0]?.number, email: data.emails?.[0]?.address, source: 'CNPJA' } }
      }
    } catch {}

    return { valid: false, error: 'CNPJ não encontrado ou serviços indisponíveis' }
  }
}
