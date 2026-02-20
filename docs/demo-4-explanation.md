# Demo 4: JOIN orders + order_items for a Customer

## The Query

```sql
-- customer_id varies per run; 37760 is used as an example
SELECT o.id, o.total_amount, oi.product_id, oi.quantity, oi.unit_price
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.customer_id = 37760
```

## What Happens Without an Index

Without indexes, this query is very expensive. PostgreSQL has to:

1. Scan all 1M orders to find the ~20 for this customer.
2. For each of those 20 orders, find the matching `order_items` — but without an index on `order_id`, it has to scan all 3M order_items.

In practice, PostgreSQL optimizes this — it does not do 20 separate full scans. It typically uses a **Hash Join** — it scans the orders table to find matches, builds a hash table, then scans order_items and probes the hash. But it's still reading millions of rows from both tables.

## Why the Indexes Help

```sql
CREATE INDEX idx_orders_customer_id ON orders (customer_id)
CREATE INDEX idx_order_items_order_id ON order_items (order_id)
```

With both indexes in place, the plan changes completely:

1. Use the `customer_id` index to find the ~20 orders for this customer (instead of scanning 1M rows).
2. For each of those 20 orders, use the `order_id` index to find the ~3 order_items per order (instead of scanning 3M rows).

This turns into a **Nested Loop** with **Index Scans** — the ideal plan for this kind of selective join. PostgreSQL reads ~20 orders + ~60 order_items instead of 4M total rows.

This is why this demo usually shows the largest speedup (often 50–100x or more).

## Why It's a Good Candidate for Indexing

- **Join columns**: Any column used in a `JOIN ... ON` condition is a strong candidate for indexing. Without it, PostgreSQL may need to scan the entire table for each probe.
- **Combined selectivity**: The `WHERE` clause narrows orders to ~20 rows, and the join further narrows order_items to ~60 rows. Indexes let PostgreSQL take advantage of this selectivity at every step.
- **Two indexes working together**: This demo shows how indexes combine. One index alone would help, but both together turn a multi-million-row operation into a sub-millisecond lookup.
