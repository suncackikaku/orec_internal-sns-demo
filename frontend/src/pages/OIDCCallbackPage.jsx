import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

function OIDCCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    
    if (!token) {
      setError('トークンが見つかりません。再度ログインしてください。')
      return
    }

    // Store token and fetch user info
    localStorage.setItem('token', token)

    // トークンを URL から即座に取り除く。
    // ブラウザ履歴や Referer 経由での露出を減らす。
    window.history.replaceState({}, '', '/oidc/callback')
    
    const fetchUser = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || '/api'
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (res.ok) {
          const userData = await res.json()
          setUser(userData)
          
          // Check if department selection is needed
          if (!userData?.primary_department_id) {
            navigate('/select-department')
          } else {
            navigate('/')
          }
        } else {
          setError('ユーザー情報の取得に失敗しました。')
          localStorage.removeItem('token')
        }
      } catch (err) {
        console.error('Failed to fetch user:', err)
        setError('ログイン処理中にエラーが発生しました。')
        localStorage.removeItem('token')
      }
    }

    fetchUser()
  }, [searchParams, navigate, setUser])

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-red-600">エラー</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">{error}</p>
            <button 
              onClick={() => navigate('/login')}
              className="w-full mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              ログイン画面に戻る
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">ログイン処理中</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">しばらくお待ちください...</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default OIDCCallbackPage
