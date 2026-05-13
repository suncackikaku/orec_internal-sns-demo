-- WOFF認証用カラムを追加
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS woff_id VARCHAR(255) UNIQUE,
    ADD COLUMN IF NOT EXISTS domain_id VARCHAR(255);

-- woff_id用のインデックスを作成
CREATE INDEX IF NOT EXISTS idx_users_woff_id ON users(woff_id);

-- 既存のlineworks_idカラムがあれば、woff_idに統合（データ移行が必要な場合）
-- UPDATE users SET woff_id = lineworks_id WHERE woff_id IS NULL AND lineworks_id IS NOT NULL;
