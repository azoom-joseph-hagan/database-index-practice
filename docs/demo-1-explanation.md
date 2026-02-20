# Demo 1: Lookup by last_name (50k rows)

## The Query

```sql
SELECT * FROM customers WHERE last_name = 'Swallows';
```

## What Happens Without an Index

PostgreSQL has no way to find rows with `last_name = 'Swallows'` without reading every single row in the `customers` table. It performs a **Sequential Scan** — checking all 50,000 rows one by one and discarding the ones that don't match.

This is like searching for a name in an unsorted phone book by reading every entry.

## Why the Index Helps

When we create an index on `last_name`:

```sql
CREATE INDEX idx_customers_last_name ON customers (last_name);
```

PostgreSQL builds a sorted B-tree of all last name values. Now when you search for `'Swallows'`, it can look up the value in the tree and go directly to the matching rows — without reading the other ~49,994 rows.

In the EXPLAIN output, you'll see the Seq Scan replaced by a **Bitmap Index Scan** (looks up matching entries in the index) followed by a **Bitmap Heap Scan** (fetches the actual rows).

## Why It's a Good Candidate for Indexing

- **High selectivity**: One specific last name out of thousands of distinct values. Only a tiny fraction of rows match.
- **Medium-sized table**: 50,000 rows is enough that a full table scan is noticeably slower than an index lookup.
- **Equality predicate**: `= 'Swallows'` is the simplest and most efficient type of index lookup.

## Cleanup

```sql
DROP INDEX idx_customers_last_name;
```
