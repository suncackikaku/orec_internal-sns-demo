import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LogIn } from 'lucide-react'

function RegisterPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <LogIn className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">新規登録</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            LINE WORKSアカウントでログインしてください
          </p>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => navigate('/login')}
            className="w-full"
          >
            ログインページへ
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default RegisterPage
