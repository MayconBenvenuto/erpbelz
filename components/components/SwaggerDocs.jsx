'use client'
import { useEffect, useRef } from 'react'

export default function SwaggerDocs({ specUrl = '/openapi.json' }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // CSS
    if (!document.getElementById('swagger-ui-css')) {
      const link = document.createElement('link')
      link.id = 'swagger-ui-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css'
      document.head.appendChild(link)
    }

    function init() {
      if (window.SwaggerUIBundle && containerRef.current) {
        window.SwaggerUIBundle({
          url: specUrl,
          dom_id: `#${containerRef.current.id}`,
          presets: [window.SwaggerUIBundle.presets.apis],
          layout: 'BaseLayout',
          docExpansion: 'list',
          filter: true,
          defaultModelsExpandDepth: 0,
        })
      }
    }

    if (!window.SwaggerUIBundle) {
      const existing = document.getElementById('swagger-ui-bundle-js')
      if (!existing) {
        const script = document.createElement('script')
        script.id = 'swagger-ui-bundle-js'
        script.src = 'https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js'
        script.async = true
        script.onload = init
        document.body.appendChild(script)
      } else if (existing.getAttribute('data-loaded') === 'true') {
        init()
      } else {
        existing.addEventListener('load', init, { once: true })
      }
    } else {
      init()
    }
  }, [specUrl])

  return (
    <div className="p-0 m-0">
      <style>{`.topbar { display:none; } body { margin:0; }`}</style>
      <div id="swagger-ui" ref={containerRef} />
    </div>
  )
}
