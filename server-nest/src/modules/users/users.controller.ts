import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { Inject } from '@nestjs/common'
import bcrypt from 'bcryptjs'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { GestorGuard } from '../auth/gestor.guard'
import { randomUUID } from 'crypto'

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(@Inject('SUPABASE') private supabase: any) {}

  @Get()
  async list() {
    const { data, error } = await this.supabase
      .from('usuarios')
      .select('id, nome, email, tipo_usuario, criado_em')
      .order('nome')
    if (error) throw new Error(error.message)
    return data || []
  }

  @Post()
  @UseGuards(GestorGuard)
  async create(@Body() body: any, @Req() _req: any) {
    const { nome, email, senha, tipo_usuario } = body || {}
    if (!nome || !email || !senha) return { error: 'Dados inválidos' }

    const { data: existing } = await this.supabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .single()
    if (existing) return { error: 'Email já cadastrado no sistema' }

    const toInsert = {
      id: randomUUID(),
      nome,
      email,
      senha: await bcrypt.hash(senha, parseInt(process.env.BCRYPT_ROUNDS || '12')),
      tipo_usuario: tipo_usuario || 'analista',
      criado_em: new Date().toISOString(),
    }

    const { data, error } = await this.supabase
      .from('usuarios')
      .insert([toInsert])
      .select('id, nome, email, tipo_usuario, criado_em')
      .single()
    if (error) throw new Error(error.message)

  await this.supabase.from('metas').insert([
      {
    id: randomUUID(),
        usuario_id: data.id,
        valor_meta: 200000.0,
        valor_alcancado: 0.0,
        periodo: new Date().getFullYear().toString(),
      },
    ])

    return data
  }
}
