import { Body, Controller, Post, Req } from '@nestjs/common'
import { Inject } from '@nestjs/common'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'

@Controller('auth')
export class AuthController {
  constructor(@Inject('SUPABASE') private supabase: any) {}

  @Post('login')
  async login(@Body() body: any, @Req() req: any) {
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')

    if (!email || !password) {
      return { error: 'Email e senha são obrigatórios' }
    }

    const { data: user, error } = await this.supabase
      .from('usuarios')
      .select('id, nome, email, senha, tipo_usuario')
      .eq('email', email)
      .single()

    if (error || !user) return { error: 'Credenciais inválidas' }

    let passwordValid = false
    if (user.senha?.startsWith('$2')) {
      passwordValid = await bcrypt.compare(password, user.senha)
    } else {
      passwordValid = password === user.senha
      if (passwordValid) {
        const hashed = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'))
        await this.supabase.from('usuarios').update({ senha: hashed }).eq('id', user.id)
      }
    }
    if (!passwordValid) return { error: 'Credenciais inválidas' }

    const token = jwt.sign({ userId: user.id, email: user.email, tipo: user.tipo_usuario }, process.env.JWT_SECRET || 'fallback-secret-change-in-production', { expiresIn: '24h' })

    const { data: session } = await this.supabase
      .from('sessoes')
      .insert([{ id: randomUUID(), usuario_id: user.id, data_login: new Date().toISOString() }])
      .select()
      .single()

    return {
      user: { id: user.id, nome: user.nome, email: user.email, tipo_usuario: user.tipo_usuario },
      token,
      sessionId: session?.id,
      expiresIn: '24h',
    }
  }

  @Post('logout')
  async logout(@Body() body: any) {
    const { sessionId } = body || {}
  if (sessionId) {
      const { data: session } = await this.supabase
        .from('sessoes')
        .select('data_login')
        .eq('id', sessionId)
        .single()

      if (session) {
        const loginTime = new Date(session.data_login)
        const logoutTime = new Date()
        const diff = logoutTime.getTime() - loginTime.getTime()
        const hours = Math.floor(diff / 3600000)
        const minutes = Math.floor((diff % 3600000) / 60000)
        await this.supabase
          .from('sessoes')
          .update({ data_logout: logoutTime.toISOString(), tempo_total: `${hours}:${minutes}:00` })
          .eq('id', sessionId)
      }
    }
    return { success: true }
  }
}
