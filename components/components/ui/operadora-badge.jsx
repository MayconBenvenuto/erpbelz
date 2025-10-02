"use client"

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { getOperadoraLogoFile, getOperadoraInitials } from '@/lib/utils'

export default function OperadoraBadge({ nome, className, size = 16, showName = true }) {
  const file = getOperadoraLogoFile(nome)
  const initials = getOperadoraInitials(nome)
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} title={nome || ''}>
      {file ? (
        <Image src={`/seguradoras/${file}`} alt={nome || 'Operadora'} width={size} height={size} className="shrink-0" />
      ) : (
        <span className="inline-flex items-center justify-center shrink-0 rounded bg-muted text-foreground/80" style={{ width: size, height: size, fontSize: Math.max(9, size/2.2), lineHeight: 1 }}>
          {initials}
        </span>
      )}
      {showName && <span className="truncate capitalize">{nome || '—'}</span>}
    </span>
  )
}
