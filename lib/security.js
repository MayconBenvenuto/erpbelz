import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

// Rate limiting storage (em produção, usar Redis)
const rateLimitMap = new Map()

// Configurações de segurança
const SECURITY_CONFIG = {
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 86400000, // 24h
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15min
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
}

// Função para hash de senhas
export async function hashPassword(password) {
  return await bcrypt.hash(password, SECURITY_CONFIG.bcryptRounds)
}

// Função para verificar senhas
export async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword)
}

// Função para gerar JWT
export function generateToken(user) {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      tipo: user.tipo_usuario,
      iat: Math.floor(Date.now() / 1000)
    },
    SECURITY_CONFIG.jwtSecret,
    { expiresIn: '24h' }
  )
}

// Função para verificar JWT
export function verifyToken(token) {
  try {
    return jwt.verify(token, SECURITY_CONFIG.jwtSecret)
  } catch (error) {
    return null
  }
}

// Rate Limiting
export function checkRateLimit(identifier) {
  const now = Date.now()
  const windowStart = now - SECURITY_CONFIG.rateLimitWindow
  
  if (!rateLimitMap.has(identifier)) {
    rateLimitMap.set(identifier, [])
  }
  
  const requests = rateLimitMap.get(identifier)
  
  // Remove requisições antigas
  const validRequests = requests.filter(time => time > windowStart)
  
  if (validRequests.length >= SECURITY_CONFIG.rateLimitMax) {
    return false
  }
  
  validRequests.push(now)
  rateLimitMap.set(identifier, validRequests)
  
  return true
}

// Validação de entrada
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input
  
  return input
    .replace(/[<>]/g, '') // Remove caracteres HTML básicos
    .trim()
    .substring(0, 1000) // Limita tamanho
}

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateCNPJ(cnpj) {
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '')
  return cleanCNPJ.length === 14
}

// Sanitização de logs (remove dados sensíveis)
export function sanitizeForLog(data) {
  const sensitive = ['senha', 'password', 'token', 'authorization']
  const sanitized = { ...data }
  
  for (const key in sanitized) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]'
    }
  }
  
  return sanitized
}

// Headers de segurança
export function addSecurityHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  
  return response
}

// Middleware de autenticação
export function requireAuth(handler) {
  return async (request, { params }) => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Token de acesso requerido' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Adiciona usuário ao request
    request.user = decoded
    
    return handler(request, { params })
  }
}

// Middleware de autorização (apenas gestores)
export function requireGestor(handler) {
  return requireAuth(async (request, { params }) => {
    if (request.user.tipo !== 'gestor') {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas gestores.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    return handler(request, { params })
  })
}
