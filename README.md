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

- **部署**: 6つ（技術開発部、営業部、マーケティング部、人事部、総務部、経理部）
- **ユーザー**: 7名
- **投稿**: 7件

### デモユーザー（ログイン用）

| 名前 | メールアドレス | パスワード | 所属部署 |
|------|---------------|-----------|---------|
| 山田太郎 | yamada@example.com | password123 | 技術開発部 |
| 佐藤花子 | sato@example.com | password123 | 技術開発部 |
| 鈴木一郎 | suzuki@example.com | password123 | 営業部 |
| 田中美咲 | tanaka@example.com | password123 | 営業部 |
| 高橋健太 | takahashi@example.com | password123 | マーケティング部 |
| 伊藤さくら | ito@example.com | password123 | 技術開発部 |
| 渡辺隆 | watanabe@example.com | password123 | 営業部 |

**※ 全ユーザーのパスワードは `password123` です**

## ページ一覧

1. **Welcomeページ** (`/`)
   - 自身のアイコンと名前表示
   - 検索バー（社員・部署・投稿検索）
   - クイックアクセスメニュー

2. **社員一覧ページ** (`/users`)
   - グリッドレイアウトで全社員表示
   - 部署フィルタリング
   - 検索機能
   - ページネーション

3. **部署一覧ページ** (`/departments`)
   - 全社の部署を一覧表示
   - カバー画像、キャッチコピー表示

4. **部署紹介ページ** (`/departments/{id}`)
   - カバー画像、部署名、キャッチコピー
   - メンバー一覧 / フィード タブ切り替え

5. **社員プロフィールページ** (`/users/{id}/profile`)
   - プロフィール画像、基本情報
   - 趣味・関心、得意なこと、キャリア経歴
   - プロフィール編集ボタン（自分のプロフィールのみ）
   - ログアウトボタン

## 停止方法

```bash
# コンテナ停止
docker-compose down

# データボリュームも削除する場合
docker-compose down -v
```

## 認証機能

### 現在の認証方式
- **ローカル認証**: メールアドレス / パスワード（JWT）
- パスワードは bcrypt でハッシュ化
- JWT有効期限: 24時間

### 将来的な認証方式
- **LINE WORKS認証**: OAuth2（準備中）
- 環境変数 `AUTH_MODE` で切り替え可能（`local` / `lineworks`）

## 注意事項

- デモ版のため、認証機能はモック化しています
- データの入力UI（POST/PUT）は実装していません
- 本番環境では適切な認証・認可機能を追加してください