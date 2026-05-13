import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LogIn } from 'lucide-react'

function LoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { loginWithWoff, woffInitialized } = useAuth()
  const navigate = useNavigate()

  const handleWoffLogin = async () => {
    setError('')
    setLoading(true)

    if (!woffInitialized) {
      setError('WOFFの初期化が完了していません。しばらくしてから再度お試しください。')
      setLoading(false)
      return
    }

    const result = await loginWithWoff()
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error || 'LINE WORKSでのログインに失敗しました')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <LogIn className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">ログイン</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            LINE WORKSアカウントでログインします
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Button
            onClick={handleWoffLogin}
            className="w-full"
            disabled={loading || !woffInitialized}
          >
            {loading ? 'ログイン中...' : 'LINE WORKSでログイン'}
          </Button>
          
          {!woffInitialized && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              WOFFを初期化中...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginPage
