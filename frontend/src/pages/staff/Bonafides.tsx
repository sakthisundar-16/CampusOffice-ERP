import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useState } from 'react'
import { FileCheck, Loader2, Check, X, Download } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function StaffBonafides() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [remarks, setRemarks] = useState('')

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ['staffBonafides', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      const response = await api.get(`/api/v1/staff/bonafides?${params.toString()}`)
      return response.data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ requestId, status, remarks }: { requestId: number; status: string; remarks: string }) => {
      const response = await api.put(`/api/v1/staff/bonafides/${requestId}`, { status, remarks })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffBonafides'] })
      setShowApproveModal(false)
      setShowRejectModal(false)
      setSelectedRequest(null)
      setRemarks('')
      toast.success('Request updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update request')
    },
  })

  const handleApprove = () => {
    if (selectedRequest) {
      updateMutation.mutate({ requestId: selectedRequest.id, status: 'approved', remarks: remarks || 'Approved' })
    }
  }

  const handleReject = () => {
    if (selectedRequest && remarks.trim()) {
      updateMutation.mutate({ requestId: selectedRequest.id, status: 'rejected', remarks })
    } else {
      toast.error('Remarks are required for rejection')
    }
  }

  const handleDownloadCertificate = async (request: any) => {
    try {
      const response = await api.get(`/api/v1/files/bonafide/${request.id}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `bonafide_${request.id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Certificate downloaded')
    } catch (error) {
      toast.error('Failed to download certificate')
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
        Error loading requests
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Bonafide Requests</h1>
          <p className="mt-1 text-sm text-gray-500">Review and approve student bonafide requests</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex space-x-2 mb-4">
              {['all', 'pending', 'approved', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {requests?.map((request: any) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">Request #{request.id}</p>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          request.status === 'approved' ? 'bg-green-100 text-green-800' :
                          request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        <strong>Student:</strong> {request.user?.full_name || 'N/A'} ({request.user?.student_id || 'N/A'})
                      </p>
                      {request.purpose && (
                        <p className="text-sm text-gray-500 mt-1"><strong>Purpose:</strong> {request.purpose}</p>
                      )}
                      {request.reason && (
                        <p className="text-sm text-gray-500 mt-1"><strong>Reason:</strong> {request.reason}</p>
                      )}
                      {request.required_date && (
                        <p className="text-sm text-gray-500 mt-1">
                          <strong>Required Date:</strong> {new Date(request.required_date).toLocaleDateString()}
                        </p>
                      )}
                      {request.remarks && (
                        <p className="text-sm text-gray-700 mt-2 italic">
                          <strong>Remarks:</strong> {request.remarks}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Submitted: {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="ml-4 flex space-x-2">
                      {request.status === 'approved' && request.certificate_path && (
                        <button
                          onClick={() => handleDownloadCertificate(request)}
                          className="text-blue-600 hover:text-blue-600/80"
                          title="Download Certificate"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => { setSelectedRequest(request); setShowApproveModal(true) }}
                            className="text-green-600 hover:text-green-800"
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setSelectedRequest(request); setShowRejectModal(true) }}
                            className="text-red-600 hover:text-red-800"
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                          </button>
                         </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Approve Bonafide Request</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to approve this request? This will generate a certificate and notify the student.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Optional)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                rows={3}
                placeholder="Remarks..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => { setShowApproveModal(false); setRemarks(''); }}
                className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Reject Bonafide Request</h3>
            <p className="text-sm text-gray-500 mb-4">
              Please enter a reason for rejecting this request.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Required) *</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-600 focus:ring-red-500"
                rows={3}
                placeholder="Reason for rejection..."
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => { setShowRejectModal(false); setRemarks(''); }}
                className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                disabled={!remarks.trim()}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
