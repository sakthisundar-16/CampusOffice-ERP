import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { GlobalSearch } from './ui'
import {
  LayoutDashboard,
  CreditCard,
  FileText,
  FileCheck,
  Users,
  GraduationCap,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  Sun,
  Moon,
  UserCog,
  ClipboardList,
  FileSearch,
  Search
} from 'lucide-react'
import { ConfirmDialog } from './ui'
import Notifications from './Notifications'

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true'
  })
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('darkMode', 'true')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('darkMode', 'false')
    }
  }, [darkMode])

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = () => {
    setShowLogoutConfirm(false)
    logout()
    navigate('/login')
  }

  const getNavItems = () => {
    if (user?.role === 'student') {
      return [
        { path: '/student', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/student/payments', label: 'Payments', icon: CreditCard },
        { path: '/student/results', label: 'Results', icon: FileText },
        { path: '/student/documents', label: 'Documents', icon: ClipboardList },
        { path: '/student/bonafide', label: 'Bonafide', icon: FileCheck },
      ]
    }
    if (user?.role === 'staff') {
      return [
        { path: '/staff', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/staff/payments', label: 'Payments', icon: CreditCard },
        { path: '/staff/payment-history', label: 'Payment History', icon: Search },
        { path: '/staff/documents', label: 'Documents', icon: ClipboardList },
        { path: '/staff/results', label: 'Results', icon: FileText },
        { path: '/staff/bonafides', label: 'Bonafides', icon: FileCheck },
      ]
    }
    if (user?.role === 'admin') {
      return [
        { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/admin/users', label: 'User Management', icon: UserCog },
        { path: '/admin/students', label: 'Students', icon: Users },
        { path: '/admin/staff', label: 'Staff', icon: GraduationCap },
        { path: '/admin/departments', label: 'Departments', icon: BookOpen },
        { path: '/admin/semesters', label: 'Semesters', icon: BookOpen },
        { path: '/admin/fee-structures', label: 'Fee Structures', icon: Settings },
        { path: '/admin/document-types', label: 'Doc Templates', icon: FileSearch },
      ]
    }
    return []
  }

  const navItems = getNavItems()

  const getRoleColor = () => {
    if (user?.role === 'admin') return 'gradient-primary'
    if (user?.role === 'staff') return 'gradient-info'
    return 'gradient-success'
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 erp-sidebar transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-white">CampusOffice</span>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">ERP System</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <nav className="mt-5 px-3 space-y-1 overflow-y-auto h-[calc(100vh-200px)] erp-scrollbar">
          <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Main Menu</p>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/student' && location.pathname.startsWith(item.path))
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className={`h-4 w-4 mr-3 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/50 bg-gradient-to-t from-slate-900/50 to-transparent">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 mb-3 border border-slate-700/50">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
              <span className="text-white text-xs font-semibold">
                {user?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
              <p className="text-[11px] text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-full px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 border border-slate-700/50 hover:border-slate-600"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 erp-header shadow-soft">
          <div className="flex items-center justify-between h-14 px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <Menu className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </button>
              <div>
                <h1 className="text-base font-semibold text-slate-900 dark:text-white capitalize">
                  {user?.role === 'student' && 'Student Portal'}
                  {user?.role === 'staff' && 'Staff Portal'}
                  {user?.role === 'admin' && 'Admin Portal'}
                </h1>
              </div>
            </div>

             <div className="flex items-center gap-2 sm:gap-3">
               {(user?.role === 'staff' || user?.role === 'admin') && <GlobalSearch />}
               <button
                 onClick={() => setDarkMode(!darkMode)}
                 className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200"
                 title="Toggle dark mode"
                 aria-label="Toggle dark mode"
               >
                 {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
               </button>
               <Notifications />
               <div className="relative">
                 <button
                   onClick={() => setProfileOpen(!profileOpen)}
                   className="flex items-center gap-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200"
                   aria-haspopup="true"
                   aria-expanded={profileOpen}
                 >
                   <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
                     <span className="text-white text-xs font-semibold">
                       {user?.full_name?.charAt(0) || 'U'}
                     </span>
                   </div>
                   <ChevronDown className={`h-4 w-4 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                 </button>
                 {profileOpen && (
                   <>
                     <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                     <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-elevated z-20 py-2 border border-slate-200 dark:border-slate-700" role="menu">
                       <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                         <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.full_name}</p>
                         <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{user?.email}</p>
                       </div>
                       {user?.role === 'student' && (
                         <Link to="/student/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" onClick={() => setProfileOpen(false)} role="menuitem">
                           Your Profile
                           <GraduationCap className="h-4 w-4" />
                         </Link>
                       )}
                       <button
                         onClick={handleLogout}
                         className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                         role="menuitem"
                       >
                         <LogOut className="h-4 w-4" />
                         Sign out
                       </button>
                     </div>
                   </>
                 )}
               </div>
             </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8 animate-in">
          {children}
        </main>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Confirm Sign Out"
        description="Are you sure you want to sign out of your account?"
        confirmLabel="Sign Out"
        variant="danger"
      />
    </div>
  )
}