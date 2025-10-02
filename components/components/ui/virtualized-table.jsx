// Virtualized Table para listas grandes de propostas
import { FixedSizeList as List } from 'react-window'
import { Card } from '@/components/ui/card'
import { useMemo, forwardRef } from 'react'

const VirtualizedTable = forwardRef(({ 
  data = [], 
  height = 400, 
  itemHeight = 60,
  columns = [],
  renderItem,
  className = ""
}, ref) => {
  const itemCount = data.length

  // Memoizar dados para evitar re-renders
  const memoizedData = useMemo(() => data, [data])
  
  const Row = ({ index, style }) => {
    const item = memoizedData[index]
    
    return (
      <div style={style} className="border-b border-border">
        {renderItem ? renderItem(item, index) : (
          <div className="p-4 flex items-center gap-4">
            <span className="text-sm">{item.id}</span>
            <span className="text-sm">{item.name || item.codigo}</span>
          </div>
        )}
      </div>
    )
  }

  if (itemCount === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Nenhum item encontrado
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* Header da tabela */}
      {columns.length > 0 && (
        <div className="border-b border-border bg-muted/50 sticky top-0 z-10">
          <div className="flex items-center px-4 py-3">
            {columns.map((column, index) => (
              <div 
                key={index}
                className={`text-sm font-medium text-muted-foreground ${column.className || 'flex-1'}`}
              >
                {column.header}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Lista virtualizada */}
      <List
        ref={ref}
        height={height}
        itemCount={itemCount}
        itemSize={itemHeight}
        className="scrollbar-thin"
      >
        {Row}
      </List>
    </div>
  )
})

VirtualizedTable.displayName = 'VirtualizedTable'

export default VirtualizedTable
