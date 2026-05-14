import React, { createContext, useState, useContext, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (token) {
      fetchAdmin(token)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchAdmin = async (token) => {
    try {
      const res = await fetch(`${API_URL}/admin/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const adminData = await res.json()
        setAdmin(adminData)
      } else {
        localStorage.removeItem('adminToken')
      }
    } catch (err) {
      console.error('Failed to fetch admin:', err)
      localStorage.removeItem('adminToken')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      if (!res.ok) {
        const error = await res.text()
        throw new Error(error)
      }

      const data = await res.json()
      localStorage.setItem('adminToken', data.token)
      setAdmin(data.admin)
      return { success: true }
    } catch (err) {
      console.error('Admin login failed:', err)
      return { success: false, error: err.message }
    }
  }

  const logout = () => {
    localStorage.removeItem('adminToken')
    setAdmin(null)
  }

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  return (
    <AdminAuthContext.Provider value={{ 
      admin, 
      login, 
      logout, 
      getAuthHeaders, 
      loading 
    }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  return useContext(AdminAuthContext)
}
