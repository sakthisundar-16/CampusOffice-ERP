import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useState } from 'react'
import { Plus, Loader2, Edit, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Semester {
  id: number
  name: string
  academic_year: string
  start_date: string
  end_date: string
  is_current: boolean
  created_at: string
  updated_at: string
}

export default function AdminSemesters() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingSem, setEditingSem] = useState<Semester | null>(null)
  const [formData, setFormData] = useState({ name: '', academic_year: '', start_date: '', end_date: '', is_current: false })

  const { data: semesters, isLoading } = useQuery({
    queryKey: ['adminSemesters'],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/semesters')
      return response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; academic_year: string; start_date: string; end_date: string; is_current: boolean }) => {
      const response = await api.post('/api/v1/admin/semesters', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSemesters'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      setShowForm(false)
      setFormData({ name: '', academic_year: '', start_date: '', end_date: '', is_current: false })
      toast.success('Semester created successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create semester')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ semId, data }: { semId: number; data: { name: string; academic_year: string; start_date: string; end_date: string; is_current: boolean } }) => {
      const response = await api.put(`/api/v1/admin/semesters/${semId}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSemesters'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      setShowForm(false)
      setEditingSem(null)
      setFormData({ name: '', academic_year: '', start_date: '', end_date: '', is_current: false })
      toast.success('Semester updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update semester')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (semId: number) => {
      const response = await api.delete(`/api/v1/admin/semesters/${semId}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSemesters'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      toast.success('Semester deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete semester')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingSem) {
      updateMutation.mutate({ semId: editingSem.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (sem: Semester) => {
    setEditingSem(sem)
    setFormData({ name: sem.name, academic_year: sem.academic_year, start_date: sem.start_date, end_date: sem.end_date, is_current: sem.is_current })
    setShowForm(true)
  }

  const handleDelete = (semId: number) => {
    if (window.confirm('Are you sure you want to delete this semester?')) {
      deleteMutation.mutate(semId)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Semesters</h1>
            <p className="mt-1 text-sm text-gray-500">Manage academic semesters</p>
          </div>
            <button
              onClick={() => { setShowForm(true); setEditingSem(null); setFormData({ name: '', academic_year: '', start_date: '', end_date: '', is_current: false }) }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Semester
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {showForm && (
          <div className="mb-6 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{editingSem ? 'Edit Semester' : 'New Semester'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Semester Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    placeholder="e.g., 2024-2025-FALL"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Academic Year *</label>
                  <input
                    type="text"
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    placeholder="e.g., 2025-2026"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Is Current</label>
                  <input
                    type="checkbox"
                    checked={formData.is_current}
                    onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                    className="mt-4 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    editingSem ? 'Update' : 'Create'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingSem(null); setFormData({ name: '', academic_year: '', start_date: '', end_date: '', is_current: false }) }}
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Academic Year</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {semesters?.map((sem: Semester) => (
                    <tr key={sem.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{sem.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sem.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sem.academic_year}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(sem.start_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(sem.end_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {sem.is_current ? <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Yes</span> : 'No'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button onClick={() => handleEdit(sem)} className="text-blue-600 hover:text-blue-600/80">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(sem.id)} className="text-red-600 hover:text-red-800">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!semesters?.length && (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No semesters found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
