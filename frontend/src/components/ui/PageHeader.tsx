import { type LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  actions?: React.ReactNode
  breadcrumb?: { label: string; href?: string }[]
}

export default function PageHeader({ title, subtitle, icon: Icon, actions, breadcrumb }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      // @ts-ignore
      className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            {Icon && (
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
            )}
            <div>
              {breadcrumb && breadcrumb.length > 0 && (
                <nav className="flex text-xs text-gray-500 dark:text-gray-400 mb-1" aria-label="Breadcrumb">
                  {breadcrumb.map((item, index) => (
                    <span key={index} className="flex items-center">
                      {index > 0 && <span className="mx-2">/</span>}
                      {item.href ? (
                        <span className="hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">{item.label}</span>
                      ) : (
                        <span className="text-gray-900 dark:text-white font-medium">{item.label}</span>
                      )}
                    </span>
                  ))}
                </nav>
              )}
              <h1 id="page-title" className="text-2xl font-bold text-gray-900 dark:text-white">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
