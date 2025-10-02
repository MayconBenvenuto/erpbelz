'use client'
import { useAuth } from '@/components/auth/AuthProvider'

export default function SolicitacoesPage() {
  const { currentUser } = useAuth()
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Solicitações - implementação futura.</p>
      {currentUser && <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify({ user: currentUser.id, role: currentUser.tipo_usuario }, null, 2)}</pre>}
    </div>
  )
}
