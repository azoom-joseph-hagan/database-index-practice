# Demo 5: Composite Index (customer_id, created_at)

## The Query

```sql
-- customer_id varies per run; 37760 is used as an example
SELECT * FROM orders
WHERE customer_id = 37760
  AND created_at BETWEEN '2024-01-01' AND '2024-03-31'
```

## What It Compares

This demo runs the same query three ways:

1. **No index** — Full sequential scan of 1M rows.
2. **Single-column index on `customer_id`** — Finds the ~20 orders for this customer, then filters by date in memory.
3. **Composite index on `(customer_id, created_at)`** — Finds only the orders for this customer within the date range directly from the index.

## How the Single-Column Index Works

```sql
CREATE INDEX idx_orders_customer_id ON orders (customer_id)
```

PostgreSQL uses the index to quickly find all ~20 orders for customer 37760. Then it applies the `created_at` filter to those 20 rows in memory. You'll see this in the EXPLAIN output:

```
Bitmap Heap Scan on orders
  Recheck Cond: (customer_id = 37760)
  Filter: (created_at BETWEEN ...)
  Rows Removed by Filter: 22
```

The `Filter` line means some rows passed the index lookup but were discarded after checking the date. This is fine when you're only filtering 20 rows — but imagine a customer with 10,000 orders where you only want 5 from last week.

## How the Composite Index Works

```sql
CREATE INDEX idx_orders_cust_date ON orders (customer_id, created_at)
```

A composite index is sorted by the first column, then by the second column within each first-column value. Think of it like a phone book sorted by last name, then first name:

```
(customer 37760, 2023-11-15)
(customer 37760, 2024-01-22)  ← start here
(customer 37760, 2024-02-10)  ← match
(customer 37760, 2024-05-01)  ← stop here
(customer 37761, 2022-03-05)
```

PostgreSQL can jump to `customer_id = 37760` AND start at `created_at = 2024-01-01`, then walk forward until it passes `2024-03-31`. It never reads any rows outside the exact range.

In the EXPLAIN output, you'll see a clean **Index Scan** where both conditions appear in the `Index Cond` (not as a `Filter`):

```
Index Scan using idx_orders_cust_date
  Index Cond: ((customer_id = 37760) AND (created_at BETWEEN ...))
```

No `Rows Removed by Filter` — every row the index returned was a match.

## Why This Matters

For this specific query with ~20 orders per customer, the difference between single and composite is small. But the principle applies more strongly with larger data:

- A customer with 50,000 orders where you want 10 from last week: single-column index reads 50,000 rows, composite reads 10.
- The composite index has already organized the data to answer "what are this customer's orders in this date range?"

## Column Order Matters

The order of columns in a composite index is important. `(customer_id, created_at)` supports:

- `WHERE customer_id = ?` (uses the first column)
- `WHERE customer_id = ? AND created_at BETWEEN ...` (uses both columns)

But it does **not** efficiently support:

- `WHERE created_at BETWEEN ...` alone (the first column isn't constrained, so the index cannot reduce the search space)

Think of it like the phone book: you can look up all "Smiths" or "Smith, John" — but you can't easily find all "Johns" across all last names.
