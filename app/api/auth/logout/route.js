import { NextResponse } from 'next/server'
import { supabase, handleCORS } from '@/lib/api-helpers'

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function POST(request) {
  const origin = request.headers.get('origin')
  const body = await request.json()
  const { sessionId } = body

  if (sessionId) {
    const { data: session } = await supabase
      .from('sessoes')
      .select('data_login')
      .eq('id', sessionId)
      .single()

    if (session) {
      const loginTime = new Date(session.data_login)
      const logoutTime = new Date()
      const timeDiff = logoutTime - loginTime
      const hours = Math.floor(timeDiff / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))

      await supabase
        .from('sessoes')
        .update({ data_logout: logoutTime.toISOString(), tempo_total: `${hours}:${minutes}:00` })
        .eq('id', sessionId)
    }
  }

  return handleCORS(NextResponse.json({ success: true }), origin)
}
