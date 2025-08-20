import { NextResponse } from 'next/server'

export function middleware(request) {
  const url = new URL(request.url)
  const { pathname, search } = url

  // Proxy todas as rotas /api/* para o Nest
  if (pathname.startsWith('/api/')) {
    const target = process.env.NEST_API_URL
    const isPublicTarget = !!target && !/^(?:https?:\/\/)?(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(target)
    if (isPublicTarget) {
      const destBase = target.replace(/\/$/, '')
      const pathNoApi = pathname.replace(/^\/api\//, '/')
      const destUrl = new URL(destBase + pathNoApi)
      destUrl.search = search
      return NextResponse.rewrite(destUrl)
    }
    // Sem target público, deixe o Next lidar com a rota (rotas locais de compatibilidade)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
