import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import {
  FileText, Loader2, Check, X, RotateCcw, Download, Eye,
  Search, RefreshCw, AlertCircle, ClipboardList, Users,
  ArrowUpDown, ChevronDown, Clock, CheckCircle2, XCircle, Archive
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { staffDocumentApi, DocumentRequest, DocumentType } from '../../services/documentRequests'

type TabFilter = 'all' | 'pending' | 'approved' | 'returned' | 'rejected'

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; dotColor: string }> = {
  pending: { label: 'Pending Review', color: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20', dotColor: 'bg-yellow-500' },
  approved: { label: 'Approved', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20', dotColor: 'bg-green-500' },
  rejected: { label: 'Rejected', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20', dotColor: 'bg-red-500' },
  returned: { label: 'Returned', color: 'text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/20', dotColor: 'bg-orange-500' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['pending']
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color} ${cfg.bgColor}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
      {cfg.label}
    </span>
  )
}

export default function StaffDocumentsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<TabFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDocType, setSelectedDocType] = useState<number | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'return'>('approve')
  const [reviewRemarks, setReviewRemarks] = useState('')
  const [showDetail, setShowDetail] = useState(false)
  const [previewRequestId, setPreviewRequestId] = useState<number | null>(null)

  const { data: queueData } = useQuery({
    queryKey: ['docWorkQueue'],
    queryFn: async () => { const res = await staffDocumentApi.getWorkQueue(); return res },
    refetchInterval: 30000,
  })

  const { data: docTypesData } = useQuery({
    queryKey: ['docTypesForStaff'],
    queryFn: async () => { const res = await staffDocumentApi.getDocumentTypes(); return res.document_types || [] },
  })

  const { data: requestsData, isLoading, error, refetch } = useQuery({
    queryKey: ['allDocRequests', statusFilter, searchQuery, selectedDocType],
    queryFn: async () => {
      const res = await staffDocumentApi.getAllRequests({
        status: statusFilter === 'all' ? undefined : statusFilter,
        document_type_id: selectedDocType || undefined,
        search: searchQuery || undefined,
        limit: 200,
      })
      return res
    },
  })

  const reviewMutation = useMutation({
    mutationFn: async ({ requestId, status, remarks }: { requestId: number; status: string; remarks: string }) =>
      staffDocumentApi.reviewRequest(requestId, { status, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allDocRequests'] })
      queryClient.invalidateQueries({ queryKey: ['docWorkQueue'] })
      queryClient.invalidateQueries({ queryKey: ['studentDocRequests'] })
      setShowReviewModal(false)
      setSelectedRequest(null)
      setReviewRemarks('')
      toast.success('Request updated successfully')
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0]?.msg : 'Failed to update');
      toast.error(msg);
    },
  })

  const issueMutation = useMutation({
    mutationFn: async (requestId: number) => staffDocumentApi.issueDocument(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allDocRequests'] })
      queryClient.invalidateQueries({ queryKey: ['docWorkQueue'] })
      setShowReviewModal(false)
      setSelectedRequest(null)
      toast.success('Certificate issued successfully')
    },
    onError: (err: any) => {
      if (err.response?.data?.detail === 'Only approved requests can be issued') {
        toast.error('Please approve the request first before issuing')
      } else {
        const detail = err.response?.data?.detail;
        toast.error(typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0]?.msg : 'Failed to issue document'))
      }
    },
  })

  const handleReview = () => {
    if (!selectedRequest) return
    const status = reviewAction === 'approve' ? 'approved' : reviewAction === 'reject' ? 'rejected' : 'returned'
    if ((reviewAction === 'reject' || reviewAction === 'return') && !reviewRemarks.trim()) {
      toast.error('Remarks are required')
      return
    }
    reviewMutation.mutate({ requestId: selectedRequest.id, status, remarks: reviewRemarks || 'Approved' })
  }

  const handlePreview = (req: DocumentRequest) => {
    setPreviewRequestId(req.id)
    setSelectedRequest(req)
  }

  const openReviewModal = (req: DocumentRequest, action: 'approve' | 'reject' | 'return') => {
    setSelectedRequest(req)
    setReviewAction(action)
    setReviewRemarks(req.status === 'pending' ? '' : (req.review_remarks || ''))
    setShowReviewModal(true)
  }

  const openDetail = (req: DocumentRequest) => {
    setSelectedRequest(req)
    setShowDetail(true)
  }

  const requests = requestsData?.requests || []
  const total = requestsData?.total || 0

  const pendingRequiringApproval = requests.filter((r: DocumentRequest) => r.status === 'pending' && r.document_type?.requires_approval)
  const autoApprovable = requests.filter((r: DocumentRequest) => r.status === 'pending' && !r.document_type?.requires_approval)

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Document Requests</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Review, approve, and issue student certificates
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </button>
        </div>
      </div>

      {queueData && (
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Pending Review', value: queueData.pending_document_requests ?? 0, icon: Clock, color: 'bg-yellow-500', href: '/staff/documents' },
              { label: 'Approved', value: queueData.approved_document_requests ?? 0, icon: CheckCircle2, color: 'bg-green-500' },
              { label: 'Returned', value: queueData.returned_document_requests ?? 0, icon: RotateCcw, color: 'bg-orange-500' },
              { label: 'Rejected', value: queueData.rejected_document_requests ?? 0, icon: XCircle, color: 'bg-red-500' },
              { label: 'Total Requests', value: queueData.total_document_requests ?? 0, icon: ClipboardList, color: 'bg-blue-500' },
              { label: 'Archived', value: queueData.archived_requests ?? 0, icon: Archive, color: 'bg-gray-500' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-4">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 ${stat.color} rounded-md p-2.5`}>
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="ml-3 w-0 flex-1">
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">{stat.label}</dt>
                      <dd className="text-xl font-semibold text-gray-900 dark:text-white">{stat.value}</dd>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
              <div className="flex flex-wrap items-center gap-2">
                {(['all', 'pending', 'approved', 'returned', 'rejected'] as TabFilter[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      statusFilter === tab
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {tab === 'pending' && (queueData?.pending_document_requests ?? 0) > 0 && <span className="ml-1.5 bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200 px-1.5 py-0.5 rounded-full text-[10px]">{queueData?.pending_document_requests ?? 0}</span>}
                  </button>
                ))}
              </div>

              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by request #, cert #, student name, roll number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <select
                value={selectedDocType || ''}
                onChange={(e) => setSelectedDocType(e.target.value ? Number(e.target.value) : null)}
                className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm"
              >
                <option value="">All Document Types</option>
                {(docTypesData || []).map((dt: DocumentType) => (
                  <option key={dt.id} value={dt.id}>{dt.name}</option>
                ))}
              </select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">Error loading document requests</div>
            ) : !requests.length ? (
              <div className="text-center py-16">
                <FileText className="mx-auto h-14 w-14 text-gray-300 dark:text-gray-600" />
                <h3 className="mt-3 text-sm font-medium text-gray-900 dark:text-white">No requests found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {statusFilter === 'all' ? 'No document requests in the system yet.' : `No ${statusFilter} requests.`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Request</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Certificate</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Submitted</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {(requests as DocumentRequest[]).map((req: DocumentRequest) => {
                      const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG['pending']
                      const needsApproval = req.document_type?.requires_approval ?? true
                      const isPending = req.status === 'pending'

                      return (
                        <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">{req.request_number}</p>
                              <p className="text-xs text-gray-500 truncate max-w-[180px]">{req.purpose || 'N/A'}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{req.requester_name || 'N/A'}</p>
                              <p className="text-xs text-gray-500 font-mono">{req.roll_number || 'N/A'}</p>
                              {req.department && <p className="text-xs text-gray-400">{req.department}</p>}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div>
                              <p className="text-sm text-gray-900 dark:text-white">{req.document_type?.name || 'N/A'}</p>
                              <p className="text-xs text-gray-500">{req.document_type?.code || ''}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color} ${cfg.bgColor}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                              {cfg.label}
                            </span>
                            {!needsApproval && isPending && (
                              <span className="ml-1.5 text-[10px] italic text-gray-400">(auto)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {req.certificate_number ? (
                              <span className="font-mono text-xs text-green-700 dark:text-green-400">{req.certificate_number}</span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                            {req.created_at ? new Date(req.created_at).toLocaleDateString('en-IN') : 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openDetail(req)}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {isPending && (
                                <>
                                  <button
                                    onClick={() => openReviewModal(req, 'approve')}
                                    className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md"
                                    title="Approve"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => openReviewModal(req, 'return')}
                                    className="p-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-md"
                                    title="Return for Correction"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => openReviewModal(req, 'reject')}
                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md"
                                    title="Reject"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              {req.status === 'approved' && !req.certificate_number && (
                                <button
                                  onClick={() => { setSelectedRequest(req); issueMutation.mutate(req.id) }}
                                  disabled={issueMutation.isPending}
                                  className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md disabled:opacity-50"
                                  title="Issue Certificate"
                                >
                                  {issueMutation.isPending && selectedRequest?.id === req.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                              {req.certificate_number && (
                                <button
                                  onClick={() => { setSelectedRequest(req); setPreviewRequestId(req.id) }}
                                  className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-md"
                                  title="Preview Certificate"
                                >
                                  <FileText className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div className="px-4 py-3 border-t dark:border-gray-700 flex items-center justify-between">
                  <p className="text-xs text-gray-500">Showing {requests.length} of {total} requests</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showReviewModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  {reviewAction === 'approve' ? <><CheckCircle2 className="h-5 w-5 text-green-500" />Approve Request</> :
                   reviewAction === 'reject' ? <><XCircle className="h-5 w-5 text-red-500" />Reject Request</> :
                   <><RotateCcw className="h-5 w-5 text-orange-500" />Return for Correction</>}
                </h3>
                <button onClick={() => { setShowReviewModal(false); setSelectedRequest(null) }} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
                <p className="text-sm"><span className="font-medium text-gray-700 dark:text-gray-300">Request:</span> <span className="font-mono text-xs">{selectedRequest.request_number}</span></p>
                <p className="text-sm mt-1"><span className="font-medium text-gray-700 dark:text-gray-300">Student:</span> {selectedRequest.requester_name} ({selectedRequest.roll_number})</p>
                <p className="text-sm mt-1"><span className="font-medium text-gray-700 dark:text-gray-300">Type:</span> {selectedRequest.document_type?.name}</p>
                <p className="text-sm mt-1"><span className="font-medium text-gray-700 dark:text-gray-300">Purpose:</span> {selectedRequest.purpose || 'N/A'}</p>
                <p className="text-sm mt-1"><span className="font-medium text-gray-700 dark:text-gray-300">Reason:</span> {selectedRequest.reason || 'N/A'}</p>
              </div>

              {reviewAction !== 'approve' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Remarks {reviewAction === 'reject' && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    rows={3}
                    placeholder={reviewAction === 'reject' ? 'Reason for rejection is mandatory...' : 'Provide correction instructions...'}
                  />
                </div>
              )}

              {reviewAction === 'approve' && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    After approval, you can issue the certificate from the list.
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setShowReviewModal(false); setSelectedRequest(null) }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReview}
                  disabled={reviewMutation.isPending}
                  className={`px-5 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white disabled:opacity-50 ${
                    reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                    reviewAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  {reviewMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2 inline" />Processing...</> :
                   reviewAction === 'approve' ? 'Approve' : reviewAction === 'reject' ? 'Reject' : 'Return for Correction'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetail && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Request Detail</h3>
                <button onClick={() => { setShowDetail(false); setSelectedRequest(null) }} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-xs text-gray-500">Request Number</span><p className="text-sm font-mono font-medium">{selectedRequest.request_number}</p></div>
                  <div><span className="text-xs text-gray-500">Certificate Number</span><p className="text-sm font-mono font-medium">{selectedRequest.certificate_number || 'Not issued yet'}</p></div>
                  <div><span className="text-xs text-gray-500">Student Name</span><p className="text-sm font-medium">{selectedRequest.requester_name}</p></div>
                  <div><span className="text-xs text-gray-500">Register Number</span><p className="text-sm font-mono">{selectedRequest.roll_number}</p></div>
                  <div><span className="text-xs text-gray-500">Department</span><p className="text-sm">{selectedRequest.department || 'N/A'}</p></div>
                  <div><span className="text-xs text-gray-500">Semester</span><p className="text-sm">{selectedRequest.semester || 'N/A'}</p></div>
                  <div><span className="text-xs text-gray-500">Document Type</span><p className="text-sm font-medium">{selectedRequest.document_type?.name || 'N/A'}</p></div>
                  <div><span className="text-xs text-gray-500">Status</span><p className="text-sm"><StatusBadge status={selectedRequest.status} /></p></div>
                  <div><span className="text-xs text-gray-500">Purpose</span><p className="text-sm">{selectedRequest.purpose || 'N/A'}</p></div>
                  <div><span className="text-xs text-gray-500">Required By</span><p className="text-sm">{selectedRequest.required_date ? new Date(selectedRequest.required_date).toLocaleDateString() : 'N/A'}</p></div>
                  <div className="col-span-2"><span className="text-xs text-gray-500">Reason</span><p className="text-sm">{selectedRequest.reason || 'N/A'}</p></div>
                  {selectedRequest.review_remarks && <div className="col-span-2"><span className="text-xs text-gray-500">Remarks</span><p className="text-sm italic">"{selectedRequest.review_remarks}"</p></div>}
                  {selectedRequest.reviewer_name && <div><span className="text-xs text-gray-500">Reviewed By</span><p className="text-sm">{selectedRequest.reviewer_name}</p></div>}
                  {selectedRequest.issuer_name && <div><span className="text-xs text-gray-500">Issued By</span><p className="text-sm">{selectedRequest.issuer_name}</p></div>}
                  {selectedRequest.verification_code && <div><span className="text-xs text-gray-500">Verification Code</span><p className="text-sm font-mono">{selectedRequest.verification_code}</p></div>}
                </div>
                <button onClick={() => { setShowDetail(false); setSelectedRequest(null) }} className="w-full mt-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
