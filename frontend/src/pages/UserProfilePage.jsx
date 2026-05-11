import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Edit, LogOut, User } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function UserProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, logout, getAuthHeaders } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isMyProfile = user && user.id === id

  useEffect(() => {
    fetch(`${API_URL}/users/${id}/profile`, {
      headers: getAuthHeaders()
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then(data => {
        setProfile(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-muted-foreground">読み込み中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-destructive">エラー: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="p-4 border-b">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
        </div>

        {/* プロフィールヘッダー */}
        <div className="text-center py-8 px-4 bg-muted/50">
          <Avatar className="h-32 w-32 mx-auto mb-4 border-4 border-background shadow-lg">
            <AvatarImage src={profile.profile_image_url} alt={profile.display_name} />
            <AvatarFallback className="text-4xl">
              <User className="h-16 w-16" />
            </AvatarFallback>
          </Avatar>
          
          <h1 className="text-2xl font-bold mb-2">{profile.display_name}</h1>
          <Badge variant="secondary" className="mb-2">
            {profile.department_name || '未所属'}
          </Badge>
          <p className="text-sm text-muted-foreground mb-4">
            入社年: {profile.joined_year || '不明'}年
          </p>
          {profile.bio && (
            <p className="text-foreground italic max-w-md mx-auto">{profile.bio}</p>
          )}
          
          {isMyProfile && (
            <Button
              className="mt-4"
              onClick={() => navigate('/users/me/profile/edit')}
            >
              <Edit className="h-4 w-4 mr-2" />
              プロフィールを編集
            </Button>
          )}
        </div>

        {/* 詳細情報 */}
        <div className="p-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">趣味・関心</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">{profile.hobbies || '未設定'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">得意なこと</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">{profile.skills || '未設定'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">キャリア経歴</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                {profile.career_history || '未設定'}
              </pre>
            </CardContent>
          </Card>
        </div>

        {/* ログアウト */}
        {isMyProfile && (
          <div className="p-4 border-t">
            <div className="max-w-xs mx-auto">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  logout()
                  navigate('/login')
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                ログアウト
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserProfilePage