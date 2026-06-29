import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useState, useCallback } from 'react'
import { Plus, Loader2, Edit, Trash2, Search, Eye, UserCheck, UserX, KeyRound, X, RefreshCw, Users, GraduationCap } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { DataTable, PageHeader, StatCard, ConfirmDialog, SkeletonPage, StatusBadge } from '../../components/ui'

type UserRow = {
  id: number
  user_id: number
  full_name: string
  email: string
  role: 'student' | 'staff' | 'admin'
  status: string
  department?: string
  department_id?: number
  created_at?: string
  register_number?: string
  employee_id?: string
  current_semester?: number
  phone?: string
}

type UserRole = 'student' | 'staff' | 'admin'

export default function AdminUsers() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [viewingUser, setViewingUser] = useState<UserRow | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    role: 'student' as UserRole,
    register_number: '',
    employee_id: '',
    department_id: '',
    semester: '',
    is_active: true,
  })
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)

  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['adminUsers', page, search, roleFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (roleFilter) params.append('role', roleFilter)
      if (statusFilter) params.append('status', statusFilter)
      params.append('page', String(page))
      params.append('limit', '10')
      const response = await api.get(`/api/v1/admin/users?${params.toString()}`)
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

  const { data: semesters } = useQuery({
    queryKey: ['semesters'],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/semesters')
      return response.data
    },
  })

  const { data: statsData } = useQuery({
    queryKey: ['adminUserStats'],
    queryFn: async () => {
      const [usersRes, studentsRes, staffRes] = await Promise.all([
        api.get('/api/v1/admin/users?limit=1'),
        api.get('/api/v1/admin/students?limit=1'),
        api.get('/api/v1/admin/staff?limit=1'),
      ])
      return {
        total: Array.isArray(usersRes.data) ? usersRes.data.length : (usersRes.data?.total || 0),
        students: Array.isArray(studentsRes.data) ? studentsRes.data.length : (studentsRes.data?.total || 0),
        staff: Array.isArray(staffRes.data) ? staffRes.data.length : (staffRes.data?.total || 0),
      }
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/v1/admin/users', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      setShowForm(false)
      resetForm()
      toast.success('User created successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create user')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: any }) => {
      const response = await api.put(`/api/v1/admin/users/${userId}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      setShowForm(false)
      setEditingUser(null)
      resetForm()
      toast.success('User updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update user')
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await api.post(`/api/v1/admin/users/${userId}/deactivate`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      toast.success('User deactivated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to deactivate user')
    },
  })

  const activateMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await api.post(`/api/v1/admin/users/${userId}/activate`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      toast.success('User activated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to activate user')
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: number; newPassword: string }) => {
      const response = await api.post(`/api/v1/admin/users/${userId}/reset-password`, {
        new_password: newPassword,
      })
      return response.data
    },
    onSuccess: () => {
      toast.success('Password reset successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to reset password')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await api.delete(`/api/v1/admin/users/${userId}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      toast.success('User deleted successfully')
      setDeleteTarget(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete user')
    },
  })

  const resetForm = useCallback(() => {
    setFormData({
      full_name: '',
      email: '',
      password: '',
      phone: '',
      role: 'student',
      register_number: '',
      employee_id: '',
      department_id: '',
      semester: '',
      is_active: true,
    })
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = {
      user: {
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phone: formData.phone || undefined,
        department_id: formData.department_id ? parseInt(formData.department_id) : undefined,
      },
      department_id: formData.department_id ? parseInt(formData.department_id) : undefined,
      is_active: formData.is_active,
    }

    if (formData.role === 'student') {
      payload.register_number = formData.register_number
      payload.current_semester = formData.semester ? parseInt(formData.semester) : undefined
    } else if (formData.role === 'staff' || formData.role === 'admin') {
      payload.employee_id = formData.employee_id
    }

    if (editingUser) {
      const updatePayload: any = {
        user: {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || undefined,
          department_id: formData.department_id ? parseInt(formData.department_id) : undefined,
        },
        is_active: formData.is_active,
      }
      if (formData.role === 'student') {
        updatePayload.register_number = formData.register_number
        updatePayload.current_semester = formData.semester ? parseInt(formData.semester) : undefined
        updatePayload.department_id = formData.department_id ? parseInt(formData.department_id) : undefined
      } else if (formData.role === 'staff' || formData.role === 'admin') {
        updatePayload.employee_id = formData.employee_id
      }
      updateMutation.mutate({ userId: editingUser.user_id, data: updatePayload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleEdit = (user: UserRow) => {
    setEditingUser(user)
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      password: '',
      phone: user.phone || '',
      role: user.role || 'student',
      register_number: user.register_number || '',
      employee_id: user.employee_id || '',
      department_id: user.department_id?.toString() || '',
      semester: user.current_semester?.toString() || '',
      is_active: user.status === 'Active',
    })
    setShowForm(true)
  }

  const handleView = (user: UserRow) => {
    setViewingUser(user)
    setShowViewModal(true)
  }

  const handleResetPassword = (userId: number) => {
    const newPassword = prompt('Enter new password (min 8 chars, with uppercase, lowercase, and number):')
    if (newPassword && newPassword.length >= 8) {
      resetPasswordMutation.mutate({ userId, newPassword })
    } else if (newPassword !== null) {
      toast.error('Password must be at least 8 characters with uppercase, lowercase, and number')
    }
  }

  const isStudent = formData.role === 'student'
  const isStaffOrAdmin = formData.role === 'staff' || formData.role === 'admin'

  const columns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'full_name', label: 'Name', sortable: true, searchable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'role', label: 'Role', render: (val: string) => <StatusBadge status={val} /> },
    { key: 'department', label: 'Department', render: (val: string) => val || 'N/A' },
    { key: 'status', label: 'Status', render: (val: string) => <StatusBadge status={val} /> },
    { key: 'created_at', label: 'Created', render: (val: string) => val ? new Date(val).toLocaleDateString() : 'N/A' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: UserRow) => (
        <div className="flex items-center gap-1">
          <button onClick={() => handleView(row)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md" title="View"><Eye className="h-4 w-4" /></button>
          <button onClick={() => handleEdit(row)} className="p-1.5 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-md" title="Edit"><Edit className="h-4 w-4" /></button>
          {row.status === 'Active' ? (
            <button onClick={() => deactivateMutation.mutate(row.user_id)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md" title="Deactivate"><UserX className="h-4 w-4" /></button>
          ) : (
            <button onClick={() => activateMutation.mutate(row.user_id)} className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md" title="Activate"><UserCheck className="h-4 w-4" /></button>
          )}
          <button onClick={() => handleResetPassword(row.user_id)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md" title="Reset Password"><KeyRound className="h-4 w-4" /></button>
          <button onClick={() => setDeleteTarget(row)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md" title="Delete"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ]

  if (isLoading && !usersData) {
    return <SkeletonPage />
  }

  const users: UserRow[] = Array.isArray(usersData) ? usersData : []
  const totalUsers = Array.isArray(usersData) ? usersData.length : (usersData as any)?.total || 0

  return (
    <div className="space-y-6">
      <PageHeader title="User Management" subtitle="Manage all system users" />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard title="Total Users" value={statsData?.total || 0} icon={Users} color="bg-blue-500" />
        <StatCard title="Students" value={statsData?.students || 0} icon={GraduationCap} color="bg-green-500" href="/admin/students" />
        <StatCard title="Staff" value={statsData?.staff || 0} icon={Users} color="bg-purple-500" />
      </div>

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingUser ? 'Edit User' : 'New User'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                  required
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    required
                    minLength={8}
                  />
                  <p className="mt-1 text-xs text-gray-500">Min 8 chars, uppercase, lowercase, number</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                  required
                >
                  <option value="student">Student</option>
                  <option value="staff">Office Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                >
                  <option value="">Select Department</option>
                  {departments?.map((dept: any) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              {isStudent && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Register Number *</label>
                    <input
                      type="text"
                      value={formData.register_number}
                      onChange={(e) => setFormData({ ...formData, register_number: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                      required={isStudent}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Semester</label>
                    <select
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    >
                      <option value="">Select Semester</option>
                      {semesters?.map((sem: any) => (
                        <option key={sem.id} value={sem.id}>{sem.name} ({sem.academic_year})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {isStaffOrAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employee ID {formData.role === 'admin' ? 'Not Required' : '*'}</label>
                  <input
                    type="text"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                    required={isStaffOrAdmin && formData.role !== 'admin'}
                  />
                </div>
              )}
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
                  editingUser ? 'Update' : 'Create'
                )}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingUser(null); resetForm() }}
                 className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, register number, employee ID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500 text-sm"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
              className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500 text-sm"
            >
              <option value="">All Roles</option>
              <option value="student">Student</option>
              <option value="staff">Office Staff</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-500 text-sm"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <DataTable
            data={users}
            columns={columns}
            isLoading={isLoading}
            total={totalUsers}
            page={page}
            pageSize={10}
            onPageChange={setPage}
            onSearch={(q) => { setSearch(q); setPage(1) }}
            onExport={() => {
              const headers = ['ID', 'Name', 'Email', 'Role', 'Department', 'Status', 'Created']
              const rows = users.map((u) => [u.id, u.full_name, u.email, u.role, u.department || 'N/A', u.status, u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'].join(','))
              const csv = [headers.join(','), ...rows].join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'users.csv'
              a.click()
              URL.revokeObjectURL(url)
              toast.success('Users exported')
            }}
            searchPlaceholder="Search users..."
            fileName="users.csv"
            emptyState={
              <div className="text-center py-12">
                <p className="text-sm text-gray-500">No users found</p>
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
        title="Deactivate User"
        description={`Are you sure you want to deactivate "${deleteTarget?.full_name}"? This action can be reversed later.`}
        confirmLabel="Deactivate"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {showViewModal && viewingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">User Details</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><span className="text-sm font-medium text-gray-500">Name:</span><p className="text-sm text-gray-900 dark:text-white">{viewingUser.full_name}</p></div>
              <div><span className="text-sm font-medium text-gray-500">Email:</span><p className="text-sm text-gray-900 dark:text-white">{viewingUser.email}</p></div>
              <div><span className="text-sm font-medium text-gray-500">Role:</span><p className="text-sm text-gray-900 dark:text-white">{viewingUser.role}</p></div>
              <div><span className="text-sm font-medium text-gray-500">Department:</span><p className="text-sm text-gray-900 dark:text-white">{viewingUser.department || 'N/A'}</p></div>
              <div><span className="text-sm font-medium text-gray-500">Phone:</span><p className="text-sm text-gray-900 dark:text-white">{viewingUser.phone || 'N/A'}</p></div>
              <div><span className="text-sm font-medium text-gray-500">Status:</span><p className="text-sm text-gray-900 dark:text-white">{viewingUser.status}</p></div>
              {viewingUser.register_number && <div><span className="text-sm font-medium text-gray-500">Register Number:</span><p className="text-sm text-gray-900 dark:text-white">{viewingUser.register_number}</p></div>}
              {viewingUser.employee_id && <div><span className="text-sm font-medium text-gray-500">Employee ID:</span><p className="text-sm text-gray-900 dark:text-white">{viewingUser.employee_id}</p></div>}
              {viewingUser.current_semester && <div><span className="text-sm font-medium text-gray-500">Current Semester:</span><p className="text-sm text-gray-900 dark:text-white">{viewingUser.current_semester}</p></div>}
              <div><span className="text-sm font-medium text-gray-500">Created At:</span><p className="text-sm text-gray-900 dark:text-white">{viewingUser.created_at ? new Date(viewingUser.created_at).toLocaleString() : 'N/A'}</p></div>
            </div>
            <div className="mt-6">
              <button onClick={() => setShowViewModal(false)} className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
