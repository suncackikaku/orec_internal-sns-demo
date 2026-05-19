import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Plus, Send, User, X } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function FloatingPostButton() {
  const { user, getAuthHeaders } = useAuth()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [tags, setTags] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      fetchDepartments()
    }
  }, [open])

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_URL}/departments`)
      if (res.ok) {
        const data = await res.json()
        setDepartments(data || [])
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!body.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          body: body.trim(),
          tags: tags
        })
      })

      if (!res.ok) {
        throw new Error('Failed to create post')
      }

      setBody('')
      setTags([])
      setOpen(false)
      // Refresh the page to show new post
      window.location.reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleTag = (deptName) => {
    setTags(prev => {
      if (prev.includes(deptName)) {
        return prev.filter(t => t !== deptName)
      }
      return [...prev, deptName]
    })
  }

  if (!user) return null

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-110 flex items-center justify-center"
        aria-label="新規投稿"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Post Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新規投稿</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.profile_image_url} alt={user?.display_name} />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <Textarea
                  placeholder="今何をしていますか？"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[120px] resize-none"
                  autoFocus
                />
                
                {error && (
                  <p className="text-sm text-red-500 mt-2">{error}</p>
                )}
              </div>
            </div>

            {/* タグ選択 */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">関連する部署をタグ付け（複数選択可）</p>
              <div className="flex flex-wrap gap-2">
                {departments.map(dept => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => toggleTag(dept.name)}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
                      tags.includes(dept.name)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {dept.name}
                    {tags.includes(dept.name) && <X className="h-3 w-3" />}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading || !body.trim()}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {loading ? '投稿中...' : '投稿'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default FloatingPostButton
