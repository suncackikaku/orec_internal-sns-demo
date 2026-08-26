# tasks

最終更新: 2026-08-26

## 実装予定

### 任意改善（現況仕様書 10章より）
- [ ] `/api/auth/*` にレート制限を追加（go-chi/httprate、例: 1分10回）— 総当たりと大量ユーザー自動生成の抑制
- [ ] プロフィール画像URLの検証（https スキーム＋許可ホストに限定）— 不正スキーム・外部トラッキング防止
- [ ] `authMiddleware` に DB 照合を1回入れる — 削除済みユーザーのトークンを即時無効化
- [ ] 専用ヘルスチェック `/api/health` を追加 — DB障害とAPI障害を切り分ける（現状 deploy.sh は `/api/departments` で代用）
- [ ] エラー応答の整形 — `http.Error(w, err.Error(), 500)` が SQL エラー文をそのまま返している箇所を内部情報を隠したメッセージに統一

### 要対応（先に片付けるべきもの）
- [ ] WOFF アクセストークンのサーバー側検証を実装（api/main.go:1055）— 現状 userId 無検証でなりすまし可能
- [ ] `JWT_SECRET` 未設定時に起動失敗させる（api/main.go:227）— 既定鍵での本番稼働を防ぐ
- [ ] コミット済みバイナリの追跡解除（`git rm --cached api/api api/main.exe` ＋ .gitignore に main.exe 追加）
- [ ] CORS を本番ドメインに限定（api/main.go:237）
- [ ] DB 認証情報を docker-compose.yml から .env 参照に変更＋パスワードローテーション
- [ ] SSE のトークンをクエリ文字列から外す（短命トークン発行 or Nginx のログ除外）

### 先方テナント対応（2026-08-26 判明）
方針: WOFF が使える環境では LINE WORKS ログイン、それ以外はメールログインの二本立て。
- [ ] 先方テナントでの WOFF アプリ登録を依頼し、発行された WOFF ID を `VITE_WOFF_ID` に渡して先方向けビルドをデプロイ
- [ ] `woff.isLoggedIn()` / `woff.login()` の分岐を追加 — LINE WORKS アプリ外のブラウザで getProfile() が失敗する（AuthContext.jsx:69）
- [ ] `domain_id` によるテナント分離 — 両テナントを1環境で受ける場合、現状フィルタが無く双方の社員が同じ一覧・フィードに混ざる
- [ ] docker-compose の `VITE_API_URL` build arg が Dockerfile に未配線（.env.production 頼み）— 整理する

### 機能
- [ ] 投稿の作成 API + 投稿フォーム — 現状 posts はシード7件のみで、いいね・フィード・検索が固定データの上で動いている
- [ ] WOFF ユーザーへの部署割り当て導線 — WOFF 作成ユーザーは primary_department_id が NULL のまま
- [ ] README を現状（WOFF 専用ログイン）に合わせて更新 — メール/パスワードの記述とデモユーザー表が実態と乖離

### 保守
- [ ] `api/main.go`（1,097行）をドメイン別に分割（auth / social / search / feed で4分割が目安）
- [ ] フロントエンドの依存脆弱性 8 件（low 1 / moderate 4 / high 3）を確認・対応
      - 内訳未確認。`cd frontend && npm audit` で確認する
      - まず `npm audit fix`（破壊的変更なし）で減る分を潰し、残りを個別に判断
      - `npm audit fix --force` は vite / tailwind のメジャー更新を伴う可能性があるため、ビルド確認とセットで
      - dev 依存のみに閉じる脆弱性（vite/esbuild 系など）は本番バンドルに影響しないため優先度を下げてよい

## 実装中
- [ ] （なし）

## 実装済み
### 2026-08-26
- [x] ログインを二本立てに変更（LINE WORKS + メールアドレス）※ローカル未ビルド検証
- [x] セッション復元を woff.init() の外に出す — WOFF 不在環境でログイン状態が維持されない不具合を修正
- [x] WOFF 初期化エラーを画面に表示（詳細トグル付き）
- [x] WOFF ID を `VITE_WOFF_ID` で差し替え可能に（Dockerfile / docker-compose に配線）
- [x] 現況仕様書を作成（docs/overview.html）
- [x] タスク管理運用を導入（docs/tasks.md / CLAUDE.md）

### 2026-05-13
- [x] UUID と NULL 値の型変換エラーを修正

### 2026-05-11
- [x] フィード機能を実装
- [x] shadcn/ui を導入
- [x] お知らせ取得をプッシュ型（SSE）に変更＋追加時アニメーション

### 2026-05-08
- [x] 初期実装（部署・社員・プロフィール・検索・フォロー・いいね）
