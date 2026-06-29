import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { Users, CreditCard, FileText, FileCheck, Loader2, TrendingUp, GraduationCap, Activity, Shield, Database, HardDrive, Clock, ArrowRight, CheckCircle, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/dashboard')
      return response.data
    },
  })

  const { data: departments } = useQuery({
    queryKey: ['adminDepartments'],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/departments')
      return response.data
    },
  })

  const { data: students } = useQuery({
    queryKey: ['adminStudentsForStats'],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/students?limit=1000')
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

  const stats = [
    { label: 'Total Users', value: data?.total_users || 0, icon: Users, color: 'bg-blue-500', link: '/admin/students' },
    { label: 'Students', value: data?.total_students || 0, icon: GraduationCap, color: 'bg-green-500', link: '/admin/students' },
    { label: 'Staff', value: data?.total_staff || 0, icon: Users, color: 'bg-purple-500', link: '/admin/staff' },
    { label: 'Payments', value: data?.total_payments || 0, icon: CreditCard, color: 'bg-orange-500', link: '/admin/fee-structures' },
    { label: 'Bonafides', value: data?.total_bonafides || 0, icon: FileCheck, color: 'bg-pink-500', link: '/admin/departments' },
    { label: 'Departments', value: data?.total_departments || 0, icon: Users, color: 'bg-indigo-500', link: '/admin/departments' },
    { label: 'Semesters', value: data?.total_semesters || 0, icon: FileText, color: 'bg-teal-500', link: '/admin/semesters' },
    { label: 'Collected Fees', value: `Rs. ${(data?.total_collected || 0).toLocaleString()}`, icon: TrendingUp, color: 'bg-emerald-500', link: '/admin/fee-structures' },
  ]

  const deptDistribution = departments?.map((dept: any, idx: number) => {
    const count = students?.filter((s: any) => s.department === dept.name).length || 0
    return { name: dept.name, value: count }
  }).filter((d: any) => d.value > 0) || []

  const feeStatusData = [
    { name: 'Collected', value: data?.total_collected || 0 },
    { name: 'Pending', value: data?.pending_amount || 0 },
  ]

  const recentAuditLogs = data?.recent_audit_logs || []
  const systemHealth = data?.system_health || {}
  const unifiedStats = data?.unified_stats || {}

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow-soft rounded-2xl border border-gray-100 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Management Center</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Enterprise system overview and administration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
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
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-2xl border border-gray-100 dark:border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Students by Department</h3>
          {deptDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deptDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">No data available</div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-2xl border border-gray-100 dark:border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Status</h3>
          {feeStatusData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={feeStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {feeStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `Rs. ${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">No payment data available</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health Section */}
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-2xl border border-gray-100 dark:border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            System Health
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
              <div className="flex items-center">
                <Database className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Database</span>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${systemHealth.database === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {systemHealth.database || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
              <div className="flex items-center">
                <HardDrive className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Redis</span>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${systemHealth.redis === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {systemHealth.redis || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
              <div className="flex items-center">
                <FileText className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Storage</span>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${systemHealth.storage === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {systemHealth.storage || 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Audit Logs Section */}
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-2xl border border-gray-100 dark:border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Recent Audit Logs
          </h3>
          {recentAuditLogs.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentAuditLogs.slice(0, 10).map((log: any, idx: number) => (
                <div key={idx} className="flex items-start p-3 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
                  <Clock className="h-4 w-4 text-gray-400 mt-0.5 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{log.action}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{log.user_name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No recent audit logs</p>
          )}
        </div>

        {/* Unified Stats Section */}
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-2xl border border-gray-100 dark:border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Unified Request Stats</h3>
          {unifiedStats && Object.keys(unifiedStats).length > 0 ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">Pending Payments</span>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{(unifiedStats as any).pending_payments || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">Pending Documents</span>
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">{(unifiedStats as any).pending_documents || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">Pending Results</span>
                <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">{(unifiedStats as any).pending_results || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">Processing</span>
                <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{(unifiedStats as any).processing || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">Completed Today</span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{(unifiedStats as any).completed_today || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">Rejected Today</span>
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">{(unifiedStats as any).rejected_today || 0}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No unified stats available</p>
          )}
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="bg-white dark:bg-gray-800 shadow-soft rounded-2xl border border-gray-100 dark:border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <ArrowRight className="h-5 w-5 mr-2" />
          Quick Management Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Link to="/admin/students" className="flex flex-col items-center p-4 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <GraduationCap className="h-8 w-8 text-blue-500 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Students</span>
          </Link>
          <Link to="/admin/staff" className="flex flex-col items-center p-4 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <Users className="h-8 w-8 text-green-500 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Staff</span>
          </Link>
          <Link to="/admin/departments" className="flex flex-col items-center p-4 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <FileText className="h-8 w-8 text-purple-500 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Departments</span>
          </Link>
          <Link to="/admin/fee-structures" className="flex flex-col items-center p-4 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <CreditCard className="h-8 w-8 text-orange-500 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Fee Structures</span>
          </Link>
          <Link to="/admin/semesters" className="flex flex-col items-center p-4 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <FileCheck className="h-8 w-8 text-teal-500 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Semesters</span>
          </Link>
          <Link to="/admin/students" className="flex flex-col items-center p-4 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <Activity className="h-8 w-8 text-pink-500 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Students</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
