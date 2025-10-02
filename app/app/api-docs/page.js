// Página pública de documentação (Swagger UI) sem autenticação
export const runtime = 'edge'

import SwaggerDocs from '@/components/SwaggerDocs'

export const metadata = {
  title: 'API Docs - Belz',
  description: 'Documentação pública da API Belz',
  robots: { index: true, follow: true },
}

export default function ApiDocsPage() {
  return (
    <div className="w-full min-h-screen bg-background">
      <SwaggerDocs />
    </div>
  )
}
