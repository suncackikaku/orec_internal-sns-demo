import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Send, User } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function CreatePostForm({ onPostCreated }) {
  const { user, getAuthHeaders } = useAuth()
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
        body: JSON.stringify({ body: body.trim() })
      })

      if (!res.ok) {
        throw new Error('Failed to create post')
      }

      setBody('')
      if (onPostCreated) {
        onPostCreated()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit}>
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
                className="min-h-[100px] resize-none"
              />
              
              {error && (
                <p className="text-sm text-red-500 mt-2">{error}</p>
              )}
              
              <div className="flex justify-end mt-3">
                <Button
                  type="submit"
                  disabled={loading || !body.trim()}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {loading ? '投稿中...' : '投稿'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default CreatePostForm
