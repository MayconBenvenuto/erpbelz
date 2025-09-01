'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PlusCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function UsersSection({ currentUser, users, proposals, userGoals, onCreateUser, onUpdateUserGoal, isLoading }) {
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [userForm, setUserForm] = useState({ nome: '', email: '', senha: '', tipo_usuario: 'analista_implantacao' })
  const [metaDialogUser, setMetaDialogUser] = useState(null) // usuário selecionado para edição de meta
  const [metaForm, setMetaForm] = useState({ valor_meta_input: '' })
  // Filtros & ordenação
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('todos')
  const [sortBy, setSortBy] = useState('nome') // nome | progresso | propostas
  const [sortAsc, setSortAsc] = useState(true)

  // Máscara de moeda BRL para input
  const formatMoneyBRInput = (raw) => {
    const digits = String(raw || '').replace(/\D/g, '')
    if (!digits) return ''
    const number = parseInt(digits, 10) / 100
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number)
  }
  const parseMoneyToNumber = (raw) => {
    const digits = String(raw || '').replace(/\D/g, '')
    if (!digits) return 0
    return parseInt(digits, 10) / 100
  }

  const openMetaDialog = (user, targetValue) => {
    setMetaDialogUser(user)
    setMetaForm({
      valor_meta_input: new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(targetValue || 0))
    })
  }
  const closeMetaDialog = () => { setMetaDialogUser(null); setMetaForm({ valor_meta_input: '' }) }

  const handleSubmit = async (e) => {
    e.preventDefault()
  await onCreateUser({ ...userForm, afterSuccess: () => { setUserForm({ nome: '', email: '', senha: '', tipo_usuario: 'analista_implantacao' }); setIsUserDialogOpen(false) } })
  }

  // Normalização
  const normalize = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()

  const filteredUsers = useMemo(() => {
    let list = users.slice()
    if (search.trim()) {
      const q = normalize(search)
      list = list.filter(u => [u.nome, u.email, u.tipo_usuario].some(f => normalize(f).includes(q)))
    }
    if (roleFilter !== 'todos') list = list.filter(u => u.tipo_usuario === roleFilter)
    // Enriquecer com métricas para ordenação
    const enriched = list.map(u => {
      const goal = userGoals.find(g => g.usuario_id === u.id)
      const target = Number(goal?.valor_meta ?? 100000)
      const implanted = proposals.filter(p => p.criado_por === u.id && p.status === 'implantado')
      const achieved = Number(goal?.valor_alcancado ?? implanted.reduce((s,p)=> s + Number(p.valor||0),0))
      const progress = target > 0 ? achieved/target : 0
      return { ...u, _progress: progress, _implantadas: implanted.length, _metaTarget: target, _metaAchieved: achieved }
    })
    enriched.sort((a,b)=>{
      switch (sortBy) {
        case 'progresso': return sortAsc ? a._progress - b._progress : b._progress - a._progress
        case 'propostas': return sortAsc ? a._implantadas - b._implantadas : b._implantadas - a._implantadas
        case 'nome':
        default: return sortAsc ? a.nome.localeCompare(b.nome) : b.nome.localeCompare(a.nome)
      }
    })
    return enriched
  }, [users, search, roleFilter, sortBy, sortAsc, userGoals, proposals])

  const activeFilters = useMemo(() => {
    const arr = []
    if (search.trim()) arr.push({ key: 'search', label: `busca: "${search.trim()}"` })
    if (roleFilter !== 'todos') arr.push({ key: 'role', label: `tipo: ${roleFilter}` })
    return arr
  }, [search, roleFilter])

  const clearFilter = (key) => {
    if (key === 'search') setSearch('')
    if (key === 'role') setRoleFilter('todos')
  }

  // Persistência leve dos filtros por usuário
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('crm:users:filters')||'{}')
      if (saved.search) setSearch(saved.search)
      if (saved.roleFilter) setRoleFilter(saved.roleFilter)
      if (saved.sortBy) setSortBy(saved.sortBy)
      if (typeof saved.sortAsc === 'boolean') setSortAsc(saved.sortAsc)
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('crm:users:filters', JSON.stringify({ search, roleFilter, sortBy, sortAsc })) } catch {}
  }, [search, roleFilter, sortBy, sortAsc])

  const toggleSort = (col) => {
    if (sortBy === col) setSortAsc(a => !a)
    else { setSortBy(col); setSortAsc(col === 'nome') }
  }

  const copyEmail = async (email) => {
    try { await navigator.clipboard.writeText(email); } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciar Usuários</h2>
        <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="w-4 h-4 mr-2" />Novo Usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>Adicione um novo usuário (gerente, analista de implantação, analista de movimentação ou consultor).</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-nome">Nome Completo</Label>
                <Input id="user-nome" placeholder="Nome do usuário" value={userForm.nome} onChange={(e) => setUserForm(prev => ({ ...prev, nome: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">Email</Label>
                <Input id="user-email" type="email" placeholder="email@empresa.com" value={userForm.email} onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-senha">Senha</Label>
                <Input id="user-senha" type="password" placeholder="Senha do usuário" value={userForm.senha} onChange={(e) => setUserForm(prev => ({ ...prev, senha: e.target.value }))} required />
              </div>
              <div className="space-y-2">
    <Label htmlFor="user-tipo">Tipo de Usuário</Label>
  <Select value={userForm.tipo_usuario} onValueChange={(value) => setUserForm(prev => ({ ...prev, tipo_usuario: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
  <SelectItem value="gerente">Gerente</SelectItem>
  <SelectItem value="analista_implantacao">Analista de Implantação</SelectItem>
  <SelectItem value="analista_movimentacao">Analista de Movimentação</SelectItem>
  <SelectItem value="consultor">Consultor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsUserDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isLoading}>{isLoading ? 'Criando...' : 'Criar Usuário'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle>Lista de Usuários</CardTitle>
              <CardDescription>{filteredUsers.length} de {users.length} usuário(s)</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Input placeholder="Buscar usuário" value={search} onChange={(e)=>setSearch(e.target.value)} className="pr-8 h-8 w-44" />
                {search && <button aria-label="Limpar busca" onClick={()=>setSearch('')} className="absolute right-2 top-1.5 text-xs text-muted-foreground hover:text-foreground">×</button>}
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="analista_implantacao">Analista Implantação</SelectItem>
                  <SelectItem value="analista_movimentacao">Analista Movimentação</SelectItem>
                  <SelectItem value="consultor">Consultor</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 text-xs border rounded-md px-2 py-1 bg-muted/40">
                <span>Ordenar:</span>
                <button onClick={()=>toggleSort('nome')} className={`px-1 rounded hover:bg-muted ${sortBy==='nome'?'font-semibold underline':''}`}>Nome</button>
                <button onClick={()=>toggleSort('progresso')} className={`px-1 rounded hover:bg-muted ${sortBy==='progresso'?'font-semibold underline':''}`}>Progresso</button>
                <button onClick={()=>toggleSort('propostas')} className={`px-1 rounded hover:bg-muted ${sortBy==='propostas'?'font-semibold underline':''}`}>Implantadas</button>
                <button onClick={()=>setSortAsc(a=>!a)} className="px-1 rounded hover:bg-muted" title="Alternar ordem">{sortAsc?'↑':'↓'}</button>
              </div>
              {(search || roleFilter!=='todos') && (
                <button type="button" onClick={()=>{setSearch('');setRoleFilter('todos')}} className="text-xs px-2 py-1 border rounded hover:bg-muted">Limpar</button>
              )}
            </div>
          </div>
          {activeFilters.length>0 && (
            <div className="flex flex-wrap gap-2 text-xs">
              {activeFilters.map(f => (
                <Badge key={f.key} variant="secondary" className="gap-1">
                  <span>{f.label}</span>
                  <button type="button" onClick={()=>clearFilter(f.key)} className="opacity-70 hover:opacity-100">×</button>
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {users.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhum usuário cadastrado ainda.</div>
          )}
          {users.length > 0 && filteredUsers.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhum resultado com os filtros atuais.</div>
          )}
          {filteredUsers.length > 0 && (
            <div className="rounded-md border overflow-hidden">
              <div className="max-h-[560px] overflow-auto">
                <Table className="text-sm">
                  <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="min-w-[160px]">Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Implantadas</TableHead>
                      <TableHead>Meta</TableHead>
                      <TableHead>Progresso</TableHead>
                      {currentUser?.tipo_usuario === 'gestor' && <TableHead>Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(user => {
                      const goal = userGoals.find(g => g.usuario_id === user.id)
                      const targetValue = goal?.valor_meta || 100000
                      const achievedValue = goal?.valor_alcancado || user._metaAchieved
                      const progressPerc = targetValue>0 ? (achievedValue/targetValue)*100 : 0
                      return (
                        <TableRow key={user.id} className="hover:bg-muted/40">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span className="truncate" title={user.nome}>{user.nome}</span>
                            </div>
                            <div className="md:hidden text-[11px] text-muted-foreground">{user.email}</div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <button onClick={()=>copyEmail(user.email)} title="Copiar email" className="underline-offset-2 hover:underline text-xs">{user.email}</button>
                          </TableCell>
                          <TableCell>
                            <Badge variant={['gestor','gerente'].includes(user.tipo_usuario) ? 'default' : 'secondary'} className="capitalize text-[11px]">{user.tipo_usuario.replace(/_/g,' ')}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">{user._implantadas}</TableCell>
                          <TableCell className="text-xs">
                            <span className="font-medium">{formatCurrency(targetValue)}</span>
                            {!goal && <span className="block text-[10px] text-muted-foreground">padrão</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="relative w-9 h-9">
                                <div className="absolute inset-0 rounded-full bg-muted" />
                                <div
                                  className="absolute inset-0 rounded-full"
                                  style={{
                                    background: `conic-gradient(var(--primary) ${Math.min(100,progressPerc)}%, var(--muted) ${Math.min(100,progressPerc)}%)`
                                  }}
                                />
                                <div className="absolute inset-1 rounded-full bg-background flex items-center justify-center text-[10px] font-semibold">
                                  {Math.round(progressPerc)}%
                                </div>
                              </div>
                              <div className="text-[10px] text-muted-foreground leading-tight">
                                <div>{formatCurrency(achievedValue)}</div>
                                <div>Falta {formatCurrency(Math.max(0, targetValue - achievedValue))}</div>
                              </div>
                            </div>
                          </TableCell>
                          {currentUser?.tipo_usuario === 'gestor' && (
                            <TableCell>
                              <Button size="sm" variant="outline" onClick={() => openMetaDialog(user, targetValue)}>Meta</Button>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog edição de meta */}
      <Dialog open={!!metaDialogUser} onOpenChange={(v) => { if (!v) closeMetaDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar meta do analista</DialogTitle>
            <DialogDescription>Atualize a meta do usuário selecionado.</DialogDescription>
          </DialogHeader>
          {metaDialogUser && (
            <div className="space-y-3">
              <div className="text-sm">
                <div><strong>Nome:</strong> {metaDialogUser.nome}</div>
                <div><strong>Email:</strong> {metaDialogUser.email}</div>
                <div><strong>Tipo:</strong> {metaDialogUser.tipo_usuario}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta-valor">Nova meta (R$)</Label>
                <Input
                  id="meta-valor"
                  type="text"
                  inputMode="decimal"
                  value={metaForm.valor_meta_input}
                  onChange={(e) => setMetaForm(prev => ({ ...prev, valor_meta_input: formatMoneyBRInput(e.target.value) }))}
                  placeholder="0,00"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeMetaDialog}>Cancelar</Button>
                <Button onClick={async () => {
                  const val = parseMoneyToNumber(metaForm.valor_meta_input)
                  const res = await onUpdateUserGoal?.(metaDialogUser.id, val)
                  if (res?.ok) closeMetaDialog()
                }}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
