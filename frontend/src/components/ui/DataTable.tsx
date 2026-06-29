import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, Search, Loader2 } from 'lucide-react'

interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  searchable?: boolean
  render?: (value: any, row: T) => React.ReactNode
  width?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  isLoading?: boolean
  error?: string
  total?: number
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  onSearch?: (query: string) => void
  onExport?: () => void
  searchPlaceholder?: string
  fileName?: string
  emptyState?: React.ReactNode
  rowKey?: (row: T) => string | number
}

export default function DataTable<T>({
  data,
  columns,
  isLoading = false,
  error,
  total = 0,
  page = 1,
  pageSize = 10,
  onPageChange,
  onSort,
  onSearch,
  onExport,
  searchPlaceholder = 'Search...',
  fileName = 'export.csv',
  emptyState,
  rowKey = (row: any) => row.id,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [localSearch, setLocalSearch] = useState('')

  const handleSort = (key: string) => {
    if (!onSort) return
    if (sortKey === key) {
      const newDir = sortDir === 'asc' ? 'desc' : 'asc'
      setSortDir(newDir)
      onSort(key, newDir)
    } else {
      setSortKey(key)
      setSortDir('asc')
      onSort(key, 'asc')
    }
  }

  const handleSearchChange = (value: string) => {
    setLocalSearch(value)
    onSearch?.(value)
  }

  const totalPages = Math.ceil(total / pageSize)

  const exportCSV = () => {
    if (!onExport) return
    const headers = columns.map((c) => c.label).join(',')
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const val = row[col.key as keyof T]
          const str = typeof val === 'string' ? val : JSON.stringify(val ?? '')
          return `"${str.replace(/"/g, '""')}"`
        })
        .join(',')
    )
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey) return <ChevronsUpDown className="h-4 w-4 text-gray-400" />
    return sortDir === 'asc' ? <ChevronUp className="h-4 w-4 text-blue-600" /> : <ChevronDown className="h-4 w-4 text-blue-600" />
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-2xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
      <div className="px-5 py-4 sm:px-6 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex flex-col sm:flex-row gap-3">
          {onSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9 block w-full rounded-xl border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 text-sm transition-all duration-200"
              />
            </div>
          )}
          {onExport && (
            <button
              onClick={exportCSV}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm transition-all duration-200"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700/50">
          <thead className="bg-gray-50/80 dark:bg-gray-900/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-200 select-none transition-colors' : ''}`}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.label}
                    {col.sortable && <SortIcon columnKey={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700/50">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12">
                  <div className="flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-red-500">
                  {error}
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12">
                  {emptyState || (
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                      No data available
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={rowKey(row)} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                    >
                      {col.render ? col.render(row[col.key as keyof T], row) : String(row[col.key as keyof T] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing {Math.min((page - 1) * pageSize + 1, total)} to {Math.min(page * pageSize, total)} of {total} results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400 px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
