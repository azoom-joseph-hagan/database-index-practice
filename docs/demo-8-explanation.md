# Demo 8: Small Table (500 rows)

## The Queries

```sql
-- Approach 1: SQL WHERE (no index)
SELECT * FROM products WHERE category = 'Electronics';

-- Approach 2: Fetch all rows, filter in JavaScript
SELECT * FROM products;  -- then: rows.filter(r => r.category === 'Electronics')

-- Approach 3: SQL WHERE (with index on category)
SELECT * FROM products WHERE category = 'Electronics';
```

## What Happens

All three approaches return results in roughly the same time — usually under 1ms. The index makes no meaningful difference.

## Why the Index Doesn't Help

The `products` table has 500 rows. The entire table fits in a small number of disk pages (PostgreSQL's page size is 8KB). Reading a few pages is essentially instant.

When a table is this small:
- A **Sequential Scan** reads 2-3 pages. Done.
- An **Index Scan** reads the index (1-2 pages), then fetches matching rows from the table (1-2 pages). Same or more total I/O for no practical benefit.
- **Fetching all rows to JavaScript** and filtering in memory is also fine because you're transferring and processing so little data.

## The Takeaway

There is no need to index small tables. A common reaction is to "index everything just in case" — but for tables with hundreds or even a few thousand rows, indexes add write overhead (every insert/update must maintain the index) with no read benefit.

How small is "small"? There's no exact cutoff, but as a rough guide:
- **Under ~1,000 rows**: Almost never worth indexing (beyond the primary key).
- **1,000–10,000 rows**: Usually not worth it, unless the table is queried repeatedly in a loop (e.g. as the inner table of a nested loop join).
- **10,000+ rows**: Start considering indexes on columns you frequently filter or join on.

These thresholds also depend on row width — a table with 5,000 rows but 50 columns per row is bigger than a table with 5,000 rows and 3 columns.

## The JavaScript Filter Question

A common question is whether it's better to filter in the database or in application code. For small tables, it does not matter — the network round-trip to the database is likely the largest cost either way. For large tables, always filter in SQL — you don't want to transfer millions of rows over the network just to discard most of them in your application.

## Cleanup

```sql
DROP INDEX idx_products_category;
```
