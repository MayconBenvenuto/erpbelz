'use client'
// QueryClient Provider wrapper
import { QueryClientProvider } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { queryClient } from '@/lib/query-client'
import { useState, useEffect, useRef } from 'react'
// Carregamento lazy dos Devtools para evitar que o bundler falhe em ambientes sem a dep (ex: deploy sem devDeps)
// Mantemos numa ref para não recriar em cada render
function useReactQueryDevtools() {
  const [DevtoolsComp, setDevtoolsComp] = useState(() => () => null)
  const loadedRef = useRef(false)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    if (typeof window === 'undefined') return
    if (loadedRef.current) return
    loadedRef.current = true
    import('@tanstack/react-query-devtools')
      .then(mod => {
        const C = mod.ReactQueryDevtools || (() => null)
        setDevtoolsComp(() => C)
      })
      .catch(() => { /* ignore */ })
  }, [])
  return DevtoolsComp
}

export function QueryProvider({ children }) {
  const [client] = useState(() => {
    // já criado em lib/query-client
    return queryClient
  })

  // Persistência somente em browser
  useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const persister = createSyncStoragePersister({ storage: window.localStorage })
        persistQueryClient({
          queryClient: client,
          persister,
          maxAge: 1000 * 60 * 10, // 10 minutos
        })
      } catch { /* ignore */ }
    }
  })

  const Devtools = useReactQueryDevtools()

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === 'development' && <Devtools position="bottom-right" />}
    </QueryClientProvider>
  )
}
