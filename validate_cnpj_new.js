// CNPJ validation: ReceitaWS → BrasilAPI → CNPJA (cascata simples)
async function validateCNPJ(cnpj) {
  // Helper: limpa e valida formato básico
  const cleanCNPJ = (cnpj || '').replace(/[^\d]/g, '')
  if (cleanCNPJ.length !== 14) {
    return { valid: false, error: 'Formato de CNPJ inválido' }
  }

  // 1ª tentativa: ReceitaWS
  try {
    console.log('🔍 Tentando ReceitaWS...')
    const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cleanCNPJ}`, {
      headers: { 'User-Agent': 'CRM-Propostas/1.0' }
    })

    if (response.ok) {
      const data = await response.json()
      if (data.status === 'OK') {
        console.log('✅ ReceitaWS: sucesso')
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
            source: 'ReceitaWS'
          }
        }
      } else {
        console.log('❌ ReceitaWS retornou erro:', data.message)
      }
    }
  } catch (error) {
    console.log('❌ ReceitaWS falhou:', error.message)
  }

  // 2ª tentativa: BrasilAPI
  try {
    console.log('🔍 Tentando BrasilAPI...')
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`)

    if (response.ok) {
      const data = await response.json()
      console.log('✅ BrasilAPI: sucesso')
      return { 
        valid: true, 
        data: {
          ...data,
          source: 'BrasilAPI'
        }
      }
    } else if (response.status === 404) {
      console.log('❌ BrasilAPI: CNPJ não encontrado (404)')
      return { valid: false, error: 'CNPJ não encontrado' }
    }
  } catch (error) {
    console.log('❌ BrasilAPI falhou:', error.message)
  }

  // 3ª tentativa: CNPJA API
  try {
    console.log('🔍 Tentando CNPJA...')
    const response = await fetch(`https://api.cnpja.com/office/${cleanCNPJ}`, {
      headers: { 
        'User-Agent': 'CRM-Propostas/1.0',
        'Accept': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ CNPJA: sucesso')
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
          source: 'CNPJA'
        }
      }
    } else if (response.status === 404) {
      console.log('❌ CNPJA: CNPJ não encontrado (404)')
      return { valid: false, error: 'CNPJ não encontrado' }
    }
  } catch (error) {
    console.log('❌ CNPJA falhou:', error.message)
  }

  // Todas as APIs falharam
  console.log('❌ Todas as APIs de validação falharam')
  return { 
    valid: false, 
    error: 'CNPJ não encontrado ou serviços de validação indisponíveis' 
  }
}
