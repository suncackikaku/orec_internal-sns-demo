# ローカル開発環境セットアップ

## 前提条件

- Docker Desktop インストール済み
- ngrok アカウント（authtoken設定済み）
- Git

## セットアップ手順

### 1. ブランチ切り替え

```bash
git checkout feature/local-dev
```

### 2. 環境変数設定

`.env.local` を編集して、ngrok URLを設定：

```bash
# 例: ngrokで取得したURL
BASE_URL=https://xxxx.ngrok-free.dev
```

### 3. 開発環境起動

```bash
make dev
```

または：

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 4. ngrokで公開

別ターミナルで：

```bash
ngrok http 3000
```

取得したURL（例: `https://xxxx.ngrok-free.dev`）を：
1. `.env.local` の `BASE_URL` に設定
2. LINE WORKS Developer ConsoleのリダイレクトURLに設定

**注意**: ngrok URLが変わるたびに、`.env.local` と Developer Console を更新する必要があります。

### 5. 開発開始

- フロントエンド: http://localhost:3000
- API: http://localhost:8080
- ngrok経由: https://xxxx.ngrok-free.dev

コード変更は自動反映：
- React: 即座にHMR（Hot Module Replacement）
- Go: ファイル保存後、手動でコンテナ再起動が必要

## よく使うコマンド

```bash
# 開発環境起動
make dev

# 開発環境停止
make stop

# ログ確認
make logs
make logs-api
make logs-frontend
make logs-db

# 状態確認
make status

# ヘルスチェック
make health

# 開発環境リビルド
make rebuild

# DBリセット（データ消去）
make db-reset
```

## 開発フロー

1. **コード変更**
   - エディタでファイルを編集
   - React: 自動反映
   - Go: `docker-compose -f docker-compose.dev.yml restart api` で再起動

2. **動作確認**
   - ローカル: http://localhost:3000
   - 実機: ngrok URL

3. **コミット**
   ```bash
   git add .
   git commit -m "feat: xxx"
   ```

4. **本番反映**
   ```bash
   git checkout main
   git merge feature/local-dev
   git push origin main
   # サーバーで deploy.sh 実行
   ```

## トラブルシューティング

### CORSエラー

ngrok URLを `.env.local` の `BASE_URL` と `CORS_ALLOWED_ORIGINS` に設定しているか確認。

### LINE WORKS認証エラー

Developer Consoleで以下を確認：
- Client ID: `2F3U6QVkjQaeTn1CmP0H`
- リダイレクトURL: 現在のngrok URL

### DB接続エラー

```bash
make db-reset
```

でDBを初期化。

### ポート競合

ポート3000または8080が既に使用されている場合：

`docker-compose.dev.yml` の ports を変更：
```yaml
ports:
  - "3001:3000"  # フロントエンド
  - "8081:8080"  # API
```

## 注意事項

- `.env.local` はGitにコミットしない（すでに `.gitignore` に追加済み）
- ngrok URLはセッションごとに変わる
- ローカル用Client ID（`2F3U6QVkjQaeTn1CmP0H`）は開発専用