// Hook para debounce de buscas e filtros
import { useState, useEffect, useMemo } from 'react'

export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Hook para filtros com debounce automático
export function useSearchFilter(initialFilters = {}) {
  const [filters, setFilters] = useState(initialFilters)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Debounce do termo de busca
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  
  // Filtros finais combinados
  const finalFilters = useMemo(() => ({
    ...filters,
    ...(debouncedSearchTerm && { search: debouncedSearchTerm })
  }), [filters, debouncedSearchTerm])

  const updateFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters(initialFilters)
    setSearchTerm('')
  }

  return {
    filters: finalFilters,
    searchTerm,
    setSearchTerm,
    updateFilter,
    clearFilters,
    hasActiveFilters: Object.keys(finalFilters).length > Object.keys(initialFilters).length
  }
}

// Hook para paginação otimizada
export function usePagination(totalItems, itemsPerPage = 50) {
  const [currentPage, setCurrentPage] = useState(1)
  
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }
  
  const nextPage = () => goToPage(currentPage + 1)
  const prevPage = () => goToPage(currentPage - 1)
  const goToFirst = () => goToPage(1)
  const goToLast = () => goToPage(totalPages)
  
  // Reset para primeira página quando total muda
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])
  
  return {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    prevPage,
    goToFirst,
    goToLast,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages
  }
}

// Hook para otimização de re-renders em listas
export function useListOptimization(items, keyExtractor) {
  return useMemo(() => {
    if (!Array.isArray(items)) return []
    
    return items.map((item, index) => ({
      ...item,
      _key: keyExtractor ? keyExtractor(item, index) : item.id || index,
      _index: index
    }))
  }, [items, keyExtractor])
}
