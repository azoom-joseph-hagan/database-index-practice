# Demo 4: 顧客に対する orders + order_items の JOIN

## クエリ

```sql
-- customer_id は実行ごとに異なります。ここでは例として 37760 を使用します
SELECT o.id, o.total_amount, oi.product_id, oi.quantity, oi.unit_price
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.customer_id = 37760;
```

## インデックスがない場合の動作

インデックスがない場合、このクエリは非常にコストが高くなります。PostgreSQL は以下の処理を行う必要があります:

1. 1M件の orders すべてをスキャンして、この顧客の約20件を見つける。
2. その20件の注文それぞれに対して、一致する `order_items` を見つける — しかし `order_id` にインデックスがないため、3M件の order_items すべてをスキャンしなければならない。

実際には、PostgreSQL はこれを最適化します — 20回の個別フルスキャンは行いません。通常は **Hash Join** を使用します。orders テーブルをスキャンして一致する行を見つけ、ハッシュテーブルを構築し、次に order_items をスキャンしてハッシュを照合します。しかし、それでも両テーブルから数百万行を読み込んでいることに変わりありません。

## インデックスが効果的な理由

```sql
CREATE INDEX idx_orders_customer_id ON orders (customer_id);
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
```

両方のインデックスがある場合、実行計画は完全に変わります:

1. `customer_id` インデックスを使って、この顧客の約20件の注文を見つける（1M行のスキャンの代わりに）。
2. その20件の注文それぞれに対して、`order_id` インデックスを使って注文ごとの約3件の order_items を見つける（3M行のスキャンの代わりに）。

これは **Nested Loop** と **Index Scan** の組み合わせになります。この種の選択的な結合に対する理想的な実行計画です。PostgreSQL は合計4M行の代わりに、約20件の orders + 約60件の order_items だけを読み取ります。

このデモが通常最も大きな速度向上（50〜100倍以上になることも多い）を示す理由はここにあります。

## インデックスの良い候補である理由

- **結合カラム**: `JOIN ... ON` 条件で使用されるカラムは、インデックスの有力な候補です。インデックスがなければ、PostgreSQL はプローブのたびにテーブル全体をスキャンする必要があるかもしれません。
- **複合的な選択性**: `WHERE` 句で orders を約20行に絞り込み、結合によって order_items をさらに約60行に絞り込みます。インデックスがあることで、PostgreSQL はすべてのステップでこの選択性を活用できます。
- **2つのインデックスの連携**: このデモはインデックスがどのように組み合わさるかを示しています。1つだけでも効果はありますが、両方揃うことで数百万行の操作がサブミリ秒の検索に変わります。

## クリーンアップ

```sql
DROP INDEX idx_orders_customer_id;
DROP INDEX idx_order_items_order_id;
```
