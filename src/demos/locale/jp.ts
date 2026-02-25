import type { Locale } from "./types.js";

export const jp: Locale = {
  banner: "データベースインデックス実践 — デモ結果",
  warmingUp: "ウォームアップ中（ANALYZE実行、バッファキャッシュ準備）...",
  iterationNote: (n) =>
    `各クエリを${n}回実行し、EXPLAIN ANALYZEの中央値を表示します。`,
  tableSizes: "テーブルサイズ:",
  part1Header: "パート1: インデックスが効果的なケース",
  part2Header: "パート2: インデックスが効果的でないケース",
  allComplete: "全デモ完了！",
  demoFailed: "デモ失敗:",

  withoutIndex: "インデックスなし",
  withIndex: "インデックスあり",
  noIndex: "インデックスなし",
  singleColIndex: "単一カラム (customer_id)",
  compositeIndex: "複合インデックス (customer_id, created_at)",
  sqlWhereNoIndex: "SQL WHERE（インデックスなし）",
  fetchAllJsFilter: "全件取得 + JSフィルター",
  sqlWhereWithIndex: "SQL WHERE + インデックス",

  medianOf: (n) => `${n}回実行の中央値、EXPLAIN ANALYZE`,
  speedup: (factor) => `高速化: ${factor}倍速い`,
  slower: (factor) => `結果: インデックスありで${factor}倍遅い`,
  samePerfResult: "結果: ほぼ同じ性能",
  explainWithout: "EXPLAIN ANALYZE（インデックスなし）:",
  explainWith: "EXPLAIN ANALYZE（インデックスあり）:",
  explain: (label) => `EXPLAIN ANALYZE（${label}）:`,
  loadSimHeader: (count) =>
    `このエンドポイントに${count}リクエストが来た場合:`,

  demos: {
    demo1: {
      title: "last_nameで検索（5万行）",
      description:
        "中規模テーブルの選択的テキスト検索 → Index Scanが有利",
    },
    demo2: {
      title: "customer_idで注文検索（100万行）",
      description:
        "100万行からFK検索で約20行を取得 → 大幅な高速化",
    },
    demo3: {
      title: "orders.created_atの日付範囲検索",
      description:
        "3年分のデータから7日間の範囲 → Index Range Scan",
    },
    demo4: {
      title: "orders + order_itemsのJOIN（顧客別）",
      description:
        "Seq ScanのNested Loop vs インデックスJOIN → 大きな差",
    },
    demo5: {
      title: "複合インデックス (customer_id, created_at)",
      description:
        "複数条件クエリでの単一カラム vs 複合インデックス",
    },
    demo6: {
      title: "statusでフィルター（低カーディナリティ）",
      description:
        "5値、各約20% → インデックスの効果は最小限/なし",
    },
    demo7: {
      title: "COUNT(*) GROUP BY status",
      description:
        "全行走査が必要 → インデックスでは全件スキャンを回避できない",
    },
    demo8: {
      title: "小さいテーブル（500行）: インデックス vs なし vs JS",
      description:
        "小規模テーブル → どのアプローチもほぼ同じ",
    },
    demo9: {
      title: "WHERE total_amount > 0（95%以上が該当）",
      description:
        "非選択的な条件 → インデックスのオーバーヘッド、Seq Scanが有利",
    },
  },
};
