import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-helpers'
import { supabase } from '@/lib/api-helpers'

// Janela (deixa servidor em sincronia caso view não esteja criada ainda)
const WINDOW_SECONDS = 120

export async function GET(request) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (auth.user.tipo_usuario !== 'gestor') return NextResponse.json({ error: 'Apenas gestor' }, { status: 403 })

  // Tenta usar a view (se existir) – pode projetar last_active_at; produção pode não ter
  try {
    const viewSel = await supabase.from('vw_usuarios_online').select('id,nome,email,tipo_usuario,last_active_at')
    if (!viewSel.error) {
      return NextResponse.json({ data: viewSel.data || [], window_seconds: WINDOW_SECONDS })
    }
  } catch {}

  // Fallback: derivar de usuarios + sessoes
  try {
    const cutoff = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString()
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
    })
    return NextResponse.json({ data: online.map(u => ({ id: u.id, nome: u.nome, email: u.email, tipo_usuario: u.tipo_usuario, last_active_at: u.ultimo_refresh || u.last_active_at })), window_seconds: WINDOW_SECONDS })
  } catch {
    return NextResponse.json({ data: [], window_seconds: WINDOW_SECONDS })
  }
}
