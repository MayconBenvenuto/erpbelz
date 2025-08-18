import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// CNPJ validation function using Brasil API
async function validateCNPJ(cnpj) {
  try {
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '')
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`)
    
    if (!response.ok) {
      throw new Error('CNPJ não encontrado')
    }
    
    const data = await response.json()
    return { valid: true, data }
  } catch (error) {
    return { valid: false, error: error.message }
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
      const body = await request.json()
      const { email, password } = body

      // Simple auth - in production use proper hashing
      const { data: user, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .eq('senha', password)
        .single()

      if (error || !user) {
        return handleCORS(NextResponse.json(
          { error: "Credenciais inválidas" }, 
          { status: 401 }
        ))
      }

      // Create session
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
        sessionId: session?.id
      }))
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

      const result = await validateCNPJ(cnpj)
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