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
import { PlusCircle } from 'lucide-react'
import { formatCurrency, formatCNPJ, getStatusBadgeVariant } from '@/lib/utils'

export default function ProposalsSection({
  currentUser,
  proposals,
  operadoras,
  statusOptions,
  onCreateProposal,
  onUpdateProposalStatus,
  isLoading,
  users = [],
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [cnpjValidationResult, setCnpjValidationResult] = useState(null)
  const [proposalForm, setProposalForm] = useState({
    cnpj: '',
    consultor: '',
    operadora: '',
    quantidade_vidas: '',
    valor: '',
    previsao_implantacao: '',
    status: 'em análise'
  })

  const handleSubmit = async (e) => {
    // Validação de CNPJ antes de criar proposta (mantém comportamento)
    e.preventDefault()
    if (!currentUser) return

    const cnpjResponse = await fetch('/api/validate-cnpj', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnpj: proposalForm.cnpj })
    })
    const cnpjResult = await cnpjResponse.json()

    if (!cnpjResult.valid) {
      // Retorna erro para o handler pai exibir toast
      throw new Error(cnpjResult.error || 'CNPJ inválido')
    }
    if (currentUser.tipo_usuario === 'gestor') setCnpjValidationResult(cnpjResult.data)

    await onCreateProposal({
      ...proposalForm,
      criado_por: currentUser.id,
      cnpjValidationData: cnpjResult.data,
      afterSuccess: () => {
        setProposalForm({ cnpj: '', consultor: '', operadora: '', quantidade_vidas: '', valor: '', previsao_implantacao: '', status: 'em análise' })
        setCnpjValidationResult(null)
        setIsDialogOpen(false)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            {currentUser.tipo_usuario === 'gestor' ? 'Monitorar Propostas' : 'Gerenciar Propostas'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {currentUser.tipo_usuario === 'gestor' ? 'Visualize e monitore todas as propostas do sistema' : 'Crie, edite e gerencie suas propostas'}
          </p>
        </div>
        {currentUser.tipo_usuario !== 'gestor' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="w-4 h-4 mr-2" />
                Nova Proposta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Nova Proposta</DialogTitle>
                <DialogDescription>Preencha os dados da nova proposta. O CNPJ será validado automaticamente.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input id="cnpj" placeholder="00.000.000/0000-00" value={proposalForm.cnpj} onChange={(e) => setProposalForm(prev => ({ ...prev, cnpj: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consultor">Consultor</Label>
                    <Input id="consultor" placeholder="Nome do consultor" value={proposalForm.consultor} onChange={(e) => setProposalForm(prev => ({ ...prev, consultor: e.target.value }))} required />
                  </div>
                </div>

                {currentUser.tipo_usuario === 'gestor' && cnpjValidationResult && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        Dados da Empresa
                        <Badge variant="outline" className="text-xs">{cnpjValidationResult.source || 'API Externa'}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      {cnpjValidationResult.razao_social && (<div><strong>Razão Social:</strong> {cnpjValidationResult.razao_social}</div>)}
                      {cnpjValidationResult.nome_fantasia && (<div><strong>Nome Fantasia:</strong> {cnpjValidationResult.nome_fantasia}</div>)}
                      {cnpjValidationResult.descricao_situacao_cadastral && (<div><strong>Situação:</strong> {cnpjValidationResult.descricao_situacao_cadastral}</div>)}
                      {cnpjValidationResult.cnae_fiscal_descricao && (<div><strong>Atividade Principal:</strong> {cnpjValidationResult.cnae_fiscal_descricao}</div>)}
                      {(cnpjValidationResult.logradouro || cnpjValidationResult.municipio) && (
                        <div>
                          <strong>Endereço:</strong> {[cnpjValidationResult.logradouro, cnpjValidationResult.numero, cnpjValidationResult.bairro, cnpjValidationResult.municipio, cnpjValidationResult.uf].filter(Boolean).join(', ')}
                          {cnpjValidationResult.cep && ` - CEP: ${cnpjValidationResult.cep}`}
                        </div>
                      )}
                      {cnpjValidationResult.telefone && (<div><strong>Telefone:</strong> {cnpjValidationResult.telefone}</div>)}
                      {cnpjValidationResult.email && (<div><strong>Email:</strong> {cnpjValidationResult.email}</div>)}
                      {cnpjValidationResult.capital_social && parseFloat(cnpjValidationResult.capital_social) > 0 && (
                        <div><strong>Capital Social:</strong> {formatCurrency(parseFloat(cnpjValidationResult.capital_social))}</div>
                      )}
                      {cnpjValidationResult.note && (<div className="text-amber-600 mt-2 p-2 bg-amber-50 rounded"><strong>Aviso:</strong> {cnpjValidationResult.note}</div>)}
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="operadora">Operadora</Label>
                    <Select value={proposalForm.operadora} onValueChange={(value) => setProposalForm(prev => ({ ...prev, operadora: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a operadora" />
                      </SelectTrigger>
                      <SelectContent>
                        {operadoras.map(op => (<SelectItem key={op} value={op}>{op}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantidade_vidas">Quantidade de Vidas</Label>
                    <Input id="quantidade_vidas" type="number" placeholder="0" value={proposalForm.quantidade_vidas} onChange={(e) => setProposalForm(prev => ({ ...prev, quantidade_vidas: e.target.value }))} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor do Plano</Label>
                    <Input id="valor" type="number" step="0.01" placeholder="0.00" value={proposalForm.valor} onChange={(e) => setProposalForm(prev => ({ ...prev, valor: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="previsao_implantacao">Previsão de Implantação</Label>
                    <Input id="previsao_implantacao" type="date" value={proposalForm.previsao_implantacao} onChange={(e) => setProposalForm(prev => ({ ...prev, previsao_implantacao: e.target.value }))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={proposalForm.status} onValueChange={(value) => setProposalForm(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(status => (<SelectItem key={status} value={status}>{status}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isLoading}>{isLoading ? 'Criando...' : 'Criar Proposta'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Propostas</CardTitle>
          <CardDescription>{proposals.length} proposta(s) cadastrada(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CNPJ</TableHead>
                <TableHead>Consultor</TableHead>
                {currentUser.tipo_usuario === 'gestor' && <TableHead>Analista</TableHead>}
                <TableHead>Operadora</TableHead>
                <TableHead>Vidas</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                {currentUser.tipo_usuario === 'gestor' && <TableHead>Alterar Status</TableHead>}
                {/* {currentUser.tipo_usuario === 'gestor' && <TableHead>Ações</TableHead>} */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((proposal) => (
                <TableRow key={proposal.id}>
                  <TableCell className="font-mono text-sm">{formatCNPJ(proposal.cnpj)}</TableCell>
                  <TableCell>{proposal.consultor}</TableCell>
                  {currentUser.tipo_usuario === 'gestor' && (
                    <TableCell>{(users.find(u => u.id === proposal.criado_por)?.nome) || '-'}</TableCell>
                  )}
                  <TableCell className="capitalize">{proposal.operadora}</TableCell>
                  <TableCell>{proposal.quantidade_vidas}</TableCell>
                  <TableCell>{formatCurrency(proposal.valor)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(proposal.status)}>{proposal.status}</Badge>
                  </TableCell>
                  {currentUser.tipo_usuario === 'gestor' && (
                    <TableCell>
                      <Select value={proposal.status} onValueChange={(newStatus) => onUpdateProposalStatus(proposal.id, newStatus, proposal)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(status => (<SelectItem key={status} value={status}>{status}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}
                  {/* {currentUser.tipo_usuario === 'gestor' && (
                    <TableCell>
                      <Button variant="destructive" size="sm" onClick={() => onDeleteProposal(proposal.id)}>Excluir</Button>
                    </TableCell>
                  )} */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
