# Demo 2: Orders by customer_id (1M rows)

## The Query

```sql
-- customer_id varies per run; 37760 is used as an example
SELECT * FROM orders WHERE customer_id = 37760
```

## What Happens Without an Index

PostgreSQL must scan all 1,000,000 rows in the `orders` table to find the ~20 rows belonging to this customer. Even with parallel workers helping, it's reading and discarding nearly a million rows.

In the EXPLAIN output you'll see something like:

```
Parallel Seq Scan on orders
  Filter: (customer_id = 37760)
  Rows Removed by Filter: 333325   ← per worker, so ~1M total
```

## Why the Index Helps

```sql
CREATE INDEX idx_orders_customer_id ON orders (customer_id)
```

This is a common foreign key index use case. The `customer_id` column points back to the `customers` table, and you frequently need to ask "give me all orders for customer X."

With the index, PostgreSQL looks up `customer_id = 37760` in the B-tree, finds the ~20 matching row locations, and fetches only those rows. It goes from scanning 1M rows to reading about 20.

## Why It's a Good Candidate for Indexing

- **Extremely selective**: 20 rows out of 1,000,000 — that's 0.002% of the table.
- **Large table**: At 1M rows, the difference between a full scan and a targeted lookup is very large.
- **Foreign key pattern**: This is one of the most common reasons to add an index. PostgreSQL does *not* automatically create indexes on foreign key columns (unlike primary keys). If you define a FK constraint but don't add an index, every lookup by that FK column will be a full table scan.

This is often the most important index you can add to a database — and one of the most commonly forgotten.
