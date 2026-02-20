import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const ITERATIONS = 5;

// ─── Helpers ────────────────────────────────────────────────────────────────

interface DemoResult {
  label: string;
  timeMs: number;
  plan: string;
}

function extractExecutionTime(plan: string): number {
  const match = plan.match(/Execution Time:\s+([\d.]+)\s+ms/);
  return match ? parseFloat(match[1]) : 0;
}

async function runExplainAnalyze(
  sql: string,
  params: unknown[] = []
): Promise<{ plan: string; execTimeMs: number }> {
  const result = await pool.query(`EXPLAIN ANALYZE ${sql}`, params);
  const plan = result.rows
    .map((r: Record<string, string>) => r["QUERY PLAN"])
    .join("\n");
  return { plan, execTimeMs: extractExecutionTime(plan) };
}

async function timeQuery(
  label: string,
  sql: string,
  params: unknown[] = [],
  iterations: number = ITERATIONS
): Promise<DemoResult> {
  // Warm-up run (discard)
  await runExplainAnalyze(sql, params);

  // Collect execution times from EXPLAIN ANALYZE
  let bestPlan = "";
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const { plan, execTimeMs } = await runExplainAnalyze(sql, params);
    times.push(execTimeMs);
    if (i === 0) bestPlan = plan;
  }

  // Use median to avoid outlier skew
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)];

  return { label, timeMs: median, plan: bestPlan };
}

async function createIndex(ddl: string) {
  await pool.query(ddl);
  const table = ddl.match(/ON\s+(\w+)/i)?.[1];
  if (table) await pool.query(`ANALYZE ${table}`);
}

async function dropIndex(name: string) {
  await pool.query(`DROP INDEX IF EXISTS ${name}`);
}

function printComparison(
  demoNum: number,
  title: string,
  description: string,
  without: DemoResult,
  withIdx: DemoResult
) {
  const speedup = without.timeMs / withIdx.timeMs;
  const bar = "═".repeat(70);

  console.log(`\n╔${bar}╗`);
  console.log(`║  Demo ${demoNum}: ${title.padEnd(62)}║`);
  console.log(`╠${bar}╣`);
  console.log(`║  ${description.padEnd(68)}║`);
  console.log(`╠${bar}╣`);
  console.log(
    `║  WITHOUT index: ${without.timeMs.toFixed(2).padStart(9)} ms  (median of ${ITERATIONS} runs, EXPLAIN ANALYZE)`
      .padEnd(71) + "║"
  );
  console.log(
    `║  WITH    index: ${withIdx.timeMs.toFixed(2).padStart(9)} ms`
      .padEnd(71) + "║"
  );
  console.log(`║${"─".repeat(70)}║`);
  if (speedup >= 1.05) {
    console.log(
      `║  Speedup: ${speedup.toFixed(1)}x faster`.padEnd(71) + "║"
    );
  } else if (speedup < 0.95) {
    console.log(
      `║  Result: ${(1 / speedup).toFixed(1)}x SLOWER with index`.padEnd(71) +
        "║"
    );
  } else {
    console.log(`║  Result: ~same performance`.padEnd(71) + "║");
  }
  console.log(`╚${bar}╝`);

  console.log("\n  EXPLAIN ANALYZE (without index):");
  for (const line of without.plan.split("\n").slice(0, 8)) {
    console.log(`    ${line}`);
  }

  console.log("\n  EXPLAIN ANALYZE (with index):");
  for (const line of withIdx.plan.split("\n").slice(0, 8)) {
    console.log(`    ${line}`);
  }
  console.log("");
}

function printSingleResult(
  demoNum: number,
  title: string,
  description: string,
  results: { label: string; timeMs: number; plan?: string }[]
) {
  const bar = "═".repeat(70);

  console.log(`\n╔${bar}╗`);
  console.log(`║  Demo ${demoNum}: ${title.padEnd(62)}║`);
  console.log(`╠${bar}╣`);
  console.log(`║  ${description.padEnd(68)}║`);
  console.log(`╠${bar}╣`);
  for (const r of results) {
    console.log(
      `║  ${r.label}: ${r.timeMs.toFixed(2).padStart(9)} ms`.padEnd(71) + "║"
    );
  }
  console.log(`╚${bar}╝`);

  for (const r of results) {
    if (r.plan) {
      console.log(`\n  EXPLAIN ANALYZE (${r.label}):`);
      for (const line of r.plan.split("\n").slice(0, 6)) {
        console.log(`    ${line}`);
      }
    }
  }
  console.log("");
}

// ─── Warm up ────────────────────────────────────────────────────────────────

