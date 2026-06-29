import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { Loader2, CreditCard, FileText, FileCheck, Users, CheckCircle, XCircle, Clock, ClipboardList, Activity, Bell, ArrowRight, Search } from 'lucide-react'
import { WorkQueueStats } from '../../types'

export default function StaffDashboard() {
  const { data: dashboard, isLoading } = useQuery<WorkQueueStats>({
    queryKey: ['staffDashboard'],
    queryFn: async () => {
      const response = await api.get('/api/v1/staff/dashboard')
      return response.data
    },
  })

  const { data: docQueue } = useQuery({
    queryKey: ['docWorkQueueDashboard'],
    queryFn: async () => {
      const response = await api.get('/api/v1/staff/documents/work-queue')
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const workQueue = [
    { label: 'Pending Payments', value: dashboard?.pending_payments || 0, icon: CreditCard, color: 'bg-orange-500', link: '/staff/payments' },
    { label: 'Pending Bonafides', value: dashboard?.pending_bonafides || 0, icon: FileCheck, color: 'bg-yellow-500', link: '/staff/bonafides' },
    { label: 'Pending Documents', value: docQueue?.pending_document_requests || 0, icon: ClipboardList, color: 'bg-indigo-500', link: '/staff/documents' },
    { label: 'Pending Results', value: dashboard?.pending_results || 0, icon: FileText, color: 'bg-blue-500', link: '/staff/results' },
    { label: 'Completed Today', value: dashboard?.completed_today || 0, icon: CheckCircle, color: 'bg-green-500', link: '/staff/payments' },
    { label: 'Rejected Today', value: dashboard?.rejected_today || 0, icon: XCircle, color: 'bg-red-500', link: '/staff/payments' },
  ]

  const recentActivities = dashboard?.recent_activities || []
  const todayNotifications = dashboard?.today_notifications || []
  const unifiedStats = dashboard?.unified_stats || {}

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow-soft rounded-2xl border border-gray-100 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Office Work Center</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage student requests, payments, and results</p>
          </div>
          <Link to="/staff/payment-history" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white gradient-primary hover:opacity-90 transition-opacity">
            <Search className="h-4 w-4 mr-2" />
            Global Search
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {workQueue.map((stat) => (
          <Link key={stat.label} to={stat.link} className="block">
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-soft rounded-xl border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${stat.color} rounded-md p-3`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        {stat.label}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities Section */}
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-2xl border border-gray-100 dark:border-gray-700/50">
          <div className="px-5 py-5 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Recent Activities
            </h3>
            {recentActivities.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {recentActivities.slice(0, 10).map((activity: any, idx: number) => (
                  <div key={idx} className="flex items-start p-3 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
                    <Clock className="h-4 w-4 text-gray-400 mt-0.5 mr-3" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.event}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.details}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No recent activities</p>
            )}
          </div>
        </div>

        {/* Today's Notifications Section */}
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-2xl border border-gray-100 dark:border-gray-700/50">
          <div className="px-5 py-5 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Today's Notifications
            </h3>
            {todayNotifications.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {todayNotifications.slice(0, 10).map((notification: any, idx: number) => (
                  <div key={idx} className={`flex items-start p-3 rounded-lg ${!notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'bg-gray-50/50 dark:bg-gray-700/30'}`}>
                    <Bell className={`h-4 w-4 mt-0.5 mr-3 ${!notification.is_read ? 'text-blue-500' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {notification.created_at ? new Date(notification.created_at).toLocaleString() : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No notifications today</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="bg-white dark:bg-gray-800 shadow-soft rounded-2xl border border-gray-100 dark:border-gray-700/50">
        <div className="px-5 py-5 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <ArrowRight className="h-5 w-5 mr-2" />
            Quick Processing
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/staff/payments" className="flex flex-col items-center p-4 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <CreditCard className="h-8 w-8 text-blue-500 mb-2" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Review Payments</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{dashboard?.pending_payments || 0} pending</span>
            </Link>
            <Link to="/staff/documents" className="flex flex-col items-center p-4 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <ClipboardList className="h-8 w-8 text-green-500 mb-2" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Document Requests</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{docQueue?.pending_document_requests || 0} pending</span>
            </Link>
            <Link to="/staff/results" className="flex flex-col items-center p-4 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <FileText className="h-8 w-8 text-purple-500 mb-2" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Publish Results</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Upload CSV</span>
            </Link>
            <Link to="/staff/bonafides" className="flex flex-col items-center p-4 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <FileCheck className="h-8 w-8 text-orange-500 mb-2" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Bonafide Requests</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{dashboard?.pending_bonafides || 0} pending</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Unified Stats Section */}
      {unifiedStats && Object.keys(unifiedStats).length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-2xl border border-gray-100 dark:border-gray-700/50">
          <div className="px-5 py-5 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Unified Request Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-gray-50/50 dark:bg-gray-700/30 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{(unifiedStats as any).pending_payments || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending Payments</p>
              </div>
              <div className="bg-gray-50/50 dark:bg-gray-700/30 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{(unifiedStats as any).pending_documents || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending Documents</p>
              </div>
              <div className="bg-gray-50/50 dark:bg-gray-700/30 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{(unifiedStats as any).pending_results || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending Results</p>
              </div>
              <div className="bg-gray-50/50 dark:bg-gray-700/30 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{(unifiedStats as any).processing || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Processing</p>
              </div>
              <div className="bg-gray-50/50 dark:bg-gray-700/30 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{(unifiedStats as any).completed_today || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Completed Today</p>
              </div>
              <div className="bg-gray-50/50 dark:bg-gray-700/30 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{(unifiedStats as any).rejected_today || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Rejected Today</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}