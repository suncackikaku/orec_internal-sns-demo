import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, ChevronLeft, ChevronRight, Trash2, Building2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function UserManagementPage() {
  const { getAuthHeaders } = useAdminAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [editingUser, setEditingUser] = useState(null)
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [deleteUser, setDeleteUser] = useState(null)
  const perPage = 20

  useEffect(() => {
    fetchDepartments()
    fetchUsers()
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [page])

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/departments`, {
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
    try {
      setLoading(true)
      const queryParams = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString()
      })
      if (searchKeyword) {
        queryParams.append('q', searchKeyword)
      }

      const res = await fetch(`${API_URL}/admin/users?${queryParams}`, {
        headers: getAuthHeaders()
      })

      if (!res.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await res.json()
      setUsers(data.users)
      setTotalCount(data.total_count)
      setTotalPages(Math.ceil(data.total_count / perPage))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchUsers()
  }

  const handleUpdateDepartment = async () => {
    if (!editingUser || !selectedDepartment) return

    try {
      const res = await fetch(`${API_URL}/admin/users/${editingUser.id}/department`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ department_id: selectedDepartment })
      })

      if (!res.ok) {
        throw new Error('Failed to update department')
      }

      setEditingUser(null)
      setSelectedDepartment('')
      fetchUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteUser) return

    try {
      const res = await fetch(`${API_URL}/admin/users/${deleteUser.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (!res.ok) {
        throw new Error('Failed to delete user')
      }

      setDeleteUser(null)
      fetchUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  const getDepartmentName = (deptId) => {
    const dept = departments.find(d => d.id === deptId)
    return dept ? dept.name : '未所属'
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">ユーザー管理</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="名前またはメールアドレスで検索"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch}>検索</Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">ユーザー</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">メール</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">認証方式</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">所属部署</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profile_image_url} />
                        <AvatarFallback>{user.display_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.display_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <Badge variant={user.auth_provider === 'woff' ? 'default' : 'secondary'}>
                      {user.auth_provider === 'woff' ? 'LINE WORKS' : 'ローカル'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {getDepartmentName(user.department_id)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingUser(user)
                          setSelectedDepartment(user.department_id || 'none')
                        }}
                      >
                        <Building2 className="h-4 w-4 mr-1" />
                        部署変更
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteUser(user)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-500">
            {totalCount}件中 {(page - 1) * perPage + 1} - {Math.min(page * perPage, totalCount)}件
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">{page} / {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Department Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>所属部署の変更</DialogTitle>
            <DialogDescription>
              {editingUser?.display_name}の所属部署を変更します。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={selectedDepartment}
              onValueChange={setSelectedDepartment}
            >
              <SelectTrigger>
                <SelectValue placeholder="部署を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">未所属</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>キャンセル</Button>
            <Button onClick={handleUpdateDepartment}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ユーザーの削除</DialogTitle>
            <DialogDescription>
              {deleteUser?.display_name}を削除してもよろしいですか？この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>キャンセル</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>削除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default UserManagementPage
