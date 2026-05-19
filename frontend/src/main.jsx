import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext'
import WelcomePage from './pages/WelcomePage'
import DepartmentPage from './pages/DepartmentPage'
import DepartmentsListPage from './pages/DepartmentsListPage'
import UsersListPage from './pages/UsersListPage'
import UserProfilePage from './pages/UserProfilePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfileEditPage from './pages/ProfileEditPage'
import FeedPage from './pages/FeedPage'
import DepartmentSelectPage from './pages/DepartmentSelectPage'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import UserManagementPage from './pages/admin/UserManagementPage'
import DepartmentManagementPage from './pages/admin/DepartmentManagementPage'
import './index.css'

function PrivateRoute({ children, allowNoDepartment = false }) {
  const { user, loading } = useAuth()
  
  if (loading) return <div>読み込み中...</div>
  
  if (!user) return <Navigate to="/login" />
  
  // Redirect to department selection if not set and not explicitly allowed
  if (!allowNoDepartment && !user?.primary_department_id) {
    return <Navigate to="/select-department" />
  }
  
  return children
}

function AdminRoute({ children }) {
  const { admin, loading } = useAdminAuth()
  
  if (loading) return <div>読み込み中...</div>
  
  return admin ? children : <Navigate to="/admin/login" />
}

function App() {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            
            {/* User routes - Protected */}
            <Route path="/" element={
              <PrivateRoute>
                <WelcomePage />
              </PrivateRoute>
            } />
            <Route path="/departments" element={
              <PrivateRoute>
                <DepartmentsListPage />
              </PrivateRoute>
            } />
            <Route path="/departments/:id" element={
              <PrivateRoute>
                <DepartmentPage />
              </PrivateRoute>
            } />
            <Route path="/users" element={
              <PrivateRoute>
                <UsersListPage />
              </PrivateRoute>
            } />
            <Route path="/users/:id/profile" element={
              <PrivateRoute>
                <UserProfilePage />
              </PrivateRoute>
            } />
            <Route path="/users/me/profile/edit" element={
              <PrivateRoute>
                <ProfileEditPage />
              </PrivateRoute>
            } />
            <Route path="/feed" element={
              <PrivateRoute>
                <FeedPage />
              </PrivateRoute>
            } />
            <Route path="/select-department" element={
              <PrivateRoute allowNoDepartment={true}>
                <DepartmentSelectPage />
              </PrivateRoute>
            } />
            
            {/* Admin routes - Protected */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }>
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="departments" element={<DepartmentManagementPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AdminAuthProvider>
    </AuthProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)