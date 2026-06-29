import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useState, useEffect } from 'react'
import { CreditCard, Loader2, X, AlertCircle, Download, Check, Eye, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { PaymentRequest } from '../../types'

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

export default function StaffPayments() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedPayment, setSelectedPayment] = useState<PaymentRequest | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [verificationDetails, setVerificationDetails] = useState<any>(null)
  const [loadingVerification, setLoadingVerification] = useState(false)

  const { data: payments, isLoading, error } = useQuery({
    queryKey: ['staffPayments', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      const response = await api.get(`/api/v1/staff/payments?${params.toString()}`)
      return response.data
    },
  })

  const approveMutation = useMutation({
    mutationFn: async ({ paymentId }: { paymentId: number }) => {
      const response = await api.put(`/api/v1/staff/payments/${paymentId}/approve`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffPayments'] })
      queryClient.invalidateQueries({ queryKey: ['staffDashboard'] })
      setShowApproveModal(false)
      setSelectedPayment(null)
      setRemarks('')
      toast.success('Payment approved successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to approve payment')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ paymentId, remarks }: { paymentId: number; remarks: string }) => {
      const formData = new FormData()
      formData.append('remarks', remarks)
      const response = await api.put(`/api/v1/staff/payments/${paymentId}/reject`, formData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffPayments'] })
      queryClient.invalidateQueries({ queryKey: ['staffDashboard'] })
      setShowRejectModal(false)
      setSelectedPayment(null)
      setRemarks('')
      toast.success('Payment rejected')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to reject payment')
    },
  })

  const fetchVerificationDetails = async (paymentId: number) => {
    setLoadingVerification(true)
    try {
      const response = await api.get(`/api/v1/staff/payments/${paymentId}/verification-details`)
      setVerificationDetails(response.data)
      setShowVerificationModal(true)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to load verification details')
    } finally {
      setLoadingVerification(false)
    }
  }

  const handleApprove = () => {
    if (selectedPayment) {
      approveMutation.mutate({ paymentId: selectedPayment.id })
    }
  }

  const handleReject = () => {
    if (selectedPayment && remarks.trim()) {
      rejectMutation.mutate({ paymentId: selectedPayment.id, remarks })
    } else {
      toast.error('Remarks are required for rejection')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Payment Verification</h1>
          <p className="mt-1 text-sm text-gray-500">Review and verify student payments</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex space-x-2">
                {['all', 'pending', 'completed', 'rejected'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      statusFilter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'all' ? 'All' : status === 'completed' ? 'Approved' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments?.map((payment: any) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.request_id || `#${payment.id}`}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{payment.student_name}</div>
                          <div className="text-sm text-gray-500">{payment.roll_number}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.department}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.semester}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rs. {payment.amount_paid}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.transaction_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {payment.status === 'completed' ? 'Approved' : payment.status === 'pending' ? 'Pending' : 'Rejected'}
                        </span>
                        {payment.is_resubmitted && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                            Resubmitted
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => {
                            fetchVerificationDetails(payment.id)
                          }}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4 inline" /> View
                        </button>
                        {payment.payment_proof && (
                          <div className="inline-flex space-x-1">
                            <button
                              onClick={() => { setSelectedPayment(payment as PaymentRequest); setShowPreview(true) }}
                              className="text-gray-600 hover:text-gray-900"
                              title="Preview Screenshot"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <a
                              href={`/api/v1/files/payment/${payment.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-gray-900"
                              title="Download Screenshot"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        )}
                        {payment.status === 'pending' && (
                          <>
                            <button
                              onClick={() => { setSelectedPayment(payment as PaymentRequest); setShowApproveModal(true) }}
                              className="text-green-600 hover:text-green-800 ml-2"
                              title="Approve"
                            >
                              <Check className="h-4 w-4 inline" /> Approve
                            </button>
                            <button
                              onClick={() => { setSelectedPayment(payment as PaymentRequest); setShowRejectModal(true) }}
                              className="text-red-600 hover:text-red-800 ml-2"
                              title="Reject"
                            >
                              <X className="h-4 w-4 inline" /> Reject
                            </button>
                          </>
                        )}
                        {payment.status === 'completed' && payment.receipt_path && (
                          <button
                            onClick={() => downloadReceipt(`/api/v1/staff/payments/${payment.id}/receipt`, `receipt_${payment.receipt_number || payment.id}.pdf`)}
                            className="text-blue-600 hover:text-blue-600/80 ml-2"
                            title="Download Receipt"
                          >
                            <Download className="h-4 w-4 inline" /> Receipt
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!payments?.length && (
                <div className="text-center py-12">
                  <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No payments</h3>
                  <p className="mt-1 text-sm text-gray-500">No payment records found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedPayment && showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium">Payment Screenshot - {selectedPayment.request_id}</h3>
              <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4">
              {selectedPayment.payment_proof && (
                <img
                  src={`${import.meta.env.VITE_API_URL || ''}${selectedPayment.payment_proof}`}
                  alt="Payment Proof"
                  className="max-w-full h-auto mx-auto"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><text x="50%" y="50%" font-size="20" text-anchor="middle" dy=".3em">Preview not available</text></svg>'
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {showVerificationModal && verificationDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowVerificationModal(false)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium">Verification Details - {verificationDetails.request_id}</h3>
              <button onClick={() => setShowVerificationModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Student Information</h4>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500">Name</dt>
                      <dd className="text-sm font-medium text-gray-900">{verificationDetails.student?.full_name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Register Number</dt>
                      <dd className="text-sm font-medium text-gray-900">{verificationDetails.student?.roll_number}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Email</dt>
                      <dd className="text-sm font-medium text-gray-900">{verificationDetails.student?.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Current Semester</dt>
                      <dd className="text-sm font-medium text-gray-900">{verificationDetails.student?.current_semester}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Phone</dt>
                      <dd className="text-sm font-medium text-gray-900">{verificationDetails.student?.phone}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Department</h4>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500">Name</dt>
                      <dd className="text-sm font-medium text-gray-900">{verificationDetails.department?.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Code</dt>
                      <dd className="text-sm font-medium text-gray-900">{verificationDetails.department?.code}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Fee Details</h4>
                <dl className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <div>
                    <dt className="text-sm text-gray-500">Fee Name</dt>
                    <dd className="text-sm font-medium text-gray-900">{verificationDetails.fee_details?.fee_name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Amount</dt>
                    <dd className="text-sm font-medium text-gray-900">Rs. {verificationDetails.fee_details?.amount}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Due Date</dt>
                    <dd className="text-sm font-medium text-gray-900">{verificationDetails.fee_details?.due_date ? new Date(verificationDetails.fee_details.due_date).toLocaleDateString() : 'N/A'}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Semester & Payment Details</h4>
                <dl className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div>
                    <dt className="text-sm text-gray-500">Semester</dt>
                    <dd className="text-sm font-medium text-gray-900">{verificationDetails.semester?.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Academic Year</dt>
                    <dd className="text-sm font-medium text-gray-900">{verificationDetails.semester?.academic_year}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Amount Paid</dt>
                    <dd className="text-sm font-medium text-gray-900">Rs. {verificationDetails.amount_paid}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Transaction ID</dt>
                    <dd className="text-sm font-medium text-gray-900">{verificationDetails.transaction_id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Bank Name</dt>
                    <dd className="text-sm font-medium text-gray-900">{verificationDetails.bank_name || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">UPI Reference</dt>
                    <dd className="text-sm font-medium text-gray-900">{verificationDetails.upi_reference || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Payment Date</dt>
                    <dd className="text-sm font-medium text-gray-900">{verificationDetails.payment_date ? new Date(verificationDetails.payment_date).toLocaleString() : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Submitted At</dt>
                    <dd className="text-sm font-medium text-gray-900">{verificationDetails.created_at ? new Date(verificationDetails.created_at).toLocaleString() : 'N/A'}</dd>
                  </div>
                </dl>
              </div>

              {verificationDetails.payment_proof && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Payment Screenshot</h4>
                  <img
                    src={`${import.meta.env.VITE_API_URL || ''}${verificationDetails.payment_proof}`}
                    alt="Payment Proof"
                    className="max-w-full h-auto max-h-96 rounded border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><text x="50%" y="50%" font-size="20" text-anchor="middle" dy=".3em">Preview not available</text></svg>'
                    }}
                  />
                </div>
              )}

              {verificationDetails.remarks && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Remarks</h4>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{verificationDetails.remarks}</p>
                </div>
              )}

              {verificationDetails.receipt_number && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Receipt Info</h4>
                  <dl className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div>
                      <dt className="text-sm text-gray-500">Receipt Number</dt>
                      <dd className="text-sm font-medium text-gray-900">{verificationDetails.receipt_number}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Verified By</dt>
                      <dd className="text-sm font-medium text-gray-900">{verificationDetails.verified_by?.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Verified At</dt>
                      <dd className="text-sm font-medium text-gray-900">{verificationDetails.verified_at ? new Date(verificationDetails.verified_at).toLocaleString() : 'N/A'}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {verificationDetails.status === 'pending' && (
                <div className="flex space-x-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowVerificationModal(false)
                      setSelectedPayment(payments?.find((p: any) => p.id === verificationDetails.id) as PaymentRequest)
                      setShowApproveModal(true)
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setShowVerificationModal(false)
                      setSelectedPayment(payments?.find((p: any) => p.id === verificationDetails.id) as PaymentRequest)
                      setShowRejectModal(true)
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedPayment && showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowApproveModal(false)}>
          <div className="bg-white rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Approval</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-blue-400" />
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      Are you sure you want to approve payment <strong>{selectedPayment.request_id || `#${selectedPayment.id}`}</strong>?
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      This will generate a receipt, notify the student, and update the ledger.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowApproveModal(false)}
                   className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Confirm Approval'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPayment && showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Reject Payment</h3>
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <div className="flex">
                  <XCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      Are you sure you want to reject payment <strong>{selectedPayment.request_id || `#${selectedPayment.id}`}</strong>?
                    </p>
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Remarks *</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  placeholder="Please provide a reason for rejection..."
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                   className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejectMutation.isPending || !remarks.trim()}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {rejectMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Confirm Rejection'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}