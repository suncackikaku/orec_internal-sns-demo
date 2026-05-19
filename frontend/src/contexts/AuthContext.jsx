import React, { createContext, useState, useContext, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const WOFF_ID = 'kJAM8fCbiHyzK75Hi9y5bQ'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [woffInitialized, setWoffInitialized] = useState(false)

  useEffect(() => {
    // Initialize WOFF
    if (typeof woff !== 'undefined') {
      woff.init({ woffId: WOFF_ID })
        .then(() => {
          console.log('WOFF initialized successfully')
          setWoffInitialized(true)
          
          // Check if already logged in
          const token = localStorage.getItem('token')
          if (token) {
            fetchUser(token)
          } else {
            setLoading(false)
          }
        })
        .catch((err) => {
          console.error('WOFF initialization failed:', err)
          setLoading(false)
        })
    } else {
      console.error('WOFF SDK not loaded')
      setLoading(false)
    }
  }, [])

  const fetchUser = async (token) => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const userData = await res.json()
        setUser(userData)
      } else {
        localStorage.removeItem('token')
      }
    } catch (err) {
      console.error('Failed to fetch user:', err)
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  const loginWithWoff = async () => {
    try {
      if (!woffInitialized) {
        throw new Error('WOFF not initialized')
      }

      // Get WOFF profile
      const profile = await woff.getProfile()
      console.log('WOFF Profile:', profile)

      // Send profile to backend for authentication
      const res = await fetch(`${API_URL}/auth/woff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: profile.userId,
          displayName: profile.displayName,
          domainId: profile.domainId
        })
      })

      if (!res.ok) {
        const error = await res.text()
        throw new Error(error)
      }

      const data = await res.json()
      localStorage.setItem('token', data.token)
      setUser(data.user)
      // Check if department selection is needed
      const needsDepartment = !data.user?.primary_department_id
      return { success: true, needsDepartment }
    } catch (err) {
      console.error('WOFF login failed:', err)
      return { success: false, error: err.message }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      setUser,
      loginWithWoff, 
      logout, 
      getAuthHeaders, 
      loading,
      woffInitialized 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
