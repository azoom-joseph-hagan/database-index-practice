# Demo 9: WHERE total_amount > 0 (95%+ match)

## The Query

```sql
SELECT COUNT(*) FROM orders WHERE total_amount > 0;
```

## What Happens

Almost every order has a `total_amount` greater than 0 (the seeded data generates values between 10 and 2000). So this filter matches 95–100% of the 1M rows.

Even with an index on `total_amount`, PostgreSQL ignores it and does a Sequential Scan. The EXPLAIN plans are identical with and without the index — PostgreSQL doesn't even consider using it.

## Why the Index Doesn't Help

This is the same core issue as Demo 6, but more pronounced. The problem isn't the number of distinct values — it's the **selectivity of the predicate**.

`WHERE total_amount > 0` matches nearly every row. Even if PostgreSQL used the index, it would have to scan almost the entire thing — it can't skip anything meaningful. At that point, there's no benefit over just reading the table directly.

With Demo 6 (20% selectivity), PostgreSQL at least got a modest win from the index because it could skip 80% of rows. Here, with ~100% selectivity, there's nothing to skip. The planner sees this and does not use the index at all — both plans use a Parallel Seq Scan.

## The Key Insight

It's not about whether a column has an index — it's about whether the specific query value is selective. The same index on `total_amount` *would* help for a different query:

```sql
-- This IS selective: maybe 0.1% of orders
SELECT COUNT(*) FROM orders WHERE total_amount > 1900;

-- This is NOT selective: 95%+ of orders
SELECT COUNT(*) FROM orders WHERE total_amount > 0;
```

PostgreSQL makes this decision per-query based on the actual value you're filtering on and the column's data distribution statistics.

## How PostgreSQL Knows

When you run `ANALYZE` on a table, PostgreSQL samples the data and stores statistics about each column:
- The most common values and their frequencies
- A histogram of the value distribution
- The number of distinct values

The query planner uses these statistics to estimate how many rows a given `WHERE` clause will match. If the estimate is above a certain fraction of the table, it skips the index.

This is why running `ANALYZE` (or letting autovacuum do it) is important — stale statistics can lead PostgreSQL to make bad choices, like using an index when a Seq Scan would be faster, or vice versa.

## Cleanup

```sql
DROP INDEX idx_orders_total_amount;
```
