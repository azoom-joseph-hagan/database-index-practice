import type { Locale } from "./types.js";

export const en: Locale = {
  banner: "DATABASE INDEX PRACTICE — Demo Results",
  warmingUp: "Warming up (running ANALYZE, priming buffer cache)...",
  iterationNote: (n) =>
    `Each query runs ${n} times; median Execution Time from EXPLAIN ANALYZE shown.`,
  tableSizes: "Table sizes:",
  part1Header: "PART 1: Where Indexes WIN",
  part2Header: "PART 2: Where Indexes DON'T Help",
  allComplete: "All demos complete!",
  demoFailed: "Demo failed:",

  withoutIndex: "Without index",
  withIndex: "With index",
  noIndex: "No index",
  singleColIndex: "Single-col (customer_id)",
  compositeIndex: "Composite (customer_id, created_at)",
  sqlWhereNoIndex: "SQL WHERE (no index)",
  fetchAllJsFilter: "Fetch all + JS filter",
  sqlWhereWithIndex: "SQL WHERE + index",

  medianOf: (n) => `median of ${n} runs, EXPLAIN ANALYZE`,
  speedup: (factor) => `Speedup: ${factor}x faster`,
  slower: (factor) => `Result: ${factor}x SLOWER with index`,
  samePerfResult: "Result: ~same performance",
  explainWithout: "EXPLAIN ANALYZE (without index):",
  explainWith: "EXPLAIN ANALYZE (with index):",
  explain: (label) => `EXPLAIN ANALYZE (${label}):`,
  loadSimHeader: (count) => `If ${count} requests hit this endpoint:`,

  demos: {
    demo1: {
      title: "Lookup by last_name (50k rows)",
      description:
        "Selective text search on a medium table → Index Scan wins",
    },
    demo2: {
      title: "Orders by customer_id (1M rows)",
      description: "FK lookup returning ~20 rows from 1M → massive speedup",
    },
    demo3: {
      title: "Date range on orders.created_at",
      description:
        "Narrow 7-day window from 3 years of data → Index Range Scan",
    },
    demo4: {
      title: "JOIN orders + order_items for a customer",
      description:
        "Nested loop with seq scans vs indexed join → huge difference",
    },
    demo5: {
      title: "Composite index (customer_id, created_at)",
      description:
        "Single-col vs composite for multi-predicate queries",
    },
    demo6: {
      title: "Filter by status (low cardinality)",
      description:
        "5 values, ~20% each → index provides minimal/no benefit",
    },
    demo7: {
      title: "COUNT(*) GROUP BY status",
      description: "Must touch every row → index can't avoid full scan",
    },
    demo8: {
      title: "Small table (500 rows): index vs no index vs JS",
      description:
        "Tiny tables → all approaches are virtually identical",
    },
    demo9: {
      title: "WHERE total_amount > 0 (95%+ match)",
      description:
        "Non-selective predicate → index overhead, Seq Scan preferred",
    },
  },
};
