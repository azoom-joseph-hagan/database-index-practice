# Index Basics

## What Is an Index?

Think of a database index like the index at the back of a textbook. If you want to find every mention of "PostgreSQL" in a 500-page book, you have two options:

1. **Read every page** — You will find them all, but it is very slow.
2. **Check the index** — It tells you "PostgreSQL: pages 12, 47, 203" and you jump straight there.

A database index works the same way. Without one, PostgreSQL has to read every single row in the table to find what you're looking for (a **Sequential Scan**). With an index, it can jump directly to the matching rows.

## How Indexes Work (Simplified)

When you create an index on a column — say `last_name` — PostgreSQL builds a separate, sorted data structure (usually a **B-tree**) that maps values to their row locations:

```
"Adams"   → row 4821
"Adams"   → row 31002
"Brown"   → row 156
"Brown"   → row 8934
"Chen"    → row 2201
...
```

A B-tree is a balanced tree where each node can have hundreds of children. This means PostgreSQL can find any single value in a table of a billion rows in just 3 or 4 "hops" down the tree — instead of checking every row, it narrows down to the exact location almost instantly.

> **Note:** PostgreSQL also supports other index types (Hash, GIN, GiST, BRIN, SP-GiST) for specialized use cases like full-text search or geospatial data. B-tree is the default and covers the vast majority of use cases, so that's what we focus on here.

## When Indexes Help

Indexes work best when your query is **selective** — meaning it returns a small fraction of the total rows:

- Looking up a specific customer by name out of 50,000
- Finding 20 orders for one customer out of 1,000,000
- Filtering to a 7-day window out of 3 years of dates

The more rows the index lets you skip, the bigger the speedup.

## When Indexes Don't Help

Indexes are not magic. They're useless — or even harmful — when:

- **Low selectivity**: If your filter matches 20%+ of the table (e.g. filtering by `status` when there are only 5 possible values), PostgreSQL knows it is faster to read the whole table sequentially than to jump back and forth between the index and the data pages.
- **Tiny tables**: If the table only has 500 rows, it fits in a couple of disk pages. Reading it all is already fast — an index adds no meaningful benefit.
- **You need every row anyway**: Queries like `COUNT(*) GROUP BY status` must touch every row regardless. An index can't skip anything.


## The Cost of Indexes

Indexes aren't free:
- They take up disk space (a separate copy of the indexed column data, sorted).
- Every `INSERT`, `UPDATE`, or `DELETE` must also update all relevant indexes, which slows down writes.
- They increase **VACUUM overhead**. PostgreSQL's VACUUM process (a background cleaner that reclaims space from deleted/updated rows) has to clean up dead entries in every index on the table. More indexes means VACUUM takes longer, and if VACUUM cannot keep up, you can end up with index bloat.
- An unused index is pure overhead — costing writes, storage, and VACUUM time for zero read benefit.

This is why you shouldn't index everything. Index the columns you actually filter, join, or sort on in performance-critical queries.

---

# How to Read EXPLAIN ANALYZE

`EXPLAIN ANALYZE` is PostgreSQL's way of showing you exactly how it executed a query — what strategy it chose and how long each step took. It's one of the most useful tools for understanding query performance.

## Running It

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;
```

The `EXPLAIN` part shows the plan. The `ANALYZE` part actually runs the query and adds real timing numbers.

## Reading the Output

Here's a typical output:

```
Seq Scan on orders  (cost=0.00..20457.00 rows=21 width=31) (actual time=0.03..85.12 rows=24 loops=1)
  Filter: (customer_id = 42)
  Rows Removed by Filter: 999976
