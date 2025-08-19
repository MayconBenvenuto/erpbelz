import { Controller, Get, UseGuards } from '@nestjs/common'
import { Inject } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt.guard'

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(@Inject('SUPABASE') private supabase: any) {}

  @Get()
  async list() {
    const { data, error } = await this.supabase.from('metas').select('*')
    if (error) throw new Error(error.message)
    return data || []
  }
}
