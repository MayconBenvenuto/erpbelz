import { NextResponse } from 'next/server'
import { handleCORS } from '@/lib/api-helpers'

const cache = new Map()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutos

async function validateCNPJWithAPI(cnpj) {
  const cleanCNPJ = (cnpj || '').replace(/[^\d]/g, '')
  if (cleanCNPJ.length !== 14) {
    return { valid: false, error: 'Formato de CNPJ inválido' }
  }

  try {
    const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cleanCNPJ}`, {
      headers: { 'User-Agent': 'CRM-Propostas/1.0' },
    })

    if (response.ok) {
      const data = await response.json()
      if (data.status === 'OK') {
        return {
          valid: true,
          data: {
            cnpj: cleanCNPJ,
            razao_social: data.nome,
            nome_fantasia: data.fantasia || 'Não informado',
            situacao_cadastral: data.situacao,
            descricao_situacao_cadastral: data.situacao,
            cnae_fiscal_descricao: data.atividade_principal?.[0]?.text,
            logradouro: data.logradouro,
            numero: data.numero,
            bairro: data.bairro,
            municipio: data.municipio,
            uf: data.uf,
            cep: data.cep,
            telefone: data.telefone,
            email: data.email,
            source: 'ReceitaWS',
          },
        }
      }
    }
  } catch (error) {}

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`)
    if (response.ok) {
      const data = await response.json()
      return { valid: true, data: { ...data, source: 'BrasilAPI' } }
    }
  } catch (error) {}

  try {
    const headers = { 'User-Agent': 'CRM-Propostas/1.0', Accept: 'application/json' }
    const apiKey = process.env.CNPJA_API_KEY
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
    const response = await fetch(`https://api.cnpja.com/office/${cleanCNPJ}`, { headers })

    if (response.ok) {
      const data = await response.json()
      return {
        valid: true,
        data: {
          cnpj: cleanCNPJ,
          razao_social: data.company?.name,
          nome_fantasia: data.alias || 'Não informado',
          situacao_cadastral: data.status?.text,
          descricao_situacao_cadastral: data.status?.text,
          cnae_fiscal_descricao: data.mainActivity?.text,
          logradouro: data.address?.street,
          numero: data.address?.number,
          bairro: data.address?.district,
          municipio: data.address?.city,
          uf: data.address?.state,
          cep: data.address?.zip,
          telefone: data.phones?.[0]?.number,
          email: data.emails?.[0]?.address,
          source: 'CNPJA',
        },
      }
    }
  } catch (error) {}

  return { valid: false, error: 'CNPJ não encontrado ou serviços indisponíveis' }
}

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function POST(request) {
  const origin = request.headers.get('origin')
  const body = await request.json()
  const { cnpj } = body
  const now = Date.now()
  const key = (cnpj || '').replace(/[^\d]/g, '')
  const cached = cache.get(key)
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return handleCORS(NextResponse.json(cached.value), origin)
  }
  const result = await validateCNPJWithAPI(cnpj)
  cache.set(key, { ts: now, value: result })
  return handleCORS(NextResponse.json(result), origin)
}
