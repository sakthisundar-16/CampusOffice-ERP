import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useState, useCallback } from 'react'
import { Plus, Loader2, Edit, Trash2, Search, Users, GraduationCap } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { DataTable, PageHeader, StatCard, ConfirmDialog, SkeletonPage, StatusBadge } from '../../components/ui'

type StudentRow = {
  id: number
  user_id: number
  full_name: string
  email: string
  role: string
  status: string
  roll_number?: string
  department?: string
  current_semester?: number
  created_at?: string
  student_id?: string
  department_id?: number
  quota?: string
  transport_route?: string
  transport_fee?: number
}

export default function AdminStudents() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StudentRow | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'student',
    student_id: '',
    roll_number: '',
    admission_date: '',
    current_semester: '',
    department_id: '',
    phone: '',
    address: '',
    quota: 'Govt Quota',
    transport_route: '',
    transport_fee: '',
  })

  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['adminStudents', page, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      params.append('page', String(page))
      params.append('limit', '10')
      const response = await api.get(`/api/v1/admin/students?${params.toString()}`)
      return response.data
    },
  })

  const students: StudentRow[] = Array.isArray(studentsData) ? studentsData : []
  const totalStudents = Array.isArray(studentsData) ? studentsData.length : (studentsData as any)?.total || 0

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/departments')
      return response.data
    },
  })

  const { data: statsData } = useQuery({
    queryKey: ['adminStudentStats'],
    queryFn: async () => {
      const res = await api.get('/api/v1/admin/students?limit=1')
      return { total: Array.isArray(res.data) ? res.data.length : (res.data?.total || 0) }
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/v1/admin/students', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      setShowForm(false)
      resetForm()
      toast.success('Student created successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create student')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: any }) => {
      const response = await api.put(`/api/v1/admin/users/${userId}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      setShowForm(false)
      setEditingStudent(null)
      resetForm()
      toast.success('Student updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update student')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await api.delete(`/api/v1/admin/users/${userId}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      toast.success('Student deleted successfully')
      setDeleteTarget(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete student')
    },
  })

  const resetForm = useCallback(() => {
    setFormData({
      full_name: '',
      email: '',
      password: '',
      role: 'student',
      student_id: '',
      roll_number: '',
      admission_date: '',
      current_semester: '',
      department_id: '',
      phone: '',
      address: '',
      quota: 'Govt Quota',
      transport_route: '',
      transport_fee: '',
    })
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      user: {
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        student_id: formData.student_id,
        phone: formData.phone,
        address: formData.address,
      },
      roll_number: formData.roll_number,
      admission_date: formData.admission_date || new Date().toISOString().split('T')[0],
      current_semester: formData.current_semester ? parseInt(formData.current_semester) : null,
      department_id: formData.department_id ? parseInt(formData.department_id) : null,
      quota: formData.quota || 'Govt Quota',
      transport_route: formData.transport_route || null,
      transport_fee: formData.transport_fee ? parseFloat(formData.transport_fee) : 0.0,
    }
    if (editingStudent) {
      updateMutation.mutate({ userId: editingStudent.user_id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleEdit = (student: StudentRow) => {
    setEditingStudent(student)
    setFormData({
      full_name: student.full_name || '',
      email: student.email || '',
      password: '',
      role: student.role || 'student',
      student_id: student.student_id || '',
      roll_number: student.roll_number || '',
      admission_date: '',
      current_semester: student.current_semester?.toString() || '',
      department_id: student.department_id?.toString() || '',
      phone: '',
      address: '',
      quota: student.quota || 'Govt Quota',
      transport_route: student.transport_route || '',
      transport_fee: student.transport_fee?.toString() || '',
    })
    setShowForm(true)
  }

  const columns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'full_name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'roll_number', label: 'Roll Number', render: (val: string) => val || 'N/A' },
    { key: 'department', label: 'Department', render: (val: string) => val || 'N/A' },
    { key: 'quota', label: 'Quota', render: (val: string) => val || 'Govt Quota' },
    {
      key: 'transport_route',
      label: 'Transport Route',
      render: (_: any, row: StudentRow) => row.transport_route ? `${row.transport_route} (Rs. ${row.transport_fee || 0})` : 'Self Transport'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: StudentRow) => (
        <div className="flex items-center gap-1">
          <button onClick={() => handleEdit(row)} className="p-1.5 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-md" title="Edit"><Edit className="h-4 w-4" /></button>
          <button onClick={() => setDeleteTarget(row)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md" title="Delete"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ]

  if (isLoading && !studentsData) {
    return <SkeletonPage />
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Student Management" subtitle="Manage student records" actions={
        <button
          onClick={() => { setShowForm(true); setEditingStudent(null); resetForm() }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Student
        </button>
      } />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <StatCard title="Total Students" value={statsData?.total || 0} icon={Users} color="bg-green-500" href="/admin/students" />
        <StatCard title="Staff" value="—" icon={GraduationCap} color="bg-purple-500" />
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {editingStudent ? 'Edit Student' : 'New Student'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                  required
                />
              </div>
              {!editingStudent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Roll Number *</label>
                <input
                  type="text"
                  value={formData.roll_number}
                  onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Student ID</label>
                <input
                  type="text"
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Department</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                >
                  <option value="">Select Department</option>
                  {departments?.map((dept: any) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Semester</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={formData.current_semester}
                  onChange={(e) => setFormData({ ...formData, current_semester: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quota / Category</label>
                <select
                  value={formData.quota}
                  onChange={(e) => setFormData({ ...formData, quota: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                >
                  <option value="Govt Quota">Govt Quota</option>
                  <option value="Management Quota">Management Quota</option>
                  <option value="Sports Quota">Sports Quota</option>
                  <option value="7.5 Scheme">7.5 Scheme</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Transport Route</label>
                <input
                  type="text"
                  value={formData.transport_route}
                  onChange={(e) => setFormData({ ...formData, transport_route: e.target.value })}
                  placeholder="e.g. Route 12 / Places"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Transport Fee (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.transport_fee}
                  onChange={(e) => setFormData({ ...formData, transport_fee: e.target.value })}
                  placeholder="e.g. 5000"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500"
                  rows={2}
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
                  editingStudent ? 'Update' : 'Create'
                )}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingStudent(null); resetForm() }}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <DataTable
            data={students}
            columns={columns}
            isLoading={isLoading}
            total={totalStudents}
            page={page}
            pageSize={10}
            onPageChange={setPage}
            onSearch={(q) => { setSearch(q); setPage(1) }}
            onExport={() => {
              const headers = ['ID', 'Name', 'Email', 'Roll Number', 'Department']
              const rows = students.map((s) => [s.id, s.full_name, s.email, s.roll_number || 'N/A', s.department || 'N/A'].join(','))
              const csv = [headers.join(','), ...rows].join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'students.csv'
              a.click()
              URL.revokeObjectURL(url)
              toast.success('Students exported')
            }}
            searchPlaceholder="Search students..."
            fileName="students.csv"
            emptyState={
              <div className="text-center py-12">
                <p className="text-sm text-gray-500">No students found</p>
              </div>
            }
            rowKey={(row) => row.id}
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.user_id)}
        title="Delete Student"
        description={`Are you sure you want to delete "${deleteTarget?.full_name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
