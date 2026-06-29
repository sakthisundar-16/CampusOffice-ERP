import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useState } from 'react'
import { FileCheck, Loader2, Calendar, FileText, Download } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function StudentBonafide() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    purpose: '',
    reason: '',
    required_date: '',
    additional_notes: '',
  })

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ['bonafides'],
    queryFn: async () => {
      const response = await api.get('/api/v1/student/bonafides')
      return response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/v1/student/bonafide', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonafides'] })
      queryClient.invalidateQueries({ queryKey: ['studentDashboard'] })
      setShowForm(false)
      setFormData({ purpose: '', reason: '', required_date: '', additional_notes: '' })
      toast.success('Bonafide request submitted successfully')
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : 'Failed to submit request')
      toast.error(msg)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...formData,
      required_date: formData.required_date ? new Date(formData.required_date).toISOString() : null,
    }
    createMutation.mutate(payload)
  }

  const handleDownload = async (requestId: number, certificatePath: string) => {
    try {
      const response = await api.get(`/api/v1/files/bonafide/${requestId}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `bonafide_${requestId}.pdf`)
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bonafide Requests</h1>
            <p className="mt-1 text-sm text-gray-500">Apply for bonafide certificates</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <FileCheck className="h-4 w-4 mr-2" />
            New Request
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {showForm && (
          <div className="mb-6 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">New Bonafide Request</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Purpose *</label>
                  <select
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Purpose</option>
                    <option value="Passport">Passport</option>
                    <option value="Visa">Visa</option>
                    <option value="Scholarship">Scholarship</option>
                    <option value="Bank Loan">Bank Loan</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Required Date *</label>
                  <input
                    type="date"
                    value={formData.required_date}
                    onChange={(e) => setFormData({ ...formData, required_date: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason *</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
                <textarea
                  value={formData.additional_notes}
                  onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Submit Request'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                   className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Your Requests</h3>
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
                        <strong>Purpose:</strong> {request.purpose}
                      </p>
                      {request.reason && (
                        <p className="text-sm text-gray-500 mt-1">
                          <strong>Reason:</strong> {request.reason}
                        </p>
                      )}
                      {request.required_date && (
                        <p className="text-sm text-gray-500 mt-1 flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Required: {new Date(request.required_date).toLocaleDateString()}
                        </p>
                      )}
                      {request.additional_notes && (
                        <p className="text-sm text-gray-500 mt-1">
                          <strong>Notes:</strong> {request.additional_notes}
                        </p>
                      )}
                      {request.remarks && (
                        <p className="text-sm text-gray-700 mt-2 italic">
                          Remarks: {request.remarks}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Submitted: {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {request.status === 'approved' && request.certificate_path && (
                      <button
                        onClick={() => handleDownload(request.id, request.certificate_path)}
                        className="ml-4 inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Certificate
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!requests?.length && (
                <div className="text-center py-12">
                  <FileCheck className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No requests</h3>
                  <p className="mt-1 text-sm text-gray-500">You haven't submitted any bonafide requests.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}