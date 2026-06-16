import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LogIn } from 'lucide-react'

function LoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { loginWithWoff, loginWithEmail, woffInitialized } = useAuth()
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
      if (result.needsDepartment) {
        navigate('/select-department')
      } else {
        navigate('/')
      }
    } else {
      setError(result.error || 'LINE WORKSでのログインに失敗しました')
    }
    setLoading(false)
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await loginWithEmail(email, password)
    if (result.success) {
      if (result.needsDepartment) {
        navigate('/select-department')
      } else {
        navigate('/')
      }
    } else {
      setError(result.error || 'ログインに失敗しました')
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
            ログイン方法を選択してください
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
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
            {loading ? 'ログイン中...' : 'LINE WORKSでログイン (スマホ)'}
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                または
              </span>
            </div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="demo@orec.co.jp"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
                required
              />
            </div>

            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'ログイン中...' : 'ID/PASSWORDでログイン'}
            </Button>
          </form>
          
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
