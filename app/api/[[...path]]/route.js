import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { 
  hashPassword, 
  verifyPassword, 
  generateToken,
  verifyToken,
  checkRateLimit,
  sanitizeInput,
  validateEmail,
  validateCNPJ as validateCNPJFormat,
  sanitizeForLog,
  addSecurityHeaders
} from '@/lib/security'

// Supabase client com configuração segura
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// CORS configuração restritiva
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000']

function handleCORS(response, origin = '*') {
  const isAllowedOrigin = allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development'
  
  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Max-Age', '86400')
  
  return addSecurityHeaders(response)
}

// Middleware de autenticação para endpoints protegidos
async function requireAuth(request) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Token de acesso requerido', status: 401 }
  }
  
  const token = authHeader.substring(7)
  const decoded = verifyToken(token)
  
  if (!decoded) {
    return { error: 'Token inválido ou expirado', status: 401 }
  }
  
  return { user: decoded }
}

// OPTIONS handler para CORS preflight
export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

// CNPJ validation: ReceitaWS → BrasilAPI → CNPJA (cascata simples)
async function validateCNPJWithAPI(cnpj) {
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

// Route handler function
async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    // Root endpoint
    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({ message: "CRM Propostas API" }))
    }

    // Auth endpoints
    if (route === '/auth/login' && method === 'POST') {
      const origin = request.headers.get('origin')
      const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
      
      // Rate limiting
      if (!checkRateLimit(`login:${clientIP}`)) {
        return handleCORS(NextResponse.json(
          { error: "Muitas tentativas de login. Tente novamente em 15 minutos." }, 
          { status: 429 }
        ), origin)
      }

      try {
        const body = await request.json()
        const email = sanitizeInput(body.email)
        const password = body.password

        // Validação de entrada
        if (!validateEmail(email) || !password) {
          return handleCORS(NextResponse.json(
            { error: "Email e senha são obrigatórios" }, 
            { status: 400 }
          ), origin)
        }

        // Buscar usuário no banco
        const { data: user, error } = await supabase
          .from('usuarios')
          .select('id, nome, email, senha, tipo_usuario')
          .eq('email', email)
          .single()

        if (error || !user) {
          return handleCORS(NextResponse.json(
            { error: "Credenciais inválidas" }, 
            { status: 401 }
          ), origin)
        }

        // Verificar senha (suporte para senhas hash e texto plano durante migração)
        let passwordValid = false
        if (user.senha.startsWith('$2a$') || user.senha.startsWith('$2b$')) {
          // Senha já está hashada
          passwordValid = await verifyPassword(password, user.senha)
        } else {
          // Senha em texto plano (migração)
          passwordValid = password === user.senha
          
          // Atualizar para hash na primeira validação bem-sucedida
          if (passwordValid) {
            const hashedPassword = await hashPassword(password)
            await supabase
              .from('usuarios')
              .update({ senha: hashedPassword })
              .eq('id', user.id)
          }
        }

        if (!passwordValid) {
          return handleCORS(NextResponse.json(
            { error: "Credenciais inválidas" }, 
            { status: 401 }
          ), origin)
        }

        // Gerar JWT token
        const token = generateToken(user)

        // Criar sessão
        const { data: session, error: sessionError } = await supabase
          .from('sessoes')
          .insert([{
            id: crypto.randomUUID(),
            usuario_id: user.id,
            data_login: new Date().toISOString()
          }])
          .select()
          .single()

        if (sessionError) {
          console.error('Session creation error:', sessionError)
        }

        return handleCORS(NextResponse.json({ 
          user: { 
            id: user.id, 
            nome: user.nome, 
            email: user.email, 
            tipo_usuario: user.tipo_usuario 
          },
          token,
          sessionId: session?.id,
          expiresIn: '24h'
        }), origin)

      } catch (error) {
        console.error('Login error:', sanitizeForLog(error))
        return handleCORS(NextResponse.json(
          { error: "Erro interno do servidor" }, 
          { status: 500 }
        ), origin)
      }
    }

    if (route === '/auth/logout' && method === 'POST') {
      const body = await request.json()
      const { sessionId } = body

      if (sessionId) {
        // Get session start time to calculate duration
        const { data: session } = await supabase
          .from('sessoes')
          .select('data_login')
          .eq('id', sessionId)
          .single()

        if (session) {
          const loginTime = new Date(session.data_login)
          const logoutTime = new Date()
          const timeDiff = logoutTime - loginTime
          const hours = Math.floor(timeDiff / (1000 * 60 * 60))
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))

          await supabase
            .from('sessoes')
            .update({
              data_logout: logoutTime.toISOString(),
              tempo_total: `${hours}:${minutes}:00`
            })
            .eq('id', sessionId)
        }
      }

      return handleCORS(NextResponse.json({ success: true }))
    }

    // CNPJ validation endpoint
    if (route === '/validate-cnpj' && method === 'POST') {
      const body = await request.json()
      const { cnpj } = body

      const result = await validateCNPJWithAPI(cnpj)
      return handleCORS(NextResponse.json(result))
    }

    // Proposals endpoints
    if (route === '/proposals' && method === 'GET') {
      const { data, error } = await supabase
        .from('propostas')
        .select('*')
        .order('criado_em', { ascending: false })

      if (error) {
        return handleCORS(NextResponse.json(
          { error: error.message }, 
          { status: 500 }
        ))
      }

      return handleCORS(NextResponse.json(data || []))
    }

    if (route === '/proposals' && method === 'POST') {
      const body = await request.json()
      
      const proposalData = {
        id: crypto.randomUUID(),
        cnpj: body.cnpj,
        consultor: body.consultor,
        operadora: body.operadora,
        quantidade_vidas: parseInt(body.quantidade_vidas),
        valor: parseFloat(body.valor),
        previsao_implantacao: body.previsao_implantacao || null,
        status: body.status,
        criado_por: body.criado_por,
        criado_em: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('propostas')
        .insert([proposalData])
        .select()
        .single()

      if (error) {
        return handleCORS(NextResponse.json(
          { error: error.message }, 
          { status: 500 }
        ))
      }

      // If status is 'implantado', update user goals
      if (body.status === 'implantado') {
        await supabase.rpc('atualizar_meta_usuario', {
          p_usuario_id: body.criado_por,
          p_valor: parseFloat(body.valor)
        })
      }

      return handleCORS(NextResponse.json(data))
    }

    // Delete proposal (Gestor only)
    if (route.startsWith('/proposals/') && method === 'DELETE') {
      const proposalId = route.split('/')[2]
      
      const { error } = await supabase
        .from('propostas')
        .delete()
        .eq('id', proposalId)

      if (error) {
        return handleCORS(NextResponse.json(
          { error: error.message }, 
          { status: 500 }
        ))
      }

      return handleCORS(NextResponse.json({ success: true }))
    }

    // Update proposal status (All users can update status)
    if (route.startsWith('/proposals/') && method === 'PUT') {
      const proposalId = route.split('/')[2]
      const body = await request.json()
      
      const updateData = {
        status: body.status
      }

      const { data, error } = await supabase
        .from('propostas')
        .update(updateData)
        .eq('id', proposalId)
        .select()
        .single()

      if (error) {
        return handleCORS(NextResponse.json(
          { error: error.message }, 
          { status: 500 }
        ))
      }

      // If status changed to 'implantado', update user goals
      if (body.status === 'implantado' && body.criado_por) {
        await supabase.rpc('atualizar_meta_usuario', {
          p_usuario_id: body.criado_por,
          p_valor: parseFloat(body.valor || 0)
        })
      }

      return handleCORS(NextResponse.json(data))
    }

    // Users endpoint
    if (route === '/users' && method === 'GET') {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, tipo_usuario, criado_em')
        .order('nome')

      if (error) {
        return handleCORS(NextResponse.json(
          { error: error.message }, 
          { status: 500 }
        ))
      }

      return handleCORS(NextResponse.json(data || []))
    }

    // Create user endpoint (Gestor only)
    if (route === '/users' && method === 'POST') {
      const body = await request.json()
      
      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', body.email)
        .single()

      if (existingUser) {
        return handleCORS(NextResponse.json(
          { error: 'Email já cadastrado no sistema' }, 
          { status: 400 }
        ))
      }

      const userData = {
        id: crypto.randomUUID(),
        nome: body.nome,
        email: body.email,
        senha: body.senha, // In production, hash this password
        tipo_usuario: body.tipo_usuario || 'analista',
        criado_em: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('usuarios')
        .insert([userData])
        .select('id, nome, email, tipo_usuario, criado_em')
        .single()

      if (error) {
        return handleCORS(NextResponse.json(
          { error: error.message }, 
          { status: 500 }
        ))
      }

      // Create default goal for new user (150k)
      await supabase
        .from('metas')
        .insert([{
          id: crypto.randomUUID(),
          usuario_id: data.id,
          valor_meta: 150000.00,
          valor_alcancado: 0.00,
          periodo: new Date().getFullYear().toString()
        }])

      return handleCORS(NextResponse.json(data))
    }

    // Goals endpoint
    if (route === '/goals' && method === 'GET') {
      const { data, error } = await supabase
        .from('metas')
        .select('*')

      if (error) {
        return handleCORS(NextResponse.json(
          { error: error.message }, 
          { status: 500 }
        ))
      }

      return handleCORS(NextResponse.json(data || []))
    }

    // Sessions endpoint
    if (route === '/sessions' && method === 'GET') {
      const { data, error } = await supabase
        .from('sessoes')
        .select('*')
        .order('data_login', { ascending: false })
        .limit(100)

      if (error) {
        return handleCORS(NextResponse.json(
          { error: error.message }, 
          { status: 500 }
        ))
      }

      return handleCORS(NextResponse.json(data || []))
    }

    // Route not found
    return handleCORS(NextResponse.json(
      { error: `Route ${route} not found` }, 
      { status: 404 }
    ))

  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json(
      { error: "Internal server error", details: error.message }, 
      { status: 500 }
    ))
  }
}

// Export all HTTP methods
export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute