'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ImplantacaoSection() {
  return (
    <div className="grid gap-6">
      <Card className="bg-card border shadow-sm">
        <CardHeader>
          <CardTitle>Implantação</CardTitle>
          <CardDescription>Área para acompanhar implantações.</CardDescription>
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
