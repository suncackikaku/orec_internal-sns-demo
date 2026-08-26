import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LogIn } from 'lucide-react'

function LoginPage() {
  const [error, setError] = useState('')
  const [woffLoading, setWoffLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showWoffDetail, setShowWoffDetail] = useState(false)
  const { loginWithWoff, loginWithEmail, woffInitialized, woffError } = useAuth()
  const navigate = useNavigate()

  const handleWoffLogin = async () => {
    setError('')
    setWoffLoading(true)

    const result = await loginWithWoff()
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error || 'LINE WORKSでのログインに失敗しました')
    }
    setWoffLoading(false)
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setError('')
    setEmailLoading(true)

    const result = await loginWithEmail(email, password)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error)
    }
    setEmailLoading(false)
  }

  // WOFF の初期化が終わるまでは判定を保留し、ボタンをちらつかせない
  const woffPending = !woffInitialized && !woffError

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <LogIn className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">ログイン</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* LINE WORKS ログイン */}
          {!woffError && (
            <div className="space-y-2">
              <Button
                onClick={handleWoffLogin}
                className="w-full"
                disabled={woffLoading || emailLoading || woffPending}
              >
                {woffLoading ? 'ログイン中...' : 'LINE WORKSでログイン'}
              </Button>
              {woffPending && (
                <p className="text-center text-sm text-muted-foreground">
                  LINE WORKSを確認中...
                </p>
              )}
            </div>
          )}

          {/* WOFF が使えない環境への案内 */}
          {woffError && (
            <div className="rounded-md border border-border bg-muted/50 p-3 space-y-2">
              <p className="text-sm text-muted-foreground">
                この環境ではLINE WORKSログインを利用できません。下のメールアドレスでログインしてください。
              </p>
              <button
                type="button"
                onClick={() => setShowWoffDetail(!showWoffDetail)}
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                {showWoffDetail ? '詳細を隠す' : '詳細を表示'}
              </button>
              {showWoffDetail && (
                <p className="text-xs text-muted-foreground break-words font-mono leading-relaxed">
                  {woffError}
                </p>
              )}
            </div>
          )}

          {/* 区切り */}
          {!woffError && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-2 text-xs text-muted-foreground">または</span>
              </div>
            </div>
          )}

          {/* メールログイン */}
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yamada@example.com"
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <Button
              type="submit"
              variant={woffError ? 'default' : 'outline'}
              className="w-full"
              disabled={emailLoading || woffLoading}
            >
              {emailLoading ? 'ログイン中...' : 'メールアドレスでログイン'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginPage
