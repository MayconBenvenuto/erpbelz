# Documentação de Cores e Estilos - CRM Belz

## 🎨 Sistema de Cores dos Status das Propostas

### 📍 Localização das Configurações

**Arquivo Principal**: `lib/constants.js`

- Objeto: `STATUS_COLORS`
- Estrutura: `{ bg: 'cor_fundo', text: 'cor_texto', border: 'cor_borda' }`

### 🌈 Cores Atuais por Status

```javascript
export const STATUS_COLORS = {
  recepcionado: {
    bg: '#E3F2FD', // Azul muito claro
    text: '#1565C0', // Azul escuro
    border: '#2196F3', // Azul médio
  },
  'pendente assinatura ds/proposta': {
    bg: '#F3E5F5', // Roxo muito claro
    text: '#7B1FA2', // Roxo escuro
    border: '#9C27B0', // Roxo médio
  },
  análise: {
    bg: '#FFF8E1', // Amarelo muito claro
    text: '#F57C00', // Laranja escuro
    border: '#FF9800', // Laranja médio
  },
  pendência: {
    bg: '#FFF3E0', // Laranja muito claro
    text: '#E65100', // Laranja escuro
    border: '#FF9800', // Laranja médio
  },
  'pleito seguradora': {
    bg: '#E8EAF6', // Índigo muito claro
    text: '#3F51B5', // Índigo escuro
    border: '#3F51B5', // Índigo escuro
  },
  'boleto liberado': {
    bg: '#E8F5E8', // Verde muito claro
    text: '#2E7D32', // Verde escuro
    border: '#4CAF50', // Verde médio
  },
  implantado: {
    bg: '#E0F2F1', // Verde água claro
    text: '#00695C', // Verde água escuro
    border: '#009688', // Verde água médio
  },
  'proposta declinada': {
    bg: '#FFEBEE', // Vermelho muito claro
    text: '#C62828', // Vermelho escuro
    border: '#F44336', // Vermelho médio
  },
}
```

## � Sistema de Cores dos Status das Solicitações

### 📍 Localização das Configurações

**Arquivo Principal**: `lib/constants.js`

- Objeto: `SOLICITACAO_STATUS_COLORS`
- Estrutura: `{ bg: 'cor_fundo', text: 'cor_texto', border: 'cor_borda' }`

### 🌈 Cores das Solicitações por Status

```javascript
export const SOLICITACAO_STATUS_COLORS = {
  aberta: {
    bg: '#E3F2FD', // Azul muito claro (mesmo padrão de 'recepcionado')
    text: '#1565C0', // Azul escuro
    border: '#2196F3', // Azul médio
  },
  'em validação': {
    bg: '#FFF8E1', // Amarelo muito claro (mesmo padrão de 'análise')
    text: '#F57C00', // Laranja escuro
    border: '#FF9800', // Laranja médio
  },
  'em execução': {
    bg: '#E8EAF6', // Índigo muito claro (mesmo padrão de 'pleito seguradora')
    text: '#3F51B5', // Índigo escuro
    border: '#3F51B5', // Índigo escuro
  },
  concluída: {
    bg: '#E0F2F1', // Verde água claro (mesmo padrão de 'implantado')
    text: '#00695C', // Verde água escuro
    border: '#009688', // Verde água médio
  },
  cancelada: {
    bg: '#FFEBEE', // Vermelho muito claro (mesmo padrão de 'proposta declinada')
    text: '#C62828', // Vermelho escuro
    border: '#F44336', // Vermelho médio
  },
}
```

## �🎯 Onde as Cores São Aplicadas

### 1. Cards das Propostas (Kanban)

**Arquivo**: `app/sections/Proposals.jsx`
**Linha**: ~752-760

```jsx
<span
  className="font-mono text-[10px] px-1 py-0.5 rounded flex items-center gap-1"
  style={{
    backgroundColor: statusColors.bg,
    color: '#000000 !important',        // ⚠️ SEMPRE PRETO PARA CÓDIGOS
    fontWeight: 'bold',
    border: `1px solid ${statusColors.border}`
  }}
>
  {p.codigo || '—'}
```

### 2. Cabeçalhos das Colunas Kanban

**Arquivo**: `app/sections/Proposals.jsx`
**Linha**: ~711-721

```jsx
<div
  className="p-2 border-b flex items-center gap-2 text-sm font-medium capitalize sticky top-0 z-10"
  style={{
    backgroundColor: statusColors.bg,
    color: statusColors.text,            // Usa cor do texto do status
    borderColor: statusColors.border
  }}
>
```

### 3. Fundo dos Cards das Propostas

**Arquivo**: `app/sections/Proposals.jsx`
**Linha**: ~740-747

