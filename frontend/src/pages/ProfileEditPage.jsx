import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function ProfileEditPage() {
  const { user, getAuthHeaders } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    bio: '',
    hobbies: '',
    skills: '',
    career_history: '',
    profile_image_url: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetchLoading, setFetchLoading] = useState(true)

  // 既存のプロフィールデータを取得
  useEffect(() => {
    fetchCurrentProfile()
  }, [])

  const fetchCurrentProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/users/${user.id}/profile`, {
        headers: getAuthHeaders()
      })
      
      if (res.ok) {
        const data = await res.json()
        setFormData({
          bio: data.bio || '',
          hobbies: data.hobbies || '',
          skills: data.skills || '',
          career_history: data.career_history || '',
          profile_image_url: data.profile_image_url || ''
        })
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    } finally {
      setFetchLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/users/me/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        // 更新成功後、プロフィールページに遷移
        navigate(`/users/${user.id}/profile`)
      } else {
        const errorText = await res.text()
        setError(errorText)
      }
    } catch (err) {
      setError('更新に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (fetchLoading) {
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
          onClick={() => navigate(-1)}
        >
          ← 戻る
        </button>
      </div>

      <h1 style={styles.title}>プロフィール編集</h1>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={styles.formGroup}>
          <label style={styles.label}>一言メッセージ</label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            style={styles.textarea}
            rows={3}
            placeholder="自分を一言で表現"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>趣味・関心</label>
          <textarea
            name="hobbies"
            value={formData.hobbies}
            onChange={handleChange}
            style={styles.textarea}
            rows={3}
            placeholder="趣味や興味のあること"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>得意なこと</label>
          <textarea
            name="skills"
            value={formData.skills}
            onChange={handleChange}
            style={styles.textarea}
            rows={3}
            placeholder="得意なスキルや技術"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>キャリア経歴</label>
          <textarea
            name="career_history"
            value={formData.career_history}
            onChange={handleChange}
            style={styles.textarea}
            rows={5}
            placeholder="これまでのキャリア経歴"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>プロフィール画像URL</label>
          <input
            type="url"
            name="profile_image_url"
            value={formData.profile_image_url}
            onChange={handleChange}
            style={styles.input}
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <button
          type="submit"
          style={styles.button}
          disabled={loading}
        >
          {loading ? '更新中...' : '更新'}
        </button>
      </form>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#fff',
    minHeight: '100vh',
    padding: '16px',
  },
  header: {
    marginBottom: '16px',
  },
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    color: '#1976d2',
    padding: '8px 0',
  },
  title: {
    fontSize: '24px',
    marginBottom: '24px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '16px',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '16px',
  },
}

export default ProfileEditPage