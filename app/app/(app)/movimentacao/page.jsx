'use client'
import { useAuth } from '@/components/auth/AuthProvider'
import { LazyMovimentacaoSection } from '@/components/lazy-sections'

export default function MovimentacaoPage() {
  const { currentUser, token } = useAuth()
  return (
    <div className="space-y-6">
      <LazyMovimentacaoSection currentUser={currentUser} token={token} />
    </div>
  )
}
