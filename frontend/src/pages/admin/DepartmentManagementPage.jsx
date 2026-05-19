import React, { useState, useEffect } from 'react'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Users } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function DepartmentManagementPage() {
  const { getAuthHeaders } = useAdminAuth()
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingDept, setEditingDept] = useState(null)
  const [deleteDept, setDeleteDept] = useState(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    catchcopy: '',
    description: '',
    cover_image_url: ''
  })

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/admin/departments`, {
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

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/departments`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        throw new Error('Failed to create department')
      }

      setIsCreateDialogOpen(false)
      setFormData({ name: '', catchcopy: '', description: '', cover_image_url: '' })
      fetchDepartments()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUpdate = async () => {
    if (!editingDept) return

    try {
      const res = await fetch(`${API_URL}/admin/departments/${editingDept.id}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        throw new Error('Failed to update department')
      }

      setEditingDept(null)
      setFormData({ name: '', catchcopy: '', description: '', cover_image_url: '' })
      fetchDepartments()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async () => {
    if (!deleteDept) return

    try {
      const res = await fetch(`${API_URL}/admin/departments/${deleteDept.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (!res.ok) {
        throw new Error('Failed to delete department')
      }

      setDeleteDept(null)
      fetchDepartments()
    } catch (err) {
      setError(err.message)
    }
  }

  const openEditDialog = (dept) => {
    setEditingDept(dept)
    setFormData({
      name: dept.name,
      catchcopy: dept.catchcopy || '',
      description: dept.description || '',
      cover_image_url: dept.cover_image_url || ''
    })
  }

  const openCreateDialog = () => {
    setFormData({ name: '', catchcopy: '', description: '', cover_image_url: '' })
    setIsCreateDialogOpen(true)
  }

  if (loading && departments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">部署管理</h1>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          新規作成
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <Card key={dept.id} className="overflow-hidden">
            <div
              className="h-32 bg-cover bg-center"
              style={{
                backgroundImage: dept.cover_image_url
                  ? `url(${dept.cover_image_url})`
                  : 'linear-gradient(to right, #e5e7eb, #f3f4f6)'
              }}
            />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{dept.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{dept.catchcopy}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(dept)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteDept(dept)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                {dept.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || !!editingDept}
        onOpenChange={() => {
          setIsCreateDialogOpen(false)
          setEditingDept(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingDept ? '部署を編集' : '新規部署作成'}
            </DialogTitle>
            <DialogDescription>
              部署情報を入力してください。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">部署名 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="技術開発部"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catchcopy">キャッチコピー</Label>
              <Input
                id="catchcopy"
                value={formData.catchcopy}
                onChange={(e) => setFormData({ ...formData, catchcopy: e.target.value })}
                placeholder="未来を創る技術力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="部署の説明"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cover_image_url">カバー画像URL</Label>
              <Input
                id="cover_image_url"
                value={formData.cover_image_url}
                onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false)
                setEditingDept(null)
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={editingDept ? handleUpdate : handleCreate}
              disabled={!formData.name}
            >
              {editingDept ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDept} onOpenChange={() => setDeleteDept(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>部署の削除</DialogTitle>
            <DialogDescription>
              {deleteDept?.name}を削除してもよろしいですか？この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDept(null)}>キャンセル</Button>
            <Button variant="destructive" onClick={handleDelete}>削除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DepartmentManagementPage
