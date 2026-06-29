import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useState, useRef } from 'react'
import { FileText, Loader2, Upload, Download, Trash2, Search, Award } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function StaffResults() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('all')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [uploadResults, setUploadResults] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: results, isLoading, error } = useQuery({
    queryKey: ['staffResults', search, selectedSemester],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (selectedSemester !== 'all') params.append('semester', selectedSemester)
      const response = await api.get(`/api/v1/staff/results?${params.toString()}`)
      return response.data
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post('/api/v1/staff/results/csv', formData)
      return response.data
    },
    onSuccess: (data) => {
      setUploadResults(data)
      queryClient.invalidateQueries({ queryKey: ['staffResults'] })
      toast.success(`Uploaded ${data.success} results successfully`)
      setCsvFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to upload CSV')
    },
  })

  const handleCsvUpload = () => {
    if (!csvFile) {
      toast.error('Please select a CSV file')
      return
    }
    uploadMutation.mutate(csvFile)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error('Only CSV files are allowed')
        return
      }
      setCsvFile(file)
      setUploadResults(null)
    }
  }

  const handleDownloadPDF = async (resultId: number) => {
    try {
      const response = await api.get(`/api/v1/staff/results/${resultId}/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `result_${resultId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Result downloaded')
    } catch (error) {
      toast.error('Failed to download result')
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
        Error loading results
      </div>
    )
  }

  const semesters: string[] = Array.from(new Set((results || []).map((r: any) => r.semester as string)))

  return (
    <div className="space-y-6">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Results Management</h1>
          <p className="mt-1 text-sm text-gray-500">View and manage student results</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Results via CSV</h2>
          <div className="flex items-center space-x-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
            <button
              onClick={handleCsvUpload}
              disabled={!csvFile || uploadMutation.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload CSV
            </button>
          </div>
          {uploadResults && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                Successfully uploaded {uploadResults.success} results. {uploadResults.errors} errors encountered.
              </p>
              {uploadResults.error_details && uploadResults.error_details.length > 0 && (
                <ul className="mt-2 list-disc list-inside text-sm text-red-600">
                  {uploadResults.error_details.map((err: string, idx: number) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500">
            CSV must contain columns: user_id, semester, gpa. Optional: total_marks, percentage, grade, pass_fail, details
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-3 sm:space-y-0">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Published Results</h3>
            <div className="flex space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500 text-sm"
                />
              </div>
              {semesters.length > 0 && (
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500 text-sm"
                >
                  <option value="all">All Semesters</option>
                  {semesters.map((sem) => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GPA</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PDF</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results?.map((result: any) => (
                  <tr key={result.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{result.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.user?.full_name || result.student_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.user?.student_id || result.roll_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{result.semester}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{result.gpa?.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{result.grade || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        result.pass_fail === 'pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {result.pass_fail === 'pass' ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDownloadPDF(result.id)}
                        className="text-blue-600 hover:text-blue-600/80"
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!results?.length && (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No results</h3>
                <p className="mt-1 text-sm text-gray-500">Results will appear here once published.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}