```jsx
<div
  key={p.id}
  className="rounded p-2 backdrop-blur text-xs space-y-1 border relative group transition-colors hover:border-primary/60 hover:shadow-md"
  style={{
    backgroundColor: statusColors.bg,
    color: statusColors.text,            // Usa cor do texto do status
    borderColor: statusColors.border
  }}
>
```

### 4. Modal de Detalhes da Proposta

**Arquivo**: `app/sections/Proposals.jsx`
**Linha**: ~938-948

```jsx
<span
  className="font-mono text-xs px-1 py-0.5 rounded ml-2"
  style={{
    backgroundColor: (STATUS_COLORS[detail.status] || { bg: '#f6f6f6' }).bg,
    color: '#000000 !important',        // ⚠️ SEMPRE PRETO PARA CÓDIGOS
    fontWeight: 'bold',
    border: `1px solid ${(STATUS_COLORS[detail.status] || { border: '#e2e2e2' }).border}`
  }}
>
  {detail.codigo}
```

### 5. Cabeçalhos das Colunas Kanban (Movimentação)

**Arquivo**: `app/sections/Movimentacao.jsx`
**Linha**: ~282-292

```jsx
<div
  className="p-2 border-b flex items-center gap-2 text-sm font-medium capitalize sticky top-0 z-10"
  style={{
    backgroundColor: statusColors.bg,
    color: statusColors.text,
    borderColor: statusColors.border,
  }}
>
  {statusIcon(status)} {status}
  <span className="ml-auto text-xs opacity-75">{groupedByStatus[status]?.length || 0}</span>
</div>
```

## 🔧 Como Alterar as Cores

### Para Alterar uma Cor de Status:

1. **Abra o arquivo**: `lib/constants.js`
2. **Localize o status** no objeto `STATUS_COLORS` (propostas) ou `SOLICITACAO_STATUS_COLORS` (solicitações)
3. **Modifique as propriedades**:
   - `bg`: Cor de fundo (use cores claras para legibilidade)
   - `text`: Cor do texto (use cores escuras para contraste)
   - `border`: Cor da borda (geralmente uma versão média da cor)

### Para Adicionar um Novo Status:

1. **Adicione no array** `STATUS_OPTIONS` ou `SOLICITACAO_STATUS` (mesmo arquivo)
2. **Adicione no objeto** correspondente com a estrutura:
   ```javascript
   'nome_do_status': {
     bg: '#COR_FUNDO',
     text: '#COR_TEXTO',
     border: '#COR_BORDA'
   }
   ```

### ⚠️ Nota sobre Consistência Visual

**As seções de Propostas e Movimentação seguem o mesmo padrão de cores** para manter a consistência visual do sistema. Cores similares são usadas para estados semanticamente equivalentes:

- **Estados iniciais**: Azul (recepcionado ↔ aberta)
- **Estados de análise**: Amarelo/Laranja (análise ↔ em validação)
- **Estados de execução**: Índigo/Roxo (pleito seguradora ↔ em execução)
- **Estados finalizados**: Verde (implantado ↔ concluída)
- **Estados cancelados**: Vermelho (proposta declinada ↔ cancelada)

## ⚠️ Regras Importantes

### Códigos das Propostas

- **SEMPRE usar preto**: `color: '#000000 !important'`
- **SEMPRE usar negrito**: `fontWeight: 'bold'`
- **NUNCA remover o !important**: Garante que sobrescreva classes CSS

### Contraste e Legibilidade

- **Fundos claros**: Para boa legibilidade do texto
- **Textos escuros**: Para contraste adequado
- **Bordas definidas**: Para separação visual clara

### Consistência Visual

- **Família de cores**: Use tons da mesma cor (claro/médio/escuro)
- **Saturação similar**: Mantenha níveis de saturação parecidos
- **Harmonia**: Cores devem funcionar bem juntas no Kanban

## 🎨 Palette de Cores Recomendadas

### Azuis

- Claro: `#E3F2FD`, Médio: `#2196F3`, Escuro: `#1565C0`

### Verdes

- Claro: `#E8F5E8`, Médio: `#4CAF50`, Escuro: `#2E7D32`

### Vermelhos

- Claro: `#FFEBEE`, Médio: `#F44336`, Escuro: `#C62828`

### Laranjas

- Claro: `#FFF3E0`, Médio: `#FF9800`, Escuro: `#E65100`

### Amarelos

- Claro: `#FFF8E1`, Médio: `#FFD54F`, Escuro: `#F57C00`

## 🔄 Após Fazer Alterações

1. **Salve o arquivo** `lib/constants.js`
2. **O Next.js recompila automaticamente** (hot reload)
3. **Atualize o navegador** se necessário
4. **Teste em diferentes status** para verificar o resultado

## 📝 Histórico de Mudanças

- **2025-09-01**: Implementação do sistema de cores HEX personalizado
- **2025-09-01**: Correção do contraste para melhor legibilidade
- **2025-09-01**: Forçado cor preta nos códigos das propostas com !important
