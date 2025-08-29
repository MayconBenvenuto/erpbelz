import { NextResponse } from 'next/server'
import { requireAuth, handleCORS, supabase } from '@/lib/api-helpers'

export const runtime = 'nodejs'

// Conjunto de clientes SSE (reinicia a cada cold start)
const clients = new Set()

// Estado último snapshot para evitar broadcasts redundantes
let lastIdsKey = ''
let pollingStarted = false

const ONLINE_WINDOW_MS = 2 * 60 * 1000 // mesmo critério do endpoint /api/users/online
const POLL_INTERVAL_MS = 8000 // ~quase tempo real sem sobrecarregar

async function fetchOnlineIds(){
  const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString()
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, ultimo_refresh, last_active_at')
      .or(`ultimo_refresh.gte.${cutoff},last_active_at.gte.${cutoff}`)
      .limit(500)
    if (error) return []
    return (data||[]).map(r => r.id)
  } catch { return [] }
}

function broadcast(ids){
  const payload = { type: 'online_presence', ids }
  const data = `data: ${JSON.stringify(payload)}\n\n`
  clients.forEach(res => { try { res.write(data) } catch(_){} })
}

async function pollLoop(){
  if (pollingStarted) return
  pollingStarted = true
  async function tick(){
    try {
      const ids = await fetchOnlineIds()
      ids.sort()
      const key = ids.join(',')
      if (key !== lastIdsKey){
        lastIdsKey = key
        broadcast(ids)
      }
    } catch {}
    setTimeout(tick, POLL_INTERVAL_MS)
  }
  tick()
}

// Exposto para outros módulos poderem forçar checagem imediata (opcional)
export async function forcePresencePulse(){
  // Executa uma checagem fora do ciclo se necessário
  const ids = await fetchOnlineIds()
  ids.sort()
  const key = ids.join(',')
  if (key !== lastIdsKey){
    lastIdsKey = key
    broadcast(ids)
  }
}

export async function GET(request){
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)

  // Inicializa polling global
  pollLoop()

  const stream = new ReadableStream({
    start(controller){
      const encoder = new TextEncoder()
      const write = (chunk) => controller.enqueue(encoder.encode(chunk))
      const client = { write }
      clients.add(client)
      // Snapshot imediato
      if (lastIdsKey){
        try { write(`data: ${JSON.stringify({ type:'online_presence', ids: lastIdsKey.split(',').filter(Boolean) })}\n\n`) } catch {}
      } else {
        // dispara uma checagem inicial assíncrona
        fetchOnlineIds().then(ids => {
          ids.sort(); lastIdsKey = ids.join(',');
          try { write(`data: ${JSON.stringify({ type:'online_presence', ids })}\n\n`) } catch {}
        })
      }
    },
    cancel(){ /* cliente removido implicitamente em serverless */ }
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
