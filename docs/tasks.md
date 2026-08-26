# tasks

最終更新: 2026-08-26

正式仕様書は `docs/LINE WORKS連携社内SNSシステムの正式仕様書作成依頼.html` を正とする。
ログイン周りの調査記録は `docs/login-triage.html`。

## 実装予定

### 認証・セキュリティ（優先）
- [ ] **WOFF トークンのサーバー側検証**（api/main.go の `woffAuthHandler`）
      - 現状 `userId` を無検証で受け取って JWT を発行しており、WOFF ユーザー同士のなりすましが可能
      - 仕様書 9.1 は「トークン送信 → Go がトークン検証」を指定。`auth.VerifyWoffUser` は実装済みだが未使用
      - 2026-08-26 に緩和策（`auth_provider = 'woff'` 限定 + 衝突拒否）を入れたが、根本対応は未
      - **これが入るまで WOFF ログインは実運用に出せない**
- [ ] OIDC のトークン受け渡しを httpOnly Cookie にする
      - 現状 `/oidc/callback?token=` のクエリで渡しており、nginx と Cloudflare のアクセスログに JWT が残る
      - ブラウザ履歴からは `history.replaceState` で除去済み
      - 仕様書 7.1 / 7.2 も「内部セッション Cookie」を指定している
- [ ] `JWT_SECRET` 未設定時に起動を失敗させる（既定値のまま稼働するのを防ぐ）
- [ ] CORS を本番ドメインに限定（現状 `AllowedOrigins: ["*"]`）
- [ ] DB 認証情報を docker-compose.yml から `.env` 参照に変更＋パスワードローテーション
- [ ] `/api/auth/*` にレート制限（`go-chi/httprate`）
- [ ] プロフィール画像 URL の検証（https スキーム＋許可ホストに限定）
- [ ] `authMiddleware` に DB 照合を入れる（削除済みユーザーのトークンを即時無効化）
- [ ] エラー応答の整形（`http.Error(w, err.Error(), 500)` が SQL エラー文をそのまま返している）

### 仕様書との乖離
- [ ] ユーザー同期の実装（仕様書 7.3）— 初回ログイン時と定期ジョブで表示名・アイコン・所属部署を Upsert。現状は同期なしで部署は手動選択
- [ ] `notifications` テーブルの導入（仕様書 8.1）— 実装は `activities` で代替。既読管理も無い
- [ ] `users.is_admin` / `status` の扱い（仕様書 8.2）— 実装は `admins` 別テーブル。どちらを正とするか決める
- [ ] カラム名の整理 — 仕様書は `lineworks_user_id`、実装は `woff_id`。OIDC の `sub` も同じカラムに入れているため名前が実態と合っていない
- [ ] API パスの整理 — 仕様書は `/internal/auth/woff/bootstrap`、実装は `/api/auth/woff`

### 先方対応
- [ ] **先方の OIDC ログイン検証の結果待ち** — 別テナントのアカウントで通るかどうかでテナント制約の有無が確定する
      - 通った → 先方での登録は不要。OIDC 一本で完結
      - 通らない → 先方テナントでの ClientApp 登録を依頼
- [ ] 結果に応じて WOFF ボタンの去就を決める（撤去する場合もコードと API は残し、入口だけ外す）
- [ ] 検証で作成された先方アカウントの削除（不要になり次第）

### 機能
- [ ] Bot によるトークルーム通知
      - サーバー側 API の機能で WOFF は不要。Scope の `bot` は付与済み
      - 宛先の LINE WORKS ユーザー ID は `users.woff_id` に保存済み（2026-08-26 対応）
      - サーバートークンの取得方式（Service Account の JWT 方式か client_credentials か）は要確認。`auth/woff.go` の `GetAccessToken` は未使用・未検証
- [ ] WOFF ユーザーへの部署割り当て導線（`primary_department_id` が NULL のまま）

### 保守
- [ ] ユーザー行の二重化を解消 — WOFF は `woff_id`、OIDC は `email` で照合しており同一人物が別レコードになる。LINE WORKS ユーザー ID で一意に識別する設計に寄せる
- [ ] コミット済みバイナリの追跡解除 — `api/api` / `api/main.exe` / `api/main_test.exe`（計約 36MB）
      - `git rm --cached` ＋ `.gitignore` に追加
- [ ] `api/main.go`（2,400 行超）をドメイン別に分割（auth / social / search / feed / admin）
- [ ] フロントエンドの依存脆弱性
      - 本番依存は react-router のオープンリダイレクト 1 件。**このアプリでは到達不可**（リダイレクト先は全てハードコードか API 由来の UUID）
      - `npm audit fix` で解消可。ルーティングライブラリの更新なので単独コミットで入れる
      - high 3 件は開発依存のみで本番バンドルに影響しない
- [ ] `docker-compose.yml` の `version` 属性を削除（obsolete 警告が出ている）
- [ ] 自動テストの導入（Go・フロントとも 0 件）

## 実装中
- [ ] （なし）

## 実装済み

### 2026-08-26
ログイン不具合の調査と OIDC 経路の本番稼働。真因は「WOFF アプリを WOFF URL から開いていなかった」こと。詳細は `docs/login-triage.html`。

- [x] OIDC を本番で有効化 — Developer Console に Redirect URL 追加、docker-compose で既存の `LINE_WORKS_*` を `OIDC_*` に配線（Secret の二重管理を回避）
- [x] ログイン画面に OIDC の入口を追加（サーバーが 503 を返す間は非表示）
- [x] `expires_in` の型不一致を修正 — LINE WORKS は文字列で返すため `FlexInt` 型を追加
- [x] `users/me` の呼び出しをやめ `id_token` のクレームから読むよう変更（Works API スコープが不要になった）
- [x] 再ログイン時の照合を修正 — `GetOIDCUserByEmail` を追加（`auth_provider = 'local'` 限定で 2 回目から 500 になっていた）
- [x] `FRONTEND_URL` を設定 — 認証後に `http://localhost:5173` へリダイレクトしていた
- [x] セッション復元を `woff.init()` の外に出す — ID/PASSWORD ログイン後に再読み込みでログアウトしていた
- [x] OIDC トークンを URL から除去（`history.replaceState`）
- [x] `index.html` のキャッシュを無効化、ハッシュ付き `assets` は長期キャッシュに — デプロイが反映されず古い画面が出続けていた
- [x] ログインボタンの文言と順序を実態に合わせて変更（OIDC を主導線、WOFF は注記付きの副導線）
- [x] `VITE_WOFF_ID` を環境変数化（テナントごとに差し替え可能に）
- [x] OIDC の `sub` を `users.woff_id` に保存＋既存ユーザーの補完（Bot 通知の宛先確保）
- [x] WOFF 照合を `auth_provider = 'woff'` に限定＋`woff_id` 衝突を 409 で拒否（上記変更で広がったなりすまし範囲の緩和）
- [x] `JWT_SECRET` をローテーション
- [x] `woff.login()` の実装を試行 → 撤回（`redirect_uri` を付けずに認可要求を出すため LINE WORKS が拒否。一度スマホ経路を壊してロールバック）
