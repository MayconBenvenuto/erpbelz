import { Module } from '@nestjs/common'
import { ValidateCnpjController } from './validate-cnpj.controller'
import { EmailTestController } from './email-test.controller'

@Module({
  controllers: [ValidateCnpjController, EmailTestController],
})
export class UtilityModule {}
