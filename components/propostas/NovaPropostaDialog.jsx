'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { PlusCircle, Loader2, AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react'
import Image from 'next/image'
import { assertSupabaseBrowser } from '@/lib/supabase-client'
import { Progress } from '@/components/ui/progress'

// Componente de anexos com upload adiado até salvar
function ProposalUploadDocs({ attached, onChange }) {
  const MAX_FILE_MB = 7
  const allowed = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/csv',
  ]
  const CATEGORIES = [
    {
      key: 'empresa',
      title: '1 - Empresa',
      docs: [
        'CNPJ',
        'Contrato Social / Alterações / CCMEI',
        'Docs Sócios (quando solicitado)',
        'Comprovante de residência (casos)',
      ],
    },
    {
      key: 'titular',
      title: '2 - Titular e Dependentes',
      docs: [
        'RG / CPF / Certidões',
        'Vínculo titular/dependentes',
        'Vínculo empregatício',
        'CTPS / e-Social / FGTS',
      ],
    },
  ]
  const [openCats, setOpenCats] = useState(() => new Set(CATEGORIES.map((c) => c.key)))
  const toggleCat = (k) =>
    setOpenCats((s) => {
      const n = new Set(s)
      n.has(k) ? n.delete(k) : n.add(k)
      return n
    })
  const [pending, setPending] = useState({}) // cat -> File
  const [preview, setPreview] = useState(null) // { url, mime, nome, texto? }
  // limpa URL anterior ao trocar
  useEffect(() => {
    return () => {
      try {
        if (preview?.url) URL.revokeObjectURL(preview.url)
      } catch (_) {}
    }
  }, [preview])
  const addPending = (cat) => {
    const file = pending[cat]
    if (!file) {
      toast.error('Selecione um arquivo')
      return
    }
    if (!allowed.includes(file.type)) {
      toast.error('Tipo não permitido')
      return
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error('Arquivo muito grande')
      return
    }
    const item = {
      id: crypto.randomUUID(),
      file,
      categoria: cat,
      nome: file.name,
      mime: file.type,
      tamanho_bytes: file.size,
    }
    onChange([...(attached || []), item])
    setPending((p) => ({ ...p, [cat]: null }))
  }
  const remove = (id) => {
    // se removendo arquivo que está em preview, fecha
    setPreview((prev) =>
      prev && attached?.find((a) => a.id === id)?.file === prev._file ? null : prev
    )
    onChange((attached || []).filter((f) => f.id !== id))
  }
  const openPreview = async (f) => {
    try {
      if (preview?.url) {
        try {
          URL.revokeObjectURL(preview.url)
        } catch (_) {}
      }
      const url = URL.createObjectURL(f.file)
      // CSV: ler primeiras linhas
      if (/text\/csv|application\/csv/.test(f.mime)) {
        const text = await f.file.text().catch(() => null)
        const head = text ? text.split(/\r?\n/).slice(0, 10).join('\n') : null
        setPreview({ url, mime: f.mime, nome: f.nome, texto: head, _file: f.file })
        return
      }
      // XLS/XLSX: ler primeiras linhas da primeira aba
      if (
        /application\/(vnd.openxmlformats-officedocument.spreadsheetml.sheet|vnd.ms-excel)/.test(
          f.mime
        )
      ) {
        setPreview({ url, mime: f.mime, nome: f.nome, _file: f.file, loading: true })
        try {
          const data = await f.file.arrayBuffer()
          const XLSX = await import('xlsx')
          const wb = XLSX.read(data, { type: 'array' })
          const sheetName = wb.SheetNames[0]
          const sheet = wb.Sheets[sheetName]
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
          const previewRows = rows.slice(0, 15).map((r) => (Array.isArray(r) ? r.slice(0, 12) : []))
          setPreview({
            url,
            mime: f.mime,
            nome: f.nome,
            _file: f.file,
            sheetName,
            sheetRows: previewRows,
          })
        } catch (err) {
          toast.error('Falha ao ler planilha')
          setPreview({ url, mime: f.mime, nome: f.nome, _file: f.file })
        }
        return
      }
      setPreview({ url, mime: f.mime, nome: f.nome, _file: f.file })
    } catch (err) {
      toast.error('Falha ao gerar pré-visualização')
    }
  }
  const closePreview = () => {
    try {
      if (preview?.url) URL.revokeObjectURL(preview.url)
    } catch (_) {}
    setPreview(null)
  }
  const grouped = (attached || []).reduce(
    (acc, f) => {
      const k = f.categoria || 'outros'
      ;(acc[k] || (acc[k] = [])).push(f)
      return acc
    },
    { empresa: [], titular: [], outros: [] }
  )
  return (
    <div className="space-y-4">
      <div>
        <Label className="font-semibold">Documentos</Label>
        <p className="text-[11px] text-muted-foreground mt-1">
          PDF, Imagens, Planilhas, CSV até {MAX_FILE_MB}MB. Remover antes de salvar evita envio.
        </p>
      </div>
      <div className="space-y-6">
        {CATEGORIES.map((cat) => (
          <div key={cat.key} className="rounded-md border bg-muted/10">
            <button
              type="button"
              onClick={() => toggleCat(cat.key)}
              aria-expanded={openCats.has(cat.key)}
              className="w-full flex items-center justify-between px-3 py-2 text-left gap-3"
            >
              <span className="font-medium text-sm flex items-center gap-2">
                {cat.title}
                {grouped[cat.key]?.length > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 font-medium">
                    {grouped[cat.key].length}
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground select-none" aria-hidden>
                {openCats.has(cat.key) ? '−' : '+'}
              </span>
            </button>
            {openCats.has(cat.key) && (
              <div className="px-3 pb-3 space-y-3">
                <ul className="list-disc ml-5 text-[11px] text-muted-foreground space-y-0.5">
                  {cat.docs.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <input
                    type="file"
                    className="text-xs"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      setPending((p) => ({ ...p, [cat.key]: f || null }))
                      e.target.value = ''
                    }}
                  />
                  <Button type="button" size="sm" onClick={() => addPending(cat.key)}>
                    Adicionar
                  </Button>
                  {pending[cat.key] && (
                    <span
                      className="text-[11px] text-muted-foreground truncate max-w-[160px]"
                      title={pending[cat.key].name}
                    >
                      {pending[cat.key].name}
                    </span>
                  )}
                </div>
                <div>
                  {grouped[cat.key].length === 0 && (
                    <p className="text-[11px] text-muted-foreground">Nenhum arquivo listado.</p>
                  )}
                  {grouped[cat.key].length > 0 && (
                    <ul className="space-y-1 max-h-32 overflow-auto text-xs pr-1">
                      {grouped[cat.key].map((f) => (
                        <li
                          key={f.id}
                          className="flex items-center gap-2 border rounded px-2 py-1 bg-background"
                        >
                          <span className="flex-1 truncate" title={f.nome}>
                            {f.nome}
                          </span>
                          <button
                            type="button"
                            className="text-[11px] text-primary hover:underline"
                            onClick={() => openPreview(f)}
                          >
                            ver
                          </button>
                          <button
                            type="button"
                            className="text-destructive text-[11px]"
                            onClick={() => remove(f.id)}
                          >
                            remover
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {preview && (
        <div className="border rounded-md p-3 bg-background shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="truncate">Pré-visualização: {preview.nome}</span>
            <button
              type="button"
              className="ml-auto text-[11px] text-destructive hover:underline"
              onClick={closePreview}
            >
              Fechar
            </button>
          </div>
          {/* Conteúdo */}
          {/^image\//.test(preview.mime) && (
            <div className="relative w-full max-h-64 flex justify-center">
              <Image
                src={preview.url}
                alt={preview.nome}
                width={512}
                height={512}
                className="h-auto max-h-64 w-auto rounded border object-contain"
              />
            </div>
          )}
          {preview.mime === 'application/pdf' && (
            <iframe title={preview.nome} src={preview.url} className="w-full h-64 border rounded" />
          )}
          {/csv/.test(preview.mime) && (
            <pre className="text-[10px] max-h-64 overflow-auto bg-muted/40 p-2 rounded whitespace-pre-wrap">
              {preview.texto || 'Sem conteúdo'}
            </pre>
          )}
          {/application\/(vnd.openxmlformats-officedocument.spreadsheetml.sheet|vnd.ms-excel)/.test(
            preview.mime
          ) && (
            <div className="border rounded bg-muted/40 max-h-64 overflow-auto">
              {preview.loading && (
                <div className="p-2 text-[11px] text-muted-foreground">Carregando planilha...</div>
              )}
              {!preview.loading && preview.sheetRows && preview.sheetRows.length > 0 && (
                <table className="w-full text-[10px]">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      {preview.sheetRows[0].map((c, i) => (
                        <th
                          key={i}
                          className="text-left font-medium px-2 py-1 border-b border-border min-w-[60px] truncate max-w-[140px]"
                        >
                          {String(c || '').slice(0, 40)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sheetRows.slice(1).map((row, ri) => (
                      <tr key={ri} className="even:bg-background/60">
                        {row.map((c, ci) => (
                          <td
                            key={ci}
                            className="px-2 py-1 border-b border-border align-top truncate max-w-[140px]"
                            title={c ? String(c) : ''}
                          >
                            {String(c || '').slice(0, 60)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!preview.loading && (!preview.sheetRows || preview.sheetRows.length === 0) && (
                <div className="p-2 text-[11px] text-muted-foreground">
                  Planilha vazia ou não pôde ser lida.
                </div>
              )}
            </div>
          )}
          {!/^image\//.test(preview.mime) &&
            preview.mime !== 'application/pdf' &&
            !/csv/.test(preview.mime) && (
              <p className="text-[11px] text-muted-foreground">
                Tipo não suportado para pré-visualização direta.
              </p>
            )}
        </div>
      )}
    </div>
  )
}

export function NovaPropostaDialog({
  open,
  onOpenChange,
  currentUser,
  operadoras,
  statusOptions,
  onCreateProposal,
}) {
  const [form, setForm] = useState({
    cnpj: '',
    operadora: '',
    quantidade_vidas: '',
    valor: '',
    previsao_implantacao: '',
    status: 'recepcionado',
    consultor: '',
    consultor_email: '',
    cliente_nome: '',
    cliente_email: '',
    _docs: [],
  })
  const [cnpjCache, setCnpjCache] = useState({}) // digits -> { loading, error, nome }
  const [uploadingDocs, setUploadingDocs] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 })
  const abortRef = useRef({ aborted: false })
  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      abortRef.current.aborted = false
      setUploadingDocs(false)
      setUploadProgress({ done: 0, total: 0 })
    }
  }, [open])
  const isConsultor = currentUser?.tipo_usuario === 'consultor'
  const maskCNPJ = (raw) => {
    const digits = String(raw || '')
      .replace(/\D/g, '')
      .slice(0, 14)
    let out = digits
    if (digits.length > 2) out = digits.slice(0, 2) + '.' + digits.slice(2)
    if (digits.length > 5) out = out.slice(0, 6) + '.' + out.slice(6)
    if (digits.length > 8) out = out.slice(0, 10) + '/' + out.slice(10)
    if (digits.length > 12) out = out.slice(0, 15) + '-' + out.slice(15)
    return out
  }
  const moneyDigits = (v) =>
    String(v || '')
      .replace(/\D/g, '')
      .slice(0, 15)
  const formatMoneyBR = (v) => {
    const d = moneyDigits(v)
    if (!d) return ''
    const n = parseInt(d, 10) / 100
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)
  }
  const parseMoney = (m) => {
    const d = String(m || '').replace(/\D/g, '')
    return d ? parseInt(d, 10) / 100 : 0
  }
  const fetchCnpj = useCallback(
    async (masked) => {
      const digits = String(masked || '').replace(/\D/g, '')
      if (digits.length !== 14) return
      if (cnpjCache[digits]?.loading || cnpjCache[digits]?.fetched) return
      setCnpjCache((p) => ({
        ...p,
        [digits]: { ...(p[digits] || {}), loading: true, error: null },
      }))
      try {
        const r = await fetch('/api/validate-cnpj', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cnpj: digits }),
        })
        const j = await r.json().catch(() => null)
        if (!r.ok || !j?.valid || !j?.data) {
          setCnpjCache((p) => ({
            ...p,
            [digits]: { loading: false, fetched: true, error: j?.error || 'Não encontrado' },
          }))
          return
        }
        const nome = j.data.nome_fantasia || j.data.razao_social || ''
        setCnpjCache((p) => ({ ...p, [digits]: { loading: false, fetched: true, nome } }))
        if (isConsultor && nome)
          setForm((f) => (f.cliente_nome?.trim() ? f : { ...f, cliente_nome: nome }))
      } catch {
        setCnpjCache((p) => ({
          ...p,
          [digits]: { loading: false, fetched: true, error: 'Erro ao consultar' },
        }))
      }
    },
    [cnpjCache, isConsultor]
  )
  const handleSubmit = async (e) => {
    e.preventDefault()
    const email = isConsultor ? form.cliente_email.trim() : form.consultor_email.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error(isConsultor ? 'Email de cliente inválido' : 'Email de consultor inválido')
      return
    }
    if (isConsultor && !form.cliente_nome.trim()) {
      toast.error('Valide o CNPJ para carregar o Nome do Cliente')
      return
    }
    const valorNumber = parseMoney(form.valor)
    if (!valorNumber || valorNumber <= 0) {
      toast.error('Informe valor > 0')
      return
    }
    const cnpjDigits = form.cnpj.replace(/\D/g, '')
    if (cnpjDigits.length !== 14) {
      toast.error('CNPJ deve ter 14 dígitos')
      return
    }
    // valida CNPJ final novamente
    try {
      const r = await fetch('/api/validate-cnpj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj: cnpjDigits }),
      })
      const j = await r.json()
      if (!j?.valid) {
        toast.error(j?.error || 'CNPJ inválido')
        return
      }
    } catch {
      toast.error('Erro ao validar CNPJ')
      return
    }
    const forcedStatus = isConsultor ? 'recepcionado' : form.status
    // Upload adiado dos documentos
    let docsMeta = []
    const pendingDocs = form._docs || []
    if (pendingDocs.length) {
      setUploadingDocs(true)
      setUploadProgress({ done: 0, total: pendingDocs.length })
      try {
        const authToken = (() => {
          try {
            return sessionStorage.getItem('erp_token') || sessionStorage.getItem('crm_token')
          } catch {
            return null
          }
        })()
        const supa = assertSupabaseBrowser()
        for (let i = 0; i < pendingDocs.length; i++) {
          if (abortRef.current.aborted) {
            toast.error('Upload cancelado')
            setUploadingDocs(false)
            return
          }
          const d = pendingDocs[i]
          const file = d.file
          if (!file) continue
          const resp = await fetch('/api/proposals/upload-url', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({ filename: file.name, mime: file.type, size: file.size }),
          })
          const signed = await resp.json().catch(() => null)
          if (!resp.ok) {
            throw new Error(signed?.message || 'Falha gerar URL')
          }
          const { path, token: uploadToken, bucket } = signed
          const { error: upErr } = await supa.storage
            .from(bucket)
            .uploadToSignedUrl(path, uploadToken, file, { contentType: file.type, upsert: false })
          if (upErr) throw upErr
          let url = null
          try {
            const { data } = supa.storage.from(bucket).getPublicUrl(path)
            url = data?.publicUrl || null
          } catch {}
          if (!url) {
            try {
              const { data } = await supa.storage.from(bucket).createSignedUrl(path, 3600)
              url = data?.signedUrl || null
            } catch {}
          }
          docsMeta.push({
            path,
            nome: file.name,
            mime: file.type,
            tamanho_bytes: file.size,
            bucket,
            url,
            categoria: d.categoria,
          })
          setUploadProgress((p) => ({ ...p, done: p.done + 1 }))
        }
      } catch (err) {
        console.error('upload adiado error', err)
        toast.error('Falha ao enviar documentos')
        setUploadingDocs(false)
        return
      }
      setUploadingDocs(false)
    }
    const payload = {
      ...form,
      status: forcedStatus,
      valor: valorNumber,
      criado_por: currentUser.id,
      cnpj: cnpjDigits,
    }
    if (isConsultor) {
      delete payload.consultor
      delete payload.consultor_email
    } else {
      if (!payload.consultor?.trim()) delete payload.consultor
      if (!payload.consultor_email?.trim()) delete payload.consultor_email
      if (!payload.cliente_nome) delete payload.cliente_nome
      if (!payload.cliente_email) delete payload.cliente_email
    }
    await onCreateProposal({
      ...payload,
      _docs: docsMeta,
      afterSuccess: () => {
        setForm({
          cnpj: '',
          operadora: '',
          quantidade_vidas: '',
          valor: '',
          previsao_implantacao: '',
          status: 'recepcionado',
          consultor: '',
          consultor_email: '',
          cliente_nome: '',
          cliente_email: '',
          _docs: [],
        })
        onOpenChange(false)
      },
    })
  }
  const cnpjDigits = form.cnpj.replace(/\D/g, '')
  const cnpjInfo = cnpjDigits.length === 14 ? cnpjCache[cnpjDigits] : null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 flex flex-col"
        description="Cadastro de proposta com validação de CNPJ e anexos."
      >
        <DialogHeader className="px-6 pt-4">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />{' '}
            {isConsultor ? 'Solicitar Proposta' : 'Nova Proposta'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2 space-y-6 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>CNPJ *</Label>
              <Input
                value={form.cnpj}
                maxLength={18}
                inputMode="numeric"
                placeholder="00.000.000/0000-00"
                onChange={(e) => {
                  const masked = maskCNPJ(e.target.value)
                  setForm((f) => ({ ...f, cnpj: masked }))
                  if (masked.replace(/\D/g, '').length === 14) fetchCnpj(masked)
                }}
                onBlur={(e) => fetchCnpj(e.target.value)}
                required
              />
              {(() => {
                if (!form.cnpj) return null
                if (cnpjDigits.length < 14)
                  return (
                    <p className="text-[11px] text-muted-foreground mt-1">Digite os 14 dígitos.</p>
                  )
                if (cnpjInfo?.loading)
                  return (
                    <p className="text-[11px] text-primary mt-1 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Validando CNPJ...
                    </p>
                  )
                if (cnpjInfo?.error)
                  return (
                    <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {cnpjInfo.error}
                    </p>
                  )
                if (cnpjInfo?.nome)
                  return (
                    <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {cnpjInfo.nome}
                    </p>
                  )
                return null
              })()}
            </div>
            <div>
              <Label>Operadora</Label>
              <Select
                value={form.operadora}
                onValueChange={(v) => setForm((f) => ({ ...f, operadora: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {operadoras.map((op) => (
                    <SelectItem key={op} value={op}>
                      {op}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade de Vidas *</Label>
              <Input
                type="number"
                value={form.quantidade_vidas}
                onChange={(e) => setForm((f) => ({ ...f, quantidade_vidas: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Valor do Plano *</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={form.valor}
                onChange={(e) => setForm((f) => ({ ...f, valor: formatMoneyBR(e.target.value) }))}
                placeholder="R$ 0,00"
                required
              />
            </div>
            <div>
              <Label>Previsão Implantação</Label>
              <Input
                type="date"
                value={form.previsao_implantacao}
                onChange={(e) => setForm((f) => ({ ...f, previsao_implantacao: e.target.value }))}
              />
            </div>
            {!isConsultor && (
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isConsultor ? (
              <>
                <div>
                  <Label>Nome do Cliente *</Label>
                  <Input value={form.cliente_nome} readOnly disabled placeholder="Valide o CNPJ" />
                </div>
                <div>
                  <Label>Email do Cliente *</Label>
                  <Input
                    type="email"
                    value={form.cliente_email}
                    onChange={(e) => setForm((f) => ({ ...f, cliente_email: e.target.value }))}
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>Consultor *</Label>
                  <Input
                    value={form.consultor}
                    onChange={(e) => setForm((f) => ({ ...f, consultor: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Email do Consultor *</Label>
                  <Input
                    type="email"
                    value={form.consultor_email}
                    onChange={(e) => setForm((f) => ({ ...f, consultor_email: e.target.value }))}
                    required
                  />
                </div>
              </>
            )}
          </div>
          <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5" />
              <div className="space-y-1 w-full">
                <p className="font-medium text-primary">Orientações</p>
                <ul className="list-disc ml-4 space-y-0.5">
                  <li>Valide o CNPJ para preencher automaticamente o nome.</li>
                  <li>
                    Informe o valor total <b>mensal</b> estimado do plano.
                  </li>
                  <li>Anexe documentos claros e legíveis (sem cortes).</li>
                  <li>Status inicial sempre recepcionado.</li>
                </ul>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Após salvar você poderá acompanhar o andamento no Kanban.
                </p>
              </div>
            </div>
          </div>
          <ProposalUploadDocs
            attached={form._docs || []}
            onChange={(docs) => setForm((f) => ({ ...f, _docs: docs }))}
          />
          {uploadingDocs && (
            <div className="space-y-2 border rounded-md p-3 bg-muted/30">
              <div className="flex items-center gap-2 text-xs font-medium">
                <Loader2 className="h-4 w-4 animate-spin" /> Enviando documentos (
                {uploadProgress.done}/{uploadProgress.total})
                <button
                  type="button"
                  className="ml-auto text-red-600 hover:underline flex items-center gap-1"
                  onClick={() => {
                    abortRef.current.aborted = true
                  }}
                >
                  <XCircle className="h-3 w-3" /> Cancelar
                </button>
              </div>
              <Progress
                value={
                  uploadProgress.total ? (uploadProgress.done / uploadProgress.total) * 100 : 0
                }
                className="h-2"
              />
            </div>
          )}
        </form>
        <div className="border-t px-6 py-3 flex justify-end gap-2 bg-background sticky bottom-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={uploadingDocs}
            onClick={(e) => {
              const formEl = e.currentTarget.closest('[role=dialog]')?.querySelector('form')
              formEl?.requestSubmit()
            }}
          >
            {uploadingDocs
              ? `Enviando (${uploadProgress.done}/${uploadProgress.total})...`
              : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
