// Hook para registrar Service Worker
import { useEffect } from 'react'

export function useServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {
          // Service worker registrado com sucesso
        })
        .catch(() => {
          // Erro no registro do service worker
        })
    }
  }, [])
}
