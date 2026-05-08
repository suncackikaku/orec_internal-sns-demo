import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

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
    return <div style={styles.loading}>検索中...</div>
  }

  if (error) {
    return (
      <div style={styles.error}>
        <p>{error}</p>
        <button onClick={onClear} style={styles.clearButton}>クリア</button>
      </div>
    )
  }

  if (!results) {
    return null
  }

  const totalCount = (results.users?.length || 0) + (results.departments?.length || 0) + (results.posts?.length || 0)

  if (totalCount === 0) {
    return (
      <div style={styles.noResults}>
        <p>「{keyword}」の検索結果は見つかりませんでした</p>
        <button onClick={onClear} style={styles.clearButton}>クリア</button>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>検索結果: 「{keyword}」</h3>
        <button onClick={onClear} style={styles.clearButton}>クリア</button>
      </div>

      {/* タブ */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'users' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('users')}
        >
          社員 ({results.users?.length || 0})
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'departments' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('departments')}
        >
          部署 ({results.departments?.length || 0})
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'posts' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('posts')}
        >
          投稿 ({results.posts?.length || 0})
        </button>
      </div>

      {/* 結果表示 */}
      <div style={styles.results}>
        {activeTab === 'users' && results.users?.map(user => (
          <div
            key={user.id}
            style={styles.resultCard}
            onClick={() => navigate(`/users/${user.id}/profile`)}
          >
            <img
              src={user.profile_image_url || 'https://via.placeholder.com/50'}
              alt={user.display_name}
              style={styles.userAvatar}
            />
            <div style={styles.userInfo}>
              <h4 style={styles.userName}>{user.display_name}</h4>
              <p style={styles.userDept}>{user.department_name}</p>
              <p style={styles.matchedText}>
                <span style={styles.matchedLabel}>{user.matched_field}: </span>
                {user.matched_text}
              </p>
            </div>
          </div>
        ))}

        {activeTab === 'departments' && results.departments?.map(dept => (
          <div
            key={dept.id}
            style={styles.resultCard}
            onClick={() => navigate(`/departments/${dept.id}`)}
          >
            <img
              src={dept.cover_image_url || 'https://via.placeholder.com/100x60'}
              alt={dept.name}
              style={styles.deptImage}
            />
            <div style={styles.deptInfo}>
              <h4 style={styles.deptName}>{dept.name}</h4>
              <p style={styles.deptCatchcopy}>{dept.catchcopy}</p>
              <p style={styles.matchedText}>
                <span style={styles.matchedLabel}>{dept.matched_field}</span>
              </p>
            </div>
          </div>
        ))}

        {activeTab === 'posts' && results.posts?.map(post => (
          <div
            key={post.id}
            style={styles.resultCard}
          >
            <div style={styles.postHeader}>
              <strong>{post.author_name}</strong>
              <span style={styles.postDate}>
                {new Date(post.created_at).toLocaleDateString('ja-JP')}
              </span>
            </div>
            <p style={styles.postBody}>{post.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '24px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #e0e0e0',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold',
  },
  clearButton: {
    padding: '6px 12px',
    backgroundColor: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e0e0e0',
  },
  tab: {
    flex: 1,
    padding: '12px',
    border: 'none',
    backgroundColor: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
  },
  activeTab: {
    borderBottom: '2px solid #1976d2',
    color: '#1976d2',
    fontWeight: 'bold',
  },
  results: {
    padding: '16px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  resultCard: {
    display: 'flex',
    padding: '12px',
    marginBottom: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  userAvatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    objectFit: 'cover',
    marginRight: '12px',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    margin: '0 0 4px 0',
    fontSize: '16px',
  },
  userDept: {
    margin: '0 0 4px 0',
    fontSize: '14px',
    color: '#666',
  },
  deptImage: {
    width: '100px',
    height: '60px',
    objectFit: 'cover',
    borderRadius: '4px',
    marginRight: '12px',
  },
  deptInfo: {
    flex: 1,
  },
  deptName: {
    margin: '0 0 4px 0',
    fontSize: '16px',
  },
  deptCatchcopy: {
    margin: '0 0 4px 0',
    fontSize: '14px',
    color: '#666',
  },
  matchedText: {
    margin: 0,
    fontSize: '13px',
    color: '#888',
  },
  matchedLabel: {
    fontWeight: 'bold',
    color: '#1976d2',
  },
  postHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  postDate: {
    fontSize: '12px',
    color: '#888',
  },
  postBody: {
    margin: 0,
    fontSize: '14px',
    lineHeight: '1.5',
  },
  loading: {
    textAlign: 'center',
    padding: '20px',
    fontSize: '16px',
  },
  error: {
    padding: '16px',
    backgroundColor: '#ffebee',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  noResults: {
    textAlign: 'center',
    padding: '24px',
    color: '#666',
  },
}

export default SearchResults