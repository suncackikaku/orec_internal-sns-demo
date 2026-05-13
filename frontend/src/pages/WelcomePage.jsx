import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import SearchResults from '../components/SearchResults'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Search, X, Settings, Building2, Users, Bell, MessageSquare, Heart } from 'lucide-react'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"

const API_URL = import.meta.env.VITE_API_URL || '/api'

function WelcomePage() {
  const { user, getAuthHeaders } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [activities, setActivities] = useState([])
  const [activitiesRef] = useAutoAnimate()

  useEffect(() => {
    if (user) {
      fetchProfile()
      const token = localStorage.getItem('token')
      const eventSource = new EventSource(`${API_URL}/activities/stream?token=${token}`)
      
      eventSource.onmessage = (event) => {
        try {
          const newActivity = JSON.parse(event.data)
          setActivities(prev => {
            if (prev.find(a => a.id === newActivity.id)) {
              return prev
            }
            return [newActivity, ...prev].slice(0, 10)
          })
        } catch (err) {
          console.error('Failed to parse activity:', err)
        }
      }
      
      eventSource.onerror = (err) => {
        console.error('SSE error:', err)
        eventSource.close()
      }
      
      return () => {
        eventSource.close()
      }
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/users/${user.id}/profile`, {
        headers: getAuthHeaders()
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'たった今'
    if (diffMins < 60) return `${diffMins}分前`
    if (diffHours < 24) return `${diffHours}時間前`
    if (diffDays < 7) return `${diffDays}日前`
    return date.toLocaleDateString('ja-JP')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchKeyword.trim()) {
      setShowResults(true)
    }
  }

  const handleClearSearch = () => {
    setSearchKeyword('')
    setShowResults(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-muted-foreground">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <header className="bg-primary text-primary-foreground p-4 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary-foreground">
              <AvatarImage src={profile?.profile_image_url} alt={user?.display_name} />
              <AvatarFallback>{user?.display_name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-bold">{user?.display_name}</h2>
              <Badge variant="secondary" className="mt-1">
                {profile?.department_name || '未所属'}
              </Badge>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(`/users/${user?.id}/profile`)}
            className="text-primary-foreground hover:bg-primary/90"
          >
            <Settings className="h-6 w-6" />
          </Button>
        </header>

        {/* メインコンテンツ */}
        <main className="p-4 space-y-6">
          {/* 検索バー */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value)
                  if (!e.target.value.trim()) {
                    setShowResults(false)
                  }
                }}
                placeholder="社員、部署、投稿を検索..."
                className="pl-10 pr-10"
              />
              {searchKeyword && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClearSearch}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button type="submit">
              検索
            </Button>
          </form>

          {/* 検索結果 */}
          {showResults && (
            <SearchResults
              keyword={searchKeyword}
              onClear={handleClearSearch}
            />
          )}

          {/* ウェルカムメッセージ */}
          <h1 className="text-2xl font-bold text-center text-foreground">
            ようこそああ、{user?.display_name}さん
          </h1>

          {/* クイックアクセスメニュー */}
          <div className="grid grid-cols-3 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/feed')}
            >
              <CardHeader className="text-center">
                <Heart className="h-10 w-10 mx-auto text-primary mb-2" />
                <CardTitle>フィード</CardTitle>
                <CardDescription>フォロー中の投稿</CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/departments')}
            >
              <CardHeader className="text-center">
                <Building2 className="h-10 w-10 mx-auto text-primary mb-2" />
                <CardTitle>部署一覧</CardTitle>
                <CardDescription>全社の部署情報を閲覧します</CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/users')}
            >
              <CardHeader className="text-center">
                <Users className="h-10 w-10 mx-auto text-primary mb-2" />
                <CardTitle>社員一覧</CardTitle>
                <CardDescription>全社の社員を閲覧します</CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* 一言メッセージ */}
          {profile?.bio && (
            <Card>
              <CardHeader>
                <CardTitle className="text-primary">一言メッセージ</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg italic text-foreground">{profile.bio}</p>
              </CardContent>
            </Card>
          )}

          {/* お知らせ */}
          {(activities?.length || 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  お知らせ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ItemGroup ref={activitiesRef} className="gap-3">
                  {activities.map(activity => (
                    <Item key={activity.id} variant="outline" className="cursor-pointer hover:bg-muted/80">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                          {activity.actor_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <ItemContent>
                        <ItemTitle className="line-clamp-2">
                          {activity.message}
                        </ItemTitle>
                        <ItemDescription className="flex items-center gap-1">
                          <span>{activity.actor_name || 'Unknown'}</span>
                          <span>·</span>
                          <span>{formatTimeAgo(activity.created_at)}</span>
                        </ItemDescription>
                      </ItemContent>
                    </Item>
                  ))}
                </ItemGroup>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}

export default WelcomePage