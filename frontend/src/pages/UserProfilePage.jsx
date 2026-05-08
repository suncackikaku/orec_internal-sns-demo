import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

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

  if (loading) return <div style={styles.loading}>読み込み中...</div>
  if (error) return <div style={styles.error}>エラー: {error}</div>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button 
          style={styles.backButton}
          onClick={() => navigate(-1)}
        >
          ← 戻る
        </button>
      </div>

      <div style={styles.profileHeader}>
        <img 
          src={profile.profile_image_url || 'https://via.placeholder.com/120'} 
          alt={profile.display_name}
          style={styles.avatar}
        />
        <h1 style={styles.name}>{profile.display_name}</h1>
        <p style={styles.department}>{profile.department_name || '未所属'}</p>
        <p style={styles.joinedYear}>入社年: {profile.joined_year || '不明'}年</p>
        <p style={styles.bio}>{profile.bio}</p>
        {isMyProfile && (
          <button
            style={styles.editButton}
            onClick={() => navigate('/users/me/profile/edit')}
          >
            プロフィールを編集
          </button>
        )}
      </div>

      <div style={styles.details}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>趣味・関心</h2>
          <p style={styles.sectionContent}>{profile.hobbies || '未設定'}</p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>得意なこと</h2>
          <p style={styles.sectionContent}>{profile.skills || '未設定'}</p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>キャリア経歴</h2>
          <pre style={styles.careerHistory}>{profile.career_history || '未設定'}</pre>
        </div>
      </div>

      {isMyProfile && (
        <div style={styles.logoutSection}>
          <button
            style={styles.logoutButton}
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            ログアウト
          </button>
        </div>
      )}
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
  header: {
    padding: '16px',
    borderBottom: '1px solid #e0e0e0',
  },
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    color: '#1976d2',
    padding: '8px 0',
  },
  profileHeader: {
    textAlign: 'center',
    padding: '32px 16px',
    backgroundColor: '#f8f9fa',
  },
  avatar: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    objectFit: 'cover',
    marginBottom: '16px',
    border: '4px solid #fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  name: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  department: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '4px',
  },
  joinedYear: {
    fontSize: '14px',
    color: '#888',
    marginBottom: '12px',
  },
  bio: {
    fontSize: '14px',
    color: '#333',
    fontStyle: 'italic',
  },
  editButton: {
    marginTop: '16px',
    padding: '8px 16px',
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  logoutSection: {
    padding: '24px 16px',
    textAlign: 'center',
    borderTop: '1px solid #e0e0e0',
    marginTop: '16px',
  },
  logoutButton: {
    padding: '10px 24px',
    backgroundColor: '#dc3545',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    width: '100%',
    maxWidth: '300px',
  },
  details: {
    padding: '16px',
  },
  section: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#1976d2',
  },
  sectionContent: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#333',
  },
  careerHistory: {
    fontSize: '14px',
    lineHeight: '1.8',
    color: '#333',
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit',
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
}

export default UserProfilePage