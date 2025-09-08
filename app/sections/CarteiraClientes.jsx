'use client'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { ExternalLink } from 'lucide-react'

export default function CarteiraClientesSection({ currentUser, token }) {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ cnpj: '', razao_social: '', responsavel: '', cargo_responsavel: '', email_responsavel: '', whatsapp_responsavel: '' })
  const [cnpjStatus, setCnpjStatus] = useState('idle') // idle|validating|valid|invalid
  const validatedRef = useRef(null)
  const debounceRef = useRef(null)
  const [search, setSearch] = useState('')
  const [detailCliente, setDetailCliente] = useState(null)
  const [docs, setDocs] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notas, setNotas] = useState([])
  const [notaText, setNotaText] = useState('')
  const [notasLoading, setNotasLoading] = useState(false)

  const authHeaders = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token])

  const loadClientes = useCallback(async (query) => {
    setLoading(true)
    try {
      const url = query
        ? `/api/clientes?q=${encodeURIComponent(query)}&fields=list&page=1&pageSize=50`
        : '/api/clientes?fields=list&page=1&pageSize=50'
      const res = await fetch(url, { headers: authHeaders })
      const data = await res.json().catch(()=>[])
      if (res.ok) {
        setClientes(Array.isArray(data) ? data : [])
      } else {
        toast.error(data.error || 'Erro ao carregar clientes')
      }
    } catch { toast.error('Erro de conexão') }
    finally { setLoading(false) }
  }, [authHeaders])

  useEffect(() => { loadClientes(search.trim()) }, [loadClientes, search])

  // Validação automática de CNPJ com debounce
  useEffect(() => {
    const digits = form.cnpj.replace(/\D/g,'')
    if (digits !== validatedRef.current && cnpjStatus === 'valid') setCnpjStatus('idle')
    if (digits.length < 14) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (cnpjStatus !== 'idle') setCnpjStatus('idle')
      return
    }
    if (digits === validatedRef.current) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setCnpjStatus('validating')
      try {
        const res = await fetch('/api/validate-cnpj', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ cnpj: digits }) })
        const json = await res.json().catch(()=>({}))
        if (!res.ok || !json.valid) {
          setCnpjStatus('invalid')
        } else {
          validatedRef.current = digits
          setCnpjStatus('valid')
          // Preenche / sobrescreve razão social com valor oficial retornado
          if (json.razao_social || json.data?.razao_social) {
            const rs = json.razao_social || json.data?.razao_social
            setForm(f => ({ ...f, razao_social: rs }))
          }
        }
      } catch {
        setCnpjStatus('invalid')
      }
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [form.cnpj, cnpjStatus])

  const handleCreate = async (e) => {
    e.preventDefault()
    const digits = form.cnpj.replace(/\D/g,'')
  if (digits.length !== 14) return toast.error('CNPJ inválido')
  if (cnpjStatus !== 'valid') return toast.error('Validação de CNPJ pendente ou inválida')
    try {
      const res = await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type':'application/json', ...authHeaders }, body: JSON.stringify({ ...form, cnpj: digits }) })
      const json = await res.json()
      if (!res.ok) {
        if (json.code === 'duplicate') return toast.error('Duplicado: já existe esse CNPJ na sua carteira')
        if (json.code === 'invalid_cnpj') return toast.error('CNPJ inválido')
        if (json.code === 'cnpj_lookup_failed') return toast.error('Falha na validação externa do CNPJ')
        if (json.code === 'invalid_whatsapp') return toast.error('Whatsapp inválido')
        return toast.error(json.error || 'Erro ao criar')
      }
      toast.success('Cliente adicionado')
      setDialogOpen(false)
      setForm({ cnpj: '', razao_social: '', responsavel: '', cargo_responsavel: '', email_responsavel: '', whatsapp_responsavel: '' })
      await loadClientes(search.trim())
    } catch { toast.error('Erro de conexão') }
  }

  const filtered = clientes

  const maskCNPJ = (raw) => {
    const digits = String(raw || '').replace(/\D/g, '').slice(0,14)
    let out = digits
    if (digits.length > 2) out = digits.slice(0,2) + '.' + digits.slice(2)
    if (digits.length > 5) out = out.slice(0,6) + '.' + out.slice(6)
    if (digits.length > 8) out = out.slice(0,10) + '/' + out.slice(10)
    if (digits.length > 12) out = out.slice(0,15) + '-' + out.slice(15)
    return out
  }

  const openDetails = (cliente) => {
    setDetailCliente(cliente)
    loadDocs(cliente.id)
    loadNotas(cliente.id)
  }

  const loadDocs = async (clienteId) => {
    setDocsLoading(true)
    try {
      const res = await fetch(`/api/clientes/docs?cliente_id=${clienteId}`, { headers: authHeaders })
      const json = await res.json().catch(()=>[])
      if (res.ok) setDocs(Array.isArray(json)? json: [])
      else toast.error(json.error || 'Erro docs')
    } catch { toast.error('Falha docs') }
    finally { setDocsLoading(false) }
  }

  const loadNotas = async (clienteId) => {
    setNotasLoading(true)
    try {
      const res = await fetch(`/api/clientes/notas?cliente_id=${clienteId}`, { headers: authHeaders })
      const json = await res.json().catch(()=>[])
      if (res.ok) setNotas(Array.isArray(json)? json: [])
      else toast.error(json.error || 'Erro notas')
    } catch { toast.error('Falha notas') }
    finally { setNotasLoading(false) }
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !detailCliente) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('cliente_id', detailCliente.id)
      const res = await fetch('/api/clientes/upload', { method: 'POST', headers: authHeaders, body: formData })
      const json = await res.json()
      if (!res.ok) return toast.error(json.error || 'Erro upload')
      toast.success('Documento anexado')
      loadDocs(detailCliente.id)
    } catch { toast.error('Falha upload') }
    finally { setUploading(false); e.target.value = '' }
  }

  const removerDoc = async (path) => {
    if (!detailCliente) return
    if (!confirm('Remover documento?')) return
    try {
      const res = await fetch('/api/clientes/docs', { method: 'DELETE', headers: { 'Content-Type':'application/json', ...authHeaders }, body: JSON.stringify({ path, cliente_id: detailCliente.id }) })
      const json = await res.json()
      if (!res.ok) return toast.error(json.error || 'Erro remover')
      toast.success('Removido')
      setDocs(d => d.filter(x => x.path !== path))
    } catch { toast.error('Falha remover') }
  }

  const adicionarNota = async () => {
    if (!notaText.trim() || !detailCliente) return
    try {
      const res = await fetch('/api/clientes/notas', { method: 'POST', headers: { 'Content-Type':'application/json', ...authHeaders }, body: JSON.stringify({ cliente_id: detailCliente.id, nota: notaText }) })
      const json = await res.json()
      if (!res.ok) return toast.error(json.error || 'Erro nota')
      setNotas(n => [json, ...n])
      setNotaText('')
    } catch { toast.error('Falha nota') }
  }

  const excluirNota = async (id) => {
    if (!confirm('Excluir nota?')) return
    try {
      const res = await fetch('/api/clientes/notas', { method: 'DELETE', headers: { 'Content-Type':'application/json', ...authHeaders }, body: JSON.stringify({ id }) })
      const json = await res.json()
      if (!res.ok) return toast.error(json.error || 'Erro excluir')
      setNotas(n => n.filter(x => x.id !== id))
    } catch { toast.error('Falha excluir') }
  }

  return (
    <div className="space-y-6">
      {/* Atalhos de trabalho para Analista Cliente */}
      {['analista_cliente','gestor'].includes(currentUser?.tipo_usuario) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Atalhos de Trabalho</CardTitle>
            <CardDescription className="text-xs">Links úteis usados no dia a dia (abre em nova guia)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {/* Planilhas */}
              <a
                href="https://docs.google.com/spreadsheets/d/1NK7tGQCioDRoTFlI7bCSlLqXLKdUyfoe-_uCNHO7bi0/edit?gid=1533137706#gid=1533137706"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded border hover:bg-muted transition-colors"
                title="Planilha de Boletos/Movimentação"
              >
                <ExternalLink className="w-4 h-4" /> Planilha: Boletos/Movimentação
              </a>
              <a
                href="https://docs.google.com/spreadsheets/d/1eRgoxc6oqtdVNMWwYJiWHhe_SmEEW9LaL0-zSTGj8kc/edit?gid=11585494#gid=11585494"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded border hover:bg-muted transition-colors"
                title="Planilha de Implantação"
              >
                <ExternalLink className="w-4 h-4" /> Planilha: Implantação
              </a>

              {/* Sites Operadoras */}
              <a
                href="https://wwwn.bradescoseguros.com.br/pnegocios2/wps/portal/portaldenegociosnovo/!ut/p/z1/04_Sj9CPykssy0xPLMnMz0vMAfIjo8zifdx9PA0sLYz8DJzdjAwCHcOCTdx9jQxNfE30wwkpiAJKG-AAjgZA_VGElBTkRhikOyoqAgBzNoDA/dz/d5/L2dBISEvZ0FBIS9nQSEh/"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded border hover:bg-muted transition-colors"
                title="Portal Bradesco Seguros"
              >
                <ExternalLink className="w-4 h-4" /> Bradesco (Portal de Negócios)
              </a>
              <a
                href="https://corretor.sulamericaseguros.com.br/?accessError=2#/"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded border hover:bg-muted transition-colors"
                title="Portal Corretor SulAmérica"
              >
                <ExternalLink className="w-4 h-4" /> SulAmérica (Corretor)
              </a>
              <a
                href="https://institucional.amil.com.br/"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded border hover:bg-muted transition-colors"
                title="Portal Amil"
              >
                <ExternalLink className="w-4 h-4" /> Amil
              </a>
              <a
                href="https://remote.unimedrecife.com.br:444/connecta/Default.aspx?ReturnUrl=%2fconnecta%2fContent%2fContrato%2fCoParticipacao.aspx"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded border hover:bg-muted transition-colors"
                title="Unimed Recife Connecta"
              >
                <ExternalLink className="w-4 h-4" /> Unimed Recife (Connecta)
              </a>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold">Carteira de Clientes</h2>
          <p className="text-sm text-muted-foreground">Gerencie clientes vinculados {currentUser.tipo_usuario === 'consultor' ? 'a você' : 'aos consultores'}.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Adicionar Cliente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Cliente</DialogTitle>
              <DialogDescription>Informe os dados do cliente.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>CNPJ</Label>
                  <Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: maskCNPJ(e.target.value) }))} placeholder="00.000.000/0000-00" required />
                  <div className="text-xs h-4">
                    {cnpjStatus === 'validating' && <span className="text-amber-600">Validando...</span>}
                    {cnpjStatus === 'valid' && <span className="text-green-600">CNPJ válido</span>}
                    {cnpjStatus === 'invalid' && <span className="text-red-600">CNPJ inválido</span>}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Razão Social</Label>
                  <Input value={form.razao_social} disabled={cnpjStatus === 'valid'} onChange={e => setForm(f => ({ ...f, razao_social: e.target.value }))} placeholder="Razão Social" />
                </div>
                <div className="space-y-1">
                  <Label>Responsável</Label>
                  <Input value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} placeholder="Nome responsável" required />
                </div>
                <div className="space-y-1">
                  <Label>Cargo</Label>
                  <Input value={form.cargo_responsavel} onChange={e => setForm(f => ({ ...f, cargo_responsavel: e.target.value }))} placeholder="Cargo" />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={form.email_responsavel} onChange={e => setForm(f => ({ ...f, email_responsavel: e.target.value }))} placeholder="email@empresa.com" required />
                </div>
                <div className="space-y-1">
                  <Label>Whatsapp</Label>
                  <Input value={form.whatsapp_responsavel} onChange={e => setForm(f => ({ ...f, whatsapp_responsavel: e.target.value }))} placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

  <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Clientes ({filtered.length})</CardTitle>
            <CardDescription>Resultados filtrados</CardDescription>
          </div>
          <div className="flex gap-2 items-center">
            <Input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} className="w-48" />
            <Button variant="outline" size="sm" onClick={loadClientes} disabled={loading}>{loading ? '...' : 'Recarregar'}</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded border overflow-auto max-h-[520px]">
            <Table className="text-sm">
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Whatsapp</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
        {filtered.map(c => (
                  <TableRow key={c.id}>
      <TableCell className="font-mono text-xs" title={maskCNPJ(c.cnpj)}>{maskCNPJ(c.cnpj)}</TableCell>
                    <TableCell className="truncate max-w-[220px]" title={c.razao_social}>{c.razao_social || '—'}</TableCell>
                    <TableCell>{c.responsavel}</TableCell>
                    <TableCell>{c.email_responsavel}</TableCell>
          <TableCell>{c.whatsapp_responsavel || '—'}</TableCell>
          <TableCell><Button size="sm" variant="outline" onClick={()=>openDetails(c)}>Detalhes</Button></TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">Nenhum cliente</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Detalhes Cliente */}
      <Dialog open={!!detailCliente} onOpenChange={v => { if (!v) { setDetailCliente(null); setDocs([]); setNotas([]) } }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Cliente</DialogTitle>
            <DialogDescription>{detailCliente ? maskCNPJ(detailCliente.cnpj) : ''} • {detailCliente?.razao_social}</DialogDescription>
          </DialogHeader>
      <Tabs defaultValue="docs" className="mt-2">
            <TabsList>
              <TabsTrigger value="docs">Documentos</TabsTrigger>
              <TabsTrigger value="notas">Notas</TabsTrigger>
        <TabsTrigger value="editar">Editar</TabsTrigger>
            </TabsList>
            <TabsContent value="docs" className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Upload:</label>
                <input type="file" onChange={handleUpload} disabled={uploading} className="text-sm" />
                {uploading && <span className="text-xs text-muted-foreground">Enviando...</span>}
              </div>
              <div className="border rounded max-h-64 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr><th className="text-left p-2">Nome</th><th className="text-left p-2">Ações</th></tr>
                  </thead>
                  <tbody>
                    {docsLoading && <tr><td colSpan={2} className="p-3 text-center">Carregando...</td></tr>}
                    {!docsLoading && docs.length === 0 && <tr><td colSpan={2} className="p-3 text-center">Sem documentos</td></tr>}
                    {docs.map(d => (
                      <tr key={d.path} className="border-t">
                        <td className="p-2 truncate max-w-[320px]"><a className="text-primary underline" href={d.url || '#'} target="_blank" rel="noreferrer">{d.nome}</a></td>
                        <td className="p-2"><button onClick={()=>removerDoc(d.path)} className="text-red-600 hover:underline">Remover</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            <TabsContent value="notas" className="space-y-4">
              <div className="space-y-2">
                <Textarea placeholder="Adicionar nota..." value={notaText} onChange={e=>setNotaText(e.target.value)} className="text-sm" rows={3} />
                <div className="flex justify-end">
                  <Button size="sm" onClick={adicionarNota} disabled={!notaText.trim()}>Salvar Nota</Button>
                </div>
              </div>
              <div className="border rounded max-h-64 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0"><tr><th className="text-left p-2 w-[70%]">Nota</th><th className="text-left p-2">Data</th><th className="p-2">Ações</th></tr></thead>
                  <tbody>
                    {notasLoading && <tr><td colSpan={3} className="p-3 text-center">Carregando...</td></tr>}
                    {!notasLoading && notas.length === 0 && <tr><td colSpan={3} className="p-3 text-center">Sem notas</td></tr>}
                    {notas.map(n => (
                      <tr key={n.id} className="border-t">
                        <td className="p-2 whitespace-pre-wrap">{n.nota}</td>
                        <td className="p-2 text-nowrap">{new Date(n.criado_em).toLocaleString()}</td>
                        <td className="p-2"><button onClick={()=>excluirNota(n.id)} className="text-red-600 hover:underline">Excluir</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            <TabsContent value="editar" className="space-y-4">
              {detailCliente && (
                <EditarClienteForm detailCliente={detailCliente} authHeaders={authHeaders} onUpdated={(upd)=>{ setDetailCliente(upd); setClientes(cs=> cs.map(c=> c.id===upd.id? upd: c)) }} />
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EditarClienteForm({ detailCliente, authHeaders, onUpdated }) {
  const [form, setForm] = useState({
    razao_social: detailCliente.razao_social || '',
    responsavel: detailCliente.responsavel || '',
    cargo_responsavel: detailCliente.cargo_responsavel || '',
    email_responsavel: detailCliente.email_responsavel || '',
    whatsapp_responsavel: detailCliente.whatsapp_responsavel || ''
  })
  const [saving, setSaving] = useState(false)

  const salvar = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/clientes', { method: 'PATCH', headers: { 'Content-Type':'application/json', ...authHeaders }, body: JSON.stringify({ id: detailCliente.id, ...form }) })
      const json = await res.json().catch(()=>({}))
      if (!res.ok) {
        if (json.code === 'invalid_whatsapp') toast.error('Whatsapp inválido')
        else toast.error(json.error || 'Erro ao salvar')
      } else {
        toast.success('Atualizado')
        onUpdated(json)
      }
    } catch { toast.error('Falha conexão') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Razão Social</Label>
          <Input value={form.razao_social} onChange={e=>setForm(f=>({...f, razao_social: e.target.value}))} />
        </div>
        <div className="space-y-1">
          <Label>Responsável</Label>
          <Input value={form.responsavel} onChange={e=>setForm(f=>({...f, responsavel: e.target.value}))} />
        </div>
        <div className="space-y-1">
          <Label>Cargo</Label>
          <Input value={form.cargo_responsavel} onChange={e=>setForm(f=>({...f, cargo_responsavel: e.target.value}))} />
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input type="email" value={form.email_responsavel} onChange={e=>setForm(f=>({...f, email_responsavel: e.target.value}))} />
        </div>
        <div className="space-y-1">
          <Label>Whatsapp</Label>
          <Input value={form.whatsapp_responsavel} onChange={e=>setForm(f=>({...f, whatsapp_responsavel: e.target.value}))} placeholder="(00)00000-0000" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Alterações'}</Button>
      </div>
    </form>
  )
}
