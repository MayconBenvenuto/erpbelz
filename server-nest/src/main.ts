import 'reflect-metadata'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import type { Request, Response, NextFunction } from 'express'
import { AppModule } from './modules/app.module'

async function bootstrap() {
  // Carrega .env da raiz do monorepo e do server-nest
  try {
    dotenv.config({ path: path.resolve(__dirname, '../../.env') })
    dotenv.config({ path: path.resolve(__dirname, '../.env') })
    dotenv.config()
  } catch {}
  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  })

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }
    next()
  })

  const port = Number(process.env.PORT || 3001)
  await app.listen(port)
  // eslint-disable-next-line no-console
  console.log(`[Nest] CRM Belz API running on http://localhost:${port}`)
}

bootstrap()
