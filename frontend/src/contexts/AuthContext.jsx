import React, { createContext, useState, useContext, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const WOFF_ID = import.meta.env.VITE_WOFF_ID || 'kJAM8fCbiHyzK75Hi9y5bQ'

// woff.login() は外部ブラウザでリダイレクトを伴うため、
// 戻ってきたときに続きを自動実行するための目印を sessionStorage に置く。
const WOFF_PENDING_KEY = 'woff_login_pending'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [woffInitialized, setWoffInitialized] = useState(false)
  const [woffError, setWoffError] = useState('')
  const [woffLoginPending, setWoffLoginPending] = useState(
    () => sessionStorage.getItem(WOFF_PENDING_KEY) === '1'
  )

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

  // WOFF のログイン状態を確認する。
  // SDK のバージョンによって同期・非同期の差があるため両方を受ける。
  const isWoffLoggedIn = async () => {
    try {
      return await Promise.resolve(woff.isLoggedIn())
    } catch (err) {
      console.error('woff.isLoggedIn() failed:', err)
      return false
    }
  }

  const loginWithWoff = async () => {
    try {
      if (!woffInitialized) {
        throw new Error('WOFF の初期化が完了していません')
      }

      // 外部ブラウザでは未ログイン状態で getProfile() が
      // "Need access_token for api call" で失敗するため、先に login() を通す。
      if (!(await isWoffLoggedIn())) {
        sessionStorage.setItem(WOFF_PENDING_KEY, '1')
        setWoffLoginPending(true)

        // 通常はここでリダイレクトが走り、以降の行は実行されない。
        // 戻ってきた後は初期化が再度走り、pending 目印で続きが自動実行される。
        await woff.login()

        // リダイレクトせずに解決した場合。公式仕様どおり init をやり直す。
        await woff.init({ woffId: WOFF_ID })
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
      clearWoffPending()

      const needsDepartment = !data.user?.primary_department_id
      return { success: true, needsDepartment }
    } catch (err) {
      console.error('WOFF login failed:', err)
      clearWoffPending()
      return { success: false, error: err.message }
    }
  }

  const clearWoffPending = () => {
    sessionStorage.removeItem(WOFF_PENDING_KEY)
    setWoffLoginPending(false)
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
    sessionStorage.removeItem(WOFF_PENDING_KEY)
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
      woffError,
      woffLoginPending,
      clearWoffPending
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
