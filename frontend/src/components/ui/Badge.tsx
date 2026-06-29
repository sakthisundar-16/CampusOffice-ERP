import { type LucideIcon } from 'lucide-react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

const variantStyles = {
  default: 'bg-gray-100/80 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300 border border-gray-200 dark:border-gray-600',
  success: 'bg-green-100/80 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50',
  warning: 'bg-yellow-100/80 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/50',
  danger: 'bg-red-100/80 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50',
  info: 'bg-blue-100/80 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50',
  purple: 'bg-purple-100/80 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50',
}

const dotColors = {
  default: 'bg-gray-500 dark:bg-gray-400',
  success: 'bg-green-500 dark:bg-green-400',
  warning: 'bg-yellow-500 dark:bg-yellow-400',
  danger: 'bg-red-500 dark:bg-red-400',
  info: 'bg-blue-500 dark:bg-blue-400',
  purple: 'bg-purple-500 dark:bg-purple-400',
}

export default function Badge({ children, variant = 'default', size = 'sm', dot = false, className = '' }: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses} ${variantStyles[variant]} ${className} backdrop-blur-sm`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} animate-pulse`} />}
      {children}
    </span>
  )
}

interface StatusBadgeProps {
  status: string
}

const statusConfig: Record<string, { label: string; variant: BadgeProps['variant']; dot?: boolean }> = {
  pending: { label: 'Pending Review', variant: 'warning', dot: true },
  approved: { label: 'Approved', variant: 'success', dot: true },
  completed: { label: 'Approved', variant: 'success', dot: true },
  rejected: { label: 'Rejected', variant: 'danger', dot: true },
  returned: { label: 'Returned', variant: 'warning', dot: true },
  active: { label: 'Active', variant: 'success', dot: true },
  inactive: { label: 'Inactive', variant: 'danger', dot: true },
  paid: { label: 'Paid', variant: 'success', dot: true },
  partially_paid: { label: 'Partially Paid', variant: 'warning', dot: true },
  not_paid: { label: 'Not Paid', variant: 'danger', dot: true },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = statusConfig[status] || { label: status, variant: 'default' as BadgeProps['variant'] }

  return (
    <Badge variant={cfg.variant} dot={cfg.dot}>
      {cfg.label}
    </Badge>
  )
}
