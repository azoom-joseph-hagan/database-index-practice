# Demo 6: Filter by status (Low Cardinality)

## The Query

```sql
SELECT COUNT(*) FROM orders WHERE status = 'pending';
```

## What Happens

There are only 5 possible status values (`pending`, `processing`, `shipped`, `delivered`, `cancelled`), each appearing in roughly 20% of the 1M rows. So `WHERE status = 'pending'` matches about 200,000 rows.

With an index on `status`, you might see a small speedup (~1.3–1.5x) — but compare this to Demo 2 where the index gave a 600x+ speedup. The index provides some benefit, but the improvement is small because the query still has to process 200,000 rows either way.

## Why the Improvement Is Marginal

This is about **selectivity** — what percentage of the table matches your filter.

In demos 1–4, the queries matched a tiny fraction of the table (0.002%–0.5%), so the index could skip almost everything. Here, 20% of the table matches. The index helps PostgreSQL avoid reading the other 80%, but it's still touching 200,000 rows — a fifth of the whole table.

**What actually happens**: PostgreSQL may use an **Index Only Scan** — since `COUNT(*)` only needs to know which rows match, not their full contents, it can answer entirely from the index without touching the table at all. This is slightly faster than a full Sequential Scan because the index is smaller than the table. But "slightly faster" is the key — you are scanning a fifth of a smaller structure instead of all of a larger one. (The exact plan can vary depending on table statistics and visibility map state — PostgreSQL might also choose a Bitmap Index Scan or even a Seq Scan.)

If the query were `SELECT * FROM orders WHERE status = 'pending'` (needing full rows), the result would be worse. PostgreSQL would need to read 200,000 rows from the table via random I/O, which can be *slower* than just scanning the whole table sequentially. In that case, PostgreSQL often ignores the index entirely and does a Seq Scan.

## The Key Insight

An index's value is proportional to how much work it lets you skip. When your filter matches 20% of the table, the index can only skip 80% of the work. That's a modest improvement at best — a 1.3x speedup means the index saved you 23% of the time. Compare that to Demo 2, where the index skipped 99.998% of rows.

## The Rule of Thumb

An index on a column is most useful when your query selects a small fraction of rows — typically under 5–10%. Beyond that, the improvement becomes marginal. The further above that threshold you go, the less an index helps.

**Low cardinality** (few distinct values) usually means low selectivity, which usually means indexes provide minimal benefit. Common examples:
- `status` (pending/active/closed)
- `is_active` (true/false)
- `type` (a small number of categories)
- `country` (if most users are from one country)

## When It Can Help

There are exceptions. If the distribution is skewed — say 95% of orders are `delivered` and only 1% are `cancelled` — then an index *would* help significantly for `WHERE status = 'cancelled'` (very selective) but not for `WHERE status = 'delivered'` (not selective at all). PostgreSQL is smart enough to make this distinction per-value using its column statistics.

## The Practical Question

Should you add this index? It depends on context:
- If this query runs thousands of times per second, a consistent 1.3x improvement is significant in total.
- If it runs occasionally, the write overhead of maintaining the index on every INSERT/UPDATE probably isn't worth the marginal read improvement.
- The index also costs disk space — a question of whether that 20–30% speedup justifies the storage and write penalty.

## Cleanup

```sql
DROP INDEX idx_orders_status;
```
