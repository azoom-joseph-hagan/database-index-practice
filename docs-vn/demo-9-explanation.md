# Demo 9: WHERE total_amount > 0 (95%+ khớp)

## Truy vấn

```sql
SELECT COUNT(*) FROM orders WHERE total_amount > 0;
```

## Chuyện gì xảy ra

Hầu hết mọi đơn hàng đều có `total_amount` lớn hơn 0 (dữ liệu seed tạo ra giá trị từ 10 đến 2000). Vì vậy bộ lọc này khớp với 95–100% của 1 triệu dòng.

Ngay cả khi có index trên `total_amount`, PostgreSQL bỏ qua nó và thực hiện Sequential Scan. Kế hoạch EXPLAIN ANALYZE giống hệt nhau dù có hay không có index — PostgreSQL thậm chí không cân nhắc sử dụng nó.

## Tại sao index không giúp ích

Đây là cùng vấn đề cốt lõi như Demo 6, nhưng rõ ràng hơn. Vấn đề không phải số lượng giá trị phân biệt — mà là **độ chọn lọc của điều kiện lọc (selectivity of the predicate)**.

`WHERE total_amount > 0` khớp với gần như mọi dòng. Ngay cả khi PostgreSQL sử dụng index, nó vẫn phải quét gần như toàn bộ — không thể bỏ qua điều gì đáng kể. Đến lúc đó, không có lợi ích gì so với việc đọc trực tiếp bảng.

Với Demo 6 (độ chọn lọc 20%), PostgreSQL ít nhất cũng được lợi khiêm tốn từ index vì có thể bỏ qua 80% dòng. Ở đây, với độ chọn lọc ~100%, không có gì để bỏ qua. Bộ lập kế hoạch nhận ra điều này và không sử dụng index — cả hai kế hoạch đều sử dụng Parallel Seq Scan.

## Bài học quan trọng

Vấn đề không phải là cột có index hay không — mà là giá trị truy vấn cụ thể có chọn lọc hay không. Cùng một index trên `total_amount` *sẽ* giúp ích cho truy vấn khác:

```sql
-- Đây LÀ chọn lọc: có thể 0.1% đơn hàng
SELECT COUNT(*) FROM orders WHERE total_amount > 1900;

-- Đây KHÔNG chọn lọc: 95%+ đơn hàng
SELECT COUNT(*) FROM orders WHERE total_amount > 0;
```

PostgreSQL đưa ra quyết định này cho từng truy vấn dựa trên giá trị thực tế bạn đang lọc và thống kê phân bố dữ liệu của cột.

## PostgreSQL biết bằng cách nào

Khi bạn chạy `ANALYZE` trên một bảng, PostgreSQL lấy mẫu dữ liệu và lưu trữ thống kê về mỗi cột:
- Các giá trị phổ biến nhất và tần suất của chúng
- Biểu đồ phân bố giá trị (histogram)
- Số lượng giá trị phân biệt

Bộ lập kế hoạch truy vấn sử dụng các thống kê này để ước tính bao nhiêu dòng mà mệnh đề `WHERE` sẽ khớp. Nếu ước tính vượt quá một tỷ lệ nhất định của bảng, nó sẽ bỏ qua index.

Đây là lý do tại sao việc chạy `ANALYZE` (hoặc để autovacuum thực hiện) rất quan trọng — thống kê cũ có thể khiến PostgreSQL đưa ra quyết định sai, như sử dụng index khi Seq Scan sẽ nhanh hơn, hoặc ngược lại.

## Dọn dẹp

```sql
DROP INDEX idx_orders_total_amount;
```
