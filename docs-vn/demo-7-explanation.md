# Demo 7: COUNT(*) GROUP BY status

## Truy vấn

```sql
SELECT status, COUNT(*) FROM orders GROUP BY status;
```

## Chuyện gì xảy ra

Truy vấn này cần đếm có bao nhiêu đơn hàng cho mỗi giá trị status. Không có mệnh đề `WHERE` — nó cần xem xét từng dòng một để tạo ra các số đếm.

Ngay cả khi có index trên `status`, hiệu suất về cơ bản vẫn như nhau.

## Tại sao index không giúp ích

Index giúp bạn *bỏ qua* các dòng. Nhưng truy vấn này không thể bỏ qua gì cả — nó phải đếm mọi dòng trong bảng để có tổng chính xác. Không có dòng nào để loại bỏ.

Sử dụng phép so sánh với cuốn sách: nếu ai đó hỏi "mỗi chương xuất hiện bao nhiêu lần trong cuốn sách này?", phần mục lục ở cuối sách không thể giúp — bạn phải duyệt qua mọi tham chiếu trang dù sao đi nữa. Đơn giản hơn là cứ đọc cuốn sách từ đầu đến cuối.

Cụ thể:

- **Không có index**: PostgreSQL thực hiện Sequential Scan, đọc toàn bộ 1 triệu dòng, rồi nhóm và đếm chúng. Nó có thể sử dụng parallel workers để chia nhỏ công việc.
- **Có index**: PostgreSQL có hai lựa chọn, và không lựa chọn nào tốt hơn:
  1. Bỏ qua index và thực hiện Sequential Scan như bình thường (đây là cách thường làm).
  2. Thực hiện Index Only Scan — đọc toàn bộ 1 triệu mục từ index thay vì từ bảng. Điều này *có thể* nhanh hơn một chút vì index nhỏ hơn bảng đầy đủ, nhưng mức cải thiện không đáng kể vì bạn vẫn đọc mọi mục.

## Kết luận

Các truy vấn tổng hợp phải duyệt qua mọi dòng (`COUNT`, `SUM`, `AVG`, `GROUP BY` mà không có `WHERE` chọn lọc) không hưởng lợi đáng kể từ index. Nút cổ chai là tổng lượng dữ liệu cần xử lý, và index không thể giảm điều đó.

Nếu bạn cần các phép tổng hợp này chạy nhanh, giải pháp khác với việc đánh index:
- **Materialized views**: Tính toán trước phép tổng hợp và làm mới định kỳ.
- **Summary tables**: Duy trì các bộ đếm cập nhật khi dữ liệu thay đổi.
- **Partitioning**: Chia bảng theo ngày hoặc status để cơ sở dữ liệu chỉ quét partition liên quan.

## Dọn dẹp

```sql
DROP INDEX idx_orders_status;
```
