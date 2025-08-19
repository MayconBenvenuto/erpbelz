import { NextResponse } from 'next/server'
import { handleCORS } from '@/lib/api-helpers'

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function GET() {
  return handleCORS(NextResponse.json({ message: 'CRM Propostas API' }))
}

export async function POST() {
  return handleCORS(NextResponse.json({ error: 'Use rotas dedicadas' }, { status: 404 }))
}

export async function DELETE() {
  return handleCORS(NextResponse.json({ error: 'Use rotas dedicadas' }, { status: 404 }))
}

export async function PATCH() {
  return handleCORS(NextResponse.json({ error: 'Use rotas dedicadas' }, { status: 404 }))
}