import { Controller, Get, UseGuards } from '@nestjs/common'
import { Inject } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { GestorGuard } from '../auth/gestor.guard'

@Controller('sessions')
@UseGuards(JwtAuthGuard, GestorGuard)
export class SessionsController {
  constructor(@Inject('SUPABASE') private supabase: any) {}

  @Get()
  async list() {
    const { data, error } = await this.supabase
      .from('sessoes')
      .select('*')
      .order('data_login', { ascending: false })
      .limit(100)
    if (error) throw new Error(error.message)
    return data || []
  }
}
