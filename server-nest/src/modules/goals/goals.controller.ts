import { Controller, Get, UseGuards, Inject } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { GestorGuard } from '../auth/gestor.guard'

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(@Inject('SUPABASE') private supabase: any) {}

  @Get()
  @UseGuards(GestorGuard)
  async list() {
    const { data, error } = await this.supabase
      .from('metas')
      .select('id, usuario_id, valor_meta, valor_alcancado, atualizado_em')
    if (error) throw new Error(error.message)
    return data || []
  }
}
