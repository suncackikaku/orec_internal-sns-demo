import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import SearchResults from '../components/SearchResults'

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
      // SSE接続を確立（トークンをクエリパラメータで送信）
      const token = localStorage.getItem('token')
      const eventSource = new EventSource(`${API_URL}/activities/stream?token=${token}`)
      
      eventSource.onmessage = (event) => {
        try {
          const newActivity = JSON.parse(event.data)
          setActivities(prev => {
            // 重複を避ける
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
        {/* 検索バー */}
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <div style={styles.searchContainer}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value)
                if (!e.target.value.trim()) {
                  setShowResults(false)
                }
              }}
              placeholder="社員、部署、投稿を検索..."
              style={styles.searchInput}
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={handleClearSearch}
                style={styles.clearButton}
              >
                ✕
              </button>
            )}
          </div>
          <button type="submit" style={styles.searchButton}>
            検索
          </button>
        </form>

        {/* 検索結果 */}
        {showResults && (
          <SearchResults
            keyword={searchKeyword}
            onClear={handleClearSearch}
          />
        )}

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

          {/* 社員一覧 */}
          <div
            style={styles.menuCard}
            onClick={() => navigate('/users')}
          >
            <div style={styles.menuIcon}>👥</div>
            <h3 style={styles.menuTitle}>社員一覧</h3>
            <p style={styles.menuDescription}>
              全社の社員を閲覧します
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

        {/* お知らせ */}
        {(activities?.length || 0) > 0 && (
          <div style={styles.activitiesSection}>
            <h3 style={styles.activitiesTitle}>📢 お知らせ</h3>
            <div ref={activitiesRef} style={styles.activitiesList}>
              {activities.map(activity => (
                <div key={activity.id} style={styles.activityItem}>
                  <div style={styles.activityMessage}>{activity.message}</div>
                  <div style={styles.activityTime}>{formatTimeAgo(activity.created_at)}</div>
                </div>
              ))}
            </div>
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
  searchForm: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
  },
  searchContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '8px 12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  searchIcon: {
    fontSize: '18px',
    marginRight: '8px',
    color: '#666',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '16px',
    padding: '4px',
  },
  clearButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#999',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
  },
  searchButton: {
    padding: '10px 20px',
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
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
    marginBottom: '24px',
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
  activitiesSection: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  activitiesTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#333',
  },
  activitiesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  activityItem: {
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    borderLeft: '4px solid #1976d2',
  },
  activityMessage: {
    fontSize: '14px',
    color: '#333',
    marginBottom: '4px',
  },
  activityTime: {
    fontSize: '12px',
    color: '#888',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '16px',
  },
}

export default WelcomePage