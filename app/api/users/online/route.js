import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-helpers'
import { supabase } from '@/lib/api-helpers'

// Janela (deixa servidor em sincronia caso view não esteja criada ainda)
const WINDOW_SECONDS = 120

export async function GET(request) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (auth.user.tipo_usuario !== 'gestor') return NextResponse.json({ error: 'Apenas gestor' }, { status: 403 })

  // Tenta usar a view; se falhar recorre a fallback baseado em sessoes
  try {
    const { data: viewData, error: viewErr } = await supabase.from('vw_usuarios_online').select('id,nome,email,tipo_usuario,last_active_at')
    if (!viewErr) {
      return NextResponse.json({ data: viewData || [], window_seconds: WINDOW_SECONDS })
    }
  } catch {}

  // Fallback: derivar de usuarios + sessoes
  try {
    const cutoff = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString()
    const { data: users, error: uErr } = await supabase.from('usuarios').select('id,nome,email,tipo_usuario,last_active_at,last_logout_at')
    if (uErr) return NextResponse.json({ error: 'Falha consulta usuarios' }, { status: 500 })
    const online = (users||[]).filter(u => u.last_active_at && u.last_active_at >= cutoff && (!u.last_logout_at || u.last_logout_at < u.last_active_at))
    return NextResponse.json({ data: online.map(u => ({ id: u.id, nome: u.nome, email: u.email, tipo_usuario: u.tipo_usuario, last_active_at: u.last_active_at })), window_seconds: WINDOW_SECONDS })
  } catch {
    return NextResponse.json({ data: [], window_seconds: WINDOW_SECONDS })
  }
}
