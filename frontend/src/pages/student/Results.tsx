import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { useState } from 'react'
import { FileText, Loader2, Download, Award, AlertTriangle } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function StudentResults() {
  const [selectedSemester, setSelectedSemester] = useState<string>('all')
  const { data: results, isLoading, error } = useQuery({
    queryKey: ['results', selectedSemester],
    queryFn: async () => {
      const url = selectedSemester === 'all'
        ? '/api/v1/student/results'
        : `/api/v1/student/results?semester=${selectedSemester}`
      const response = await api.get(url)
      return response.data
    },
  })

  const handleDownloadPDF = async (resultId: number) => {
    try {
      const response = await api.get(`/api/v1/student/results/${resultId}/pdf`, { responseType: 'blob' })
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

  const totalResults = results?.length || 0
  const backlogs = results?.filter((r: any) => r.pass_fail !== 'pass').length || 0
  const cgpa = totalResults > 0
    ? (results?.reduce((sum: number, r: any) => sum + (r.gpa || 0), 0) / totalResults).toFixed(2)
    : 'N/A'

  return (
    <div className="space-y-6">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Results</h1>
          <p className="mt-1 text-sm text-gray-500">View your semester results</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white shadow rounded-lg p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
              <Award className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">CGPA</dt>
                <dd className="text-lg font-medium text-gray-900">{cgpa}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Semesters</dt>
                <dd className="text-lg font-medium text-gray-900">{totalResults}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-5">
          <div className="flex items-center">
            <div className={`flex-shrink-0 ${backlogs > 0 ? 'bg-red-500' : 'bg-green-500'} rounded-md p-3`}>
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Backlogs</dt>
                <dd className={`text-lg font-medium ${backlogs > 0 ? 'text-red-600' : 'text-green-600'}`}>{backlogs}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {results && results.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Semester Results</h3>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-500"
              >
                <option value="all">All Semesters</option>
                {semesters.map((sem) => (
                  <option key={sem} value={sem}>{sem}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {results?.map((result: any) => (
                <div key={result.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Semester: {result.semester}</h3>
                      <p className="text-sm text-gray-500">Published: {new Date(result.published_at).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => handleDownloadPDF(result.id)}
                       className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-100"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <Award className="h-8 w-8 text-blue-600" />
                        <div className="ml-3">
                          <p className="text-sm text-gray-500">GPA</p>
                          <p className="text-2xl font-bold text-gray-900">{result.gpa?.toFixed(2) || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    {result.total_marks && (
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500">Total Marks</p>
                        <p className="text-2xl font-bold text-gray-900">{result.total_marks}</p>
                      </div>
                    )}
                    {result.percentage && (
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500">Percentage</p>
                        <p className="text-2xl font-bold text-gray-900">{result.percentage.toFixed(1)}%</p>
                      </div>
                    )}
                    {result.grade && (
                      <div className="bg-purple-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500">Grade</p>
                        <p className="text-2xl font-bold text-gray-900">{result.grade}</p>
                      </div>
                    )}
                  </div>

                  {result.pass_fail && (
                    <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      result.pass_fail === 'pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {result.pass_fail === 'pass' ? 'PASS' : 'FAIL'}
                    </div>
                  )}

                  {result.details && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900">Details</h4>
                      <p className="text-sm text-gray-500 mt-1">{result.details}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
