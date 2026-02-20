# Demo 7: COUNT(*) GROUP BY status

## The Query

```sql
SELECT status, COUNT(*) FROM orders GROUP BY status
```

## What Happens

This query needs to count how many orders exist for each status value. There's no `WHERE` clause — it needs to look at every single row to produce the counts.

Even with an index on `status`, the performance is essentially the same.

## Why the Index Doesn't Help

An index helps you *skip* rows. But this query can't skip anything — it must count every row in the table to get accurate totals. There are no rows to filter out.

Using the textbook analogy: if someone asks "how many times does each chapter appear in this book?", the index at the back cannot help — you have to go through every page reference anyway. It is simpler to just read the book from start to finish.

Specifically:

- **Without an index**: PostgreSQL does a Sequential Scan, reading all 1M rows, and groups/counts them. It can use parallel workers to split the work.
- **With an index**: PostgreSQL has two choices, and neither is better:
  1. Ignore the index and do the same Sequential Scan (which is what it usually does).
  2. Do an Index Only Scan — reading all 1M entries from the index instead of the table. This *can* be slightly faster because the index is smaller than the full table, but the gain is marginal since you're still reading every entry.

## The Takeaway

Aggregation queries that must touch every row (`COUNT`, `SUM`, `AVG`, `GROUP BY` without a selective `WHERE`) do not benefit meaningfully from indexes. The bottleneck is the total volume of data to process, and an index cannot reduce that.

If you need these aggregations to be fast, the solutions are different from indexing:
- **Materialized views**: Pre-compute the aggregation and refresh it periodically.
- **Summary tables**: Maintain running counts as data changes.
- **Partitioning**: Split the table by date or status so the database only scans the relevant partition.