async function warmUp() {
  await pool.query("ANALYZE");
  // Warm the buffer cache — read all tables into shared buffers
  await pool.query("SELECT COUNT(*) FROM customers");
  await pool.query("SELECT COUNT(*) FROM orders");
  await pool.query("SELECT COUNT(*) FROM order_items");
  await pool.query("SELECT * FROM customers LIMIT 0");
  await pool.query("SELECT * FROM orders LIMIT 0");
  await pool.query("SELECT * FROM order_items LIMIT 0");
}

// ─── Part 1: Where Indexes WIN ──────────────────────────────────────────────

async function demo1() {
  const sql = `SELECT * FROM customers WHERE last_name = 'Smith'`;

  const without = await timeQuery("No index", sql);

  await createIndex(
    `CREATE INDEX idx_customers_last_name ON customers (last_name)`
  );
  const withIdx = await timeQuery("With index", sql);
  await dropIndex("idx_customers_last_name");

  printComparison(
    1,
    "Lookup by last_name (50k rows)",
    "Selective text search on a medium table → Index Scan wins",
    without,
    withIdx
  );
}

async function demo2() {
  const { rows } = await pool.query(
    `SELECT customer_id FROM orders LIMIT 1`
  );
  const custId = rows[0].customer_id;

  const sql = `SELECT * FROM orders WHERE customer_id = $1`;

  const without = await timeQuery("No index", sql, [custId]);

  await createIndex(
    `CREATE INDEX idx_orders_customer_id ON orders (customer_id)`
  );
  const withIdx = await timeQuery("With index", sql, [custId]);
  await dropIndex("idx_orders_customer_id");

  printComparison(
    2,
    "Orders by customer_id (1M rows)",
    "FK lookup returning ~20 rows from 1M → massive speedup",
    without,
    withIdx
  );
}

async function demo3() {
  const sql = `SELECT * FROM orders WHERE created_at BETWEEN '2024-06-01' AND '2024-06-07'`;

  const without = await timeQuery("No index", sql);

  await createIndex(
    `CREATE INDEX idx_orders_created_at ON orders (created_at)`
  );
  const withIdx = await timeQuery("With index", sql);
  await dropIndex("idx_orders_created_at");

  printComparison(
    3,
    "Date range on orders.created_at",
    "Narrow 7-day window from 3 years of data → Index Range Scan",
    without,
    withIdx
  );
}

async function demo4() {
  const { rows } = await pool.query(
    `SELECT customer_id FROM orders LIMIT 1`
  );
  const custId = rows[0].customer_id;

  const sql = `
    SELECT o.id, o.total_amount, oi.product_id, oi.quantity, oi.unit_price
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.customer_id = $1
  `;

  const without = await timeQuery("No index", sql, [custId]);

  await createIndex(
    `CREATE INDEX idx_orders_customer_id ON orders (customer_id)`
  );
  await createIndex(
    `CREATE INDEX idx_order_items_order_id ON order_items (order_id)`
  );
  const withIdx = await timeQuery("With index", sql, [custId]);
  await dropIndex("idx_orders_customer_id");
  await dropIndex("idx_order_items_order_id");

  printComparison(
    4,
    "JOIN orders + order_items for a customer",
    "Nested loop with seq scans vs indexed join → huge difference",
    without,
    withIdx
  );
}

async function demo5() {
  const { rows } = await pool.query(
    `SELECT customer_id FROM orders LIMIT 1`
  );
  const custId = rows[0].customer_id;

  const sql = `
    SELECT * FROM orders
    WHERE customer_id = $1
      AND created_at BETWEEN '2024-01-01' AND '2024-03-31'
  `;

  const without = await timeQuery("No index", sql, [custId]);

  await createIndex(
    `CREATE INDEX idx_orders_customer_id ON orders (customer_id)`
  );
  const singleIdx = await timeQuery("Single-col index", sql, [custId]);

  await createIndex(
    `CREATE INDEX idx_orders_cust_date ON orders (customer_id, created_at)`
  );
  const compositeIdx = await timeQuery("Composite index", sql, [custId]);

  await dropIndex("idx_orders_customer_id");
  await dropIndex("idx_orders_cust_date");

  printSingleResult(
    5,
    "Composite index (customer_id, created_at)",
    "Single-col vs composite for multi-predicate queries",
    [
      { label: "No index", timeMs: without.timeMs, plan: without.plan },
      {
        label: "Single-col (customer_id)",
        timeMs: singleIdx.timeMs,
        plan: singleIdx.plan,
      },
      {
        label: "Composite (customer_id, created_at)",
        timeMs: compositeIdx.timeMs,
        plan: compositeIdx.plan,
      },
    ]
  );
}

// ─── Part 2: Where Indexes DON'T Help ───────────────────────────────────────

