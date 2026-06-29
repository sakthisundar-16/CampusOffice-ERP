import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color: string
  href?: string
  subtitle?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

export default function StatCard({ title, value, icon: Icon, color, href, subtitle, trend }: StatCardProps) {
  const content = (
    <div className="group erp-card hover:shadow-elevated transition-all duration-300">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex-shrink-0 ${color} rounded-lg p-2.5 shadow-md group-hover:scale-105 transition-transform duration-300`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                {value}
              </p>
              {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {trend && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
              trend.isPositive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  )

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    )
  }

  return content
}
