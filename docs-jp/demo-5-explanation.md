# Demo 5: 複合インデックス (customer_id, created_at)

## クエリ

```sql
-- customer_id は実行ごとに異なります。ここでは例として 37760 を使用します
SELECT * FROM orders
WHERE customer_id = 37760
  AND created_at BETWEEN '2024-01-01' AND '2024-03-31';
```

## 比較内容

このデモでは、同じクエリを3通りの方法で実行します:

1. **インデックスなし** — 1M行のフル Sequential Scan。
2. **`customer_id` の単一カラムインデックス** — この顧客の約20件の注文を見つけた後、メモリ上で日付フィルタを適用。
3. **`(customer_id, created_at)` の複合インデックス** — インデックスから直接、この顧客の指定日付範囲内の注文のみを取得。

## 単一カラムインデックスの動作

```sql
CREATE INDEX idx_orders_customer_id ON orders (customer_id);
```

PostgreSQL はインデックスを使って顧客 37760 の約20件の注文をすばやく見つけます。その後、メモリ上でそれらの20行に対して `created_at` フィルタを適用します。EXPLAIN の出力では以下のように表示されます:

```
Bitmap Heap Scan on orders
  Recheck Cond: (customer_id = 37760)
  Filter: (created_at BETWEEN ...)
  Rows Removed by Filter: 22
```

`Filter` 行は、インデックス検索を通過したものの、日付の確認後に破棄された行があることを意味します。20行のフィルタリングであれば問題ありませんが、10,000件の注文がある顧客から先週の5件だけを取得したい場合を想像してみてください。

## 複合インデックスの動作

```sql
CREATE INDEX idx_orders_cust_date ON orders (customer_id, created_at);
```

複合インデックスは、最初のカラムでソートされ、次に各最初のカラム値の中で2番目のカラムでソートされます。これは電話帳が姓でソートされ、次に名でソートされているのと同じ考え方です:

```
(customer 37760, 2023-11-15)
(customer 37760, 2024-01-22)  ← ここから開始
(customer 37760, 2024-02-10)  ← 一致
(customer 37760, 2024-05-01)  ← ここで停止
(customer 37761, 2022-03-05)
```

PostgreSQL は `customer_id = 37760` の位置にジャンプし、かつ `created_at = 2024-01-01` から開始して、`2024-03-31` を超えるまで前方に走査します。正確な範囲外の行は一切読み取りません。

EXPLAIN の出力では、両方の条件が `Index Cond` に表示される（`Filter` ではない）きれいな **Index Scan** が確認できます:

```
Index Scan using idx_orders_cust_date
  Index Cond: ((customer_id = 37760) AND (created_at BETWEEN ...))
```

`Rows Removed by Filter` はありません — インデックスが返したすべての行が一致しています。

## なぜこれが重要なのか

今回のクエリでは顧客あたり約20件の注文しかないため、単一カラムと複合インデックスの差は小さいです。しかし、より大きなデータでは原則がより顕著に現れます:

- 50,000件の注文がある顧客から先週の10件だけを取得する場合: 単一カラムインデックスは50,000行を読み取り、複合インデックスは10行だけを読み取ります。
- 複合インデックスは「この顧客のこの日付範囲の注文は何か？」という問いに答えるためにデータをあらかじめ整理しています。

## カラムの順序が重要

複合インデックスのカラム順序は重要です。`(customer_id, created_at)` は以下をサポートします:

- `WHERE customer_id = ?`（最初のカラムを使用）
- `WHERE customer_id = ? AND created_at BETWEEN ...`（両方のカラムを使用）

しかし、以下は効率的にサポート**しません**:

- `WHERE created_at BETWEEN ...` のみ（最初のカラムが制約されていないため、インデックスは検索範囲を絞り込めません）

電話帳に例えると、「Smith」全員や「Smith, John」は検索できますが、すべての姓にまたがる「John」全員を簡単には検索できないのと同じです。

## クリーンアップ

```sql
DROP INDEX idx_orders_customer_id;
DROP INDEX idx_orders_cust_date;
```
