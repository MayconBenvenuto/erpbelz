// Frontend Supabase client (browser) para operações diretas como upload de arquivos.
// Usa apenas a ANON KEY. Política RLS deve proteger o bucket.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabaseBrowser = url && anon ? createClient(url, anon, {
  auth: { persistSession: false },
}) : null

export function assertSupabaseBrowser() {
  if (!supabaseBrowser) throw new Error('Supabase client não configurado no frontend')
  return supabaseBrowser
}
