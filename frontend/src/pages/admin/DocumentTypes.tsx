import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  FileText, Loader2, Plus, X, Pencil, Trash2, CheckCircle2,
  AlertCircle, Archive, Settings, Search
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { adminDocumentApi, DocumentType } from '../../services/documentRequests'

const DEFAULT_DOCUMENT_TYPES = [
  {
    code: 'BONAFIDE',
    name: 'Bonafide Certificate',
    description: 'Certificate of status/study verification for passport, visa, or scholarship applications',
    requires_approval: true,
    validity_days: 365,
    certificate_prefix: 'CERT',
    certificate_title: 'Bonafide Certificate',
    allowed_purposes: ['Passport', 'Visa', 'Scholarship', 'Bank Loan', 'Other'],
  },
  {
    code: 'CONDUCT',
    name: 'Conduct Certificate',
    description: 'Certificate of good conduct and character',
    requires_approval: true,
    validity_days: 365,
    certificate_prefix: 'CERT',
    certificate_title: 'Conduct Certificate',
    allowed_purposes: ['Higher Studies', 'Employment', 'Visa', 'Other'],
  },
  {
    code: 'FEE_PAID',
    name: 'Fee Paid Certificate',
    description: 'Certificate confirming all fees are paid',
    requires_approval: true,
    validity_days: 180,
    certificate_prefix: 'CERT',
    certificate_title: 'Fee Paid Certificate',
    allowed_purposes: ['Visa', 'Scholarship', 'Loan', 'Other'],
  },
  {
    code: 'INTERNSHIP',
    name: 'Internship Permission Letter',
    description: 'Letter permitting internship or project work outside campus',
    requires_approval: true,
    validity_days: 90,
    certificate_prefix: 'CERT',
    certificate_title: 'Internship Permission Letter',
    allowed_purposes: ['Summer Internship', 'Winter Internship', 'Project Work', 'Other'],
  },
  {
    code: 'COURSE_COMPLETION',
    name: 'Course Completion Certificate',
    description: 'Certificate confirming completion of course/program',
    requires_approval: false,
    validity_days: null,
    certificate_prefix: 'CERT',
    certificate_title: 'Course Completion Certificate',
    allowed_purposes: ['Higher Studies', 'Employment', 'Other'],
  },
]

