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
  const [loadingCnpj, setLoadingCnpj] = useState(false)

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

  // Função para buscar dados da empresa pelo CNPJ
  const fetchEmpresaData = useCallback(async (cnpjValue) => {
    const cnpjNumbers = cnpjValue.replace(/\D/g, '')
    if (cnpjNumbers.length !== 14) return

    setLoadingCnpj(true)
    try {
      const response = await fetch('/api/validate-cnpj', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ cnpj: cnpjNumbers })
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.valid && result.data?.razao_social) {
          setRazaoSocial(result.data.razao_social)
          toast.success('Dados da empresa carregados automaticamente!')
        } else if (!result.valid) {
          toast.error(result.error || 'CNPJ não encontrado')
        }
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Erro ao validar CNPJ')
      }
    } catch (error) {
      console.error('Erro ao buscar dados do CNPJ:', error)
      toast.error('Erro ao conectar com o serviço de validação')
    } finally {
      setLoadingCnpj(false)
    }
  }, [token])

  // Handler para mudança do CNPJ
  const handleCnpjChange = useCallback((e) => {
    const masked = maskCnpj(e.target.value)
    setCnpj(masked)
    
    // Se o CNPJ estiver completo (14 dígitos), busca os dados
    const cnpjNumbers = masked.replace(/\D/g, '')
    if (cnpjNumbers.length === 14 && validateCNPJ(masked)) {
      fetchEmpresaData(masked)
    }
  }, [fetchEmpresaData])

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
    if (loadingCnpj) return 'Aguarde a validação do CNPJ...'
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
  }, [loadingCnpj, razaoSocial, cnpj, tipo, subtipo, observacoes, docFiles, extraFiles, docLabel, requiredDocKeys])

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
      setRazaoSocial('')
      setCnpj('')
      setApoliceBelz(false)
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
  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-50" description="Formulário completo para criação e envio de uma nova solicitação com uploads de documentos.">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 -m-6 mb-4 rounded-t-lg">
          <DialogTitle className="text-xl font-semibold">Nova Solicitação</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 px-2">{/* Aumentei o gap e padding */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-lg shadow-sm border border-blue-100">
            <div>
              <Label className="text-gray-700 font-medium">🏢 Razão Social * {loadingCnpj && <span className="text-xs text-blue-600">(carregando...)</span>}</Label>
              <Input 
                value={razaoSocial} 
                readOnly
                placeholder="Será preenchida automaticamente ao validar o CNPJ"
                className={`bg-blue-50 border-blue-200 cursor-not-allowed ${loadingCnpj ? "opacity-50" : ""}`}
              />
            </div>
            <div>
              <Label className="text-gray-700 font-medium">📄 CNPJ * {loadingCnpj && <span className="text-xs text-blue-600">(validando...)</span>}</Label>
              <Input 
                value={cnpj} 
                onChange={handleCnpjChange}
                placeholder="Digite o CNPJ para buscar a empresa"
                className={`border-blue-200 focus:border-blue-400 focus:ring-blue-400 ${loadingCnpj ? "opacity-50 bg-blue-50" : "bg-white"}`}
                disabled={loadingCnpj}
              />
              {loadingCnpj && <div className="text-xs text-blue-600 mt-1 animate-pulse">🔍 Buscando dados da empresa...</div>}
            </div>
            <div>
              <Label className="text-gray-700 font-medium">⏰ SLA Previsto</Label>
              <Input 
                type="date" 
                value={slaPrevisto} 
                onChange={e => setSlaPrevisto(e.target.value)}
                className="border-green-200 focus:border-green-400 focus:ring-green-400"
              />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                aria-pressed={apoliceBelz}
                onClick={() => setApoliceBelz(v => !v)}
                className={`h-6 w-6 rounded-md border-2 flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                  apoliceBelz 
                    ? 'bg-green-500 text-white border-green-500 shadow-md transform scale-105' 
                    : 'bg-white border-gray-300 hover:border-green-400'
                }`}
              >{apoliceBelz ? '✓' : ''}</button>
              <Label className="cursor-pointer text-gray-700 font-medium">🏥 Apólice é da Belz?</Label>
            </div>
            <div>
              <Label className="text-gray-700 font-medium">🔐 Acesso da empresa (URL / credencial)</Label>
              <Input 
                value={acessoEmpresa} 
                onChange={e => setAcessoEmpresa(e.target.value)}
                className="border-amber-200 focus:border-amber-400 focus:ring-amber-400"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-gray-700 font-medium">🏥 Operadora:</Label>
              <Select value={operadora} onValueChange={setOperadora}>
                <SelectTrigger className="mt-2 capitalize border-purple-200 focus:border-purple-400 focus:ring-purple-400"><SelectValue placeholder="Selecione uma operadora" /></SelectTrigger>
                <SelectContent className="bg-white border-purple-200">
                  {OPERADORAS.map(op => (
                    <SelectItem key={op} value={op} className="capitalize hover:bg-purple-50">{op}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-indigo-100">
          <Tabs value={tipo} onValueChange={setTipo}>
            <TabsList className="grid grid-cols-4 bg-gradient-to-r from-indigo-100 to-purple-100 p-1 rounded-lg">
              <TabsTrigger value="inclusao" className="data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200">➕ Inclusão</TabsTrigger>
              <TabsTrigger value="exclusao" className="data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200">➖ Exclusão</TabsTrigger>
              <TabsTrigger value="cancelamento" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200">🚫 Cancelamento</TabsTrigger>
              <TabsTrigger value="outros" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200">📝 Outros</TabsTrigger>
            </TabsList>
            <TabsContent value="inclusao" className="mt-4 space-y-4 bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex gap-3 flex-wrap">
                {['funcionario', 'socio', 'dependente'].map(s => (
                  <Button 
                    key={s} 
                    variant={subtipo === s ? 'default' : 'outline'} 
                    onClick={() => setSubtipo(s)} 
                    className={`text-sm capitalize transition-all duration-200 ${
                      subtipo === s 
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-md' 
                        : 'border-green-300 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {s === 'funcionario' && '👤'} 
                    {s === 'socio' && '🤝'} 
                    {s === 'dependente' && '👨‍👩‍👧‍👦'} 
                    {' ' + s}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-green-700 bg-green-100 p-2 rounded border-l-4 border-green-400">📋 Uploads necessários variam pelo subtipo selecionado.</p>
            </TabsContent>
            <TabsContent value="exclusao" className="mt-4 text-sm space-y-2 bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-red-800 bg-red-100 p-3 rounded border-l-4 border-red-400">
                <strong>📋 Necessário:</strong> Formulário RN 561. Se operadora = SulAmérica adicionar Carta de próprio punho.
              </p>
            </TabsContent>
            <TabsContent value="cancelamento" className="mt-4 text-sm space-y-2 bg-orange-50 p-4 rounded-lg border border-orange-200">
              <ul className="list-none space-y-2 text-orange-800">
                <li className="bg-orange-100 p-2 rounded border-l-4 border-orange-400">🟡 <strong>Amil:</strong> URL/credencial portal gestor (usar campo Acesso)</li>
                <li className="bg-orange-100 p-2 rounded border-l-4 border-orange-400">🔴 <strong>Bradesco:</strong> Observação de refaturamento</li>
                <li className="bg-orange-100 p-2 rounded border-l-4 border-orange-400">🟢 <strong>SulAmérica / Unimed Recife:</strong> Formulário de cancelamento</li>
              </ul>
            </TabsContent>
            <TabsContent value="outros" className="mt-4 bg-purple-50 p-4 rounded-lg border border-purple-200">
              <Label className="text-purple-800 font-medium">📝 Descrição</Label>
              <Textarea 
                value={observacoes} 
                onChange={e => setObservacoes(e.target.value)} 
                placeholder="Descreva a solicitação..."
                className="border-purple-200 focus:border-purple-400 focus:ring-purple-400 bg-white"
              />
            </TabsContent>
          </Tabs>
          </div>

          {/* Box de orientação dinâmica */}
          <div className="rounded-lg border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 text-sm space-y-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="bg-blue-500 text-white p-2 rounded-full">
                <Info className="h-5 w-5" />
              </div>
              <div className="space-y-2 w-full">
                <p className="font-semibold text-blue-800 text-base">💡 Orientações dos documentos necessários</p>
                <div className="grid gap-2">
                  {dynamicDocs.length === 0 && (
                    <span className="text-blue-600 bg-blue-100 p-2 rounded border-l-4 border-blue-400">
                      🔍 Selecione tipo/subtipo/operadora(s) para ver documentos específicos.
                    </span>
                  )}
                  {dynamicDocs.map(doc => (
                    <div key={doc.key} className="leading-relaxed bg-white p-3 rounded border-l-4 border-blue-400 shadow-sm">
                      <span className="font-semibold text-blue-800">📎 {doc.label}:</span> 
                      <span className="text-gray-700 ml-1">{doc.desc}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t-2 border-blue-200 mt-3">
                  <p className="text-blue-800 font-medium mb-2">📋 Campos gerais obrigatórios:</p>
                  <ul className="space-y-1">
                    {DOC_TIPS.gerais.map(g => (
                      <li key={g.key} className="bg-gray-50 p-2 rounded border-l-4 border-gray-400">
                        <span className="font-semibold text-gray-800">🔸 {g.label}:</span> 
                        <span className="text-gray-600 ml-1">{g.desc}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-amber-700 bg-amber-100 p-2 rounded border-l-4 border-amber-400">
                    ⚠️ Garanta que todos os arquivos estejam nítidos, completos e sem cortes para evitar retrabalho.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <Label className="block mb-2 text-gray-800 font-medium text-base">💬 Observações *</Label>
            <Textarea 
              value={observacoes} 
              onChange={e => setObservacoes(e.target.value)} 
              placeholder="Descreva detalhes obrigatórios da solicitação"
              className="border-gray-300 focus:border-blue-400 focus:ring-blue-400 bg-gray-50 min-h-[100px]"
            />
          </div>

          <div className="space-y-6 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div>
              <Label className="font-semibold text-lg text-red-700 flex items-center gap-2">
                📋 Documentos obrigatórios
                <span className="text-xs font-normal bg-red-100 text-red-700 px-2 py-1 rounded">Requeridos</span>
              </Label>
              <div className="mt-3 space-y-3">
                {requiredDocKeys().length === 0 && (
                  <p className="text-sm text-amber-700 bg-amber-100 p-3 rounded border-l-4 border-amber-400">
                    ⚠️ Nenhum documento obrigatório para esta combinação, mas pelo menos 1 arquivo é exigido.
                  </p>
                )}
                {requiredDocKeys().map(docKey => {
                  const meta = docFiles[docKey]
                  const inputId = `file-doc-${docKey}`
                  return (
                    <div key={docKey} className="border-2 border-red-200 rounded-lg p-3 bg-red-50 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-red-800 flex items-center gap-2">
                          📎 {docLabel(docKey)}
                          {meta && <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">✓ Enviado</span>}
                        </div>
                        {!meta && (
                          <>
                            <Input id={inputId} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.csv,.xls,.xlsx" onChange={e => directUpload(e.target.files?.[0], docKey)} />
                            <Button 
                              type="button" 
                              size="sm" 
                              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white h-8 px-4 shadow-md transition-all duration-200 transform hover:scale-105" 
                              onClick={() => document.getElementById(inputId).click()}
                            >
                              📤 Enviar
                            </Button>
                          </>
                        )}
                        {meta && (
                          <div className="flex items-center gap-2 text-sm">
                            <button type="button" className="underline text-blue-600 hover:text-blue-800 font-medium" onClick={() => { setPreviewFile(meta); setPreviewOpen(true) }}>👁️ ver</button>
                            <button type="button" className="underline text-red-600 hover:text-red-800 font-medium" onClick={() => removeDocFile(docKey)}>🗑️ remover</button>
                          </div>
                        )}
                      </div>
                      {!meta && (
                        <p className="mt-2 text-xs text-red-700 bg-red-100 p-2 rounded border border-red-200">
                          📋 Envie: PDF/JPG/PNG ≤{MAX_FILE_SIZE_MB}MB. {DOC_TIPS.funcionario.concat(DOC_TIPS.socio, DOC_TIPS.dependente, DOC_TIPS.exclusao, DOC_TIPS.cancelamento).find(d => d.key === docKey)?.desc}
                        </p>
                      )}
                      {meta && (
                        <p className="mt-2 text-xs text-green-700 bg-green-100 p-2 rounded border border-green-200 break-all">
                          ✅ {meta.nome}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div>
              <Label className="font-semibold text-lg text-blue-700 flex items-center gap-2">
                📎 Documentos adicionais 
                <span className="text-xs font-normal bg-blue-100 text-blue-700 px-2 py-1 rounded">Opcional</span>
              </Label>
              <div className="flex items-center gap-3 mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Input id="file-extra-input" className="hidden" type="file" accept=".pdf,.jpg,.jpeg,.png,.csv,.xls,.xlsx" onChange={e => directUpload(e.target.files?.[0], null)} />
                <Button 
                  type="button" 
                  onClick={() => document.getElementById('file-extra-input').click()} 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md transition-all duration-200 transform hover:scale-105"
                >
                  ➕ Adicionar Documento
                </Button>
                <span className="text-sm text-blue-700">📝 Anexe outros documentos de apoio.</span>
              </div>
              <div className="mt-3 space-y-2 max-h-32 overflow-y-auto">
                {extraFiles.map(a => (
                  <div key={a.path} className="flex items-center gap-3 border border-blue-200 p-2 rounded-lg bg-blue-50 hover:shadow-sm transition-all duration-200">
                    <span className="flex-1 truncate text-sm text-blue-800" title={a.nome}>📄 {a.nome}</span>
                    <button type="button" className="text-blue-600 hover:text-blue-800 underline text-sm font-medium" onClick={() => { setPreviewFile(a); setPreviewOpen(true) }}>👁️ ver</button>
                    <button type="button" className="text-red-600 hover:text-red-800 underline text-sm font-medium" onClick={() => removeExtraFile(a.path)}>🗑️ remover</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 p-4 -m-2 rounded-b-lg">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={saving || uploading}
              className="border-gray-300 text-gray-700 hover:bg-gray-100 px-6 py-2 transition-all duration-200"
            >
              ❌ Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={saving || uploading} 
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-2 shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              {saving ? '⏳ Salvando...' : '✅ Salvar / Enviar'}
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
