import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api, { uploadApi } from '../../services/api'
import { useState, useRef, useEffect } from 'react'
import { CreditCard, Loader2, X, AlertCircle, Download, CheckCircle, ArrowLeft, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { PaymentRequest, DashboardData } from '../../types'
import { StatusBadge, DataTable, SkeletonPage } from '../../components/ui'

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

export default function StudentPayments() {
  const queryClient = useQueryClient()
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [showResubmitForm, setShowResubmitForm] = useState(false)
  const [resubmitOriginalId, setResubmitOriginalId] = useState<number | null>(null)
  const [selectedSemester, setSelectedSemester] = useState('')
  const [formData, setFormData] = useState({
    amount_paid: '',
    transaction_id: '',
    bank_name: '',
    upi_reference: '',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: feeLedger } = useQuery({
    queryKey: ['feeLedger'],
    queryFn: async () => {
      const response = await api.get('/api/v1/student/fee-ledger')
      return response.data
    },
  })

  const { data: payments, isLoading, error } = useQuery<PaymentRequest[]>({
    queryKey: ['payments'],
    queryFn: async () => {
      const response = await api.get('/api/v1/student/payments')
      return response.data
    },
  })

  const { data: dashboard } = useQuery<DashboardData>({
    queryKey: ['studentDashboard'],
    queryFn: async () => {
      const response = await api.get('/api/v1/student/dashboard')
      return response.data
    },
  })

  const pendingSemesters = feeLedger?.ledger?.filter((sem: any) => sem.pending_amount > 0) || []

  useEffect(() => {
    if (feeLedger && feeLedger.total_pending <= 0) {
      setShowUploadForm(false)
    }
  }, [feeLedger])

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const formatErrorDetail = (error: any): string => {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail.length > 0 && typeof detail[0] === 'object') {
      return `${detail[0].loc?.join('.') || 'Error'}: ${detail[0].msg || 'Invalid field value'}`
    }
    return 'An unexpected error occurred'
  }

  const createPaymentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await uploadApi.post('/api/v1/student/payments', formData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['studentDashboard'] })
      queryClient.invalidateQueries({ queryKey: ['feeLedger'] })
      setShowUploadForm(false)
      setSelectedSemester('')
      setFormData({ amount_paid: '', transaction_id: '', bank_name: '', upi_reference: '' })
      setSelectedFile(null)
      setPreviewUrl(null)
      toast.success('Payment submitted successfully')
    },
    onError: (error: any) => {
      toast.error(formatErrorDetail(error) || 'Failed to submit payment')
    },
  })

  const resubmitMutation = useMutation({
    mutationFn: async ({ originalId, formData }: { originalId: number; formData: FormData }) => {
      const response = await uploadApi.post(`/api/v1/student/payments/resubmit/${originalId}`, formData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['studentDashboard'] })
      queryClient.invalidateQueries({ queryKey: ['feeLedger'] })
      setShowResubmitForm(false)
      setResubmitOriginalId(null)
      setSelectedSemester('')
      setFormData({ amount_paid: '', transaction_id: '', bank_name: '', upi_reference: '' })
      setSelectedFile(null)
      setPreviewUrl(null)
      toast.success('Payment resubmitted successfully')
    },
    onError: (error: any) => {
      toast.error(formatErrorDetail(error) || 'Failed to resubmit payment')
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only jpg, jpeg, png, and pdf files are allowed')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return
      }
      setSelectedFile(file)
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file))
      } else {
        setPreviewUrl(null)
      }
    }
  }

  const handleNewPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSemester) {
      toast.error('Please select a semester')
      return
    }
    const data = new FormData()
    data.append('amount_paid', formData.amount_paid)
    data.append('transaction_id', formData.transaction_id)
    data.append('semester_id', selectedSemester)
    if (formData.bank_name) data.append('bank_name', formData.bank_name)
    if (formData.upi_reference) data.append('upi_reference', formData.upi_reference)
    if (selectedFile) data.append('file', selectedFile)
    createPaymentMutation.mutate(data)
  }

  const handleResubmit = (originalId: number) => {
    setResubmitOriginalId(originalId)
    setShowResubmitForm(true)
  }

  const handleResubmitSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSemester) {
      toast.error('Please select a semester')
      return
    }
    if (!resubmitOriginalId) return
    const data = new FormData()
    data.append('amount_paid', formData.amount_paid)
    data.append('transaction_id', formData.transaction_id)
    data.append('semester_id', selectedSemester)
    if (formData.bank_name) data.append('bank_name', formData.bank_name)
    if (formData.upi_reference) data.append('upi_reference', formData.upi_reference)
    if (selectedFile) data.append('file', selectedFile)
    resubmitMutation.mutate({ originalId: resubmitOriginalId, formData: data })
  }

  const hasPendingPayment = payments?.some((p) => p.status === 'pending')
  const allPaid = feeLedger && feeLedger.total_pending <= 0
  const latestStatus = dashboard?.latest_payment_status || 'no_payments'

  if (isLoading) {
    return <SkeletonPage />
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        Error loading payments
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
            <p className="mt-1 text-sm text-gray-500">Manage your fee payments</p>
          </div>
          {!allPaid && !hasPendingPayment && latestStatus !== 'rejected' && (
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              New Payment
            </button>
          )}
        </div>
      </div>

      {allPaid && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">All Fees Paid</h3>
              <p className="mt-1 text-sm text-green-700">
                You have paid all semester fees. Thank you!
              </p>
            </div>
          </div>
        </div>
      )}

      {hasPendingPayment && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Pending Payment</h3>
              <p className="mt-1 text-sm text-yellow-700">
                You have a pending payment request. Please wait for it to be processed before submitting a new one.
              </p>
            </div>
          </div>
        </div>
      )}

      {latestStatus === 'rejected' && !allPaid && !hasPendingPayment && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <X className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Payment Rejected</h3>
              <p className="mt-1 text-sm text-red-700">
                Your last payment was rejected. Please review the remarks and resubmit.
              </p>
              <button
                onClick={() => {
                  const rejectedPayment = payments?.find(p => p.status === 'rejected')
                  if (rejectedPayment) {
                    handleResubmit(rejectedPayment.id)
                  }
                }}
                className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Resubmit Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {feeLedger && !allPaid && !showResubmitForm && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Fee Ledger</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee Breakdown</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Fee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {feeLedger.ledger?.map((sem: any) => (
                    <tr key={sem.semester_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sem.semester_name}
                        <p className="text-xs text-gray-500">{sem.academic_year}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {Object.entries(sem.fee_breakdown || {}).map(([name, amount]: [string, any]) => (
                          <div key={name} className="flex justify-between">
                            <span>{name}:</span>
                            <span className="ml-4">Rs. {amount}</span>
                          </div>
                        ))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rs. {sem.total_fee}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">Rs. {sem.paid_amount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">Rs. {sem.pending_amount}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          sem.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                          sem.payment_status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {sem.payment_status === 'paid' ? 'Paid' : sem.payment_status === 'partially_paid' ? 'Partially Paid' : 'Not Paid'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!feeLedger.ledger?.length && (
                <div className="text-center py-12">
                  <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No fee records</h3>
                  <p className="mt-1 text-sm text-gray-500">No fee structures found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(showUploadForm && !allPaid && !hasPendingPayment && latestStatus !== 'rejected') && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Submit Payment</h3>
          <form onSubmit={handleNewPaymentSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Semester *</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Semester</option>
                  {pendingSemesters.map((sem: any) => (
                    <option key={sem.semester_id} value={sem.semester_id}>
                      {sem.semester_name} ({sem.academic_year}) - Pending: Rs. {sem.pending_amount}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount Paid (Rs.) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount_paid}
                  onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Transaction ID *</label>
                <input
                  type="text"
                  value={formData.transaction_id}
                  onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">UPI Reference Number</label>
                <input
                  type="text"
                  value={formData.upi_reference}
                  onChange={(e) => setFormData({ ...formData, upi_reference: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Screenshot *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                  required
                />
                {previewUrl && (
                  <div className="mt-2 relative">
                    <img src={previewUrl} alt="Preview" className="h-32 w-auto rounded-md border" />
                    <button
                      type="button"
                      onClick={() => { setSelectedFile(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={createPaymentMutation.isPending}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {createPaymentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Submit Payment'
                )}
              </button>
              <button
                type="button"
                onClick={() => { setShowUploadForm(false); setSelectedSemester(''); setSelectedFile(null); setPreviewUrl(null) }}
                 className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showResubmitForm && !allPaid && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <button onClick={() => { setShowResubmitForm(false); setResubmitOriginalId(null); setSelectedSemester(''); setSelectedFile(null); setPreviewUrl(null) }} className="mr-3 text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-medium text-gray-900">Resubmit Payment</h3>
          </div>
          <form onSubmit={handleResubmitSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Semester *</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Semester</option>
                  {pendingSemesters.map((sem: any) => (
                    <option key={sem.semester_id} value={sem.semester_id}>
                      {sem.semester_name} ({sem.academic_year}) - Pending: Rs. {sem.pending_amount}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount Paid (Rs.) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount_paid}
                  onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Transaction ID *</label>
                <input
                  type="text"
                  value={formData.transaction_id}
                  onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">UPI Reference Number</label>
                <input
                  type="text"
                  value={formData.upi_reference}
                  onChange={(e) => setFormData({ ...formData, upi_reference: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Screenshot *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                  required
                />
                {previewUrl && (
                  <div className="mt-2 relative">
                    <img src={previewUrl} alt="Preview" className="h-32 w-auto rounded-md border" />
                    <button
                      type="button"
                      onClick={() => { setSelectedFile(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={resubmitMutation.isPending}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {resubmitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Resubmit Payment'
                )}
              </button>
              <button
                type="button"
                onClick={() => { setShowResubmitForm(false); setResubmitOriginalId(null); setSelectedSemester(''); setSelectedFile(null); setPreviewUrl(null) }}
                 className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">Payment History</h3>
          <DataTable
            data={payments || []}
            columns={[
              { key: 'request_id', label: 'Request ID', sortable: true },
              { key: 'receipt_number', label: 'Receipt No.', render: (val: string) => val || '-' },
              { key: 'semester_name', label: 'Semester', render: (val: string) => val || 'N/A' },
              { key: 'payment_date', label: 'Payment Date', render: (val: string) => val ? new Date(val).toLocaleDateString() : 'N/A', sortable: true },
              { key: 'amount_paid', label: 'Amount', render: (val: number) => `Rs. ${val}` },
              { key: 'transaction_id', label: 'Transaction ID', render: (val: string) => val || 'N/A' },
              { key: 'status', label: 'Status', render: (val: string) => <StatusBadge status={val} /> },
              {
                key: 'receipt_path',
                label: 'Receipt',
                render: (_: any, row: PaymentRequest) => row.status === 'completed' && row.receipt_path ? (
                  <button
                    onClick={() => downloadReceipt(`/api/v1/student/payments/${row.id}/receipt`, `receipt_${row.receipt_number || row.id}.pdf`)}
                    className="text-blue-600 hover:underline text-sm font-medium flex items-center gap-1"
                  >
                    <Download className="h-3 w-3" /> Download
                  </button>
                ) : '-'
              },
            ]}
            searchPlaceholder="Search payments..."
            fileName="payment_history.csv"
            emptyState={
              <div className="text-center py-12">
                <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No payments</h3>
                <p className="mt-1 text-sm text-gray-500">No payment history found.</p>
              </div>
            }
            rowKey={(row) => row.id}
          />
        </div>
      </div>
    </div>
  )
}