export default function AdminDocumentTypesPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    is_active: true,
    requires_approval: true,
    validity_days: '',
    certificate_prefix: 'CERT',
    certificate_title: '',
    allowed_purposes: '',
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['documentTypesAdmin'],
    queryFn: async () => { const res = await adminDocumentApi.getDocumentTypes(); return res.document_types || [] },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => adminDocumentApi.createDocumentType(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['documentTypesAdmin'] }); setShowForm(false); resetForm(); toast.success('Document type created') },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0]?.msg : 'Failed to create'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminDocumentApi.updateDocumentType(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['documentTypesAdmin'] }); setEditingId(null); resetForm(); toast.success('Document type updated') },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0]?.msg : 'Failed to update'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminDocumentApi.deleteDocumentType(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['documentTypesAdmin'] }); toast.success('Document type deactivated') },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0]?.msg : 'Failed to deactivate'))
    },
  })

  const resetForm = () => {
    setFormData({ code: '', name: '', description: '', is_active: true, requires_approval: true, validity_days: '', certificate_prefix: 'CERT', certificate_title: '', allowed_purposes: '' })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.code || !formData.name || !formData.certificate_title) {
      toast.error('Code, Name, and Certificate Title are required')
      return
    }
    const payload: any = { ...formData }
    if (payload.validity_days === '' || payload.validity_days === null) payload.validity_days = null
    else payload.validity_days = Number(payload.validity_days)
    if (typeof payload.allowed_purposes === 'string') {
      payload.allowed_purposes = payload.allowed_purposes.split(',').map((s: string) => s.trim()).filter(Boolean)
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const startEdit = (dt: DocumentType) => {
    setEditingId(dt.id)
    setFormData({
      code: dt.code,
      name: dt.name,
      description: dt.description || '',
      is_active: dt.is_active,
      requires_approval: dt.requires_approval,
      validity_days: dt.validity_days?.toString() || '',
      certificate_prefix: dt.certificate_prefix,
      certificate_title: dt.certificate_title,
      allowed_purposes: '',
    })
    setShowForm(true)
  }

  const seedDefaults = async () => {
    for (const dt of DEFAULT_DOCUMENT_TYPES) {
      try {
        await fetch('/api/v1/admin/document-types/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify({
            ...dt,
            is_active: true,
            description: dt.description,
            allowed_purposes: JSON.stringify(dt.allowed_purposes),
            template_fields: JSON.stringify({}),
          }),
        }).then(r => { if (!r.ok) throw new Error('Failed') })
      } catch (e: any) {
        if (e.response?.status !== 400) console.error(e)
      }
    }
    queryClient.invalidateQueries({ queryKey: ['documentTypesAdmin'] })
    toast.success('Default document types seeded')
  }

  const filteredTypes = (data as DocumentType[] || []).filter((dt: DocumentType) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return dt.name.toLowerCase().includes(q) || dt.code.toLowerCase().includes(q) || (dt.description || '').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Document Templates</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage document types, templates, and approval workflows</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={seedDefaults}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200"
            >
              <Settings className="h-4 w-4 mr-2" />Seed Defaults
            </button>
            <button
              onClick={() => { setEditingId(null); resetForm(); setShowForm(!showForm) }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              {showForm ? <><X className="h-4 w-4 mr-2" />Cancel</> : <><Plus className="h-4 w-4 mr-2" />Add Document Type</>}
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {editingId ? 'Edit Document Type' : 'Add New Document Type'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    required
                    disabled={!!editingId}
                    placeholder="e.g., BONAFIDE"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    required
                    placeholder="e.g., Bonafide Certificate"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certificate Title *</label>
                  <input
                    type="text"
                    value={formData.certificate_title}
                    onChange={(e) => setFormData({ ...formData, certificate_title: e.target.value })}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    required
                    placeholder="e.g., Bonafide Certificate"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certificate Prefix</label>
                  <input
                    type="text"
                    value={formData.certificate_prefix}
                    onChange={(e) => setFormData({ ...formData, certificate_prefix: e.target.value })}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    placeholder="e.g., CERT"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Validity (days)</label>
                  <input
                    type="number"
                    value={formData.validity_days}
                    onChange={(e) => setFormData({ ...formData, validity_days: e.target.value })}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    placeholder="e.g., 365"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Allowed Purposes (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.allowed_purposes}
                    onChange={(e) => setFormData({ ...formData, allowed_purposes: e.target.value })}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    placeholder="e.g., Passport, Visa, Scholarship, Other"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                  rows={2}
                  placeholder="Describe this document type..."
                />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.requires_approval}
                    onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Requires Staff Approval</span>
                </label>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); setEditingId(null) }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2 inline" />Saving...</>
                  ) : (
                    editingId ? 'Update Template' : 'Create Template'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="mb-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">Error loading document types</div>
            ) : !filteredTypes.length ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2">No document types found. Click "Seed Defaults" to add standard types.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Approval</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Validity</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {(filteredTypes as DocumentType[]).map((dt: DocumentType) => (
                      <tr key={dt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono font-medium text-gray-900 dark:text-white">{dt.code}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">{dt.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{dt.certificate_title}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${dt.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400'}`}>
                            {dt.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${dt.requires_approval ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-400'}`}>
                            {dt.requires_approval ? 'Required' : 'Auto'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-600 dark:text-gray-400">
                          {dt.validity_days ? `${dt.validity_days} days` : 'Permanent'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEdit(dt)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => { if (confirm('Deactivate this document type?')) deleteMutation.mutate(dt.id) }}
                              disabled={deleteMutation.isPending}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md disabled:opacity-50"
                              title="Deactivate"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
