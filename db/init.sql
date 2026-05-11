-- Create tables
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    catchcopy TEXT,
    description TEXT,
    cover_image_url TEXT,
    manager_user_id UUID
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    display_name TEXT NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    auth_provider VARCHAR(50) DEFAULT 'local',
    lineworks_id VARCHAR(255),
    primary_department_id UUID REFERENCES departments(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    hobbies TEXT,
    skills TEXT,
    joined_year INTEGER,
    career_history TEXT,
    profile_image_url TEXT
);

CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id),
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- users.updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert seed data
INSERT INTO departments (id, name, catchcopy, description, cover_image_url, manager_user_id) VALUES
('11111111-1111-1111-1111-111111111111', '技術開発部', '未来を創る技術力', '最先端の技術で製品開発を行う部署です。AI、クラウド、IoTなど幅広い技術領域をカバーしています。', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800', NULL),
('22222222-2222-2222-2222-222222222222', '営業部', 'お客様と共に成長する', '全国のお客様と直接接し、ニーズを汲み取り、最適なソリューションを提案する部署です。', 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800', NULL),
('33333333-3333-3333-3333-333333333333', 'マーケティング部', '想いを届ける架け橋に', 'ブランド価値を高め、製品の魅力を多くの人に伝えるための戦略を立案・実行する部署です。', 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800', NULL),
('44444444-4444-4444-4444-444444444444', '人事部', '人を育み、組織を強くする', '採用、教育、人事制度の設計など、社員の成長と組織の発展を支える部署です。', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800', NULL),
('55555555-5555-5555-5555-555555555555', '総務部', '会社の縁の下の力持ち', 'オフィス管理、備品管理、法務対応など、社内のインフラを支える部署です。', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', NULL),
('66666666-6666-6666-6666-666666666666', '経理部', '数字で会社を守る', '財務諸表の作成、予算管理、税務対応など、会社の経営基盤を支える部署です。', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800', NULL);

-- Insert demo users with email/password (password: 'password123')
INSERT INTO users (id, display_name, email, password_hash, auth_provider, primary_department_id) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '山田太郎', 'yamada@example.com', '$2a$10$RV1yFBFcHJbWuAhJp3w9DuZ3dokyb4w5uulijerVuUG0n9tDxWcy6', 'local', '11111111-1111-1111-1111-111111111111'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '佐藤花子', 'sato@example.com', '$2a$10$RV1yFBFcHJbWuAhJp3w9DuZ3dokyb4w5uulijerVuUG0n9tDxWcy6', 'local', '11111111-1111-1111-1111-111111111111'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '鈴木一郎', 'suzuki@example.com', '$2a$10$RV1yFBFcHJbWuAhJp3w9DuZ3dokyb4w5uulijerVuUG0n9tDxWcy6', 'local', '22222222-2222-2222-2222-222222222222'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '田中美咲', 'tanaka@example.com', '$2a$10$RV1yFBFcHJbWuAhJp3w9DuZ3dokyb4w5uulijerVuUG0n9tDxWcy6', 'local', '22222222-2222-2222-2222-222222222222'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '高橋健太', 'takahashi@example.com', '$2a$10$RV1yFBFcHJbWuAhJp3w9DuZ3dokyb4w5uulijerVuUG0n9tDxWcy6', 'local', '33333333-3333-3333-3333-333333333333'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', '伊藤さくら', 'ito@example.com', '$2a$10$RV1yFBFcHJbWuAhJp3w9DuZ3dokyb4w5uulijerVuUG0n9tDxWcy6', 'local', '11111111-1111-1111-1111-111111111111'),
('77777777-7777-7777-7777-777777777777', '渡辺隆', 'watanabe@example.com', '$2a$10$RV1yFBFcHJbWuAhJp3w9DuZ3dokyb4w5uulijerVuUG0n9tDxWcy6', 'local', '22222222-2222-2222-2222-222222222222');

INSERT INTO user_profiles (user_id, bio, hobbies, skills, joined_year, career_history, profile_image_url) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '技術の力で世界を変えたい', 'プログラミング、読書、登山', 'Go, React, Kubernetes, AWS', 2018, '2018年 新卒入社\n2019年 クラウド基盤構築プロジェクト参画\n2021年 技術開発部 リードエンジニア就任', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ユーザー体験を大切にしています', 'UIデザイン、カメラ、旅行', 'Figma, React, TypeScript, UXリサーチ', 2020, '2020年 中途入社\n2021年 フロントエンド刷新プロジェクトリード\n2022年 デザインシステム構築', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'お客様の成功が私の喜びです', 'ゴルフ、料理、音楽鑑賞', '営業戦略、交渉術、CRM', 2015, '2015年 新卒入社\n2017年 年間MVP受賞\n2019年 営業部 チームリーダー就任\n2022年 大規模プロジェクト完遂', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '新しいことに挑戦し続けたい', 'ヨガ、読書、ボランティア', 'デジタルマーケティング、SNS運用、データ分析', 2019, '2019年 新卒入社\n2020年 デジタル推進室配属\n2021年 マーケティング部 スペシャリスト', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'データドリブンで意思決定を', 'マラソン、将棋、プログラミング', 'Python, SQL, 統計分析, Tableau', 2017, '2017年 新卒入社\n2018年 データ分析チーム創設\n2020年 AIプロジェクト立ち上げ\n2023年 マーケティング部 データサイエンティスト', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'チームで最高のものを作る', 'ゲーム開発、イラスト、DIY', 'Rust, WebAssembly, GraphQL, Docker', 2021, '2021年 新卒入社\n2022年 新規サービス開発参画\n2023年 技術開発部 若手リーダー', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200'),
('77777777-7777-7777-7777-777777777777', '信頼関係を大切にした営業を', '野球観戦、ファッション、カフェ巡り', 'アカウントマネジメント、プレゼン、英語', 2016, '2016年 新卒入社\n2018年 海外営業部配属\n2020年 営業部 シニアアカウントマネージャー', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200');

-- Update departments with manager_user_id
UPDATE departments SET manager_user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE departments SET manager_user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE departments SET manager_user_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' WHERE id = '33333333-3333-3333-3333-333333333333';

INSERT INTO posts (id, author_id, body, created_at) VALUES
('11111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '新しいマイクロサービスアーキテクチャの設計が完了しました！来週から開発開始です。', '2024-05-01 09:00:00+09'),
('22222222-2222-2222-2222-222222222223', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '新しいデザインシステムのガイドラインを公開しました。ぜひご確認ください。', '2024-05-02 14:30:00+09'),
('33333333-3333-3333-3333-333333333334', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '週末の技術勉強会、今回はGoの並行処理について深く掘り下げます。', '2024-05-03 11:00:00+09'),
('44444444-4444-4444-4444-444444444445', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Rustで書いたWebAssemblyモジュール、パフォーマンスが予想以上に良くて驚いています。', '2024-05-04 16:00:00+09'),
('55555555-5555-5555-5555-555555555556', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '今月の営業目標達成しました！チームのみんなありがとう！', '2024-05-05 10:00:00+09'),
('66666666-6666-6666-6666-666666666667', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '新しいSNSキャンペーンの効果測定結果が出ました。CTRが前月比150%です！', '2024-05-06 13:00:00+09'),
('77777777-7777-7777-7777-777777777778', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '機械学習モデルの精度が92%に到達。本番適用に向けて最終調整中です。', '2024-05-07 15:00:00+09');