import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ShieldCheck, ShieldX, Loader2, ArrowLeft, FileText,
  CheckCircle2, XCircle, User, Calendar, Building2
} from 'lucide-react'
import { verifyApi } from '../../services/documentRequests'

export default function VerifyCertificatePage() {
  const { certificateNumber } = useParams<{ certificateNumber: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['verifyCertificate', certificateNumber],
    queryFn: async () => {
      const res = await verifyApi.verifyCertificate(certificateNumber!)
      return res
    },
    enabled: !!certificateNumber,
  })

  const isValid = data?.verification_status === 'valid'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>

        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b dark:border-gray-700 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Certificate Verification Portal
            </h1>
          </div>

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Verifying certificate...</p>
            </div>
          )}

          {error && (
            <div className="px-6 py-12 text-center">
              <XCircle className="mx-auto h-12 w-12 text-red-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Verification Failed</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Certificate not found. Please check the certificate number and try again.
              </p>
            </div>
          )}

          {data && !error && (
            <div className="p-6">
              {isValid ? (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-700 dark:text-green-400">Valid Certificate</span>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                    {data.message}
                  </p>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ShieldX className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <span className="font-medium text-red-700 dark:text-red-400">Invalid / Expired Certificate</span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-500 mt-1">
                    {data.message}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Certificate Number</span>
                  <p className="text-sm font-mono font-medium text-gray-900 dark:text-white mt-0.5">{data.certificate_number}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Verification Code</span>
                  <p className="text-sm font-mono font-medium text-gray-900 dark:text-white mt-0.5">{data.verification_code}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Document Type</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{data.document_type}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Certificate Title</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{data.certificate_title}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Student Name</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-gray-400" />
                    {data.student_name}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Register Number</span>
                  <p className="text-sm font-mono font-medium text-gray-900 dark:text-white mt-0.5">{data.roll_number}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Issued On</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    {data.issued_at ? new Date(data.issued_at).toLocaleDateString('en-IN') : 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Status</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5 capitalize">{data.status}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          CampusOffice ERP — Digital Certificate Verification System
        </p>
      </div>
    </div>
  )
}
