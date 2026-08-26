import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LogIn } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function LoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showWoffDetail, setShowWoffDetail] = useState(false)
  const [oidcAvailable, setOidcAvailable] = useState(false)
  const { loginWithWoff, loginWithEmail, woffInitialized, woffError } = useAuth()
  const navigate = useNavigate()

  // OIDC はサーバー側の環境変数が揃っていないと 503 を返す。
  // 未設定のまま「PCでログイン」を出しても失敗するだけなので、
  // 使える場合にだけボタンを表示する。
  useEffect(() => {
    let alive = true
    fetch(`${API_URL}/auth/oidc/login`, { redirect: 'manual' })
      .then((res) => {
        if (alive) setOidcAvailable(res.status !== 503)
      })
      .catch(() => {
        // ネットワークエラー時はボタンを出さない
      })
    return () => { alive = false }
  }, [])

  const goAfterLogin = (result) => {
    if (result.needsDepartment) {
      navigate('/select-department')
    } else {
      navigate('/')
    }
  }

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
      goAfterLogin(result)
    } else {
      setError(result.error || 'LINE WORKSでのログインに失敗しました')
    }
    setLoading(false)
  }

  // OIDC はサーバーが LINE WORKS の認可画面へリダイレクトするため、
  // fetch ではなくページ遷移で開始する。
  const handleOidcLogin = () => {
    setError('')
    setLoading(true)
    window.location.href = `${API_URL}/auth/oidc/login`
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await loginWithEmail(email, password)
    if (result.success) {
      goAfterLogin(result)
    } else {
      setError(result.error || 'ログインに失敗しました')
    }
    setLoading(false)
  }

  const woffPending = !woffInitialized && !woffError

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

          {/* スマホの LINE WORKS アプリ内から使う経路 */}
          {!woffError && (
            <Button
              onClick={handleWoffLogin}
              className="w-full"
              disabled={loading || woffPending}
            >
              {loading ? 'ログイン中...' : 'LINE WORKSでログイン (スマホ)'}
            </Button>
          )}

          {/* PC ブラウザから使う経路 */}
          {oidcAvailable && (
            <Button
              onClick={handleOidcLogin}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              LINE WORKSでログイン (PCブラウザ)
            </Button>
          )}

          {/* WOFF が使えない環境（他テナント・SDK未読込）への案内 */}
          {woffError && (
            <div className="rounded-md border border-border bg-muted/50 p-3 space-y-2">
              <p className="text-sm text-muted-foreground">
                この環境ではスマホ向けのLINE WORKSログインを利用できません。
                下のメールアドレスでログインしてください。
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
                autoComplete="username"
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
                autoComplete="current-password"
                required
              />
            </div>

            <Button
              type="submit"
              variant={woffError ? 'default' : 'outline'}
              className="w-full"
              disabled={loading}
            >
              {loading ? 'ログイン中...' : 'ID/PASSWORDでログイン'}
            </Button>
          </form>

          {woffPending && (
            <p className="text-center text-sm text-muted-foreground">
              LINE WORKSを確認中...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginPage
