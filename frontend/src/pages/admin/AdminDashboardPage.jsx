import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Building2 } from 'lucide-react'

function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">ダッシュボード</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/admin/users">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">ユーザー管理</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                LINE WORKSユーザーの一覧表示、所属部署の変更、削除が行えます。
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/departments">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">部署管理</CardTitle>
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                部署の一覧表示、新規作成、編集、削除が行えます。
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}

export default AdminDashboardPage
