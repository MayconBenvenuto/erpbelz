import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'

@Injectable()
export class GestorGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest()
    if (req.user?.tipo_usuario !== 'gestor') {
      throw new ForbiddenException('Ação permitida apenas para gestores')
    }
    return true
  }
}
