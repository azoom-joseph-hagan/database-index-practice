import type { Locale } from "./types.js";

export const vn: Locale = {
  banner: "THỰC HÀNH INDEX CƠ SỞ DỮ LIỆU — Kết quả Demo",
  warmingUp: "Đang khởi động (chạy ANALYZE, nạp buffer cache)...",
  iterationNote: (n) =>
    `Mỗi truy vấn chạy ${n} lần; hiển thị giá trị trung vị từ EXPLAIN ANALYZE.`,
  tableSizes: "Kích thước bảng:",
  part1Header: "PHẦN 1: Khi Index HIỆU QUẢ",
  part2Header: "PHẦN 2: Khi Index KHÔNG hiệu quả",
  allComplete: "Hoàn thành tất cả demo!",
  demoFailed: "Demo thất bại:",

  withoutIndex: "Không có index",
  withIndex: "Có index",
  noIndex: "Không có index",
  singleColIndex: "Index đơn cột (customer_id)",
  compositeIndex: "Index phức hợp (customer_id, created_at)",
  sqlWhereNoIndex: "SQL WHERE (không có index)",
  fetchAllJsFilter: "Lấy tất cả + lọc bằng JS",
  sqlWhereWithIndex: "SQL WHERE + index",

  medianOf: (n) => `trung vị của ${n} lần chạy, EXPLAIN ANALYZE`,
  speedup: (factor) => `Tăng tốc: nhanh hơn ${factor} lần`,
  slower: (factor) => `Kết quả: chậm hơn ${factor} lần với index`,
  samePerfResult: "Kết quả: hiệu năng tương đương",
  explainWithout: "EXPLAIN ANALYZE (không có index):",
  explainWith: "EXPLAIN ANALYZE (có index):",
  explain: (label) => `EXPLAIN ANALYZE (${label}):`,
  loadSimHeader: (count) =>
    `Nếu ${count} request gửi đến endpoint này:`,

  demos: {
    demo1: {
      title: "Tìm kiếm theo last_name (50k hàng)",
      description:
        "Tìm kiếm văn bản chọn lọc trên bảng trung bình → Index Scan thắng",
    },
    demo2: {
      title: "Đơn hàng theo customer_id (1M hàng)",
      description:
        "Tìm FK trả về ~20 hàng từ 1M → tăng tốc lớn",
    },
    demo3: {
      title: "Khoảng ngày trên orders.created_at",
      description:
        "Cửa sổ 7 ngày từ 3 năm dữ liệu → Index Range Scan",
    },
    demo4: {
      title: "JOIN orders + order_items theo khách hàng",
      description:
        "Nested loop seq scan vs indexed join → khác biệt lớn",
    },
    demo5: {
      title: "Index phức hợp (customer_id, created_at)",
      description:
        "Index đơn cột vs phức hợp cho truy vấn nhiều điều kiện",
    },
    demo6: {
      title: "Lọc theo status (cardinality thấp)",
      description:
        "5 giá trị, mỗi giá trị ~20% → index ít/không có lợi ích",
    },
    demo7: {
      title: "COUNT(*) GROUP BY status",
      description:
        "Phải duyệt mọi hàng → index không tránh được full scan",
    },
    demo8: {
      title: "Bảng nhỏ (500 hàng): index vs không index vs JS",
      description:
        "Bảng nhỏ → mọi cách tiếp cận gần như giống nhau",
    },
    demo9: {
      title: "WHERE total_amount > 0 (95%+ khớp)",
      description:
        "Điều kiện không chọn lọc → overhead của index, Seq Scan tốt hơn",
    },
  },
};
