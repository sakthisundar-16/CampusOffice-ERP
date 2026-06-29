import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useState } from 'react'
import { Plus, Loader2, Search, Edit, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function AdminStaff() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    staff_id: '',
    hire_date: '',
    department_id: '',
    phone: '',
    address: '',
  })

  const { data: staffs, isLoading, refetch } = useQuery({
    queryKey: ['adminStaff', search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      const response = await api.get(`/api/v1/admin/staff?${params.toString()}`)
      return response.data
    },
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/departments')
      return response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/v1/admin/staff', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminStaff'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      setShowForm(false)
      setEditingStaff(null)
      resetForm()
      toast.success('Staff created successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create staff')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: any }) => {
      const response = await api.put(`/api/v1/admin/users/${userId}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminStaff'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      setShowForm(false)
      setEditingStaff(null)
      resetForm()
      toast.success('Staff updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update staff')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await api.delete(`/api/v1/admin/users/${userId}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminStaff'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      toast.success('Staff deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete staff')
    },
  })

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      password: '',
      staff_id: '',
      hire_date: '',
      department_id: '',
      phone: '',
      address: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const userPayload: any = {
      full_name: formData.full_name,
      email: formData.email,
      role: 'staff',
    }
    if (formData.password) userPayload.password = formData.password
    if (formData.phone) userPayload.phone = formData.phone
    if (formData.department_id) userPayload.department_id = parseInt(formData.department_id)

    const payload = {
      user: userPayload,
      staff_id: formData.staff_id,
      hire_date: formData.hire_date || new Date().toISOString(),
      department_id: formData.department_id ? parseInt(formData.department_id) : undefined,
      is_active: true,
    }
    if (editingStaff) {
      const updateUserPayload: any = {}
      if (formData.full_name) updateUserPayload.full_name = formData.full_name
      if (formData.email) updateUserPayload.email = formData.email
      if (formData.phone) updateUserPayload.phone = formData.phone
      if (formData.department_id) updateUserPayload.department_id = parseInt(formData.department_id)

      const updatePayload: any = {
        user: updateUserPayload,
      }
      if (formData.staff_id) {
        updatePayload.employee_id = formData.staff_id
      }
      updateMutation.mutate({ userId: editingStaff.user_id, data: updatePayload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleEdit = (staff: any) => {
    setEditingStaff(staff)
    setFormData({
      full_name: staff.full_name || '',
      email: staff.email || '',
      password: '',
      staff_id: staff.staff_id || '',
      hire_date: '',
      department_id: staff.department_id?.toString() || '',
      phone: staff.phone || '',
      address: staff.address || '',
    })
    setShowForm(true)
  }

  const handleDelete = (userId: number) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      deleteMutation.mutate(userId)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
            <p className="mt-1 text-sm text-gray-500">Manage office staff</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingStaff(null); resetForm() }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Staff
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {showForm && (
          <div className="mb-6 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{editingStaff ? 'Edit Staff' : 'New Staff'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                  <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email *</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500" required />
                </div>
                {!editingStaff && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password *</label>
                    <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500" required />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Staff ID *</label>
                  <input type="text" value={formData.staff_id} onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <select value={formData.department_id} onChange={(e) => setFormData({ ...formData, department_id: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500">
                    <option value="">Select Department</option>
                    {departments?.map((dept: any) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500" rows={2} />
                </div>
              </div>
              <div className="flex space-x-3">
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                  {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingStaff ? 'Update' : 'Create')}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingStaff(null); resetForm() }}                 className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-100">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="text" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {staffs?.map((staff: any) => (
                    <tr key={staff.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{staff.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{staff.full_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{staff.staff_id || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{staff.department || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button onClick={() => handleEdit(staff)} className="text-blue-600 hover:text-blue-600/80"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(staff.user_id)} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!staffs?.length && <div className="text-center py-12"><p className="text-sm text-gray-500">No staff found</p></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}