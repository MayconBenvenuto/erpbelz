import { NextResponse } from 'next/server'
export const runtime = 'nodejs'

// Rota desativada: cron removido do sistema. Mantida apenas para compatibilidade, retorna 410.
export async function GET() {
  return new NextResponse(JSON.stringify({ error: 'Rota desativada. Use POST /api/solicitacoes/stale-check autenticado como gestor.' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' }
  })
}
