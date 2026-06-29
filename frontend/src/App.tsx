import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import Login from './pages/auth/Login'
import VerifyCertificate from './pages/auth/VerifyCertificate'
import StudentDashboard from './pages/student/Dashboard'
import StudentProfile from './pages/student/Profile'
import StudentPayments from './pages/student/Payments'
import StudentResults from './pages/student/Results'
import StudentDocuments from './pages/student/Documents'
import StudentBonafide from './pages/student/Bonafide'
import StaffDashboard from './pages/staff/Dashboard'
import StaffPayments from './pages/staff/Payments'
import StaffResults from './pages/staff/Results'
import StaffDocuments from './pages/staff/Documents'
import StaffBonafides from './pages/staff/Bonafides'
import StaffPaymentHistory from './pages/staff/PaymentHistory'
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminStudents from './pages/admin/Students'
import AdminStaff from './pages/admin/Staff'
import AdminDepartments from './pages/admin/Departments'
import AdminSemesters from './pages/admin/Semesters'
import AdminFeeStructures from './pages/admin/FeeStructures'
import AdminDocumentTypes from './pages/admin/DocumentTypes'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './hooks/useAuth'
import { WebSocketProvider } from './context/WebSocketContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <ErrorBoundary>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/verify/:certificateNumber" element={<VerifyCertificate />} />
            <Route path="/student" element={
              <ProtectedRoute allowedRoles={['student']}>
                <Layout>
                  <StudentDashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/student/profile" element={
              <ProtectedRoute allowedRoles={['student']}>
                <Layout>
                  <StudentProfile />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/student/payments" element={
              <ProtectedRoute allowedRoles={['student']}>
                <Layout>
                  <StudentPayments />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/student/results" element={
              <ProtectedRoute allowedRoles={['student']}>
                <Layout>
                  <StudentResults />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/student/documents" element={
              <ProtectedRoute allowedRoles={['student']}>
                <Layout>
                  <StudentDocuments />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/student/bonafide" element={
              <ProtectedRoute allowedRoles={['student']}>
                <Layout>
                  <StudentBonafide />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/staff" element={
              <ProtectedRoute allowedRoles={['staff']}>
                <Layout>
                  <StaffDashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/staff/payments" element={
              <ProtectedRoute allowedRoles={['staff']}>
                <Layout>
                  <StaffPayments />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/staff/payment-history" element={
              <ProtectedRoute allowedRoles={['staff']}>
                <Layout>
                  <StaffPaymentHistory />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/staff/results" element={
              <ProtectedRoute allowedRoles={['staff']}>
                <Layout>
                  <StaffResults />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/staff/documents" element={
              <ProtectedRoute allowedRoles={['staff']}>
                <Layout>
                  <StaffDocuments />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/staff/bonafides" element={
              <ProtectedRoute allowedRoles={['staff']}>
                <Layout>
                  <StaffBonafides />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <AdminUsers />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/students" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <AdminStudents />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/staff" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <AdminStaff />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/departments" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <AdminDepartments />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/semesters" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <AdminSemesters />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/fee-structures" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <AdminFeeStructures />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/document-types" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <AdminDocumentTypes />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        </ErrorBoundary>
      </WebSocketProvider>
    </AuthProvider>
  </QueryClientProvider>
  )
}

export default App