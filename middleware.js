import { NextResponse } from 'next/server'

export function middleware(request) {
  const url = new URL(request.url)
  const { pathname, search } = url

  // Proxy todas as rotas /api/* para o Nest
  if (pathname.startsWith('/api/')) {
    const target = process.env.NEST_API_URL || 'http://localhost:3001'
    const destBase = target.replace(/\/$/, '')
    const pathNoApi = pathname.replace(/^\/api\//, '/')
    const destUrl = new URL(destBase + pathNoApi)
    destUrl.search = search
    return NextResponse.rewrite(destUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
