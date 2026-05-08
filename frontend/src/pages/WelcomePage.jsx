import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function WelcomePage() {
  const { user, logout, getAuthHeaders } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchProfile()
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

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>読み込み中...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* ヘッダー - ユーザー情報 */}
      <header style={styles.header}>
        <div style={styles.userInfo}>
          <img
            src={profile?.profile_image_url || 'https://via.placeholder.com/60'}
            alt={user?.display_name}
            style={styles.avatar}
          />
          <div style={styles.userDetails}>
            <h2 style={styles.userName}>{user?.display_name}</h2>
            <p style={styles.department}>{profile?.department_name || '未所属'}</p>
          </div>
        </div>
        <button 
          onClick={() => navigate(`/users/${user?.id}/profile`)} 
          style={styles.settingsButton}
          title="設定"
        >
          ⚙️
        </button>
      </header>

      {/* メインコンテンツ - ダッシュボード */}
      <main style={styles.main}>
        <h1 style={styles.welcomeTitle}>
          ようこそ、{user?.display_name}さん
        </h1>

        {/* クイックアクセスメニュー */}
        <div style={styles.menuGrid}>
          {/* 部署一覧 */}
          <div
            style={styles.menuCard}
            onClick={() => navigate('/departments')}
          >
            <div style={styles.menuIcon}>🏢</div>
            <h3 style={styles.menuTitle}>部署一覧</h3>
            <p style={styles.menuDescription}>
              全社の部署情報を閲覧します
            </p>
          </div>

          {/* 所属部署 */}
          <div
            style={styles.menuCard}
            onClick={() => navigate(`/departments/${user?.primary_department_id}`)}
          >
            <div style={styles.menuIcon}>🎯</div>
            <h3 style={styles.menuTitle}>所属部署</h3>
            <p style={styles.menuDescription}>
              自分の所属部署ページへ移動します
            </p>
          </div>
        </div>

        {/* 一言メッセージ表示 */}
        {profile?.bio && (
          <div style={styles.bioSection}>
            <h3 style={styles.bioTitle}>一言メッセージ</h3>
            <p style={styles.bioText}>{profile.bio}</p>
          </div>
        )}
      </main>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
  },
  header: {
    backgroundColor: '#1976d2',
    color: '#fff',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #fff',
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold',
  },
  department: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    opacity: 0.9,
  },
  settingsButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '8px',
  },
  main: {
    padding: '24px 16px',
  },
  welcomeTitle: {
    fontSize: '24px',
    marginBottom: '24px',
    color: '#333',
    textAlign: 'center',
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  menuCard: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    textAlign: 'center',
  },
  menuIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  menuTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#333',
  },
  menuDescription: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  },
  bioSection: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  bioTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#1976d2',
  },
  bioText: {
    fontSize: '16px',
    color: '#333',
    fontStyle: 'italic',
    margin: 0,
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '16px',
  },
}

export default WelcomePage