# orec_internal-sns-demo

LINE WORKS 連携の社内SNSデモ。React + Go + PostgreSQL / Docker Compose 3サービス。
**作業ブランチは `feature/local-dev`。`main` は 2026-05 時点で止まっており実体ではない。**

## 参照ドキュメント

- `docs/LINE WORKS連携社内SNSシステムの正式仕様書作成依頼.html` — 正式仕様書（設計の正）
- `docs/③OREC_Web社内報_仕様差分書_v1.1.html` — 仕様差分書
- `docs/login-triage.html` — ログイン経路の整理と調査記録
- `docs/tasks.md` — タスク管理
- `docs/LOCAL_DEV.md` — ローカル開発環境

## 運用ルール

- 作業前に `docs/tasks.md` の「実装予定」を確認し、着手するタスクを「実装中」に1つだけ移す
- 完了したら「実装済み」に日付付きで移動し、1タスク1コミットでコミットする
- 仕様・構成に影響する変更を入れたら、仕様書との乖離を `docs/tasks.md` に記録する
- `.env` / `JWT_SECRET` / DB認証情報に触れる変更は、コミット前にリポジトリへの混入がないか確認する

## 本番環境

- URL: https://orec-demo-app.suncac.net （Cloudflare 経由）
- 配置先: `/opt/internal-sns-demo-app/orec_internal-sns-demo`（DEPLOY.md の `/opt/sns-app` は誤り）
- `.env` は compose ファイルと同じディレクトリに置く。gitignore 済みで VPS 上にしか存在しない
- フロント変更 → `docker-compose build --no-cache frontend && docker-compose up -d frontend`
- API 変更 → `docker-compose build --no-cache api && docker-compose up -d api`
- 環境変数のみ変更 → 再ビルド不要。`docker-compose up -d --force-recreate api`

## ログインの前提（重要）

- **WOFF は専用の WOFF URL から開かないと認証できない。** サイト URL を LINE WORKS アプリ内で直接開いても `woff.init()` は成功するがトークンが無く `getProfile()` が失敗する
- **OIDC は PC・スマホブラウザ・LINE WORKS アプリ内のすべてで動作する。** 経路を1本に寄せるならこちら
- ID/PASSWORD は環境を問わず利用可能（デモアカウント `demo@orec.co.jp`）
