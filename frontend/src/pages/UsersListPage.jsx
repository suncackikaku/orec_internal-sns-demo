import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Search, ArrowLeft, ChevronLeft, ChevronRight, User } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const API_URL = import.meta.env.VITE_API_URL || '/api'

function UsersListPage() {
  const { getAuthHeaders } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState(undefined)
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

  const handleDepartmentChange = (value) => {
    setSelectedDepartment(value)
    setPage(1)
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
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
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4">
        {/* ヘッダー */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
          <h1 className="text-2xl font-bold">社員一覧</h1>
        </div>

        {/* フィルター & 検索 */}
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="社員を検索..."
                  className="pl-10"
                />
              </div>
              <Button type="submit">検索</Button>
            </form>

            <Select value={selectedDepartment} onValueChange={handleDepartmentChange}>
              <SelectTrigger>
                <SelectValue placeholder="全ての部署" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* 結果件数 */}
        <p className="text-sm text-muted-foreground mb-4">
          {(totalCount || 0) === 0 
            ? '該当する社員がいません' 
            : `${totalCount || 0}件中 ${(page - 1) * perPage + 1} - ${Math.min(page * perPage, totalCount || 0)}件を表示`
          }
        </p>

        {/* グリッドレイアウト */}
        {(users?.length || 0) > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {users.map(user => (
              <Card
                key={user.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/users/${user.id}/profile`)}
              >
                <CardContent className="pt-6 text-center">
                  <Avatar className="h-20 w-20 mx-auto mb-3">
                    <AvatarImage src={user.profile_image_url} alt={user.display_name} />
                    <AvatarFallback>
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-medium mb-1">{user.display_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {user.department_name || '未所属'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              該当する社員が見つかりませんでした
            </CardContent>
          </Card>
        )}

        {/* ページネーション */}
        {(totalPages || 0) > 1 && (
          <div className="flex justify-center items-center gap-4">
            <Button
              variant="outline"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              前へ
            </Button>
            
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}ページ
            </span>
            
            <Button
              variant="outline"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
            >
              次へ
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default UsersListPage