Planning Time: 0.05 ms
Execution Time: 85.15 ms
```

Let's break down each piece:

### Scan Type

The first words tell you *how* PostgreSQL accessed the data:

| Scan Type | What It Means | When You See It |
|-----------|---------------|-----------------|
| **Seq Scan** | Reads every row in the table, one by one | No useful index, or the query isn't selective enough for an index to help |
| **Index Scan** | Looks up rows via the index, then fetches the full row data | Highly selective query with a matching index |
| **Bitmap Index Scan** + **Bitmap Heap Scan** | Scans the index first to build a "map" of matching rows, then reads them in bulk | Too many rows for Index Scan (where each row is a random I/O hop) but few enough that reading the whole table would be wasteful. Think: hundreds to low thousands of rows from a large table. |
| **Index Only Scan** | Answers the query entirely from the index without touching the table | The index contains all the columns the query needs. **Caveat:** If the table has had many recent writes and VACUUM has not run recently, PostgreSQL may still need to check the table to verify row visibility — look for a high `Heap Fetches` count, which means it's falling back to the table. |

### Cost Estimates

```
(cost=0.00..20457.00 rows=21 width=31)
```

- `cost=0.00..20457.00` — PostgreSQL's *estimated* cost to start returning rows (`0.00`) and total cost (`20457.00`). These are not milliseconds — they're internal units derived from PostgreSQL's cost model (based on settings like `seq_page_cost` and `random_page_cost`). Useful for comparing plans against each other, not for absolute timing.
- `rows=21` — How many rows PostgreSQL *estimated* it would find.
- `width=31` — Average row size in bytes.

### Actual Timing

```
(actual time=0.03..85.12 rows=24 loops=1)
```

- `actual time=0.03..85.12` — Real milliseconds. Time to return the first row (`0.03`) and all rows (`85.12`).
- `rows=24` — How many rows it *actually* found (compare to the estimate above).
- `loops=1` — How many times this step ran. In nested loops or parallel queries, this can be more than 1.

### Filter Lines

```
Filter: (customer_id = 42)
Rows Removed by Filter: 999976
```

This tells you PostgreSQL read rows and then discarded the ones that didn't match. A high `Rows Removed by Filter` number on a Seq Scan is a strong signal that an index would help — it means PostgreSQL checked nearly a million rows just to find 24.

### Nested Plans

Plans are shown as a tree. Indented lines are child operations:

```
Nested Loop  (cost=4.59..516.91 rows=63 width=24) (actual time=0.04..1.27 rows=68 loops=1)
  ->  Bitmap Heap Scan on orders  (cost=4.59..85.61 rows=21 width=10) (actual time=0.03..0.21 rows=24 loops=1)
        Recheck Cond: (customer_id = 37760)
        ->  Bitmap Index Scan on idx_orders_customer_id  ...
  ->  Index Scan using idx_order_items_order_id on order_items  (cost=0.43..20.50 rows=4 width=18) (actual time=0.03..0.04 rows=3 loops=24)
```

Read it bottom-up: the innermost operations happen first. Here, PostgreSQL:
1. Uses the index to find matching order IDs
2. Fetches those order rows
3. For each order, uses another index to find its order_items
4. Joins them together in a nested loop



## Why Single-Query Times Are Misleading

A query that takes 15ms looks fine in isolation. But in production, two things make it much worse:

### Network latency

These demos run locally — the app and database are on the same machine, so there is almost no network delay. In production, your database is usually on a separate server. Each query adds a **network round-trip** of 1–5ms (same data center) or 20–50ms+ (different regions).

With 5ms of network overhead added to each query:

- **Indexed query**: 0.02ms DB + 5ms network = **~5ms total**
- **Unindexed query**: 15ms DB + 5ms network = **~20ms total**

The total time difference looks small (4x). But the database is doing **750x more work** for the unindexed query — and that work adds up fast when many requests arrive at the same time.

### Cumulative cost under load

Databases don't serve one request at a time. If 100 requests hit an endpoint:

- **Without an index**: 15ms × 100 = **1.5 seconds** of database time
- **With an index**: 0.02ms × 100 = **2 milliseconds**

Each slow query also holds a database connection longer. Most apps use a connection pool of 10–20 connections — once those are occupied by slow queries, new requests queue up and users see timeouts. An indexed query releases its connection almost immediately, keeping the pool available.

The demos show this directly — after each EXPLAIN ANALYZE, you'll see a "If 100 requests hit this endpoint" section showing real cumulative wall-clock time. Demo 4 (the JOIN query) is the most dramatic: ~7 seconds without indexes vs ~40ms with them.

A missing index is invisible in development but degrades the entire application under production traffic.

## Quick Reference

| What You See | What It Means | What To Do |
|-------------|---------------|------------|
| `Seq Scan` + high `Rows Removed by Filter` | Full table scan, discarding most rows | Add an index on the filtered column |
| `Seq Scan` on a small table | Full scan, but the table is tiny | Nothing — it's already fast |
| `Seq Scan` + low-selectivity filter | Full scan, but most rows match anyway | Nothing — an index wouldn't help |
| `Index Scan` or `Bitmap Heap Scan` | Using an index effectively | No action needed |
| Estimated `rows` far from actual `rows` | Stale statistics | Run `ANALYZE tablename` |
| `Nested Loop` with `Seq Scan` on inner table | Repeated full scans inside a join | Add an index on the join column |
