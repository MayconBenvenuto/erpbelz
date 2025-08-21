'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { PlusCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function UsersSection({ currentUser, users, proposals, userGoals, onCreateUser, onUpdateUserGoal, isLoading }) {
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [userForm, setUserForm] = useState({ nome: '', email: '', senha: '', tipo_usuario: 'analista' })
  const [metaDialogUser, setMetaDialogUser] = useState(null) // usuário selecionado para edição de meta
  const [metaForm, setMetaForm] = useState({ valor_meta_input: '' })

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
  await onCreateUser({ ...userForm, afterSuccess: () => { setUserForm({ nome: '', email: '', senha: '', tipo_usuario: 'analista' }); setIsUserDialogOpen(false) } })
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
              <DialogDescription>Adicione um novo usuário (analista ou consultor) ao sistema.</DialogDescription>
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
                    <SelectItem value="analista">Analista</SelectItem>
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
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>{users.length} usuário(s) cadastrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhum usuário cadastrado ainda. Clique em &quot;Novo Usuário&quot; para adicionar o primeiro.
            </div>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>Alcançado</TableHead>
                  <TableHead>Progresso</TableHead>
                  {currentUser?.tipo_usuario === 'gestor' && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const userGoal = userGoals.find(g => g.usuario_id === user.id)
                  const userImplantedProposals = proposals.filter(p => p.criado_por === user.id && p.status === 'implantado')
                  const userImplantedValue = userImplantedProposals.reduce((sum, p) => sum + parseFloat(p.valor || 0), 0)
                  const targetValue = userGoal?.valor_meta || 100000
                  const achievedValue = userGoal?.valor_alcancado || userImplantedValue
                  const progress = targetValue > 0 ? (achievedValue / targetValue) * 100 : 0

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.nome}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.tipo_usuario === 'gestor' ? 'default' : 'secondary'}>{user.tipo_usuario}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          {formatCurrency(targetValue)}
                          {!userGoal && (<span className="text-xs text-muted-foreground block">(meta padrão)</span>)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {formatCurrency(achievedValue)}
                          <div className="text-xs text-muted-foreground">{userImplantedProposals.length} propostas implantadas</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress value={Math.min(Math.max(progress, 0), 100)} className="h-3 w-24 bg-secondary" />
                          <span className={`text-sm font-medium ${
                            progress >= 100 ? 'text-green-600' :
                            progress >= 75 ? 'text-blue-600' :
                            progress >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Faltam {formatCurrency(Math.max(0, targetValue - achievedValue))}</div>
                      </TableCell>
                      {currentUser?.tipo_usuario === 'gestor' && (
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => openMetaDialog(user, targetValue)}>Editar meta</Button>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            {/* Popup para editar meta do analista */}
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
