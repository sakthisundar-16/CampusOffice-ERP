import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { useState } from 'react'
import { Search, Loader2, Download, Eye, Check, X } from 'lucide-react'
import { PaymentRequest } from '../../types'
import { toast } from 'react-hot-toast'

export default function PaymentHistory() {
  const [filters, setFilters] = useState({
    request_id: '',
    student_name: '',
    roll_number: '',
    department: '',
    semester_id: '',
    academic_year: '',
    status: '',
    date_from: '',
    date_to: '',
  })

  const { data: searchResults, isLoading, error, refetch } = useQuery({
    queryKey: ['paymentHistory', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
      const response = await api.get(`/api/v1/search/payments?${params.toString()}`)
      return response.data
    },
  })

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
      const response = await api.get(`/api/v1/search/payments?${params.toString()}&export=csv`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `payment_history_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Export started')
    } catch (error) {
      toast.error('Failed to export data')
    }
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        Error loading payment history
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
          <p className="mt-1 text-sm text-gray-500">Search and filter payment requests</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Search Filters</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Request ID</label>
              <input
                type="text"
                value={filters.request_id}
                onChange={(e) => handleFilterChange('request_id', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                placeholder="PAYREQ-..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Student Name</label>
              <input
                type="text"
                value={filters.student_name}
                onChange={(e) => handleFilterChange('student_name', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                placeholder="Search by name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Roll Number</label>
              <input
                type="text"
                value={filters.roll_number}
                onChange={(e) => handleFilterChange('roll_number', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                placeholder="Search by roll number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Department</label>
              <input
                type="text"
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                placeholder="Search by department"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Academic Year</label>
              <input
                type="text"
                value={filters.academic_year}
                onChange={(e) => handleFilterChange('academic_year', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
                placeholder="e.g. 2025-2026"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date From</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date To</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </button>
            <button
              onClick={handleExport}
               className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-gray-50 hover:bg-gray-100"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={() => setFilters({ request_id: '', student_name: '', roll_number: '', department: '', semester_id: '', academic_year: '', status: '', date_from: '', date_to: '' })}
               className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-gray-50 hover:bg-gray-100"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Results {searchResults?.total !== undefined && `(${searchResults.total})`}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acad. Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(searchResults?.payments || []).map((payment: any) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.request_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.student_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.roll_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.department}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.semester}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.academic_year || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rs. {payment.amount_paid}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                        payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {payment.status === 'completed' ? 'Approved' : payment.status === 'pending' ? 'Pending' : 'Rejected'}
                      </span>
                      {payment.is_resubmitted && (
                        <span className="ml-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          Resubmitted
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.created_at ? new Date(payment.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" title={payment.remarks || ''}>
                      {payment.remarks ? (payment.remarks.length > 30 ? payment.remarks.substring(0, 30) + '...' : payment.remarks) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!searchResults?.payments || searchResults.payments.length === 0) && !isLoading && (
              <div className="text-center py-12">
                <Search className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No results</h3>
                <p className="mt-1 text-sm text-gray-500">No payment records found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
