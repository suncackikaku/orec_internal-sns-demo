# 社内SNSデモアプリ

LINE WORKS連携を想定した社内限定SNSのデモ版です。

## ディレクトリ構成

```
internal-sns-demo/
├── docker-compose.yml    # Docker Compose設定
├── db/
│   └── init.sql         # DBスキーマとシードデータ
├── api/
│   ├── Dockerfile       # Go API用Dockerfile
│   ├── go.mod          # Goモジュール定義
│   ├── go.sum          # Go依存関係
│   └── main.go         # APIサーバー実装
└── frontend/
    ├── Dockerfile       # React用Dockerfile（マルチステージビルド）
    ├── nginx.conf       # Nginx設定
    ├── package.json     # npm依存関係
    ├── vite.config.js   # Vite設定
    ├── index.html       # HTMLエントリポイント
    └── src/
        ├── main.jsx           # Reactエントリポイント
        ├── index.css          # グローバルCSS
        └── pages/
            ├── DepartmentPage.jsx   # 部署紹介ページ
            └── UserProfilePage.jsx  # 社員プロフィールページ
```

## システム構成

- **Frontend**: React 18 + Vite + React Router（Nginxで配信）
- **Backend**: Go 1.21 + chiルーター + sqlx + PostgreSQLドライバ
- **Database**: PostgreSQL 15
- **Infra**: Docker Compose（3サービス: db, api, frontend）

## 起動手順

### 前提条件
- Docker Desktop または Docker Engine + Docker Compose
- ポート 80, 8080, 5432 が利用可能であること

### ローカル環境

```bash
# プロジェクトディレクトリに移動
cd internal-sns-demo

# コンテナ起動（バックグラウンド）
docker-compose up -d

# 起動確認
docker-compose ps

# ログ確認
docker-compose logs -f
```

### ConoHa VPS上での起動

```bash
# 1. プロジェクトをVPSに転送
scp -r internal-sns-demo user@your-vps-ip:/home/user/

# 2. VPSにSSH接続
ssh user@your-vps-ip

# 3. プロジェクトディレクトリに移動
cd /home/user/internal-sns-demo

# 4. コンテナ起動
docker-compose up -d

# 5. ファイアウォール設定（必要に応じて）
# HTTP(80ポート)を開放
sudo ufw allow 80/tcp
```

## アクセス方法

- **フロントエンド**: http://localhost （またはVPSのIPアドレス）
- **API**: http://localhost:8080/api
- **データベース**: localhost:5432

## APIエンドポイント

### GET /api/departments/{deptId}
部署情報、所属メンバー、投稿フィードを取得

### GET /api/users/{userId}/profile
ユーザーの拡張プロフィール情報を取得

## デモデータ

起動時に以下のデータが自動投入されます：

- **部署**: 3つ（技術開発部、営業部、マーケティング部）
- **ユーザー**: 7名
- **投稿**: 7件

## ページ一覧

1. **部署紹介ページ**: `/departments/{id}`
   - カバー画像、部署名、キャッチコピー
   - メンバー一覧 / フィード タブ切り替え

2. **社員プロフィールページ**: `/users/{id}/profile`
   - プロフィール画像、基本情報
   - 趣味・関心、得意なこと、キャリア経歴

## 停止方法

```bash
# コンテナ停止
docker-compose down

# データボリュームも削除する場合
docker-compose down -v
```

## 注意事項

- デモ版のため、認証機能はモック化しています
- データの入力UI（POST/PUT）は実装していません
- 本番環境では適切な認証・認可機能を追加してください