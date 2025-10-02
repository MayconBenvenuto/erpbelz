'use client'

// Nota: Esta página redireciona automaticamente para a rota indicada em ?redirect (ou /dashboard)
// assim que detectar um usuário autenticado via AuthProvider (cookie + /api/auth/me).
// Também utiliza authLogin do contexto para manter sessão consistente (sessionStorage + cookies).

import { Suspense, useState, useEffect } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Toaster } from '@/components/ui/sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'

function LoginPageInner() {
  const router = useRouter()
  const search = useSearchParams()
  const redirect = search.get('redirect') || '/dashboard'
  const { currentUser, login: authLogin, loading: authLoading } = useAuth() || {}
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [forgotStep, setForgotStep] = useState('login')
  const [fpEmail, setFpEmail] = useState('')
  const [fpCode, setFpCode] = useState('')
  const [fpResetToken, setFpResetToken] = useState('')
  const [fpNewPass, setFpNewPass] = useState('')
  const [fpNewPass2, setFpNewPass2] = useState('')
  const [fpLoading, setFpLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (authLogin) {
        const res = await authLogin({ email: form.email, password: form.password })
        if (res?.ok) {
          router.replace(redirect)
          return
        }
      } else {
        // Fallback direto (caso AuthProvider não carregou ainda por algum motivo)
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(form),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(data.error || 'Credenciais inválidas')
        } else {
          toast.success('Login efetuado')
          // Persistência mínima para bootstrap posterior do AuthProvider
          try {
            if (data.user) sessionStorage.setItem('erp_user', JSON.stringify(data.user))
            if (data.sessionId) sessionStorage.setItem('erp_session', data.sessionId)
            if (data.token) sessionStorage.setItem('erp_token', data.token)
          } catch {}
          router.replace(redirect)
        }
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  // Se já autenticado (ex: usuário volta para /login com cookie válido), redirecionar automaticamente
  useEffect(() => {
    if (currentUser && !authLoading) {
      router.replace(redirect)
    }
  }, [currentUser, authLoading, redirect, router])

  // Forgot password flow replicado simplificado
  const requestCode = async (e) => {
    e.preventDefault()
    setFpLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erro ao solicitar código')
        return
      }
      toast.success('Se o email existir, código enviado')
      setForgotStep('code')
    } catch {
      toast.error('Erro de rede')
    } finally {
      setFpLoading(false)
    }
  }
  const verifyCode = async (e) => {
    e.preventDefault()
    setFpLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail, code: fpCode }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.success) {
        toast.error(d.error || 'Código inválido')
        return
      }
      setFpResetToken(d.resetToken)
      setForgotStep('reset')
      toast.success('Código verificado')
    } catch {
      toast.error('Erro de rede')
    } finally {
      setFpLoading(false)
    }
  }
  const submitReset = async (e) => {
    e.preventDefault()
    if (fpNewPass !== fpNewPass2) {
      toast.error('Senhas não coincidem')
      return
    }
    setFpLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fpEmail,
          code: fpCode,
          resetToken: fpResetToken,
          novaSenha: fpNewPass,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.success) {
        toast.error(d.error || 'Falha ao redefinir')
        return
      }
      toast.success('Senha redefinida. Faça login.')
      setForgotStep('done')
    } catch {
      toast.error('Erro de rede')
    } finally {
      setFpLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4">
      <Toaster />
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Image
              src="/logo-belz.jpg"
              alt="Logo Belz"
              width={120}
              height={60}
              className="mx-auto rounded-lg"
              priority
            />
          </div>
          <CardTitle className="text-2xl text-primary font-montserrat">
            Sistema de Gestão - Belz
          </CardTitle>
          <CardDescription>Acesse sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          {forgotStep === 'login' && !currentUser && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setForgotStep('email')
                    setFpEmail(form.email)
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Esqueci a senha
                </button>
              </div>
            </form>
          )}
          {forgotStep === 'email' && !currentUser && (
            <form onSubmit={requestCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fp-email">Email cadastrado</Label>
                <Input
                  id="fp-email"
                  type="email"
                  value={fpEmail}
                  onChange={(e) => setFpEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setForgotStep('login')}
                  disabled={fpLoading}
                >
                  Voltar
                </Button>
                <Button type="submit" className="flex-1" disabled={fpLoading}>
                  {fpLoading ? 'Enviando...' : 'Enviar código'}
                </Button>
              </div>
            </form>
          )}
          {forgotStep === 'code' && !currentUser && (
            <form onSubmit={verifyCode} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Código de 6 dígitos enviado (se email existir).
              </p>
              <div className="space-y-2">
                <Label htmlFor="fp-code">Código</Label>
                <Input
                  id="fp-code"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  value={fpCode}
                  onChange={(e) => setFpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setForgotStep('email')}
                  disabled={fpLoading}
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={fpLoading || fpCode.length !== 6}
                >
                  {fpLoading ? 'Verificando...' : 'Verificar'}
                </Button>
              </div>
            </form>
          )}
          {forgotStep === 'reset' && !currentUser && (
            <form onSubmit={submitReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fp-pass1">Nova senha</Label>
                <Input
                  id="fp-pass1"
                  type="password"
                  value={fpNewPass}
                  onChange={(e) => setFpNewPass(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fp-pass2">Confirmar senha</Label>
                <Input
                  id="fp-pass2"
                  type="password"
                  value={fpNewPass2}
                  onChange={(e) => setFpNewPass2(e.target.value)}
                  required
                />
              </div>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                <li>Mínimo 8 caracteres</li>
                <li>Ao menos 1 maiúscula, 1 minúscula e 1 dígito</li>
              </ul>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setForgotStep('code')}
                  disabled={fpLoading}
                >
                  Voltar
                </Button>
                <Button type="submit" className="flex-1" disabled={fpLoading}>
                  {fpLoading ? 'Salvando...' : 'Redefinir'}
                </Button>
              </div>
            </form>
          )}
          {forgotStep === 'done' && !currentUser && (
            <div className="space-y-4 text-center">
              <p className="text-sm">Senha redefinida com sucesso.</p>
              <Button className="w-full" onClick={() => setForgotStep('login')}>
                Voltar para login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}
    >
      <LoginPageInner />
    </Suspense>
  )
}
