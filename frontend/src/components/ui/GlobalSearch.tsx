import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, Users, FileText, CreditCard, GraduationCap, ClipboardList, ArrowRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

type SearchResult = {
  type: 'student' | 'payment' | 'document' | 'staff'
  id: number
  title: string
  subtitle: string
  href: string
}

const iconMap = {
  student: Users,
  payment: CreditCard,
  document: ClipboardList,
  staff: GraduationCap,
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
    }
  }, [isOpen])

  const { data, isLoading } = useQuery({
    queryKey: ['globalSearch', query],
    queryFn: async () => {
      if (!query.trim()) return { results: [] as SearchResult[] }
      const res = await api.get('/api/v1/search', { params: { q: query, limit: 10 } })
      const results: SearchResult[] = []
      if (res.data.students?.length) {
        res.data.students.forEach((s: any) => {
          results.push({ type: 'student', id: s.id, title: s.full_name, subtitle: s.roll_number || s.email, href: `/admin/students` })
        })
      }
      if (res.data.payments?.length) {
        res.data.payments.forEach((p: any) => {
          results.push({ type: 'payment', id: p.id, title: `Payment ${p.request_id}`, subtitle: `${p.student_name} - Rs. ${p.amount_paid}`, href: `/staff/payments` })
        })
      }
      if (res.data.documents?.length) {
        res.data.documents.forEach((d: any) => {
          results.push({ type: 'document', id: d.id, title: d.document_type || 'Document', subtitle: `${d.student_name} - ${d.status}`, href: `/staff/documents` })
        })
      }
      return { results: results.slice(0, 8) }
    },
    enabled: query.trim().length > 1,
  })

  const handleSelect = (href: string) => {
    setIsOpen(false)
    navigate(href)
  }

  if (!isOpen) return null

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // @ts-ignore
          className="fixed inset-0 bg-black/60"
          onClick={() => setIsOpen(false)}
        />
        <motion.div
          initial={{ scale: 0.95, y: -10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: -10, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          // @ts-ignore
          className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden"
        >
          <div className="flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students, payments, documents..."
              className="w-full px-4 py-4 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
            />
            <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs text-gray-400 border border-gray-200 dark:border-gray-700 rounded">
              ESC
            </kbd>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading && (
              <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            )}
            {!isLoading && data?.results?.length === 0 && query.trim().length > 1 && (
              <div className="p-8 text-center text-sm text-gray-500">No results found</div>
            )}
            {data?.results?.map((result) => {
              const Icon = iconMap[result.type]
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result.href)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{result.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{result.subtitle}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </button>
              )
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}
