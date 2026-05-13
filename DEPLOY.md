# ConoHa VPS デプロイ手順

## 前提条件

- ConoHa VPS（Ubuntu 20.04/22.04推奨）
- Docker & Docker Compose インストール済み
- ドメイン（任意）

## 1. サーバー準備

### Dockerインストール
```bash
# Dockerインストール
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Composeインストール
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# ユーザーをdockerグループに追加
sudo usermod -aG docker $USER
# ログインし直すか、以下を実行
newgrp docker
```

## 2. プロジェクト配置

```bash
# プロジェクトディレクトリ作成
mkdir -p /opt/sns-app
cd /opt/sns-app

# コードを配置（GitからクローンまたはSCPで転送）
git clone https://your-repo.git .
# または
tar -xzf sns-app.tar.gz
```

## 3. 環境変数設定

```bash
# .envファイルを作成
cp .env.example .env

# エディタで編集
nano .env
```

### 設定項目

```env
# LINE WORKS認証設定（Developer Consoleで取得）
LINE_WORKS_CLIENT_ID=your_client_id
LINE_WORKS_CLIENT_SECRET=your_client_secret

# アプリケーション設定（VPSのIPまたはドメイン）
BASE_URL=https://your-domain.com

# JWTシークレット（32文字以上のランダム文字列）
JWT_SECRET=your-strong-secret-key-here-minimum-32-characters

# データベース設定（デフォルトのままでOK）
DATABASE_URL=postgres://snsuser:snspassword@db:5432/snsdb?sslmode=disable

# サーバー設定
PORT=8080
```

## 4. データベース初期化

初回のみ実行：

```bash
# データベースボリューム作成
docker volume create sns_db_data

# 初期化（init.sqlが自動実行される）
docker-compose up -d db
sleep 10
docker-compose down
```

## 5. アプリケーション起動

```bash
# ビルド＆起動
docker-compose up -d --build

# ログ確認
docker-compose logs -f

# 状態確認
docker-compose ps
```

## 6. 動作確認

### ヘルスチェック
```bash
# API確認
curl http://localhost:8080/api/departments

# フロントエンド確認
curl -I http://localhost
```

### ブラウザでアクセス
- フロントエンド: `http://your-server-ip`
- API: `http://your-server-ip:8080`

## 7. ファイアウォール設定

```bash
# UFWの場合
sudo ufw allow 80/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 443/tcp  # HTTPS使用時
sudo ufw enable
```

## 8. ドメイン設定（推奨）

### Nginxリバースプロキシ（オプション）

```bash
sudo apt install nginx
```

`/etc/nginx/sites-available/sns-app`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sns-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### HTTPS設定（Let's Encrypt）

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 9. 自動デプロイ

```bash
# デプロイスクリプト実行
./deploy.sh
```

## 10. トラブルシューティング

### コンテナ確認
```bash
docker-compose ps
docker-compose logs api
docker-compose logs frontend
docker-compose logs db
```

### データベース接続確認
```bash
docker-compose exec db psql -U snsuser -d snsdb
```

### 再起動
```bash
docker-compose restart
docker-compose down && docker-compose up -d
```

## 11. WOFF設定

### Developer Console設定
1. WOFFアプリ登録時のEndpoint URL:
   - `https://your-domain.com` （フロントエンド）
   - または `https://your-domain.com/api` （API）

2. Scope設定:
   - `bot` （メッセージ送信機能使用時）

## 注意事項

- **JWT_SECRET** は必ず変更してください
- **本番環境**では `BASE_URL` を実際のドメインに設定
- **Firewall** で必要なポートを開放
- **定期バックアップ**を設定することを推奨


本番環境更新手順
方法1: deploy.sh を使用（推奨）
cd /opt/sns-app  # プロジェクトディレクトリ
./deploy.sh
このスクリプトは以下を自動実行：
1. バックアップ作成
2. 古いコンテナ停止
3. 最新コード取得（git pull）
4. Dockerイメージ再ビルド
5. コンテナ起動
6. ヘルスチェック


方法2: 手動更新
cd /opt/sns-app
# 1. 最新コード取得
git pull origin main
# 2. コンテナ停止・削除
docker-compose down
# 3. イメージ再ビルド（キャッシュなし）
docker-compose build --no-cache
# 4. コンテナ起動
docker-compose up -d
# 5. ログ確認
docker-compose logs -f


方法3: 変更箇所のみ更新（今回の場合）
今回はGoバックエンドのみ変更なので：
cd /opt/sns-app
# コード更新
git pull origin main
# APIのみ再ビルド・再起動
docker-compose build --no-cache api
docker-compose up -d api
# 確認
docker-compose logs api
確認コマンド
# コンテナ状態確認
docker-compose ps
# APIログ確認
docker-compose logs -f api
# ヘルスチェック
curl https://orec-demo-app.suncac.net/api/departments
注意: フロントエンドも変更している場合は、frontendコンテナも再ビルドが必要です。