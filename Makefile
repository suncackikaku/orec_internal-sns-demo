.PHONY: dev stop logs build deploy

# 開発開始（Docker Composeで開発環境起動）
dev:
	@echo "=== 開発環境を起動中 ==="
	docker-compose -f docker-compose.dev.yml up -d
	@echo ""
	@echo "フロントエンド: http://localhost:3000"
	@echo "API: http://localhost:8080"
	@echo ""
	@echo "ngrokで公開する場合:"
	@echo "  ngrok http 3000"
	@echo ""

# 開発環境停止
stop:
	@echo "=== 開発環境を停止中 ==="
	docker-compose -f docker-compose.dev.yml down

# ログ確認
logs:
	docker-compose -f docker-compose.dev.yml logs -f

# フロントエンドのみログ
logs-frontend:
	docker-compose -f docker-compose.dev.yml logs -f frontend

# APIのみログ
logs-api:
	docker-compose -f docker-compose.dev.yml logs -f api

# DBのみログ
logs-db:
	docker-compose -f docker-compose.dev.yml logs -f db

# 開発環境のリビルド（イメージ再構築）
rebuild:
	docker-compose -f docker-compose.dev.yml down
	docker-compose -f docker-compose.dev.yml build --no-cache
	docker-compose -f docker-compose.dev.yml up -d

# 本番デプロイ（mainブランチで実行）
deploy:
	git checkout main
	git pull origin main
	./deploy.sh

# データベースリセット（注意：データが消えます）
db-reset:
	docker-compose -f docker-compose.dev.yml down -v
	docker volume rm sns-app_db_data_dev 2>/dev/null || true
	docker-compose -f docker-compose.dev.yml up -d db
	@echo "10秒後にDBが初期化されます..."
	@sleep 10
	docker-compose -f docker-compose.dev.yml up -d

# 状態確認
status:
	docker-compose -f docker-compose.dev.yml ps

# ヘルスチェック
health:
	@echo "APIヘルスチェック..."
	@curl -s http://localhost:8080/api/departments > /dev/null && echo "API: OK" || echo "API: NG"
	@echo "フロントエンドヘルスチェック..."
	@curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|304" && echo "フロントエンド: OK" || echo "フロントエンド: NG"