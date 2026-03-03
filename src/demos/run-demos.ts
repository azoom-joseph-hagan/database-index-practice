import pg from "pg";
import { locale } from "./locale/index.js";

const pool = new pg.Pool({
  connectionString: "postgresql://postgres:postgres@localhost:5499/index_practice",
});

const ITERATIONS = 5;
const LOAD_QUERIES = 100;
const BOX_WIDTH = 70;

// ─── Helpers ────────────────────────────────────────────────────────────────

interface DemoResult {
  label: string;
  timeMs: number;
  plan: string;
  loadMs?: number;
}

/** Display-width-aware padEnd for CJK characters (double-width in terminals). */
function displayWidth(str: string): number {
  let w = 0;
  for (const ch of str) {
    const cp = ch.codePointAt(0)!;
    // CJK Unified Ideographs, Hiragana, Katakana, Fullwidth forms, CJK symbols
    if (
      (cp >= 0x3000 && cp <= 0x9fff) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xff01 && cp <= 0xff60) ||
      (cp >= 0xffe0 && cp <= 0xffe6)
    ) {
      w += 2;
    } else {
      w += 1;
    }
  }
  return w;
}

function padEndDisplay(str: string, width: number): string {
  const diff = width - displayWidth(str);
  return diff > 0 ? str + " ".repeat(diff) : str;
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

async function simulateLoad(
  sql: string,
  params: unknown[] = []
): Promise<number> {
  const start = performance.now();
  for (let i = 0; i < LOAD_QUERIES; i++) {
    await pool.query(sql, params);
  }
  return performance.now() - start;
}

function formatTime(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  return `${ms.toFixed(0)} ms`;
}

function boxLine(content: string): string {
  return `║  ${padEndDisplay(content, BOX_WIDTH - 2)}║`;
}

function printLoadComparison(loads: { label: string; ms: number }[]) {
  console.log(`  ${locale.loadSimHeader(LOAD_QUERIES)}`);
  for (const l of loads) {
    console.log(`      ${padEndDisplay(l.label, 30)} ${formatTime(l.ms).padStart(10)}`);
  }
  console.log("");
}

function printComparison(
  demoNum: number,
  title: string,
  description: string,
  without: DemoResult,
  withIdx: DemoResult,
  loadResults?: { label: string; ms: number }[]
) {
  const speedup = without.timeMs / withIdx.timeMs;
  const bar = "═".repeat(BOX_WIDTH);

  console.log(`\n╔${bar}╗`);
  console.log(boxLine(`Demo ${demoNum}: ${title}`));
  console.log(`╠${bar}╣`);
  console.log(boxLine(description));
  console.log(`╠${bar}╣`);
  console.log(
    boxLine(
      `WITHOUT index: ${without.timeMs.toFixed(2).padStart(9)} ms  (${locale.medianOf(ITERATIONS)})`
    )
  );
  console.log(
    boxLine(
      `WITH    index: ${withIdx.timeMs.toFixed(2).padStart(9)} ms`
    )
  );
  console.log(`║${"─".repeat(BOX_WIDTH)}║`);
  if (speedup >= 1.05) {
    console.log(boxLine(locale.speedup(speedup.toFixed(1))));
  } else if (speedup < 0.95) {
    console.log(boxLine(locale.slower((1 / speedup).toFixed(1))));
  } else {
    console.log(boxLine(locale.samePerfResult));
  }
  console.log(`╚${bar}╝`);

  console.log(`\n  ${locale.explainWithout}`);
  for (const line of without.plan.split("\n").slice(0, 8)) {
    console.log(`    ${line}`);
  }

  console.log(`\n  ${locale.explainWith}`);
  for (const line of withIdx.plan.split("\n").slice(0, 8)) {
    console.log(`    ${line}`);
  }
  console.log("");

  if (loadResults) {
    printLoadComparison(loadResults);
  }
}

function printSingleResult(
  demoNum: number,
  title: string,
  description: string,
  results: { label: string; timeMs: number; plan?: string }[],
  loadResults?: { label: string; ms: number }[]
) {
  const bar = "═".repeat(BOX_WIDTH);

  console.log(`\n╔${bar}╗`);
  console.log(boxLine(`Demo ${demoNum}: ${title}`));
  console.log(`╠${bar}╣`);
  console.log(boxLine(description));
  console.log(`╠${bar}╣`);
  for (const r of results) {
    console.log(boxLine(`${r.label}: ${r.timeMs.toFixed(2).padStart(9)} ms`));
  }
  console.log(`╚${bar}╝`);

  for (const r of results) {
    if (r.plan) {
      console.log(`\n  ${locale.explain(r.label)}`);
      for (const line of r.plan.split("\n").slice(0, 6)) {
        console.log(`    ${line}`);
      }
    }
  }
  console.log("");

  if (loadResults) {
    printLoadComparison(loadResults);
  }
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
  const sql = `SELECT * FROM customers WHERE last_name = 'Swallows'`;

  const without = await timeQuery(locale.noIndex, sql);
  const loadWithout = await simulateLoad(sql);

  await createIndex(
    `CREATE INDEX idx_customers_last_name ON customers (last_name)`
  );
  const withIdx = await timeQuery(locale.withIndex, sql);
  const loadWith = await simulateLoad(sql);
  await dropIndex("idx_customers_last_name");

  printComparison(
    1,
    locale.demos.demo1.title,
    locale.demos.demo1.description,
    without,
    withIdx,
    [
      { label: locale.withoutIndex, ms: loadWithout },
      { label: locale.withIndex, ms: loadWith },
    ]
  );
}

async function demo2() {
  const { rows } = await pool.query(
    `SELECT customer_id FROM orders LIMIT 1`
  );
  const custId = rows[0].customer_id;

  const sql = `SELECT * FROM orders WHERE customer_id = $1`;

  const without = await timeQuery(locale.noIndex, sql, [custId]);
  const loadWithout = await simulateLoad(sql, [custId]);

  await createIndex(
    `CREATE INDEX idx_orders_customer_id ON orders (customer_id)`
  );
  const withIdx = await timeQuery(locale.withIndex, sql, [custId]);
  const loadWith = await simulateLoad(sql, [custId]);
  await dropIndex("idx_orders_customer_id");

  printComparison(
    2,
    locale.demos.demo2.title,
    locale.demos.demo2.description,
    without,
    withIdx,
    [
      { label: locale.withoutIndex, ms: loadWithout },
      { label: locale.withIndex, ms: loadWith },
    ]
  );
}

async function demo3() {
  const sql = `SELECT * FROM orders WHERE created_at BETWEEN '2024-06-01' AND '2024-06-07'`;

  const without = await timeQuery(locale.noIndex, sql);
  const loadWithout = await simulateLoad(sql);

  await createIndex(
    `CREATE INDEX idx_orders_created_at ON orders (created_at)`
  );
  const withIdx = await timeQuery(locale.withIndex, sql);
  const loadWith = await simulateLoad(sql);
  await dropIndex("idx_orders_created_at");

  printComparison(
    3,
    locale.demos.demo3.title,
    locale.demos.demo3.description,
    without,
    withIdx,
    [
      { label: locale.withoutIndex, ms: loadWithout },
      { label: locale.withIndex, ms: loadWith },
    ]
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

  const without = await timeQuery(locale.noIndex, sql, [custId]);
  const loadWithout = await simulateLoad(sql, [custId]);

  await createIndex(
    `CREATE INDEX idx_orders_customer_id ON orders (customer_id)`
  );
  await createIndex(
    `CREATE INDEX idx_order_items_order_id ON order_items (order_id)`
  );
  const withIdx = await timeQuery(locale.withIndex, sql, [custId]);
  const loadWith = await simulateLoad(sql, [custId]);
  await dropIndex("idx_orders_customer_id");
  await dropIndex("idx_order_items_order_id");

  printComparison(
    4,
    locale.demos.demo4.title,
    locale.demos.demo4.description,
    without,
    withIdx,
    [
      { label: locale.withoutIndex, ms: loadWithout },
      { label: locale.withIndex, ms: loadWith },
    ]
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

  const without = await timeQuery(locale.noIndex, sql, [custId]);
  const loadNone = await simulateLoad(sql, [custId]);

  await createIndex(
    `CREATE INDEX idx_orders_customer_id ON orders (customer_id)`
  );
  const singleIdx = await timeQuery(locale.singleColIndex, sql, [custId]);
  const loadSingle = await simulateLoad(sql, [custId]);

  await createIndex(
    `CREATE INDEX idx_orders_cust_date ON orders (customer_id, created_at)`
  );
  const compositeIdx = await timeQuery(locale.compositeIndex, sql, [custId]);
  const loadComposite = await simulateLoad(sql, [custId]);

  await dropIndex("idx_orders_customer_id");
  await dropIndex("idx_orders_cust_date");

  printSingleResult(
    5,
    locale.demos.demo5.title,
    locale.demos.demo5.description,
    [
      { label: locale.noIndex, timeMs: without.timeMs, plan: without.plan },
      {
        label: locale.singleColIndex,
        timeMs: singleIdx.timeMs,
        plan: singleIdx.plan,
      },
      {
        label: locale.compositeIndex,
        timeMs: compositeIdx.timeMs,
        plan: compositeIdx.plan,
      },
    ],
    [
      { label: locale.noIndex, ms: loadNone },
      { label: locale.singleColIndex, ms: loadSingle },
      { label: locale.compositeIndex, ms: loadComposite },
    ]
  );
}

// ─── Part 2: Where Indexes DON'T Help ───────────────────────────────────────

async function demo6() {
  // Use COUNT to avoid result-transfer noise — we only care about scan strategy
  const sql = `SELECT COUNT(*) FROM orders WHERE status = 'pending'`;

  const without = await timeQuery(locale.noIndex, sql);
  const loadWithout = await simulateLoad(sql);

  await createIndex(`CREATE INDEX idx_orders_status ON orders (status)`);
  const withIdx = await timeQuery(locale.withIndex, sql);
  const loadWith = await simulateLoad(sql);
  await dropIndex("idx_orders_status");

  printComparison(
    6,
    locale.demos.demo6.title,
    locale.demos.demo6.description,
    without,
    withIdx,
    [
      { label: locale.withoutIndex, ms: loadWithout },
      { label: locale.withIndex, ms: loadWith },
    ]
  );
}

async function demo7() {
  const sql = `SELECT status, COUNT(*) FROM orders GROUP BY status`;

  const without = await timeQuery(locale.noIndex, sql);
  const loadWithout = await simulateLoad(sql);

  await createIndex(`CREATE INDEX idx_orders_status ON orders (status)`);
  const withIdx = await timeQuery(locale.withIndex, sql);
  const loadWith = await simulateLoad(sql);
  await dropIndex("idx_orders_status");

  printComparison(
    7,
    locale.demos.demo7.title,
    locale.demos.demo7.description,
    without,
    withIdx,
    [
      { label: locale.withoutIndex, ms: loadWithout },
      { label: locale.withIndex, ms: loadWith },
    ]
  );
}

async function demo8() {
  const sqlWhere = `SELECT * FROM products WHERE category = 'Electronics'`;
  const sqlAll = `SELECT * FROM products`;

  const sqlNoIndex = await timeQuery(locale.sqlWhereNoIndex, sqlWhere);
  const loadNoIndex = await simulateLoad(sqlWhere);

  // Fetch all + JS filter — use EXPLAIN ANALYZE for the fetch, add negligible JS time
  const { plan: jsPlan, execTimeMs: jsDbTime } = await runExplainAnalyze(sqlAll);
  const jsResult = { label: locale.fetchAllJsFilter, timeMs: jsDbTime, plan: jsPlan };
  const loadJs = await simulateLoad(sqlAll);

  await createIndex(
    `CREATE INDEX idx_products_category ON products (category)`
  );
  const sqlIndexed = await timeQuery(locale.sqlWhereWithIndex, sqlWhere);
  const loadIndexed = await simulateLoad(sqlWhere);
  await dropIndex("idx_products_category");

  printSingleResult(
    8,
    locale.demos.demo8.title,
    locale.demos.demo8.description,
    [
      {
        label: locale.sqlWhereNoIndex,
        timeMs: sqlNoIndex.timeMs,
        plan: sqlNoIndex.plan,
      },
      jsResult,
      {
        label: locale.sqlWhereWithIndex,
        timeMs: sqlIndexed.timeMs,
        plan: sqlIndexed.plan,
      },
    ],
    [
      { label: locale.sqlWhereNoIndex, ms: loadNoIndex },
      { label: locale.fetchAllJsFilter, ms: loadJs },
      { label: locale.sqlWhereWithIndex, ms: loadIndexed },
    ]
  );
}

async function demo9() {
  // Use COUNT to avoid transferring 1M rows and measuring network time
  const sql = `SELECT COUNT(*) FROM orders WHERE total_amount > 0`;

  const without = await timeQuery(locale.noIndex, sql);
  const loadWithout = await simulateLoad(sql);

  await createIndex(
    `CREATE INDEX idx_orders_total_amount ON orders (total_amount)`
  );
  const withIdx = await timeQuery(locale.withIndex, sql);
  const loadWith = await simulateLoad(sql);
  await dropIndex("idx_orders_total_amount");

  printComparison(
    9,
    locale.demos.demo9.title,
    locale.demos.demo9.description,
    without,
    withIdx,
    [
      { label: locale.withoutIndex, ms: loadWithout },
      { label: locale.withIndex, ms: loadWith },
    ]
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const bar = "═".repeat(BOX_WIDTH);
  console.log(`╔${bar}╗`);
  console.log(boxLine(locale.banner));
  console.log(`╚${bar}╝`);

  console.log(`\n${locale.warmingUp}`);
  console.log(`${locale.iterationNote(ITERATIONS)}\n`);
  await warmUp();

  const counts = await Promise.all([
    pool.query("SELECT COUNT(*) FROM customers"),
    pool.query("SELECT COUNT(*) FROM products"),
    pool.query("SELECT COUNT(*) FROM orders"),
    pool.query("SELECT COUNT(*) FROM order_items"),
  ]);
  console.log(locale.tableSizes);
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
  console.log(`  ${locale.part1Header}`);
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
  console.log(`  ${locale.part2Header}`);
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );

  await demo6();
  await demo7();
  await demo8();
  await demo9();

  console.log(`\n╔${bar}╗`);
  console.log(boxLine(locale.allComplete));
  console.log(`╚${bar}╝\n`);

  await pool.end();
}

main().catch((err) => {
  console.error(locale.demoFailed, err);
  process.exit(1);
});
