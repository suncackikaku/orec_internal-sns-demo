# orec_internal-sns-demo

LINE WORKS（WOFF）連携の社内SNSデモ。React + Go + PostgreSQL / Docker Compose 3サービス。
現況の仕様・アーキテクチャ・課題は `docs/overview.html` を参照。

## 運用ルール

- 作業前に `docs/tasks.md` の「実装予定」を確認し、着手するタスクを「実装中」に1つだけ移す
- 完了したら「実装済み」に日付付きで移動し、1タスク1コミットでコミットする
- 新しい依頼は、即着手するか「実装予定」に追加するかを最初に判断する
- 仕様・構成に影響する変更を入れたら `docs/overview.html` も併せて更新する
- `.env` / `JWT_SECRET` / DB認証情報に触れる変更は、コミット前にリポジトリへの混入がないか確認する
