import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useState } from 'react'
import { Plus, Loader2, Edit, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Department {
  id: number
  name: string
  code: string
  created_at: string
  updated_at: string
}

export default function AdminDepartments() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [formData, setFormData] = useState({ name: '', code: '' })

  const { data: departments, isLoading } = useQuery({
    queryKey: ['adminDepartments'],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/departments')
      return response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; code: string }) => {
      const response = await api.post('/api/v1/admin/departments', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDepartments'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      setShowForm(false)
      setFormData({ name: '', code: '' })
      toast.success('Department created successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create department')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ deptId, data }: { deptId: number; data: { name: string; code: string } }) => {
      const response = await api.put(`/api/v1/admin/departments/${deptId}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDepartments'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      setShowForm(false)
      setEditingDept(null)
      setFormData({ name: '', code: '' })
      toast.success('Department updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update department')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (deptId: number) => {
      const response = await api.delete(`/api/v1/admin/departments/${deptId}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDepartments'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      toast.success('Department deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete department')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingDept) {
      updateMutation.mutate({ deptId: editingDept.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (dept: Department) => {
    setEditingDept(dept)
    setFormData({ name: dept.name, code: dept.code })
    setShowForm(true)
  }

  const handleDelete = (deptId: number) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      deleteMutation.mutate(deptId)
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
            <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
            <p className="mt-1 text-sm text-gray-500">Manage academic departments</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingDept(null); setFormData({ name: '', code: '' }) }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Department
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {showForm && (
          <div className="mb-6 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{editingDept ? 'Edit Department' : 'New Department'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
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
                    editingDept ? 'Update' : 'Create'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingDept(null); setFormData({ name: '', code: '' }) }}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {departments?.map((dept: Department) => (
                    <tr key={dept.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{dept.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dept.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dept.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button onClick={() => handleEdit(dept)} className="text-blue-600 hover:text-blue-600/80">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(dept.id)} className="text-red-600 hover:text-red-800">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!departments?.length && (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No departments found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
