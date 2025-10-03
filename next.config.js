/** @type {import('next').NextConfig} */

// Define os cabeçalhos de segurança recomendados
const securityHeaders = [
  {
    // Protege contra ataques de clickjacking.
    // O valor 'SAMEORIGIN' é mais seguro que 'ALLOWALL'.
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    // Impede que o navegador "adivinhe" o tipo de um arquivo, o que previne ataques de XSS.
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    // Controla as informações de referência enviadas ao navegar para outros sites.
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
  {
    // Habilita a proteção contra XSS (Cross-Site Scripting) em navegadores compatíveis.
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    // Sua política existente para permitir iframes.
    // Para maior segurança, considere restringir os domínios aqui em vez de usar '*'.
    key: 'Content-Security-Policy',
    value: 'frame-ancestors *;',
  },
]

const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['mongodb'],
  },
  webpack(config, { dev, isServer }) {
    if (dev) {
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules'],
      }
      // Melhora estabilidade do Fast Refresh
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      }
    }
    return config
  },
  onDemandEntries: {
    maxInactiveAge: 25000, // Aumenta tempo antes de descarregar páginas inativas
    pagesBufferLength: 5, // Mantém mais páginas em buffer
  },
  // Desabilita React Strict Mode se estiver causando problemas
  reactStrictMode: false,
  async rewrites() {
    return { beforeFiles: [] }
  },

  // Função de headers atualizada com as melhores práticas de segurança
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
