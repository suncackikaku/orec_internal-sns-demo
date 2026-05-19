import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Building2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function DepartmentSelectPage() {
  const { user, getAuthHeaders, setUser } = useAuth()
  const navigate = useNavigate()
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_URL}/departments`)
      if (res.ok) {
        const data = await res.json()
        setDepartments(data || [])
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectDepartment = async (deptId) => {
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/users/me/department`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ department_id: deptId })
      })

      if (res.ok) {
        // Update local user state
        setUser(prev => ({
          ...prev,
          primary_department_id: deptId
        }))
        navigate('/')
      } else {
        const errText = await res.text()
        setError(errText || '部署の設定に失敗しました')
      }
    } catch (err) {
      setError('部署の設定に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-muted-foreground">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">所属部署を選択</h1>
          <p className="text-sm text-muted-foreground">
            ようこそ、{user?.display_name}さん<br />
            所属する部署を選択してください
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-500 text-center">{error}</div>
        )}

        <div className="space-y-3">
          {departments.map(dept => (
            <Card
              key={dept.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleSelectDepartment(dept.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground">{dept.name}</h3>
                    {dept.catchcopy && (
                      <p className="text-sm text-muted-foreground truncate">{dept.catchcopy}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DepartmentSelectPage
