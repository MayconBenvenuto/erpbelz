"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function EmDesenvolvimento({ titulo = 'Em desenvolvimento', descricao = 'Esta funcionalidade ainda está em construção.' }) {
  return (
    <div className="w-full">
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {titulo}
            <Badge variant="secondary" className="uppercase tracking-wide">Beta</Badge>
          </CardTitle>
          <CardDescription>{descricao}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Estamos trabalhando para entregar esta área em breve.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Design e requisitos sendo refinados..</li>
              <li>Integrações e segurança alinhadas ao padrão do sistema..</li>
              <li>Feedbacks são bem-vindos, fale conosco..</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
