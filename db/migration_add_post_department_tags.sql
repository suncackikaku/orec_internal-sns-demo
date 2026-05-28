-- post_department_tags テーブル追加（2026-05-28）
-- 仕様書 v1.1 §2.3 複数部署タグ付け（多対多）

CREATE TABLE post_department_tags (
    post_id       UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, department_id)
);

-- パフォーマンス用インデックス
CREATE INDEX idx_post_department_tags_post_id ON post_department_tags(post_id);
CREATE INDEX idx_post_department_tags_dept_id ON post_department_tags(department_id);

-- 既存の posts.tags（文字列配列）データを移行する場合の注釈:
-- posts.tags はハッシュタグ（#タグ）用に残すか、
-- 用途を変更する場合はここでデータ移行スクリプトを実行

-- 例: 既存データの移行（部署名でマッチング）
-- INSERT INTO post_department_tags (post_id, department_id)
-- SELECT p.id, d.id
-- FROM posts p
-- JOIN departments d ON d.name = ANY(p.tags)
-- ON CONFLICT DO NOTHING;