async function demo6() {
  // Use COUNT to avoid result-transfer noise — we only care about scan strategy
  const sql = `SELECT COUNT(*) FROM orders WHERE status = 'pending'`;

  const without = await timeQuery("No index", sql);

  await createIndex(`CREATE INDEX idx_orders_status ON orders (status)`);
  const withIdx = await timeQuery("With index", sql);
  await dropIndex("idx_orders_status");

  printComparison(
    6,
    "Filter by status (low cardinality)",
    "5 values, ~20% each → index provides minimal/no benefit",
    without,
    withIdx
  );
}

async function demo7() {
  const sql = `SELECT status, COUNT(*) FROM orders GROUP BY status`;

  const without = await timeQuery("No index", sql);

  await createIndex(`CREATE INDEX idx_orders_status ON orders (status)`);
  const withIdx = await timeQuery("With index", sql);
  await dropIndex("idx_orders_status");

  printComparison(
    7,
    "COUNT(*) GROUP BY status",
    "Must touch every row → index can't avoid full scan",
    without,
    withIdx
  );
}

async function demo8() {
  const sqlNoIndex = await timeQuery(
    "SQL WHERE",
    `SELECT * FROM products WHERE category = 'Electronics'`
  );

  // Fetch all + JS filter — use EXPLAIN ANALYZE for the fetch, add negligible JS time
  const { plan: jsPlan, execTimeMs: jsDbTime } = await runExplainAnalyze(
    `SELECT * FROM products`
  );
  // The JS filter on 500 rows is sub-microsecond, so jsDbTime is the total
  const jsResult = { label: "Fetch all + JS filter", timeMs: jsDbTime, plan: jsPlan };

  await createIndex(
    `CREATE INDEX idx_products_category ON products (category)`
  );
  const sqlIndexed = await timeQuery(
    "SQL WHERE + index",
    `SELECT * FROM products WHERE category = 'Electronics'`
  );
  await dropIndex("idx_products_category");

  printSingleResult(
    8,
    "Small table (500 rows): index vs no index vs JS",
    "Tiny tables → all approaches are virtually identical",
    [
      {
        label: "SQL WHERE (no index)",
        timeMs: sqlNoIndex.timeMs,
        plan: sqlNoIndex.plan,
      },
      jsResult,
      {
        label: "SQL WHERE + index",
        timeMs: sqlIndexed.timeMs,
        plan: sqlIndexed.plan,
      },
    ]
  );
}

async function demo9() {
  // Use COUNT to avoid transferring 1M rows and measuring network time
  const sql = `SELECT COUNT(*) FROM orders WHERE total_amount > 0`;

  const without = await timeQuery("No index", sql);

  await createIndex(
    `CREATE INDEX idx_orders_total_amount ON orders (total_amount)`
  );
  const withIdx = await timeQuery("With index", sql);
  await dropIndex("idx_orders_total_amount");

  printComparison(
    9,
    "WHERE total_amount > 0 (95%+ match)",
    "Non-selective predicate → index overhead, Seq Scan preferred",
    without,
    withIdx
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    "╔══════════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║           DATABASE INDEX PRACTICE — Demo Results                    ║"
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════════════╝"
  );

  console.log(
    `\nWarming up (running ANALYZE, priming buffer cache)...`
  );
  console.log(`Each query runs ${ITERATIONS} times; median Execution Time from EXPLAIN ANALYZE shown.\n`);
  await warmUp();

  const counts = await Promise.all([
    pool.query("SELECT COUNT(*) FROM customers"),
    pool.query("SELECT COUNT(*) FROM products"),
    pool.query("SELECT COUNT(*) FROM orders"),
    pool.query("SELECT COUNT(*) FROM order_items"),
  ]);
  console.log("Table sizes:");
  console.log(
    `  customers:   ${Number(counts[0].rows[0].count).toLocaleString()}`
  );
  console.log(
    `  products:    ${Number(counts[1].rows[0].count).toLocaleString()}`
  );
  console.log(
    `  orders:      ${Number(counts[2].rows[0].count).toLocaleString()}`
  );
  console.log(
    `  order_items: ${Number(counts[3].rows[0].count).toLocaleString()}`
  );

  console.log(
    "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );
  console.log("  PART 1: Where Indexes WIN");
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );

  await demo1();
  await demo2();
  await demo3();
  await demo4();
  await demo5();

  console.log(
    "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );
  console.log("  PART 2: Where Indexes DON'T Help");
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );

  await demo6();
  await demo7();
  await demo8();
  await demo9();

  console.log(
    "\n╔══════════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║                          All demos complete!                        ║"
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════════════╝\n"
  );

  await pool.end();
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
