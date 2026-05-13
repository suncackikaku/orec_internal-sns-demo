#!/bin/bash
set -e

echo "=== 社内SNS デプロイスクリプト ==="

# 色の設定
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 設定
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups/$(date +%Y%m%d_%H%M%S)"

echo -e "${YELLOW}1. バックアップを作成中...${NC}"
mkdir -p "$BACKUP_DIR"
if [ -f "$PROJECT_DIR/db_data" ]; then
    cp -r "$PROJECT_DIR/db_data" "$BACKUP_DIR/" 2>/dev/null || true
fi
echo -e "${GREEN}   完了${NC}"

echo -e "${YELLOW}2. 古いコンテナを停止中...${NC}"
cd "$PROJECT_DIR"
docker-compose down
echo -e "${GREEN}   完了${NC}"

echo -e "${YELLOW}3. 最新のコードを取得中...${NC}"
git pull origin main || echo "Git pull skipped"
echo -e "${GREEN}   完了${NC}"

echo -e "${YELLOW}4. Dockerイメージをビルド中...${NC}"
docker-compose build --no-cache
echo -e "${GREEN}   完了${NC}"

echo -e "${YELLOW}5. コンテナを起動中...${NC}"
docker-compose up -d
echo -e "${GREEN}   完了${NC}"

echo -e "${YELLOW}6. ヘルスチェック中...${NC}"
sleep 5

# APIヘルスチェック
if curl -s http://localhost:8080/api/departments > /dev/null; then
    echo -e "${GREEN}   API: 正常${NC}"
else
    echo -e "${RED}   API: 異常${NC}"
    exit 1
fi

# フロントエンドヘルスチェック
if curl -s -o /dev/null -w "%{http_code}" http://localhost > /dev/null; then
    echo -e "${GREEN}   フロントエンド: 正常${NC}"
else
    echo -e "${RED}   フロントエンド: 異常${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== デプロイ完了 ===${NC}"
echo "フロントエンド: http://localhost"
echo "API: http://localhost:8080"
echo ""
echo "ログ確認: docker-compose logs -f"
