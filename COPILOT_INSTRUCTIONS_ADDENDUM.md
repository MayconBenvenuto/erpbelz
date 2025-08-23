# 📌 Addendum de Instruções – CRM Belz (21/08/2025)

Este addendum complementa `COPILOT_INSTRUCTIONS.md` sem alterar o conteúdo original. Use estas diretrizes adicionais ao implementar novas features ou manter o sistema.

## 🆕 Resumo das Novidades

- Removida a funcionalidade de arquivamento de propostas (coluna `arquivado` não deve ser usada).
- Edição de propostas para gestor agora ocorre via Dialog popup (não há mais edição inline em linha exceto o campo de status que continua Select inline para todos que podem alterar).
- Implementado Painel de Desempenho (gestor) em Relatórios: rankings, funil, KPIs e vidas por operadora.
- Nova rota de API: `GET /api/reports/performance` para métricas consolidadas.
- Removidos todos os usos de `arquivado` em rotas e UI; se reintroduzir no futuro, criar nova migration explícita.

## 🚫 Arquivamento de Propostas (Removido)

- Não existe mais botão “Arquivar” / “Restaurar”.
- Não adicionar filtros ou campos relacionados a arquivamento.
- Qualquer referência futura deve verificar antes se a coluna foi reintroduzida via migration.

### Se precisar reintroduzir futuramente

```sql
-- Exemplo (apenas se solicitado futuramente)
ALTER TABLE public.propostas ADD COLUMN arquivado boolean NOT NULL DEFAULT false;
CREATE INDEX idx_propostas_arquivado ON public.propostas(arquivado);
```

## 🖊️ Edição de Propostas (Atualizado)

| Papel         | Pode criar | Pode editar campos gerais | Pode alterar status | Interface de edição |
|---------------|-----------|----------------------------|---------------------|---------------------|
| Analista      | ✅ (suas)  | ❌                          | ✅ (suas)           | Select inline (status) |
| Gestor        | ❌         | ✅ (todos os campos permitidos) | ✅ (todas)         | Dialog popup + Select inline p/ status |
| Consultor     | ❌         | ❌                          | ❌                 | Sem acesso à tela |

### Campos editáveis pelo gestor no Dialog

`operadora`, `quantidade_vidas`, `valor`, `previsao_implantacao`, `consultor`, `consultor_email`, `criado_por`.

### Não editar via inline row

Proibições: não reintroduzir inputs inline para os campos acima. Sempre usar o Dialog existente.

## 📊 Painel de Desempenho (Gestor)

Local: seção Relatórios. Exibe:

- KPIs gerais: total de propostas, implantadas, ticket médio (das implantadas), vidas totais.
- Ranking por analista (top 10 por valor total).
- Ranking por consultor (top 10 por valor total).
- Funil por status (contagem + barras).
- Vidas por operadora (barras).
- Ticket médio (gráfico Pie simplificado).

### Endpoint

`GET /api/reports/performance?start=YYYY-MM-DD&end=YYYY-MM-DD`

Auth: gestor-only (validação via `requireAuth` + tipo `gestor`).

Parâmetros:

- `start` (opcional) – início do período (date ISO). Default: primeiro dia do mês corrente.
- `end` (opcional) – fim do período (date ISO). Default: último dia do mês corrente.

Resposta (exemplo simplificado):

```json
{
  "periodo": { "start": "2025-08-01", "end": "2025-08-31" },
  "kpis": {
    "total_propostas": 120,
    "implantadas": 34,
    "ticket_medio_geral": 18500.75,
    "vidas_totais": 2120
  },
  "rankingAnalistas": [ { "usuario_id": "...", "nome": "João", "total_propostas": 40, "implantadas": 12, "taxa_implantacao": 30, "valor_total": 320000, "ticket_medio": 21000, "vidas_total": 540 } ],
  "rankingConsultores": [ { "consultor": "Carlos", "total_propostas": 25, "implantadas": 8, "taxa_implantacao": 32, "valor_total": 190000, "ticket_medio": 23750, "vidas_total": 350 } ],
  "funilStatus": [ { "status": "em análise", "total": 50, "valor_total": 500000 } ],
  "vidasPorOperadora": [ { "operadora": "unimed recife", "vidas_total": 620, "propostas": 18 } ]
}
```

### Exemplo de consumo (frontend)

