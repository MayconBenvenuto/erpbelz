import { Module } from '@nestjs/common'
import { ProposalsController } from './proposals.controller'
import { StaleCheckController } from './stale-check.controller'

@Module({
  controllers: [ProposalsController, StaleCheckController],
})
export class ProposalsModule {}
