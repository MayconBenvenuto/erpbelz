"use client"
import { useState, useCallback, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { sanitizeInput, validateCNPJ } from '@/lib/security'
import { OPERADORAS } from '@/lib/constants'
import { assertSupabaseBrowser } from '@/lib/supabase-client'
import { Info } from 'lucide-react'
import Image from 'next/image'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

const allowedMime = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv'
]
const MAX_FILE_SIZE_MB = 7

export function NovaSolicitacaoDialog({ open, onOpenChange, token }) {
  const [tipo, setTipo] = useState('inclusao')
  const [subtipo, setSubtipo] = useState('funcionario')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [apoliceBelz, setApoliceBelz] = useState(false)
  const [acessoEmpresa, setAcessoEmpresa] = useState('')
  const [operadora, setOperadora] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [slaPrevisto, setSlaPrevisto] = useState('')
  // arquivos final será montado dinamicamente antes do submit
  const [docFiles, setDocFiles] = useState({}) // { docKey: fileMeta }
  const [extraFiles, setExtraFiles] = useState([]) // arquivos adicionais
  // uploading removido (inputs individuais tratam estado implicitamente)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  // Mini textos explicativos (poderia vir de config externa futuramente)
  const DOC_TIPS = useMemo(() => ({
    funcionario: [
      { key: 'documento_identificacao', label: 'Documento de identificação', desc: 'RG ou CNH com foto, dentro da validade e legível.' },
      { key: 'esocial_completo', label: 'e-Social completo', desc: 'Relatório completo comprovando vínculo ativo do colaborador.' },
      { key: 'ctps_digital', label: 'CTPS digital', desc: 'Páginas com dados pessoais + contrato de trabalho.' },
      { key: 'formulario_inclusao', label: 'Formulário de inclusão', desc: 'Formulário interno preenchido e assinado.' },
    ],
    socio: [
      { key: 'contrato_social', label: 'Contrato social', desc: 'Última alteração ou consolidação registrada.' },
      { key: 'documento_identificacao', label: 'Documento de identificação', desc: 'RG ou CNH do sócio responsável.' },
      { key: 'formulario_inclusao', label: 'Formulário de inclusão', desc: 'Formulário interno preenchido e assinado.' },
    ],
    dependente: [
      { key: 'certidao_dependente', label: 'Certidão nascimento/casamento', desc: 'Documento que comprova o vínculo do dependente.' },
      { key: 'formulario_inclusao', label: 'Formulário de inclusão', desc: 'Formulário interno preenchido e assinado.' },
    ],
    exclusao: [
      { key: 'formulario_rn561', label: 'Formulário RN 561', desc: 'Preenchido, assinado e legível conforme exigência normativa.' },
      { key: 'carta_proprio_punho', label: 'Carta próprio punho (SulAmérica)', desc: 'Titular declara solicitação de exclusão, datada e assinada.' },
    ],
    cancelamento: [
      { key: 'portal_gestor_amil', label: 'Portal gestor (Amil)', desc: 'URL ou credencial válida para efetivar o cancelamento.' },
      { key: 'refaturamento_bradesco', label: 'Refaturamento (Bradesco)', desc: 'Observação clara justificando necessidade de refaturar.' },
      { key: 'formulario_cancelamento', label: 'Formulário de cancelamento', desc: 'SulAmérica / Unimed Recife: modelo oficial preenchido.' },
    ],
    outros: [
      { key: 'descricao_outros', label: 'Descrição detalhada', desc: 'Explique claramente o que precisa ser realizado.' },
    ],
    gerais: [
      { key: 'razao_social', label: 'Razão Social', desc: 'Exatamente como consta no CNPJ.' },
      { key: 'cnpj', label: 'CNPJ', desc: '14 dígitos válidos com formatação.' },
      { key: 'observacoes', label: 'Observações', desc: 'Contexto obrigatório para análise sem retrabalho.' },
      { key: 'arquivos', label: 'Arquivos', desc: 'PDF/JPG/PNG até 5MB cada; nomeie claramente.' },
    ],
  }), [])

  const getDynamicDocs = () => {
    if (tipo === 'inclusao') return DOC_TIPS[subtipo] || []
    if (tipo === 'exclusao') return DOC_TIPS.exclusao
    if (tipo === 'cancelamento') return DOC_TIPS.cancelamento.filter(d => {
      if (d.key === 'portal_gestor_amil') return operadora === 'amil'
      if (d.key === 'refaturamento_bradesco') return operadora === 'bradesco'
      if (d.key === 'formulario_cancelamento') return ['sulamerica','sulamérica','unimed recife'].includes(operadora)
      return true
    })
    if (tipo === 'outros') return DOC_TIPS.outros
    return []
  }

  const dynamicDocs = getDynamicDocs()

  const maskCnpj = (v) => {
    return v
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18)
  }

  // addFiles removido: agora cada doc tem input próprio

  // Funções auxiliares (declaradas antes para evitar ReferenceError)
  const requiredDocKeys = useCallback(() => {
    if (tipo === 'inclusao') {
      if (subtipo === 'funcionario') return ['documento_identificacao','esocial_completo','ctps_digital','formulario_inclusao']
      if (subtipo === 'socio') return ['contrato_social','documento_identificacao','formulario_inclusao']
      if (subtipo === 'dependente') return ['certidao_dependente','formulario_inclusao']
    }
    if (tipo === 'exclusao') {
      const base = ['formulario_rn561']
      if (['sulamerica','sulamérica'].includes(operadora)) base.push('carta_proprio_punho')
      return base
    }
    if (tipo === 'cancelamento') {
      const arr = []
      if (['sulamerica','sulamérica','unimed recife'].includes(operadora)) arr.push('formulario_cancelamento')
      return arr
    }
    return []
  }, [tipo, subtipo, operadora])

  const docLabel = useCallback((key) => {
    const all = [...DOC_TIPS.funcionario, ...DOC_TIPS.socio, ...DOC_TIPS.dependente, ...DOC_TIPS.exclusao, ...DOC_TIPS.cancelamento]
    return all.find(d => d.key === key)?.label || key
  }, [DOC_TIPS])

  const validate = useCallback(() => {
    if (!razaoSocial.trim()) return 'Razão Social é obrigatória'
    if (!cnpj.trim() || !validateCNPJ(cnpj)) return 'CNPJ inválido'
    if (!tipo) return 'Tipo obrigatório'
    if (tipo === 'inclusao' && !subtipo) return 'Subtipo obrigatório'
    if (!observacoes.trim()) return 'Observações são obrigatórias'
    // Requer pelo menos 1 documento
    const totalDocs = Object.keys(docFiles).length + extraFiles.length
    if (totalDocs === 0) return 'Envie pelo menos 1 documento'
    // Exigir TODOS os documentos obrigatórios presentes
    const missing = requiredDocKeys().filter(k => !docFiles[k])
    if (missing.length) return `Documento(s) faltando: ${missing.map(m => docLabel(m)).join(', ')}`
    return null
  }, [razaoSocial, cnpj, tipo, subtipo, observacoes, docFiles, extraFiles, docLabel, requiredDocKeys])

  const buildDadosDinamicos = useCallback(() => {
    const d = {}
    if (tipo === 'exclusao') {
      d.formulario_rn561 = true
      if (['sulamerica','sulamérica'].includes(operadora)) d.carta_proprio_punho = true
    }
    if (tipo === 'cancelamento') {
      if (operadora === 'amil') d.portal_gestor = acessoEmpresa
      if (operadora === 'bradesco') d.refaturamento = observacoes
      if (['sulamerica','sulamérica','unimed recife'].includes(operadora)) d.formulario_cancelamento = true
    }
    if (operadora) d.operadora = operadora
    return d
  }, [tipo, operadora, acessoEmpresa, observacoes])

  const handleSubmit = useCallback(async () => {
    const err = validate()
    if (err) {
      toast.error(err)
      return
    }
    setSaving(true)
    try {
      // Monta lista final de arquivos (padroniza campo doc_key quando aplicável)
      const finalArquivos = [
        ...Object.entries(docFiles).map(([doc_key, meta]) => ({ ...meta, doc_key })),
        ...extraFiles
      ]
  // setArquivos apenas para retrocompatibilidade visual se necessário (não listado diretamente agora)
      const payload = {
        tipo,
        subtipo: tipo === 'inclusao' ? subtipo : null,
        razao_social: sanitizeInput(razaoSocial),
        cnpj: sanitizeInput(cnpj),
  apolice_da_belz: apoliceBelz,
  acesso_empresa: sanitizeInput(acessoEmpresa),
  operadora: sanitizeInput(operadora),
        observacoes: sanitizeInput(observacoes),
        arquivos: finalArquivos,
        dados: buildDadosDinamicos(),
        sla_previsto: slaPrevisto || null
      }
      let res
      try {
        res = await fetch('/api/solicitacoes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        })
      } catch (netErr) {
        toast.error('Falha de rede na criação')
        return
      }
      let data = {}
      try { data = await res.json() } catch { /* pode vir vazio */ }
      if (!res.ok) {
        toast.error(data.message || `Erro (${res.status}) ao salvar`)
        return
      }
      toast.success('Solicitação criada')
      // reset
      onOpenChange(false)
      setDocFiles({})
      setExtraFiles([])
      setOperadora('')
      setObservacoes('')
      setAcessoEmpresa('')
      setTipo('inclusao')
      setSubtipo('funcionario')
      setSlaPrevisto('')
      // dispara evento para outra tela recarregar sem refresh manual
      try { window.dispatchEvent(new CustomEvent('solicitacao:created')) } catch {}
    } catch (e) {
      toast.error('Erro inesperado')
    } finally {
      setSaving(false)
    }
  }, [tipo, subtipo, razaoSocial, cnpj, apoliceBelz, acessoEmpresa, observacoes, token, onOpenChange, buildDadosDinamicos, validate, operadora, docFiles, extraFiles, slaPrevisto])

  // --- Documentos obrigatórios dinâmicos ---
  // requiredDocKeys e docLabel agora são funções normais acima

  // uploadSingle removido (substituído por directUpload)

  const removeDocFile = (docKey) => {
    setDocFiles(prev => {
      const clone = { ...prev }
      delete clone[docKey]
      return clone
    })
  }

  const removeExtraFile = (path) => setExtraFiles(prev => prev.filter(f => f.path !== path))

  // Upload via Signed Upload URL (gerado no backend)
  async function directUpload(file, docKey) {
    const supa = assertSupabaseBrowser()
    if (!file) return
    if (!allowedMime.includes(file.type)) { toast.error('Tipo não permitido'); return }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) { toast.error('Arquivo muito grande'); return }
    setUploading(true)
    try {
      // 1) Solicita URL assinada
      const resp = await fetch('/api/solicitacoes/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filename: file.name, mime: file.type, size: file.size })
      })
      const signedData = await resp.json().catch(() => null)
      if (!resp.ok) { toast.error(signedData?.message || 'Falha gerar URL'); return }
  const { path, token: uploadToken, bucket } = signedData
      // 2) Envia arquivo usando uploadToSignedUrl
      const { error: upErr } = await supa.storage.from(bucket).uploadToSignedUrl(path, uploadToken, file, { upsert: false, contentType: file.type })
      if (upErr) { toast.error(`Falha upload: ${upErr.message}`); return }
      // 3) URL pública / fallback signed
      let publicUrl = null
      try { const { data } = supa.storage.from(bucket).getPublicUrl(path); publicUrl = data?.publicUrl || null } catch {}
      if (!publicUrl) {
        try { const { data } = await supa.storage.from(bucket).createSignedUrl(path, 3600); publicUrl = data?.signedUrl || null } catch {}
      }
      const meta = { path, nome: file.name, tipo: file.type, url: publicUrl, signed: !publicUrl, bucket }
      if (docKey) setDocFiles(prev => ({ ...prev, [docKey]: meta }))
      else setExtraFiles(prev => [...prev, meta])
      toast.success('Documento enviado')
    } catch (_) {
      toast.error('Erro upload')
    } finally { setUploading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" description="Formulário completo para criação e envio de uma nova solicitação com uploads de documentos.">
        <DialogHeader>
          <DialogTitle>Gerenciar Solicitação</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Razão Social *</Label>
              <Input value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} />
            </div>
            <div>
              <Label>CNPJ *</Label>
              <Input value={cnpj} onChange={e => setCnpj(maskCnpj(e.target.value))} />
            </div>
            <div>
              <Label>SLA Previsto</Label>
              <Input type="date" value={slaPrevisto} onChange={e => setSlaPrevisto(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                aria-pressed={apoliceBelz}
                onClick={() => setApoliceBelz(v => !v)}
                className={`h-5 w-5 rounded border flex items-center justify-center text-xs font-semibold transition ${apoliceBelz ? 'bg-primary text-primary-foreground border-primary' : 'bg-background'}`}
              >{apoliceBelz ? '✓' : ''}</button>
              <Label className="cursor-pointer" onClick={() => setApoliceBelz(v => !v)}>Apólice é da Belz?</Label>
            </div>
            <div>
              <Label>Acesso da empresa (URL / credencial)</Label>
              <Input value={acessoEmpresa} onChange={e => setAcessoEmpresa(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Operadora:</Label>
              <Select value={operadora} onValueChange={setOperadora}>
                <SelectTrigger className="mt-2 capitalize"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {OPERADORAS.map(op => (
                    <SelectItem key={op} value={op} className="capitalize">{op}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={tipo} onValueChange={setTipo}>
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="inclusao">Inclusão</TabsTrigger>
              <TabsTrigger value="exclusao">Exclusão</TabsTrigger>
              <TabsTrigger value="cancelamento">Cancelamento</TabsTrigger>
              <TabsTrigger value="outros">Outros</TabsTrigger>
            </TabsList>
            <TabsContent value="inclusao" className="mt-4 space-y-4">
              <div className="flex gap-3 flex-wrap">
                {['funcionario', 'socio', 'dependente'].map(s => (
                  <Button key={s} variant={subtipo === s ? 'default' : 'outline'} onClick={() => setSubtipo(s)} className="text-sm capitalize">
                    {s}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Uploads necessários variam pelo subtipo.</p>
            </TabsContent>
            <TabsContent value="exclusao" className="mt-4 text-sm space-y-2">
              <p>Necessário: Formulário RN 561. Se operadora = SulAmérica adicionar Carta de próprio punho.</p>
            </TabsContent>
            <TabsContent value="cancelamento" className="mt-4 text-sm space-y-2">
              <ul className="list-disc ml-4">
                <li>Amil: URL/credencial portal gestor (usar campo Acesso)</li>
                <li>Bradesco: Observação de refaturamento</li>
                <li>SulAmérica / Unimed Recife: Formulário de cancelamento</li>
              </ul>
            </TabsContent>
            <TabsContent value="outros" className="mt-4">
              <Label>Descrição</Label>
              <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Descreva a solicitação..." />
            </TabsContent>
          </Tabs>

          {/* Box de orientação dinâmica */}
          <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5" />
              <div className="space-y-1 w-full">
                <p className="font-medium text-primary">Orientações dos documentos necessários</p>
                <div className="grid gap-1">
                  {dynamicDocs.length === 0 && (
                    <span className="text-muted-foreground">Selecione tipo/subtipo/operadora(s) para ver documentos específicos.</span>
                  )}
                  {dynamicDocs.map(doc => (
                    <div key={doc.key} className="leading-snug">
                      <span className="font-semibold">{doc.label}:</span> {doc.desc}
                    </div>
                  ))}
                </div>
                <div className="pt-1 border-t mt-2">
                  <p className="text-muted-foreground">Campos gerais obrigatórios:</p>
                  <ul className="list-disc ml-4 mt-1 space-y-0.5">
                    {DOC_TIPS.gerais.map(g => (
                      <li key={g.key}><span className="font-semibold">{g.label}:</span> {g.desc}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-muted-foreground">Garanta que todos os arquivos estejam nítidos, completos e sem cortes para evitar retrabalho.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label className="block mb-1">Observações *</Label>
            <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Descreva detalhes obrigatórios da solicitação" />
          </div>

          <div className="space-y-4">
            <div>
              <Label className="font-semibold">Documentos obrigatórios</Label>
              <div className="mt-2 space-y-3">
                {requiredDocKeys().length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum documento obrigatório para esta combinação, mas pelo menos 1 arquivo é exigido.</p>
                )}
                {requiredDocKeys().map(docKey => {
                  const meta = docFiles[docKey]
                  const inputId = `file-doc-${docKey}`
                  return (
                    <div key={docKey} className="border rounded p-2 bg-muted/30">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-medium">{docLabel(docKey)}</div>
                        {!meta && (
                          <>
                            <Input id={inputId} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.csv,.xls,.xlsx" onChange={e => directUpload(e.target.files?.[0], docKey)} />
                            <Button type="button" size="sm" className="bg-[#021d79] hover:bg-[#021d79]/90 text-white h-7" onClick={() => document.getElementById(inputId).click()}>Enviar</Button>
                          </>
                        )}
                        {meta && (
                          <div className="flex items-center gap-2 text-xs">
                            <button type="button" className="underline text-primary" onClick={() => { setPreviewFile(meta); setPreviewOpen(true) }}>ver</button>
                            <button type="button" className="underline text-red-500" onClick={() => removeDocFile(docKey)}>remover</button>
                          </div>
                        )}
                      </div>
                      {!meta && (
                        <p className="mt-1 text-[11px] text-muted-foreground">Envie: PDF/JPG/PNG &lt;={MAX_FILE_SIZE_MB}MB. {DOC_TIPS.funcionario.concat(DOC_TIPS.socio, DOC_TIPS.dependente, DOC_TIPS.exclusao, DOC_TIPS.cancelamento).find(d => d.key === docKey)?.desc}</p>
                      )}
                      {meta && (
                        <p className="mt-1 text-[11px] text-muted-foreground break-all">{meta.nome}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div>
              <Label className="font-semibold">Documentos adicionais (opcional)</Label>
              <div className="flex items-center gap-3 mt-2">
                <Input id="file-extra-input" className="hidden" type="file" accept=".pdf,.jpg,.jpeg,.png,.csv,.xls,.xlsx" onChange={e => directUpload(e.target.files?.[0], null)} />
                <Button type="button" onClick={() => document.getElementById('file-extra-input').click()} className="bg-[#021d79] hover:bg-[#021d79]/90 text-white">Adicionar Documento</Button>
                <span className="text-xs text-muted-foreground">Anexe outros documentos de apoio.</span>
              </div>
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto text-xs">
                {extraFiles.map(a => (
                  <div key={a.path} className="flex items-center gap-2 border p-1 rounded">
                    <span className="flex-1 truncate" title={a.nome}>{a.nome}</span>
                    <button type="button" className="text-primary underline" onClick={() => { setPreviewFile(a); setPreviewOpen(true) }}>ver</button>
                    <button type="button" className="text-red-500 underline" onClick={() => removeExtraFile(a.path)}>remover</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || uploading}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving || uploading} className="bg-primary">
              {saving ? 'Salvando...' : 'Salvar / Enviar'}
            </Button>
          </div>
        </div>
      </DialogContent>
      {/* Dialog de Preview de Arquivo */}
      {previewFile && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto" description="Pré-visualização do arquivo enviado. Use para conferir nitidez e conteúdo antes de concluir.">
            <DialogHeader>
              <DialogTitle>Visualizar arquivo</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="text-sm font-medium break-all">{previewFile.nome}</div>
              <div className="border rounded-md p-2 bg-muted/30">
                {previewFile.tipo?.startsWith('image/') && (
                  <div className="flex justify-center">
                    <Image
                      src={previewFile.url}
                      alt={previewFile.nome}
                      width={800}
                      height={800}
                      className="h-auto w-auto max-h-[70vh] object-contain rounded"
                      style={{ maxWidth: '100%' }}
                    />
                  </div>
                )}
                {previewFile.tipo === 'application/pdf' && (
                  <iframe
                    src={previewFile.url}
                    title={previewFile.nome}
                    className="w-full h-[70vh] rounded"
                  />
                )}
                {!previewFile.tipo && (
                  <p className="text-xs text-muted-foreground">Tipo de arquivo não identificado.</p>
                )}
              </div>
              <div className="flex justify-between items-center gap-3 flex-wrap">
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline text-primary"
                >Abrir em nova aba</a>
                <a
                  href={previewFile.url}
                  download={previewFile.nome}
                  className="text-xs underline text-primary"
                >Baixar</a>
                <Button
                  type="button"
                  variant="outline"
                  className="ml-auto"
                  onClick={() => setPreviewOpen(false)}
                >Fechar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  )
}