```javascript
async function loadPerformance(start, end, token) {
  const qs = new URLSearchParams({ start, end }).toString()
  const res = await fetch(`/api/reports/performance?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
  if (!res.ok) throw new Error('Erro ao carregar métricas')
  return res.json()
}
```

### Regras de agregação

- Ignora propostas sem `status` ou sem `criado_em`.
- Ticket médio calculado apenas em propostas `implantado`.
- Rankings ordenados por `valor_total` desc (limit 10).

## 🆕 Movimentações (Solicitações) – 23/08/2025

Implementado módulo de Movimentações (solicitações de movimentação de apólice) com:

- Tabela `solicitacoes` (sequencial `codigo` formato `MVM0000`).
- Gatilho de geração automática via sequence dedicada.
- Campos principais: `id`, `codigo`, `tipo`, `subtipo`, `razao_social`, `cnpj`, `observacoes`, `sla_previsto`, `status`, `historico[]`, `arquivos[]`, `atendido_por`, `atendido_por_nome`, `criado_por`.
- Status workflow (array `SOLICITACAO_STATUS`): `aberta`, `em validação`, `em execução`, `concluída`, `cancelada`.
- Claim: analista assume solicitação via `PATCH /api/solicitacoes/:id { claim: true }` se ainda sem `atendido_por`.
- SLA editável (gestor sempre; analista somente se atribuído).
- Histórico mantido como array de objetos `{ status, em }` (UTC ISO) limitado em exibição (slice).
- Upload de arquivos via `POST /api/solicitacoes/upload` (MIME permitido: pdf, jpeg, png, xlsx, xls, csv; limite 7MB cada).
- GET detalhe `/api/solicitacoes/:id` retorna URLs assinadas para arquivos sem `url`.

### UI

- Consultor: tabela simples somente leitura + botão “Nova Solicitação”.
- Analista/Gestor: board (kanban simplificado) agrupado por status + timeline (somente gestor) com até 25 itens recentes.
- Dialog de criação dispara evento global `window.dispatchEvent(new CustomEvent('solicitacao:created'))` ao concluir com sucesso.
- `MovimentacaoSection` escuta esse evento e chama `loadSolicitacoes()` para atualizar sem refresh manual.
- Spinner de recarregamento (`Loader2`) exibido ao lado da descrição do título enquanto `reloading=true`.

### Padrões / Regras

1. Nunca chamar funções de reset inexistentes (ex: erro anterior com `setArquivos`).
2. Após criação bem-sucedida: fechar dialog, resetar state, emitir evento global.
3. Diferenciar claramente erros de rede (`catch` fetch) de erros HTTP (`!res.ok`).
4. Não permitir analista editar SLA ou status de solicitações que não assumiu.
5. Email futuro (se implementado) deve referenciar apenas `codigo` MVM (não UUID).
6. Toda listagem ordenada asc por `codigo`.

### Exemplo Listener (já implementado)

```javascript
useEffect(() => {
  const handler = () => loadSolicitacoes()
  window.addEventListener('solicitacao:created', handler)
  return () => window.removeEventListener('solicitacao:created', handler)
}, [loadSolicitacoes])
```

### Erro Corrigido

Removida referência inexistente `setArquivos([])` que causava `ReferenceError` e exibia toast enganoso “Erro de conexão” após criação. Agora o fluxo mostra toast de sucesso e recarrega lista automaticamente.

### Boas Práticas Específicas

- Ao adicionar novos campos em `solicitacoes`, atualizar o endpoint de detalhe para incluir e, se for sensível, filtrar conforme role.
- Limitar sempre o histórico retornado ou paginar caso cresça demasiadamente.
- Usar `CustomEvent` para outras interações reativas (ex: atualização de SLA em massa) ao invés de polling adicional.

## 🔄 Metas (Goals)

- Continuação: `GET /api/goals` retorna metas com fallback ao somatório de propostas implantadas.
- Atualização de meta individual: `PATCH /api/goals` (gestor-only) com `{ usuario_id, valor_meta }`.
- Recalcular (mass update): `POST /api/goals` (gestor-only) – recalcula `valor_alcancado` baseado nas propostas implantadas.

## ✉️ Notificações de Status (Inalterado)

- E-mails continuam referenciando apenas `codigo` (PRP....).
- Variáveis de ambiente SMTP ainda necessárias.

## 🧪 Auditoria

- Tabela de auditoria (`propostas_auditoria`) permanece.
- Campos auditados agora excluem `arquivado`.

## ✅ Diretrizes Copilot Adicionais

1. Nunca usar ou reintroduzir campo `arquivado` sem uma nova migration explícita.
2. Para edição de proposta (gestor), usar sempre o Dialog existente: não gerar inputs inline.
3. Para métricas avançadas futuras, preferir endpoint único agregador (`/api/reports/...`) ao invés de múltiplos fetches pequenos.
4. Em novos endpoints de relatório: retornar objetos JSON já normalizados (sem exigir pós-processamento pesado no frontend).
5. Evitar over-fetch: se os dados já estão presentes no painel, reutilizar estado em vez de refazer a chamada.

## 🚀 Próximas Extensões Sugeridas (Opcional)

- Filtro adicional no painel: operadora / consultor.
- Exportação CSV das métricas agregadas.
- Série temporal (evolução diária) para implantação.
- Webhook para evento de implantação.

## 📅 Metadados

- Data deste addendum: 21/08/2025
- Versão base referenciada: 1.2.0
- Versão sugerida pós-addendum: 1.3.0 (não alterar arquivo original, apenas referência aqui)

---
**Uso**: Leia este addendum após o documento principal para garantir aderência aos fluxos atuais.
