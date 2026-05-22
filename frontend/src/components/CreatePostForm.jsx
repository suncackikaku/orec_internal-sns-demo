import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Send, User, X, Image as ImageIcon } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function CreatePostForm({ onPostCreated }) {
  const { user, getAuthHeaders } = useAuth()
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imageURLs, setImageURLs] = useState([])
  const [uploadingImages, setUploadingImages] = useState(false)

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
          image_urls: imageURLs
        })
      })

      if (!res.ok) {
        throw new Error('Failed to create post')
      }

      setBody('')
      setImageURLs([])
      if (onPostCreated) {
        onPostCreated()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImages(true)
    const newImageURLs = [...imageURLs]

    for (const file of files) {
      if (newImageURLs.length >= 4) {
        setError('画像は最大4枚まで添付できます')
        break
      }

      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData
        })

        if (res.ok) {
          const data = await res.json()
          newImageURLs.push(data.url)
        } else {
          setError('画像のアップロードに失敗しました')
        }
      } catch (err) {
        setError('画像のアップロードに失敗しました')
      }
    }

    setImageURLs(newImageURLs)
    setUploadingImages(false)
    e.target.value = ''
  }

  const removeImage = (index) => {
    setImageURLs(prev => prev.filter((_, i) => i !== index))
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
                maxLength={4000}
              />
              <div className="flex justify-between items-center mt-1">
                <span className={`text-xs ${body.length > 4000 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {body.length}/4000字
                </span>
              </div>
              
              {error && (
                <p className="text-sm text-red-500 mt-2">{error}</p>
              )}
              
              {/* 画像添付 */}
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="create-post-image-upload"
                    disabled={uploadingImages || imageURLs.length >= 4}
                  />
                  <label
                    htmlFor="create-post-image-upload"
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm cursor-pointer transition-colors ${
                      imageURLs.length >= 4 || uploadingImages
                        ? 'bg-muted text-muted-foreground opacity-50'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <ImageIcon className="h-4 w-4" />
                    {uploadingImages ? 'アップロード中...' : `画像を追加 (${imageURLs.length}/4)`}
                  </label>
                </div>
                
                {/* 画像プレビュー */}
                {imageURLs.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {imageURLs.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`画像 ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end mt-3">
                <Button
                  type="submit"
                  disabled={loading || !body.trim() || body.length > 4000}
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
