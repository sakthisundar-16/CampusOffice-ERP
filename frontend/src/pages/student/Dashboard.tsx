import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { CreditCard, FileText, FileCheck, Bell, Loader2, TrendingUp, AlertCircle, Receipt, GraduationCap, CheckCircle, XCircle, ClipboardList, Search, Clock, Calendar, Activity, ArrowRight } from 'lucide-react'
import Notifications from '../../components/Notifications'
import { Link } from 'react-router-dom'
import { DashboardData } from '../../types'
import { StatCard, StatusBadge, SkeletonPage } from '../../components/ui'
import { toast } from 'react-hot-toast'

async function downloadReceipt(url: string, filename: string) {
  const token = localStorage.getItem('access_token')
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) { toast.error('Failed to download receipt'); return }
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function StudentDashboard() {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['studentDashboard'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/v1/student/dashboard')
        return response.data
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        throw err
      }
    },
  })

  const { data: feeLedger, error: feeLedgerError } = useQuery({
    queryKey: ['feeLedger'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/v1/student/fee-ledger')
        return response.data
      } catch (err) {
        console.error('Error fetching fee ledger:', err)
        return null
      }
    },
  })

  const { data: docRequestsData, error: docRequestsError } = useQuery({
    queryKey: ['studentDocRequestsDashboard'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/v1/student/documents/requests')
        return response.data
      } catch (err) {
        console.error('Error fetching document requests:', err)
        return null
      }
    },
  })

  if (isLoading) {
    return <SkeletonPage />
  }

  if (error) {
    console.error('Dashboard error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-red-800 dark:text-red-400 font-semibold mb-2">Error loading dashboard</h3>
          <p className="text-red-600 dark:text-red-300 text-sm">{errorMessage}</p>
          <p className="text-red-500 dark:text-red-400 text-xs mt-2">Please check if the backend server is running and you are logged in.</p>
        </div>
      </div>
    )
  }

  const feeSummary = data?.fee_summary
  const totalFee = feeSummary?.total_fee || 0
  const totalPaid = feeSummary?.total_paid || 0
  const totalPending = feeSummary?.total_pending || 0
  const paymentPercentage = feeSummary?.payment_percentage || 0
  const currentSemesterFee = feeSummary?.current_semester_fee || 0
  const latestReceipt = feeSummary?.latest_receipt
  const latestStatus = data?.latest_payment_status || 'no_payments'

  const student = data?.student
  const activityHistory = data?.activity_history || []
  const unifiedRequests = data?.unified_requests || []
  const upcomingDueDates = data?.upcoming_due_dates || []

  const hasPendingFees = totalPending > 0

  const getPaymentStatusBadge = () => {
    switch (latestStatus) {
      case 'pending':
        return { label: 'Pending Verification', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle }
      case 'completed':
        return { label: 'Approved - Receipt Ready', color: 'bg-green-100 text-green-800', icon: CheckCircle }
      case 'rejected':
        return { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle }
      default:
        return { label: 'No Payments', color: 'bg-gray-100 text-gray-800', icon: CreditCard }
    }
  }

  const statusBadge = getPaymentStatusBadge()
  const StatusIcon = statusBadge.icon

  return (
    <div className="space-y-6">
      <div className="glass-effect rounded-2xl shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Student Portal</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Welcome back, {student?.full_name || 'Student'} | Roll: {student?.roll_number || 'N/A'} | Semester: {student?.current_semester || 'N/A'}
            </p>
          </div>
          <Notifications />
        </div>
      </div>

      {latestStatus !== 'no_payments' && (
        <div className={`rounded-xl p-4 backdrop-blur-sm ${latestStatus === 'completed' ? 'bg-green-50/80 border border-green-200 dark:bg-green-900/20 dark:border-green-800/50' : latestStatus === 'rejected' ? 'bg-red-50/80 border border-red-200 dark:bg-red-900/20 dark:border-red-800/50' : 'bg-yellow-50/80 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800/50'}`}>
          <div className="flex">
            <StatusIcon className={`h-5 w-5 ${latestStatus === 'completed' ? 'text-green-500' : latestStatus === 'rejected' ? 'text-red-500' : 'text-yellow-500'}`} />
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{statusBadge.label}</h3>
              {latestStatus === 'completed' && data?.latest_completed_payment && (
                <div className="mt-1 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <p>Receipt Number: <span className="font-medium">{data.latest_completed_payment.receipt_number}</span></p>
                  <p>Amount: <span className="font-medium">Rs. {data.latest_completed_payment.amount_paid}</span></p>
                  {latestReceipt && data?.latest_completed_payment && (
                    <button
                      onClick={() => downloadReceipt(`/api/v1/student/payments/${data.latest_completed_payment!.id}/receipt`, `receipt_${data.latest_completed_payment!.receipt_number || data.latest_completed_payment!.id}.pdf`)}
                      className="inline-flex items-center mt-2 px-3 py-1.5 border border-transparent text-sm font-medium rounded-lg text-white gradient-success hover:opacity-90 transition-opacity"
                    >
                      <Receipt className="h-4 w-4 mr-1" />
                      Download Receipt
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Payments" value={data?.payments || 0} icon={CreditCard} color="gradient-info" />
        <StatCard title="Results" value={data?.results || 0} icon={FileText} color="gradient-success" />
        <StatCard title="Bonafide" value={data?.bonafides || 0} icon={FileCheck} color="gradient-primary" />
        <StatCard title="Documents" value={data?.document_requests || (docRequestsData?.requests?.length || 0)} icon={ClipboardList} color="gradient-warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fee Summary Section */}
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-2xl border border-gray-100 dark:border-gray-700/50">
          <div className="px-5 py-5 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Fee Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50/80 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Fee</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">Rs. {totalFee.toLocaleString()}</p>
              </div>
              <div className="bg-green-50/80 dark:bg-green-900/20 rounded-xl p-4 border border-green-100 dark:border-green-800/30">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Paid</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">Rs. {totalPaid.toLocaleString()}</p>
              </div>
              <div className={`rounded-xl p-4 border ${hasPendingFees ? 'bg-yellow-50/80 border-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-800/30' : 'bg-green-50/80 border-green-100 dark:bg-green-900/20 dark:border-green-800/30'}`}>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Balance</p>
                <p className={`text-2xl font-bold ${hasPendingFees ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>Rs. {totalPending.toLocaleString()}</p>
              </div>
              <div className="bg-purple-50/80 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800/30">
                <p className="text-sm text-gray-600 dark:text-gray-400">Payment Progress</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{paymentPercentage}%</p>
              </div>
            </div>

            {hasPendingFees ? (
              <Link
                to="/student/payments"
                className="block w-full text-center mt-2 px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white gradient-warning hover:opacity-90 transition-opacity"
              >
                <CreditCard className="h-4 w-4 mr-1 inline" />
                {latestStatus === 'rejected' ? 'Resubmit Payment' : 'Pay Now'}
              </Link>
            ) : latestReceipt && (
              <a
                href={latestReceipt}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center mt-2 px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white gradient-success hover:opacity-90 transition-opacity"
              >
                <Receipt className="h-4 w-4 mr-1 inline" />
                Download Latest Receipt
              </a>
            )}
          </div>
        </div>

        {/* Upcoming Due Dates Section */}
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-2xl border border-gray-100 dark:border-gray-700/50">
          <div className="px-5 py-5 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Upcoming Due Dates
            </h3>
            {upcomingDueDates.length > 0 ? (
              <div className="space-y-3">
                {upcomingDueDates.slice(0, 5).map((due: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{due.fee_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{due.semester_name} - {due.academic_year}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Rs. {due.amount?.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{due.due_date ? new Date(due.due_date).toLocaleDateString() : 'TBD'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming due dates</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Section */}
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-2xl border border-gray-100 dark:border-gray-700/50">
          <div className="px-5 py-5 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Recent Activity
            </h3>
            {activityHistory.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {activityHistory.slice(0, 10).map((activity: any, idx: number) => (
                  <div key={idx} className="flex items-start p-3 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
                    <Clock className="h-4 w-4 text-gray-400 mt-0.5 mr-3" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {activity.created_at ? new Date(activity.created_at).toLocaleString() : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
            )}
          </div>
        </div>

        {/* Unified Requests Section */}
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-2xl border border-gray-100 dark:border-gray-700/50">
          <div className="px-5 py-5 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <ClipboardList className="h-5 w-5 mr-2" />
              Active Requests
            </h3>
            {unifiedRequests.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {unifiedRequests.slice(0, 10).map((req: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{req.request_number}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{req.request_type} - {req.status}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      req.status === 'completed' ? 'bg-green-100 text-green-800' :
                      req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No active requests</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="bg-white dark:bg-gray-800 shadow-soft rounded-2xl border border-gray-100 dark:border-gray-700/50">
        <div className="px-5 py-5 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <ArrowRight className="h-5 w-5 mr-2" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/student/payments" className="flex flex-col items-center p-4 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <CreditCard className="h-8 w-8 text-blue-500 mb-2" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Make Payment</span>
            </Link>
            <Link to="/student/documents" className="flex flex-col items-center p-4 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <FileCheck className="h-8 w-8 text-green-500 mb-2" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Request Document</span>
            </Link>
            <Link to="/student/results" className="flex flex-col items-center p-4 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <FileText className="h-8 w-8 text-purple-500 mb-2" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">View Results</span>
            </Link>
            <Link to="/student/profile" className="flex flex-col items-center p-4 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <GraduationCap className="h-8 w-8 text-orange-500 mb-2" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Update Profile</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
