# Database Index Practice

Demonstrates when PostgreSQL indexes help significantly and when they do not. Uses Docker Compose, Drizzle ORM, and TypeScript to seed ~4M rows across 4 tables, then runs 9 demos comparing query performance with and without indexes.

## Prerequisites

- [Docker](https://www.docker.com/)
- [Node.js](https://nodejs.org/) v22+
- [pnpm](https://pnpm.io/)

## First Time Setup

```bash
# 1. Start PostgreSQL (runs on port 5499 to avoid conflicts)
docker compose up -d

# 2. Install dependencies
pnpm install

# 3. Create the database tables
pnpm drizzle-kit push

# 4. Seed the database (~4M rows, takes a few minutes)
pnpm seed
```

## Run the Demos

```bash
pnpm demo
```

This runs 9 scenarios that each:
1. Run a query **without** an index and capture timing + `EXPLAIN ANALYZE`
2. Create an index and run the same query **with** the index
3. Print a side-by-side comparison with the speedup factor
4. Drop the index (reset for the next demo)

### What the Demos Cover

Each demo has a detailed explanation in the `docs-en/` folder. Start with [Index Basics](docs-en/index-basics.md) if you're new to indexes or EXPLAIN ANALYZE.

> **日本語版**: [README-jp.md](README-jp.md) | [docs-jp/](docs-jp/)

| # | Demo | Takeaway | Explanation |
|---|------|----------|-------------|
| **Part 1: Where Indexes WIN** | | | |
| 1 | Lookup by `last_name` (50k rows) | Seq Scan → Index Scan on selective query | [Read more](docs-en/demo-1-explanation.md) |
| 2 | Orders by `customer_id` (1M rows) | FK lookup returns ~20 rows from 1M | [Read more](docs-en/demo-2-explanation.md) |
| 3 | Date range on `orders.created_at` | Narrow 7-day window from 3 years of data | [Read more](docs-en/demo-3-explanation.md) |
| 4 | JOIN orders + order_items | Nested loop seq scan vs indexed join | [Read more](docs-en/demo-4-explanation.md) |
| 5 | Composite index `(customer_id, created_at)` | Single-col vs composite for multi-predicate queries | [Read more](docs-en/demo-5-explanation.md) |
| **Part 2: Where Indexes DON'T Help (Much)** | | | |
| 6 | Filter by `status` (5 values, ~20% each) | Low cardinality — marginal improvement vs 100x+ wins above | [Read more](docs-en/demo-6-explanation.md) |
| 7 | `COUNT(*) GROUP BY status` | Must touch every row — ~same performance | [Read more](docs-en/demo-7-explanation.md) |
| 8 | Small table: SQL vs JS filter (500 rows) | All approaches near-identical on tiny tables | [Read more](docs-en/demo-8-explanation.md) |
| 9 | `WHERE total_amount > 0` (95%+ match) | Non-selective predicate — ~same performance | [Read more](docs-en/demo-9-explanation.md) |

## Tear Down

```bash
# Stop PostgreSQL and wipe all data
docker compose down -v
```

To run again from the beginning, repeat the [First Time Setup](#first-time-setup) steps.

## Schema

| Table | ~Rows | Purpose |
|-------|-------|---------|
| `customers` | 50,000 | Name, email (unique), city, country |
| `products` | 500 | Intentionally small — shows indexes have no effect on tiny tables |
| `orders` | 1,000,000 | customer_id FK, status (5 values), total_amount, created_at |
| `order_items` | 3,000,000 | order_id FK, product_id FK, quantity, unit_price |

No indexes beyond primary keys and the email unique constraint. The demo script dynamically creates and drops indexes.

## Connect Directly

```bash
psql postgresql://postgres:postgres@localhost:5499/index_practice
```
