# Demo 1: last_name による検索（50,000行）

## クエリ

```sql
SELECT * FROM customers WHERE last_name = 'Swallows';
```

## インデックスがない場合の動作

PostgreSQL は `last_name = 'Swallows'` に該当する行を見つけるために、`customers` テーブルのすべての行を読み取る必要があります。**Sequential Scan** を実行し、50,000行を1行ずつ確認して、一致しない行を破棄していきます。

これは、ソートされていない電話帳の中から名前を探すために、すべてのエントリを最初から最後まで読んでいくようなものです。

## インデックスが効果的な理由

`last_name` にインデックスを作成すると:

```sql
CREATE INDEX idx_customers_last_name ON customers (last_name);
```

PostgreSQL はすべての last_name の値をソートした B-tree を構築します。`'Swallows'` を検索する際、ツリー内でその値を参照し、一致する行に直接アクセスできるようになります。残りの約49,994行を読む必要はありません。

EXPLAIN の出力では、Seq Scan が **Bitmap Index Scan**（インデックス内で一致するエントリを検索）と、それに続く **Bitmap Heap Scan**（実際の行を取得）に置き換わっていることが確認できます。

## インデックスの良い候補である理由

- **高い選択性**: 数千の異なる値の中から特定の1つの last_name を検索しています。一致する行はごくわずかです。
- **中規模テーブル**: 50,000行は、フルテーブルスキャンとインデックス検索の速度差が体感できる十分な大きさです。
- **等価述語**: `= 'Swallows'` は最もシンプルかつ効率的なインデックス検索の種類です。

## クリーンアップ

```sql
DROP INDEX idx_customers_last_name;
```
