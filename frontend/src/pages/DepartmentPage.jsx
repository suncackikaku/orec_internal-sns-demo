import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function DepartmentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getAuthHeaders } = useAuth()
  const [activeTab, setActiveTab] = useState('members')
  const [department, setDepartment] = useState(null)
  const [members, setMembers] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const deptId = id || '11111111-1111-1111-1111-111111111111'

  useEffect(() => {
    fetch(`${API_URL}/departments/${deptId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then(data => {
        setDepartment(data.department)
        setMembers(data.members)
        setPosts(data.posts)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [deptId])

  if (loading) return <div style={styles.loading}>読み込み中...</div>
  if (error) return <div style={styles.error}>エラー: {error}</div>

  return (
    <div style={styles.container}>
      <div style={styles.coverImage} >
        <img 
          src={department.cover_image_url} 
          alt={department.name}
          style={styles.coverImg}
        />
        <div style={styles.coverOverlay}>
          <h1 style={styles.deptName}>{department.name}</h1>
          <p style={styles.catchcopy}>{department.catchcopy}</p>
        </div>
      </div>

      {/* 部署紹介 */}
      {department.description && (
        <div style={styles.descriptionBox}>
          <p style={styles.descriptionText}>{department.description}</p>
        </div>
      )}

      <div style={styles.tabContainer}>
        <button 
          style={{
            ...styles.tab,
            ...(activeTab === 'members' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('members')}
        >
          メンバー一覧
        </button>
        <button 
          style={{
            ...styles.tab,
            ...(activeTab === 'feed' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('feed')}
        >
          フィード
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'members' ? (
          (members || []).length > 0 ? (
            <div style={styles.memberList}>
              {(members || []).map(member => (
                <div 
                  key={member.id} 
                  style={styles.memberCard}
                  onClick={() => navigate(`/users/${member.id}/profile`)}
                >
                  <img 
                    src={member.profile_image_url || 'https://via.placeholder.com/60'} 
                    alt={member.display_name}
                    style={styles.memberAvatar}
                  />
                  <span style={styles.memberName}>{member.display_name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <p>メンバーがいません</p>
            </div>
          )
        ) : (
          (posts || []).length > 0 ? (
            <div className="space-y-4">
              {(posts || []).map(post => (
                <Card key={post.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{post.author_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(post.created_at).toLocaleDateString('ja-JP')}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{post.body}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <p>投稿がありません</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#fff',
    minHeight: '100vh',
  },
  coverImage: {
    position: 'relative',
    height: '200px',
    overflow: 'hidden',
  },
  coverImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
    padding: '20px',
    color: '#fff',
  },
  deptName: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  catchcopy: {
    fontSize: '14px',
    opacity: 0.9,
  },
  descriptionBox: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #e0e0e0',
  },
  descriptionText: {
    fontSize: '14px',
    lineHeight: '1.8',
    color: '#444',
    margin: 0,
  },
  tabContainer: {
    display: 'flex',
    borderBottom: '1px solid #e0e0e0',
  },
  tab: {
    flex: 1,
    padding: '16px',
    border: 'none',
    backgroundColor: '#fff',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
  },
  activeTab: {
    borderBottom: '2px solid #1976d2',
    color: '#1976d2',
  },
  content: {
    padding: '16px',
  },
  memberList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  memberCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  memberAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    marginRight: '12px',
    objectFit: 'cover',
  },
  memberName: {
    fontSize: '16px',
    fontWeight: '500',
  },
  feed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  postCard: {
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  postHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  postDate: {
    fontSize: '12px',
    color: '#666',
  },
  postBody: {
    fontSize: '14px',
    lineHeight: '1.6',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '16px',
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    color: '#d32f2f',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    fontSize: '16px',
  },
}

export default DepartmentPage