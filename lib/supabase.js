import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Utility functions for authentication
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// Session management
export const startSession = async (userId) => {
  const { data, error } = await supabase
    .from('sessoes')
    .insert([{
      id: crypto.randomUUID(),
      usuario_id: userId,
      data_login: new Date().toISOString()
    }])
    .select()
    .single()
  
  return { data, error }
}

export const endSession = async (sessionId) => {
  const loginTime = new Date()
  
  // Get session start time
  const { data: session } = await supabase
    .from('sessoes')
    .select('data_login')
    .eq('id', sessionId)
    .single()
  
  if (session) {
    const startTime = new Date(session.data_login)
    const timeDiff = loginTime - startTime
    const hours = Math.floor(timeDiff / (1000 * 60 * 60))
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
    
    const { error } = await supabase
      .from('sessoes')
      .update({
        data_logout: loginTime.toISOString(),
        tempo_total: `${hours}:${minutes}:00`
      })
      .eq('id', sessionId)
    
    return { error }
  }
}

// CNPJ validation using Brasil API
export const validateCNPJ = async (cnpj) => {
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