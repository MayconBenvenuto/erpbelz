import { Module } from '@nestjs/common'
import { SupabaseModule } from './supabase.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { ProposalsModule } from './proposals/proposals.module'
import { SessionsModule } from './sessions/sessions.module'
import { HealthModule } from './health/health.module'
import { UtilityModule } from './utility/utility.module'
import { GoalsModule } from './goals/goals.module'

@Module({
  imports: [
    SupabaseModule,
    AuthModule,
    UsersModule,
    ProposalsModule,
    SessionsModule,
    HealthModule,
  UtilityModule,
  GoalsModule,
  ],
})
export class AppModule {}
