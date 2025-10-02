import { NextResponse } from 'next/server'
import { requireAuth, handleCORS, supabase } from '@/lib/api-helpers'

export const runtime = 'nodejs'

// Simple in-memory broadcaster (reiniciado a cada cold start / deploy)
const clients = new Set()

function broadcast(type, payload){
  const data = `event: ${type}\n` + `data: ${JSON.stringify(payload)}\n\n`
  clients.forEach(res => { try { res.write(data) } catch(_){} })
}

// Hook básico via supabase real-time (poll fallback)
let polling = false
async function startPolling(){
  if (polling) return
  polling = true
  let lastCheck = new Date(Date.now() - 60_000).toISOString()
  const interval = 15_000
  async function tick(){
    try {
      const { data } = await supabase
        .from('propostas')
        .select('id,codigo,status,atendido_por,atendido_em,criado_em,updated_at')
        .gte('updated_at', lastCheck)
        .order('updated_at',{ascending:true})
        .limit(200)
      if (data && data.length){
        lastCheck = data[data.length-1].updated_at || new Date().toISOString()
        data.forEach(row => broadcast('proposta_update', row))
      }
    } catch(_){}
    setTimeout(tick, interval)
  }
  tick()
}

export async function GET(request){
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  // Response stream SSE
  const stream = new ReadableStream({
    start(controller){
      const encoder = new TextEncoder()
      const write = (chunk) => controller.enqueue(encoder.encode(chunk))
      const client = { write }
      client.write = (text) => write(text)
      clients.add(client)
      write(`event: ready\ndata: {"ok":true}\n\n`)
      startPolling()
    },
    cancel(){ /* remover cliente se implementar controle */ }
  })
  const response = new Response(stream, {
    headers: {
      'Content-Type':'text/event-stream',
      'Cache-Control':'no-cache, no-transform',
      'Connection':'keep-alive'
    }
  })
  return handleCORS(response, origin)
}

// Exporta broadcast para outros módulos (ex: PATCH /proposals)
export { broadcast }