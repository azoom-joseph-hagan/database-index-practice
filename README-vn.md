# Thực Hành Index Cơ Sở Dữ Liệu

Minh họa khi nào index trong PostgreSQL giúp ích đáng kể và khi nào không. Sử dụng Docker Compose, Drizzle ORM và TypeScript để tạo dữ liệu mẫu ~4 triệu hàng trên 4 bảng, sau đó chạy 9 demo so sánh hiệu năng truy vấn có và không có index.

## Yêu cầu

- [Docker](https://www.docker.com/)
- [Node.js](https://nodejs.org/) v22+
- [pnpm](https://pnpm.io/)

## Thiết lập lần đầu

```bash
# 1. Khởi động PostgreSQL (chạy trên cổng 5499 để tránh xung đột)
docker compose up -d

# 2. Cài đặt dependencies
pnpm install

# 3. Tạo các bảng trong cơ sở dữ liệu
pnpm drizzle-kit push

# 4. Tạo dữ liệu mẫu (~4 triệu hàng, mất vài phút)
pnpm seed
```

## Chạy Demo

```bash
# Phiên bản tiếng Anh
pnpm demo

# Phiên bản tiếng Việt
pnpm demo:vn
```

Mỗi kịch bản sẽ:
1. Chạy truy vấn **không có** index và ghi lại thời gian + `EXPLAIN ANALYZE`
2. Tạo index và chạy cùng truy vấn **có** index
3. Hiển thị so sánh song song với hệ số tăng tốc
4. Xóa index (reset cho demo tiếp theo)

### Nội dung các Demo

Mỗi demo có giải thích chi tiết trong thư mục `docs-vn/`. Nếu bạn mới làm quen với index hoặc EXPLAIN ANALYZE, hãy bắt đầu với [Kiến thức cơ bản về Index](docs-vn/index-basics.md).

| # | Demo | Điểm chính | Giải thích |
|---|------|------------|------------|
| **Phần 1: Khi Index HIỆU QUẢ** | | | |
| 1 | Tìm kiếm theo `last_name` (50k hàng) | Seq Scan → Index Scan trên truy vấn chọn lọc | [Xem thêm](docs-vn/demo-1-explanation.md) |
| 2 | Đơn hàng theo `customer_id` (1M hàng) | Tìm FK trả về ~20 hàng từ 1M | [Xem thêm](docs-vn/demo-2-explanation.md) |
| 3 | Khoảng ngày trên `orders.created_at` | Cửa sổ 7 ngày từ 3 năm dữ liệu | [Xem thêm](docs-vn/demo-3-explanation.md) |
| 4 | JOIN orders + order_items | Nested loop seq scan vs indexed join | [Xem thêm](docs-vn/demo-4-explanation.md) |
| 5 | Index phức hợp `(customer_id, created_at)` | Index đơn cột vs phức hợp cho truy vấn nhiều điều kiện | [Xem thêm](docs-vn/demo-5-explanation.md) |
| **Phần 2: Khi Index KHÔNG hiệu quả** | | | |
| 6 | Lọc theo `status` (5 giá trị, mỗi ~20%) | Cardinality thấp — cải thiện nhỏ so với 100x+ ở trên | [Xem thêm](docs-vn/demo-6-explanation.md) |
| 7 | `COUNT(*) GROUP BY status` | Phải duyệt mọi hàng — hiệu năng tương đương | [Xem thêm](docs-vn/demo-7-explanation.md) |
| 8 | Bảng nhỏ: SQL vs JS filter (500 hàng) | Mọi cách tiếp cận gần như giống nhau trên bảng nhỏ | [Xem thêm](docs-vn/demo-8-explanation.md) |
| 9 | `WHERE total_amount > 0` (95%+ khớp) | Điều kiện không chọn lọc — hiệu năng tương đương | [Xem thêm](docs-vn/demo-9-explanation.md) |

## Gỡ bỏ

```bash
# Dừng PostgreSQL và xóa toàn bộ dữ liệu
docker compose down -v
```

Để chạy lại từ đầu, lặp lại các bước [Thiết lập lần đầu](#thiết-lập-lần-đầu).

## Schema

| Bảng | ~Số hàng | Mục đích |
|------|----------|----------|
| `customers` | 50,000 | Tên, email (unique), thành phố, quốc gia |
| `products` | 500 | Cố ý nhỏ — cho thấy index không có tác dụng trên bảng nhỏ |
| `orders` | 1,000,000 | customer_id FK, status (5 giá trị), total_amount, created_at |
| `order_items` | 3,000,000 | order_id FK, product_id FK, quantity, unit_price |

Không có index nào ngoài primary key và ràng buộc unique trên email. Script demo tự động tạo và xóa index.

## Kết nối trực tiếp

```bash
psql postgresql://postgres:postgres@localhost:5499/index_practice
```
