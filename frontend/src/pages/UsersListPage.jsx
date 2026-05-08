import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function UsersListPage() {
  const { getAuthHeaders } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const perPage = 12

  useEffect(() => {
    fetchDepartments()
    fetchUsers()
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [page, selectedDepartment])

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_URL}/departments`, {
        headers: getAuthHeaders()
      })
      if (res.ok) {
        const data = await res.json()
        setDepartments(data)
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    setError('')
    
    try {
      let url = `${API_URL}/users?page=${page}&per_page=${perPage}`
      
      if (selectedDepartment) {
        url += `&department_id=${selectedDepartment}`
      }
      
      if (searchKeyword) {
        url += `&q=${encodeURIComponent(searchKeyword)}`
      }
      
      const res = await fetch(url, {
        headers: getAuthHeaders()
      })
      
      if (!res.ok) {
        throw new Error('Failed to fetch users')
      }
      
      const data = await res.json()
      setUsers(data.users || [])
      setTotalCount(data.total_count || 0)
      setTotalPages(Math.ceil((data.total_count || 0) / perPage))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchUsers()
  }

  const handleDepartmentChange = (e) => {
    setSelectedDepartment(e.target.value)
    setPage(1)
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
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
      <div style={styles.header}>
        <button 
          style={styles.backButton}
          onClick={() => navigate('/')}
        >
          ← 戻る
        </button>
        <h1 style={styles.title}>社員一覧</h1>
      </div>

      {/* フィルター & 検索 */}
      <div style={styles.filterSection}>
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <div style={styles.searchContainer}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="社員を検索..."
              style={styles.searchInput}
            />
          </div>
          <button type="submit" style={styles.searchButton}>
            検索
          </button>
        </form>

        <select
          value={selectedDepartment}
          onChange={handleDepartmentChange}
          style={styles.departmentSelect}
        >
          <option value="">全ての部署</option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* 結果件数 */}
      <p style={styles.resultCount}>
        {(totalCount || 0) === 0 
          ? '該当する社員がいません' 
          : `${totalCount || 0}件中 ${(page - 1) * perPage + 1} - ${Math.min(page * perPage, totalCount || 0)}件を表示`
        }
      </p>

      {/* グリッドレイアウト */}
      {(users?.length || 0) > 0 ? (
        <div style={styles.userGrid}>
          {users.map(user => (
            <div
              key={user.id}
              style={styles.userCard}
              onClick={() => navigate(`/users/${user.id}/profile`)}
            >
              <img
                src={user.profile_image_url || 'https://via.placeholder.com/120'}
                alt={user.display_name}
                style={styles.userAvatar}
              />
              <h3 style={styles.userName}>{user.display_name}</h3>
              <p style={styles.userDepartment}>{user.department_name || '未所属'}</p>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>
          <p>該当する社員が見つかりませんでした</p>
        </div>
      )}

      {/* ページネーション */}
      {(totalPages || 0) > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            style={{
              ...styles.pageButton,
              ...(page === 1 ? styles.disabledButton : {})
            }}
          >
            ← 前へ
          </button>
          
          <span style={styles.pageInfo}>
            {page} / {totalPages}ページ
          </span>
          
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            style={{
              ...styles.pageButton,
              ...(page === totalPages ? styles.disabledButton : {})
            }}
          >
            次へ →
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
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
    padding: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    color: '#1976d2',
    padding: '8px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold',
  },
  filterSection: {
    backgroundColor: '#fff',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '24px',
  },
  searchForm: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  searchContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    padding: '8px 12px',
  },
  searchIcon: {
    fontSize: '16px',
    marginRight: '8px',
    color: '#666',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    backgroundColor: 'transparent',
  },
  searchButton: {
    padding: '8px 16px',
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  departmentSelect: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: '#fff',
  },
  resultCount: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '16px',
  },
  userGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  userAvatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    objectFit: 'cover',
    marginBottom: '12px',
  },
  userName: {
    margin: '0 0 4px 0',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  userDepartment: {
    margin: 0,
    fontSize: '14px',
    color: '#666',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
  },
  pageButton: {
    padding: '8px 16px',
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#666',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '16px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    fontSize: '16px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  error: {
    padding: '16px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '8px',
    marginBottom: '16px',
  },
}

export default UsersListPage