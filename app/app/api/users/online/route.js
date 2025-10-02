import { NextResponse } from 'next/server'
import { requireAuth, supabase, cacheJson } from '@/lib/api-helpers'

// Janela (deixa servidor em sincronia caso view não esteja criada ainda)
const WINDOW_SECONDS = 120

export async function GET(request) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (auth.user.tipo_usuario !== 'gestor') return NextResponse.json({ error: 'Apenas gestor' }, { status: 403 })
  const { searchParams } = new URL(request.url)
  const format = (searchParams.get('format') || '').toLowerCase()
  const wnd = parseInt(searchParams.get('window_seconds') || '', 10)
  const windowSeconds = Number.isFinite(wnd) && wnd > 0 && wnd < 24*3600 ? wnd : WINDOW_SECONDS
  const origin = request.headers.get('origin') || '*'

  // Tenta usar a view (se existir) – pode projetar last_active_at; produção pode não ter
  try {
    const viewSel = await supabase.from('vw_usuarios_online').select('id,nome,email,tipo_usuario,last_active_at')
    if (!viewSel.error) {
      const rows = (viewSel.data || [])
      const filtered = rows.filter(u => u.tipo_usuario !== 'gestor')
      if (format === 'csv') {
        const csv = ['id;nome;email;tipo_usuario;last_active_at']
        for (const u of filtered) {
          csv.push(`${u.id};"${(u.nome||'').replaceAll('"','""')}";${u.email};${u.tipo_usuario};${u.last_active_at || ''}`)
        }
        const res = new NextResponse(csv.join('\n'), { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="usuarios_online_${Date.now()}.csv"` } })
        res.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=60')
        res.headers.set('Vary', 'Authorization, Cookie, Origin')
        return res
      }
      return cacheJson(request, origin, { data: filtered, window_seconds: windowSeconds }, { maxAge: 15, swr: 60 })
    }
  } catch {}

  // Fallback: derivar de usuarios + sessoes
  try {
    const cutoff = new Date(Date.now() - windowSeconds * 1000).toISOString()
    // Primeiro tenta selecionar usando ultimo_refresh (produção); se falhar tenta last_active_at (novo schema)
    let usersResp = await supabase.from('usuarios').select('id,nome,email,tipo_usuario,ultimo_refresh')
    if (usersResp.error) {
      usersResp = await supabase.from('usuarios').select('id,nome,email,tipo_usuario,last_active_at')
    }
    if (usersResp.error) return NextResponse.json({ error: 'Falha consulta usuarios' }, { status: 500 })
    const rows = usersResp.data || []
    const online = rows.filter(u => {
      const ts = u.ultimo_refresh || u.last_active_at
      return ts && ts >= cutoff
    }).filter(u => u.tipo_usuario !== 'gestor')
    const payload = online.map(u => ({ id: u.id, nome: u.nome, email: u.email, tipo_usuario: u.tipo_usuario, last_active_at: u.ultimo_refresh || u.last_active_at }))
    if (format === 'csv') {
      const csv = ['id;nome;email;tipo_usuario;last_active_at']
      for (const u of payload) {
        csv.push(`${u.id};"${(u.nome||'').replaceAll('"','""')}";${u.email};${u.tipo_usuario};${u.last_active_at || ''}`)
      }
      const res = new NextResponse(csv.join('\n'), { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="usuarios_online_${Date.now()}.csv"` } })
      res.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=60')
      res.headers.set('Vary', 'Authorization, Cookie, Origin')
      return res
    }
    return cacheJson(request, origin, { data: payload, window_seconds: windowSeconds }, { maxAge: 15, swr: 60 })
  } catch {
    return NextResponse.json({ data: [], window_seconds: WINDOW_SECONDS })
  }
}
