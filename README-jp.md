# データベースインデックス実践

PostgreSQLのインデックスがどのような場合に大きく効果を発揮し、どのような場合に効果がないかを実演します。Docker Compose、Drizzle ORM、TypeScriptを使用して4つのテーブルに約400万行をシードし、インデックスの有無によるクエリ性能を比較する9つのデモを実行します。

## 前提条件

- [Docker](https://www.docker.com/)
- [Node.js](https://nodejs.org/) v22+
- [pnpm](https://pnpm.io/)

## 初回セットアップ

```bash
# 1. PostgreSQLを起動（ポート5499で実行、競合を回避）
docker compose up -d

# 2. 依存パッケージをインストール
pnpm install

# 3. データベーステーブルを作成
pnpm drizzle-kit push

# 4. データベースをシード（約400万行、数分かかります）
pnpm seed
```

## デモを実行

```bash
# 英語版
pnpm demo

# 日本語版
pnpm demo:jp
```

各シナリオでは以下を行います:
1. インデックス**なし**でクエリを実行し、実行時間と`EXPLAIN ANALYZE`を取得
2. インデックスを作成し、同じクエリをインデックス**あり**で実行
3. 高速化の倍率を含む比較結果を表示
4. インデックスを削除（次のデモのためにリセット）

### デモの内容

各デモには`docs-jp/`フォルダに詳細な解説があります。インデックスやEXPLAIN ANALYZEが初めての方は[インデックスの基礎](docs-jp/index-basics.md)から始めてください。

| # | デモ | ポイント | 解説 |
|---|------|----------|------|
| **パート1: インデックスが効果的なケース** | | | |
| 1 | `last_name`で検索（5万行） | 選択的なクエリでSeq Scan → Index Scan | [詳細](docs-jp/demo-1-explanation.md) |
| 2 | `customer_id`で注文検索（100万行） | FK検索で100万行から約20行を取得 | [詳細](docs-jp/demo-2-explanation.md) |
| 3 | `orders.created_at`の日付範囲 | 3年分のデータから7日間の範囲 | [詳細](docs-jp/demo-3-explanation.md) |
| 4 | orders + order_itemsのJOIN | Seq ScanのNested Loop vs インデックスJOIN | [詳細](docs-jp/demo-4-explanation.md) |
| 5 | 複合インデックス`(customer_id, created_at)` | 複数条件クエリでの単一カラム vs 複合 | [詳細](docs-jp/demo-5-explanation.md) |
| **パート2: インデックスが効果的でないケース** | | | |
| 6 | `status`でフィルター（5値、各約20%） | 低カーディナリティ — 上記の100倍以上の効果と比較して微小 | [詳細](docs-jp/demo-6-explanation.md) |
| 7 | `COUNT(*) GROUP BY status` | 全行走査が必要 — ほぼ同じ性能 | [詳細](docs-jp/demo-7-explanation.md) |
| 8 | 小さいテーブル: SQL vs JSフィルター（500行） | 小規模テーブルではどのアプローチもほぼ同じ | [詳細](docs-jp/demo-8-explanation.md) |
| 9 | `WHERE total_amount > 0`（95%以上が該当） | 非選択的な条件 — ほぼ同じ性能 | [詳細](docs-jp/demo-9-explanation.md) |

## 環境の削除

```bash
# PostgreSQLを停止し、全データを削除
docker compose down -v
```

最初からやり直す場合は、[初回セットアップ](#初回セットアップ)の手順を繰り返してください。

## スキーマ

| テーブル | 行数（概算） | 用途 |
|----------|-------------|------|
| `customers` | 50,000 | 名前、メール（ユニーク）、都市、国 |
| `products` | 500 | 意図的に小さく — 小規模テーブルではインデックスが効果なしであることを示す |
| `orders` | 1,000,000 | customer_id FK、status（5値）、total_amount、created_at |
| `order_items` | 3,000,000 | order_id FK、product_id FK、quantity、unit_price |

主キーとemailのユニーク制約以外にインデックスはありません。デモスクリプトがインデックスを動的に作成・削除します。

## 直接接続

```bash
psql postgresql://postgres:postgres@localhost:5499/index_practice
```
