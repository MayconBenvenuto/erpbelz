import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import jwt from 'jsonwebtoken'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest()
    const auth = req.headers['authorization'] as string | undefined
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de acesso requerido')
    }
    const token = auth.substring(7)
    const secret = process.env.JWT_SECRET || 'fallback-secret-change-in-production'
    try {
      const decoded = jwt.verify(token, secret) as any
      req.user = { id: decoded.userId, email: decoded.email, tipo_usuario: decoded.tipo }
      return true
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado')
    }
  }
}
