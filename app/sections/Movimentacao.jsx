'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function MovimentacaoSection() {
  return (
    <div className="grid gap-6">
      <Card className="bg-card border shadow-sm">
        <CardHeader>
          <CardTitle>Movimentação</CardTitle>
          <CardDescription>Área do analista para acompanhar e registrar movimentações.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 rounded-md border border-dashed text-muted-foreground">
            Em breve
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
