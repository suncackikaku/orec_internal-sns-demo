-- postsテーブルに公開範囲制御カラム追加（2026-05-28）
-- 仕様書 v1.0 5.2 公開範囲制御: 全社(company) / 部署限定(department) / 指定グループ(group) / 自分のみ(private)

ALTER TABLE posts ADD COLUMN visibility_type TEXT NOT NULL DEFAULT 'company';

-- 制約: 許可される値のみ
ALTER TABLE posts ADD CONSTRAINT chk_visibility_type CHECK (visibility_type IN ('company', 'department', 'group', 'private'));

-- 公開範囲でフィルタするためのインデックス
CREATE INDEX idx_posts_visibility ON posts(visibility_type);
