# Demo 3: Date Range on orders.created_at

## The Query

```sql
SELECT * FROM orders WHERE created_at BETWEEN '2024-06-01' AND '2024-06-07';
```

## What Happens Without an Index

PostgreSQL reads all 1,000,000 rows and checks whether each row's `created_at` falls within the 7-day window. The orders span about 3 years (2022–2024), so a single week is roughly 0.6% of the data — but without an index, PostgreSQL doesn't know where those rows are and has to check everything.

## Why the Index Helps

```sql
CREATE INDEX idx_orders_created_at ON orders (created_at);
```

A B-tree index on a timestamp column keeps values sorted chronologically. PostgreSQL can jump straight to `2024-06-01` in the tree, then walk forward through the index until it passes `2024-06-07`. It only reads the rows in that narrow range.

In the EXPLAIN output, you'll see the Seq Scan replaced by a **Bitmap Index Scan** with an `Index Cond` showing both bounds of the range.

## Why It's a Good Candidate for Indexing

- **Range queries**: B-tree indexes handle `BETWEEN`, `>`, `<`, `>=`, `<=` efficiently because the data is sorted. PostgreSQL can find the start point and scan forward — no need to check every row.
- **Narrow window vs wide spread**: 7 days out of ~1,095 days means we're touching less than 1% of the data. The narrower the range relative to the total spread, the more an index helps.
- **Common pattern**: Date range filtering is one of the most frequent operations in real applications — filtering orders by date, finding recent activity, generating reports for a time period. It's almost always worth indexing date columns you filter on.

## Cleanup

```sql
DROP INDEX idx_orders_created_at;
```
