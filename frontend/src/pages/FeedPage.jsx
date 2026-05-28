import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Heart, User, MessageSquare, Trash2, Send } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function FeedPage() {
  const { user, getAuthHeaders } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState('all') // 'all' or 'related'
  const [expandedComments, setExpandedComments] = useState(new Set())
  const [comments, setComments] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const [commentLoading, setCommentLoading] = useState({})

  useEffect(() => {
    fetchFeed()
  }, [page, activeTab])

  const fetchFeed = async () => {
    setLoading(true)
    try {
      const filterParam = activeTab === 'related' ? '&filter=related' : ''
      const res = await fetch(`${API_URL}/feed?page=${page}&per_page=20${filterParam}`, {
        headers: getAuthHeaders()
      })
      if (res.ok) {
        const data = await res.json()
        setPosts(data || [])
      } else {
        setPosts([])
      }
    } catch (err) {
      console.error('Failed to fetch feed:', err)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (postId, isLiked) => {
    try {
      const method = isLiked ? 'DELETE' : 'POST'
      const res = await fetch(`${API_URL}/posts/${postId}/like`, {
        method,
        headers: getAuthHeaders()
      })
      if (res.ok) {
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              is_liked: !isLiked,
              like_count: isLiked ? post.like_count - 1 : post.like_count + 1
            }
          }
          return post
        }))
      }
    } catch (err) {
      console.error('Failed to toggle like:', err)
    }
  }

  const toggleComments = async (postId) => {
    const newExpanded = new Set(expandedComments)
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId)
    } else {
      newExpanded.add(postId)
      if (!comments[postId]) {
        await fetchComments(postId)
      }
    }
    setExpandedComments(newExpanded)
  }

  const fetchComments = async (postId) => {
    try {
      const res = await fetch(`${API_URL}/posts/${postId}/comments`, {
        headers: getAuthHeaders()
      })
      if (res.ok) {
        const data = await res.json()
        setComments(prev => ({ ...prev, [postId]: data }))
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err)
    }
  }

  const handleCommentSubmit = async (postId) => {
    const body = commentInputs[postId]?.trim()
    if (!body) return

    setCommentLoading(prev => ({ ...prev, [postId]: true }))
    try {
      const res = await fetch(`${API_URL}/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ body })
      })
      if (res.ok) {
        setCommentInputs(prev => ({ ...prev, [postId]: '' }))
        await fetchComments(postId)
        // Update comment count
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return { ...post, comment_count: (post.comment_count || 0) + 1 }
          }
          return post
        }))
      }
    } catch (err) {
      console.error('Failed to create comment:', err)
    } finally {
      setCommentLoading(prev => ({ ...prev, [postId]: false }))
    }
  }

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const res = await fetch(`${API_URL}/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      if (res.ok) {
        await fetchComments(postId)
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return { ...post, comment_count: Math.max(0, (post.comment_count || 0) - 1) }
          }
          return post
        }))
      }
    } catch (err) {
      console.error('Failed to delete comment:', err)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-muted-foreground">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">フィード</h1>
        
        {/* タブ */}
        <div className="flex mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'all' 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            全フィード
            {activeTab === 'all' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('related')}
            className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'related' 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            自分に関連
            {activeTab === 'related' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>
        
        <div className="space-y-4">
          {posts.map(post => (
            <Card key={post.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Avatar 
                    className="h-10 w-10 cursor-pointer"
                    onClick={() => navigate(`/users/${post.author_id}/profile`)}
                  >
                    <AvatarImage src={post.author_image_url} alt={post.author_name} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="font-medium cursor-pointer hover:underline"
                        onClick={() => navigate(`/users/${post.author_id}/profile`)}
                      >
                        {post.author_name}
                      </span>
                      {post.visibility_type !== 'company' && (
                        <Badge variant="outline" className="text-xs">
                          {post.visibility_type === 'department' && '部署限定'}
                          {post.visibility_type === 'private' && '自分のみ'}
                          {post.visibility_type === 'group' && 'グループ限定'}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(post.created_at)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-foreground mb-3">{post.body}</p>
                    
                    {/* 画像表示 */}
                    {post.image_urls && post.image_urls.length > 0 && (
                      <div className={`grid gap-2 mb-3 ${
                        post.image_urls.length === 1 ? 'grid-cols-1' : 
                        post.image_urls.length === 2 ? 'grid-cols-2' : 
                        'grid-cols-2'
                      }`}>
                        {post.image_urls.map((url, index) => (
                          <img
                            key={index}
                            src={url}
                            alt={`画像 ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* タグ表示 */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {post.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-1 ${post.is_liked ? 'text-red-500' : 'text-muted-foreground'}`}
                        onClick={() => handleLike(post.id, post.is_liked)}
                      >
                        <Heart className={`h-4 w-4 ${post.is_liked ? 'fill-current' : ''}`} />
                        <span className="text-xs">{post.like_count || 0}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-1 ${expandedComments.has(post.id) ? 'text-primary' : 'text-muted-foreground'}`}
                        onClick={() => toggleComments(post.id)}
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-xs">{post.comment_count || 0}</span>
                      </Button>
                    </div>

                    {/* コメントセクション */}
                    {expandedComments.has(post.id) && (
                      <div className="mt-4 pt-4 border-t border-border">
                        {/* コメント入力 */}
                        <div className="flex gap-2 mb-4">
                          <input
                            type="text"
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(post.id)}
                            placeholder="コメントを入力..."
                            className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
                            disabled={commentLoading[post.id]}
                          />
                          <Button
                            size="sm"
                            disabled={!commentInputs[post.id]?.trim() || commentLoading[post.id]}
                            onClick={() => handleCommentSubmit(post.id)}
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* コメント一覧 */}
                        <div className="space-y-3">
                          {(comments[post.id] || []).map(comment => (
                            <div key={comment.id} className="flex items-start gap-2">
                              <Avatar className="h-6 w-6 flex-shrink-0">
                                <AvatarFallback className="text-xs">
                                  {comment.author_name?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{comment.author_name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatTimeAgo(comment.created_at)}
                                  </span>
                                  {user?.id === comment.author_id && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-auto py-0 px-1 text-muted-foreground hover:text-destructive"
                                      onClick={() => handleDeleteComment(post.id, comment.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                                <p className="text-sm text-foreground">{comment.body}</p>
                              </div>
                            </div>
                          ))}
                          {(comments[post.id]?.length === 0) && (
                            <p className="text-sm text-muted-foreground text-center py-2">
                              まだコメントがありません
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {(!posts || posts.length === 0) && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              {activeTab === 'all' 
                ? '投稿がありません。' 
                : '自分に関連する投稿がありません。'}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default FeedPage
