import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useState, useRef, useEffect } from 'react'
import {
  FileText, Loader2, Plus, X, Check, XCircle, RotateCcw,
  Download, Eye, Search, Filter, ChevronDown, Calendar,
  FileCheck, AlertCircle, Archive, ArrowRight, ClipboardList,
  ShieldCheck, HelpCircle, Clock
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { documentRequestApi, DocumentRequest, DocumentType, DocumentRequestFormData } from '../../services/documentRequests'
import { SkeletonPage } from '../../components/ui'

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'returned'

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  pending: { label: 'Pending Review', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Clock },
  approved: { label: 'Approved', color: 'text-green-700', bgColor: 'bg-green-100', icon: Check },
  rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle },
  returned: { label: 'Returned', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: RotateCcw },
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['pending']
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

function Timeline({ history }: { history?: DocumentRequest['history'] }) {
  if (!history || history.length === 0) return null
  return (
    <div className="space-y-3">
      {history.map((event, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            {i < history.length - 1 && <div className="w-0.5 h-8 bg-gray-200 dark:bg-gray-700 mt-1" />}
          </div>
          <div className="pb-4">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{event.event}</p>
            {event.timestamp && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(event.timestamp).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
            )}
            {event.notes && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">{event.notes}</p>}
            {event.reviewed_by && <p className="text-xs text-gray-500 mt-0.5">By: {event.reviewed_by}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function StudentDocumentsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [formData, setFormData] = useState<DocumentRequestFormData>({
    document_type_id: 0,
    purpose: '',
    reason: '',
    required_date: '',
    additional_notes: '',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const { data: docTypesData } = useQuery({
    queryKey: ['documentTypes'],
    queryFn: async () => {
      const res = await documentRequestApi.getDocumentTypes()
      return res.document_types || []
    },
  })

  const { data: requestsData, isLoading, error } = useQuery({
    queryKey: ['studentDocRequests', statusFilter],
    queryFn: async () => {
      const res = await documentRequestApi.getStudentRequests(statusFilter === 'all' ? undefined : statusFilter)
      return res.requests || []
    },
  })

  const { data: historyData } = useQuery({
    queryKey: ['documentHistory'],
    queryFn: async () => {
      const res = await documentRequestApi.getDocumentHistory()
      return res.history || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: DocumentRequestFormData) => documentRequestApi.createRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentDocRequests'] })
      queryClient.invalidateQueries({ queryKey: ['studentDashboard'] })
      queryClient.invalidateQueries({ queryKey: ['documentHistory'] })
      setShowForm(false)
      resetForm()
      toast.success('Document request submitted successfully!')
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0]?.msg : 'Failed to submit request'))
    },
  })

  const detailMutation = useMutation({
    mutationFn: async (id: number) => documentRequestApi.getRequestDetail(id),
    onSuccess: (data) => {
      setSelectedRequest(data)
      setShowDetail(true)
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0]?.msg : 'Failed to load details'))
    },
  })

  const downloadMutation = useMutation({
    mutationFn: async (id: number) => documentRequestApi.downloadCertificate(id),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(new Blob([blob]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `certificate_${selectedRequest?.certificate_number || 'document'}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Certificate downloaded successfully!')
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0]?.msg : 'Failed to download certificate'))
    },
  })

  const resetForm = () => {
    setFormData({ document_type_id: 0, purpose: '', reason: '', required_date: '', additional_notes: '' })
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.document_type_id) {
      toast.error('Please select a document type')
      return
    }
    if (!formData.purpose || !formData.reason || !formData.required_date) {
      toast.error('Please fill in all required fields')
      return
    }
    createMutation.mutate(formData)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setPreviewUrl(base64)
      setFormData({ ...formData, attachment: base64 })
    }
    reader.readAsDataURL(file)
  }

  const openDetail = (req: DocumentRequest) => {
    detailMutation.mutate(req.id)
  }

  const handleDownload = (req: DocumentRequest) => {
    setSelectedRequest(req)
    downloadMutation.mutate(req.id)
  }

  const selectedDocType = docTypesData?.find((dt: DocumentType) => dt.id === formData.document_type_id)
  const availablePurposes = selectedDocType?.allowed_purposes || []

  const pendingCount = requestsData?.filter((r: DocumentRequest) => r.status === 'pending').length || 0
  const approvedCount = requestsData?.filter((r: DocumentRequest) => r.status === 'approved').length || 0
  const rejectedCount = requestsData?.filter((r: DocumentRequest) => r.status === 'rejected').length || 0
  const returnedCount = requestsData?.filter((r: DocumentRequest) => r.status === 'returned').length || 0

  const totalHistory = historyData?.length || 0

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Document Requests</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Request and track certificates — Bonafide, Conduct, Fee Paid, and more
            </p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); if (showForm) resetForm() }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            {showForm ? <><X className="h-4 w-4 mr-2" />Cancel</> : <><Plus className="h-4 w-4 mr-2" />New Request</>}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-blue-600" />
              New Document Request
            </h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document Type *</label>
                  <select
                    value={formData.document_type_id}
                    onChange={(e) => setFormData({ ...formData, document_type_id: Number(e.target.value) })}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    required
                  >
                    <option value={0}>Select Document Type</option>
                    {(docTypesData || []).map((dt: DocumentType) => (
                      <option key={dt.id} value={dt.id}>{dt.name}</option>
                    ))}
                  </select>
                  {selectedDocType && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{selectedDocType.description}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purpose *</label>
                  <select
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    required
                    disabled={!selectedDocType}
                  >
                    <option value="">Select Purpose</option>
                    {availablePurposes.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason *</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    rows={3}
                    required
                    placeholder="Explain why you need this document..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Required By *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      value={formData.required_date}
                      onChange={(e) => setFormData({ ...formData, required_date: e.target.value })}
                      className="pl-10 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Notes</label>
                <textarea
                  value={formData.additional_notes}
                  onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                  rows={2}
                  placeholder="Any additional information (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attachment (Optional)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
                />
                {previewUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Attachment ready to upload</span>
                    <button
                      type="button"
                      onClick={() => { setPreviewUrl(null); setFormData({ ...formData, attachment: undefined }); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      className="ml-auto text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">PDF, JPG, or PNG. Max 5MB.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="inline-flex justify-center items-center px-5 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting...</>
                  ) : (
                    <><Plus className="h-4 w-4 mr-2" />Submit Request</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm() }}
                  className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                  Your Requests
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  All {totalHistory} request{(totalHistory !== 1) && 's'} you have made
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(['all', 'pending', 'approved', 'rejected', 'returned'] as StatusFilter[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      statusFilter === s
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                    {s === 'all' && ` (${totalHistory})`}
                    {s === 'pending' && pendingCount > 0 && ` (${pendingCount})`}
                    {s === 'approved' && approvedCount > 0 && ` (${approvedCount})`}
                    {s === 'rejected' && rejectedCount > 0 && ` (${rejectedCount})`}
                    {s === 'returned' && returnedCount > 0 && ` (${returnedCount})`}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <SkeletonPage />
            ) : error ? (
              <div className="text-center py-12 text-red-500">Error loading requests</div>
            ) : !requestsData?.length ? (
              <div className="text-center py-16">
                <FileText className="mx-auto h-14 w-14 text-gray-300 dark:text-gray-600" />
                <h3 className="mt-3 text-sm font-medium text-gray-900 dark:text-white">No requests found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {statusFilter === 'all' ? "You haven't submitted any document requests yet." : `No ${statusFilter} requests.`}
                </p>
                {statusFilter === 'all' && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Submit Your First Request
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {(requestsData as DocumentRequest[]).map((req: DocumentRequest) => {
                  const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG['pending']
                  return (
                    <div
                      key={req.id}
                      className={`relative border rounded-xl p-4 transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${
                        req.status === 'approved' ? 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10' :
                        req.status === 'rejected' ? 'border-red-200 dark:border-red-800 bg-red-50/20 dark:bg-red-900/10' :
                        req.status === 'returned' ? 'border-orange-200 dark:border-orange-800 bg-orange-50/20 dark:bg-orange-900/10' :
                        'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                              {req.request_number}
                            </span>
                            <StatusBadge status={req.status} />
                            {req.document_type && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                {req.document_type.name}
                              </span>
                            )}
                          </div>

                          {req.document_type && (
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {req.document_type.certificate_title}
                            </p>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2">
                            {req.purpose && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Purpose:</span> {req.purpose}
                              </p>
                            )}
                            {req.required_date && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                <span className="font-medium text-gray-700 dark:text-gray-300">Required:</span> {new Date(req.required_date).toLocaleDateString()}
                              </p>
                            )}
                            {req.certificate_number && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Cert No:</span> {req.certificate_number}
                              </p>
                            )}
                            {req.issued_at && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Issued:</span> {new Date(req.issued_at).toLocaleDateString()}
                              </p>
                            )}
                            {req.review_remarks && (
                              <p className="text-sm text-gray-700 dark:text-gray-300 italic col-span-full border-l-2 border-gray-300 dark:border-gray-600 pl-3">
                                "{req.review_remarks}"
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                            Submitted: {new Date(req.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>

                        <div className="flex lg:flex-col gap-2 lg:items-end">
                          <button
                            onClick={() => openDetail(req)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"
                          >
                            <Eye className="h-3.5 w-3.5" />Details
                          </button>
                          {req.status === 'approved' && req.certificate_path && (
                            <button
                              onClick={() => handleDownload(req)}
                              disabled={downloadMutation.isPending}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                            >
                              <Download className="h-3.5 w-3.5" />
                              {downloadMutation.isPending && selectedRequest?.id === req.id ? 'Downloading...' : 'Download'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showDetail && selectedRequest && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                Request Details
              </h3>
              <button onClick={() => { setShowDetail(false); setSelectedRequest(null) }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {detailMutation.isPending ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : selectedRequest ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><span className="text-xs text-gray-500">Request Number</span><p className="text-sm font-mono font-medium text-gray-900 dark:text-white">{selectedRequest.request_number}</p></div>
                  <div><span className="text-xs text-gray-500">Status</span><p className="mt-0.5"><StatusBadge status={selectedRequest.status} /></p></div>
                  <div><span className="text-xs text-gray-500">Document Type</span><p className="text-sm font-medium text-gray-900 dark:text-white">{selectedRequest.document_type?.name || 'N/A'}</p></div>
                  <div><span className="text-xs text-gray-500">Certificate Number</span><p className="text-sm font-mono font-medium text-gray-900 dark:text-white">{selectedRequest.certificate_number || 'Not yet issued'}</p></div>
                  <div><span className="text-xs text-gray-500">Purpose</span><p className="text-sm text-gray-900 dark:text-white">{selectedRequest.purpose || 'N/A'}</p></div>
                  <div><span className="text-xs text-gray-500">Required By</span><p className="text-sm text-gray-900 dark:text-white">{selectedRequest.required_date ? new Date(selectedRequest.required_date).toLocaleDateString() : 'N/A'}</p></div>
                  <div className="sm:col-span-2"><span className="text-xs text-gray-500">Reason</span><p className="text-sm text-gray-900 dark:text-white">{selectedRequest.reason || 'N/A'}</p></div>
                  {selectedRequest.review_remarks && (
                    <div className="sm:col-span-2"><span className="text-xs text-gray-500">Remarks</span><p className="text-sm text-gray-700 dark:text-gray-300 italic">"{selectedRequest.review_remarks}"</p></div>
                  )}
                  {selectedRequest.verification_code && (
                    <div className="sm:col-span-2"><span className="text-xs text-gray-500">Verification Code</span><p className="text-sm font-mono text-gray-900 dark:text-white">{selectedRequest.verification_code}</p></div>
                  )}
                </div>

                {selectedRequest.history && selectedRequest.history.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Request Timeline</h4>
                    <Timeline history={selectedRequest.history} />
                  </div>
                )}

                {selectedRequest.status === 'approved' && selectedRequest.certificate_path && (
                  <div className="pt-4 border-t dark:border-gray-700">
                    <button
                      onClick={() => handleDownload(selectedRequest)}
                      disabled={downloadMutation.isPending}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloadMutation.isPending ? 'Downloading...' : 'Download Certificate'}
                    </button>
                  </div>
                )}

                {selectedRequest.status === 'returned' && (
                  <div className="pt-4 border-t dark:border-gray-700">
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-4">
                      <div className="flex gap-3">
                        <HelpCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-orange-800 dark:text-orange-400">Action Required</h4>
                          <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                            {selectedRequest.review_remarks || 'Please review and resubmit your request with corrected information.'}
                          </p>
                          <button
                            onClick={() => { setShowDetail(false); setSelectedRequest(null) }}
                            className="mt-3 inline-flex items-center px-3 py-1.5 border border-orange-300 rounded-md text-xs font-medium text-orange-700 bg-white dark:bg-gray-800 dark:text-orange-400 hover:bg-orange-50"
                          >
                            <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                            Resubmit Request
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Failed to load details.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
