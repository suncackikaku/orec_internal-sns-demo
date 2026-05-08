import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function DepartmentsListPage() {
  const { getAuthHeaders } = useAuth()
  const navigate = useNavigate()
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_URL}/departments`, {
        headers: getAuthHeaders()
      })
      
      if (!res.ok) {
        throw new Error('Failed to fetch departments')
      }
      
      const data = await res.json()
      setDepartments(data)
    } catch (err) {
      setError(err.message)
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

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>エラー: {error}</div>
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
        <h1 style={styles.title}>部署一覧</h1>
      </div>

      <div style={styles.list}>
        {departments.map(dept => (
          <div
            key={dept.id}
            style={styles.departmentCard}
            onClick={() => navigate(`/departments/${dept.id}`)}
          >
            <div style={styles.coverImageContainer}>
              <img
                src={dept.cover_image_url || 'https://via.placeholder.com/800x200'}
                alt={dept.name}
                style={styles.coverImage}
              />
              <div style={styles.coverOverlay}>
                <h2 style={styles.deptName}>{dept.name}</h2>
              </div>
            </div>
            
            <div style={styles.deptInfo}>
              <p style={styles.catchcopy}>{dept.catchcopy}</p>
              <p style={styles.description}>{dept.description}</p>
            </div>
          </div>
        ))}
      </div>
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
    backgroundColor: '#fff',
    padding: '16px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
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
    fontSize: '20px',
    fontWeight: 'bold',
  },
  list: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  departmentCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  coverImageContainer: {
    position: 'relative',
    height: '150px',
    overflow: 'hidden',
  },
  coverImage: {
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
    padding: '16px',
  },
  deptName: {
    color: '#fff',
    margin: 0,
    fontSize: '20px',
    fontWeight: 'bold',
  },
  deptInfo: {
    padding: '16px',
  },
  catchcopy: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#1976d2',
    marginBottom: '8px',
  },
  description: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5',
    margin: 0,
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

export default DepartmentsListPage