'use client'
import { useAuth } from '@/components/auth/AuthProvider'

export default function CarteiraPage() {
  const { currentUser, token } = useAuth()
  if (!currentUser) return null
  const CarteiraClientes = require('@/app/sections/CarteiraClientes.jsx').default
  return (
    <div className="space-y-6">
      <CarteiraClientes currentUser={currentUser} token={token} initialClientes={[]} />
    </div>
  )
}
