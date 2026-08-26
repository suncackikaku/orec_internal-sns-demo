import React, { createContext, useState, useContext, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const WOFF_ID = import.meta.env.VITE_WOFF_ID || 'kJAM8fCbiHyzK75Hi9y5bQ'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [woffInitialized, setWoffInitialized] = useState(false)
  const [woffError, setWoffError] = useState('')

  useEffect(() => {
    // セッション復元は WOFF の成否と切り離す。
    // WOFF が使えない環境（PCブラウザ・他テナント）でも
    // ID/PASSWORD でログインしたセッションを維持する必要があるため。
    const token = localStorage.getItem('token')
    if (token) {
      fetchUser(token)
    } else {
      setLoading(false)
    }

    initWoff()
  }, [])

  const initWoff = () => {
    if (typeof woff === 'undefined') {
      setWoffError('LINE WORKS の SDK を読み込めませんでした。ネットワークが static.worksmobile.net を許可していない可能性があります。')
      return
    }

    woff.init({ woffId: WOFF_ID })
      .then(() => {
        console.log('WOFF initialized successfully')
        setWoffInitialized(true)
      })
      .catch((err) => {
        console.error('WOFF initialization failed:', err)
        // WOFF アプリは発行元テナント専用。別テナントのメンバーはここで失敗する。
        setWoffError(`LINE WORKS の初期化に失敗しました（WOFF ID: ${WOFF_ID}）。${err?.message || err}`)
      })
  }

  const fetchUser = async (token) => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const userData = await res.json()
        console.log('AuthContext fetchUser:', userData)
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

  // WOFF は LINE WORKS アプリ内からの利用を前提とする。
  // 外部ブラウザでは woff.login() が必要になるが、
  // 認可リクエストが「有効でないクライアント情報」で拒否されるため使わない。
  // PC ブラウザは OIDC 経路（/api/auth/oidc/login）を使う。
  const loginWithWoff = async () => {
    try {
      if (!woffInitialized) {
        throw new Error('WOFF の初期化が完了していません')
      }

      const profile = await woff.getProfile()
      console.log('WOFF Profile:', profile)

      const res = await fetch(`${API_URL}/auth/woff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: profile.userId,
          displayName: profile.displayName,
          domainId: profile.domainId,
          photoUrl: profile.photoUrl || null
        })
      })

      if (!res.ok) {
        const error = await res.text()
        throw new Error(error)
      }

      const data = await res.json()
      localStorage.setItem('token', data.token)
      setUser(data.user)

      const needsDepartment = !data.user?.primary_department_id
      return { success: true, needsDepartment }
    } catch (err) {
      console.error('WOFF login failed:', err)
      return { success: false, error: err.message }
    }
  }

  const loginWithEmail = async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('メールアドレスまたはパスワードが違います')
        }
        throw new Error('ログインに失敗しました')
      }

      const data = await res.json()
      localStorage.setItem('token', data.token)
      setUser(data.user)
      const needsDepartment = !data.user?.primary_department_id
      return { success: true, needsDepartment }
    } catch (err) {
      console.error('Email login failed:', err)
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
      loginWithEmail,
      logout,
      getAuthHeaders,
      loading,
      woffInitialized,
      woffError
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
