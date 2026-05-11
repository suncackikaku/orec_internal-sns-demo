import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import WelcomePage from './pages/WelcomePage'
import DepartmentPage from './pages/DepartmentPage'
import DepartmentsListPage from './pages/DepartmentsListPage'
import UsersListPage from './pages/UsersListPage'
import UserProfilePage from './pages/UserProfilePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfileEditPage from './pages/ProfileEditPage'
import FeedPage from './pages/FeedPage'
import './index.css'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) return <div>読み込み中...</div>
  
  return user ? children : <Navigate to="/login" />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* トップページ - Welcome */}
          <Route path="/" element={
            <PrivateRoute>
              <WelcomePage />
            </PrivateRoute>
          } />
          
          {/* 部署一覧 */}
          <Route path="/departments" element={
            <PrivateRoute>
              <DepartmentsListPage />
            </PrivateRoute>
          } />
          
          {/* 部署詳細 */}
          <Route path="/departments/:id" element={
            <PrivateRoute>
              <DepartmentPage />
            </PrivateRoute>
          } />
          
          {/* 社員一覧 */}
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
          
          {/* フィード */}
          <Route path="/feed" element={
            <PrivateRoute>
              <FeedPage />
            </PrivateRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)