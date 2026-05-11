import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Search, X, ArrowLeft, User, Building2, FileText } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function SearchResults({ keyword, onClear }) {
  const { getAuthHeaders } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('users')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  React.useEffect(() => {
    if (keyword) {
      performSearch()
    }
  }, [keyword])

  const performSearch = async () => {
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(keyword)}`, {
        headers: getAuthHeaders()
      })
      
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText)
      }
      
      const data = await res.json()
      setResults(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        検索中...
      </div>
    )
  }

  if (error) {
    return (
      <Card className="mb-6 border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={onClear}>クリア</Button>
        </CardContent>
      </Card>
    )
  }

  if (!results) {
    return null
  }

  const totalCount = (results.users?.length || 0) + (results.departments?.length || 0) + (results.posts?.length || 0)

  if (totalCount === 0) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground mb-4">
            「{keyword}」の検索結果は見つかりませんでした
          </p>
          <Button variant="outline" onClick={onClear}>クリア</Button>
        </CardContent>
      </Card>
    )
  }

  const tabs = [
    { id: 'users', label: '社員', count: results.users?.length || 0, icon: User },
    { id: 'departments', label: '部署', count: results.departments?.length || 0, icon: Building2 },
    { id: 'posts', label: '投稿', count: results.posts?.length || 0, icon: FileText },
  ]

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">検索結果: 「{keyword}」</CardTitle>
        <Button variant="outline" size="sm" onClick={onClear}>
          <X className="h-4 w-4 mr-1" />
          クリア
        </Button>
      </CardHeader>
      <CardContent>
        {/* タブ */}
        <div className="flex border-b mb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              <Badge variant={activeTab === tab.id ? "default" : "secondary"} className="ml-1">
                {tab.count}
              </Badge>
            </button>
          ))}
        </div>

        {/* 結果表示 */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {activeTab === 'users' && results.users?.map(user => (
            <div
              key={user.id}
              className="flex items-center gap-4 p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => navigate(`/users/${user.id}/profile`)}
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.profile_image_url} alt={user.display_name} />
                <AvatarFallback>{user.display_name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h4 className="font-medium">{user.display_name}</h4>
                <p className="text-sm text-muted-foreground">{user.department_name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium text-primary">{user.matched_field}: </span>
                  {user.matched_text}
                </p>
              </div>
            </div>
          ))}

          {activeTab === 'departments' && results.departments?.map(dept => (
            <div
              key={dept.id}
              className="flex items-center gap-4 p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => navigate(`/departments/${dept.id}`)}
            >
              <img
                src={dept.cover_image_url || 'https://via.placeholder.com/100x60'}
                alt={dept.name}
                className="w-24 h-16 object-cover rounded-md"
              />
              <div className="flex-1">
                <h4 className="font-medium">{dept.name}</h4>
                <p className="text-sm text-muted-foreground">{dept.catchcopy}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium text-primary">{dept.matched_field}</span>
                </p>
              </div>
            </div>
          ))}

          {activeTab === 'posts' && results.posts?.map(post => (
            <div key={post.id} className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <strong className="text-sm">{post.author_name}</strong>
                <span className="text-xs text-muted-foreground">
                  {new Date(post.created_at).toLocaleDateString('ja-JP')}
                </span>
              </div>
              <p className="text-sm text-foreground">{post.body}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default SearchResults