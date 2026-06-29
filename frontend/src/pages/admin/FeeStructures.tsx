import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useState } from 'react'
import { Plus, Loader2, Edit, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface FeeStructure {
  id: number
  semester_id: number
  fee_name: string
  amount: number
  due_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Semester {
  id: number
  name: string
}

export default function AdminFeeStructures() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null)
  const [formData, setFormData] = useState({ semester_id: '', fee_name: '', amount: '', due_date: '', is_active: true })

  const { data: feeStructures, isLoading } = useQuery({
    queryKey: ['adminFeeStructures'],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/fee-structures')
      return response.data
    },
  })

  const { data: semesters } = useQuery({
    queryKey: ['adminSemesters'],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/semesters')
      return response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: { semester_id: number; fee_name: string; amount: number; due_date: string; is_active: boolean }) => {
      const response = await api.post('/api/v1/admin/fee-structures', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFeeStructures'] })
      setShowForm(false)
      setFormData({ semester_id: '', fee_name: '', amount: '', due_date: '', is_active: true })
      toast.success('Fee structure created successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create fee structure')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ feeId, data }: { feeId: number; data: { semester_id: number; fee_name: string; amount: number; due_date: string; is_active: boolean } }) => {
      const response = await api.put(`/api/v1/admin/fee-structures/${feeId}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFeeStructures'] })
      setShowForm(false)
      setEditingFee(null)
      setFormData({ semester_id: '', fee_name: '', amount: '', due_date: '', is_active: true })
      toast.success('Fee structure updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update fee structure')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (feeId: number) => {
      const response = await api.delete(`/api/v1/admin/fee-structures/${feeId}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFeeStructures'] })
      toast.success('Fee structure deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete fee structure')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...formData,
      semester_id: parseInt(formData.semester_id),
      amount: parseFloat(formData.amount),
    }
    if (editingFee) {
      updateMutation.mutate({ feeId: editingFee.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleEdit = (fee: FeeStructure) => {
    setEditingFee(fee)
    setFormData({
      semester_id: fee.semester_id.toString(),
      fee_name: fee.fee_name,
      amount: fee.amount.toString(),
      due_date: fee.due_date,
      is_active: fee.is_active,
    })
    setShowForm(true)
  }

  const handleDelete = (feeId: number) => {
    if (window.confirm('Are you sure you want to delete this fee structure?')) {
      deleteMutation.mutate(feeId)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const getSemesterName = (semId: number) => {
    const sem = semesters?.find((s: Semester) => s.id === semId)
    return sem ? sem.name : 'N/A'
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Fee Structures</h1>
            <p className="mt-1 text-sm text-gray-500">Manage semester fee structures</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingFee(null); setFormData({ semester_id: '', fee_name: '', amount: '', due_date: '', is_active: true }) }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Fee Structure
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {showForm && (
          <div className="mb-6 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{editingFee ? 'Edit Fee Structure' : 'New Fee Structure'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Semester *</label>
                  <select
                    value={formData.semester_id}
                    onChange={(e) => setFormData({ ...formData, semester_id: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Semester</option>
                    {semesters?.map((sem: Semester) => (
                      <option key={sem.id} value={sem.id}>{sem.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fee Name *</label>
                  <input
                    type="text"
                    value={formData.fee_name}
                    onChange={(e) => setFormData({ ...formData, fee_name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    placeholder="e.g., Tuition Fee"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Due Date *</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
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
                    editingFee ? 'Update' : 'Create'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingFee(null); setFormData({ semester_id: '', fee_name: '', amount: '', due_date: '', is_active: true }) }}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {feeStructures?.map((fee: FeeStructure) => (
                    <tr key={fee.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{fee.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getSemesterName(fee.semester_id)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{fee.fee_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rs. {fee.amount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(fee.due_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button onClick={() => handleEdit(fee)} className="text-blue-600 hover:text-blue-600/80">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(fee.id)} className="text-red-600 hover:text-red-800">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!feeStructures?.length && (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No fee structures found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
