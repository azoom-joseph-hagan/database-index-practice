# Demo 6: Lọc theo status (Low Cardinality)

## Truy vấn

```sql
SELECT COUNT(*) FROM orders WHERE status = 'pending';
```

## Chuyện gì xảy ra

Chỉ có 5 giá trị status khả dụng (`pending`, `processing`, `shipped`, `delivered`, `cancelled`), mỗi giá trị xuất hiện trong khoảng 20% của 1 triệu dòng. Vì vậy `WHERE status = 'pending'` khớp với khoảng 200.000 dòng.

Với index trên `status`, bạn có thể thấy tốc độ cải thiện nhẹ (~1.3–1.5 lần) — nhưng hãy so sánh với Demo 2 nơi index mang lại tốc độ nhanh hơn 600 lần trở lên. Index có mang lại lợi ích, nhưng mức cải thiện nhỏ vì truy vấn vẫn phải xử lý 200.000 dòng dù bằng cách nào.

## Tại sao mức cải thiện không đáng kể

Đây là vấn đề về **độ chọn lọc (selectivity)** — bao nhiêu phần trăm của bảng khớp với bộ lọc của bạn.

Trong các demo 1–4, các truy vấn chỉ khớp với một phần rất nhỏ của bảng (0.002%–0.5%), nên index có thể bỏ qua gần như toàn bộ. Ở đây, 20% bảng khớp điều kiện. Index giúp PostgreSQL tránh đọc 80% còn lại, nhưng vẫn phải xử lý 200.000 dòng — một phần năm toàn bộ bảng.

**Thực tế xảy ra thế nào**: PostgreSQL có thể sử dụng **Index Only Scan** — vì `COUNT(*)` chỉ cần biết dòng nào khớp chứ không cần toàn bộ nội dung dòng, nó có thể trả lời hoàn toàn từ index mà không cần đọc bảng. Điều này nhanh hơn một chút so với Sequential Scan toàn bộ vì index nhỏ hơn bảng. Nhưng "nhanh hơn một chút" là điểm mấu chốt — bạn đang quét một phần năm của một cấu trúc nhỏ hơn thay vì toàn bộ một cấu trúc lớn hơn. (Kế hoạch thực thi chính xác có thể thay đổi tùy thuộc vào thống kê bảng và trạng thái visibility map — PostgreSQL cũng có thể chọn Bitmap Index Scan hoặc thậm chí Seq Scan.)

Nếu truy vấn là `SELECT * FROM orders WHERE status = 'pending'` (cần toàn bộ dòng), kết quả sẽ tệ hơn. PostgreSQL sẽ cần đọc 200.000 dòng từ bảng qua random I/O, điều này có thể *chậm hơn* so với việc quét tuần tự toàn bộ bảng. Trong trường hợp đó, PostgreSQL thường bỏ qua index hoàn toàn và thực hiện Seq Scan.

## Bài học quan trọng

Giá trị của index tỷ lệ thuận với lượng công việc mà nó cho phép bạn bỏ qua. Khi bộ lọc khớp với 20% bảng, index chỉ có thể bỏ qua 80% công việc. Đó là mức cải thiện khiêm tốn nhất — tốc độ nhanh hơn 1.3 lần nghĩa là index tiết kiệm cho bạn 23% thời gian. So sánh với Demo 2, nơi index bỏ qua 99.998% số dòng.

## Quy tắc chung

Index trên một cột hữu ích nhất khi truy vấn chọn một phần nhỏ các dòng — thường dưới 5–10%. Vượt quá ngưỡng đó, mức cải thiện trở nên không đáng kể. Càng vượt xa ngưỡng đó, index càng ít hữu ích.

**Low cardinality** (ít giá trị phân biệt) thường đồng nghĩa với độ chọn lọc thấp, nghĩa là index mang lại lợi ích tối thiểu. Các ví dụ phổ biến:
- `status` (pending/active/closed)
- `is_active` (true/false)
- `type` (một số ít danh mục)
- `country` (nếu hầu hết người dùng đến từ một quốc gia)

## Khi nào index có thể hữu ích

Có những ngoại lệ. Nếu phân bố bị lệch — ví dụ 95% đơn hàng là `delivered` và chỉ 1% là `cancelled` — thì index *sẽ* giúp đáng kể cho `WHERE status = 'cancelled'` (rất chọn lọc) nhưng không giúp cho `WHERE status = 'delivered'` (không chọn lọc chút nào). PostgreSQL đủ thông minh để phân biệt điều này theo từng giá trị bằng thống kê cột.

## Câu hỏi thực tế

Bạn có nên thêm index này không? Điều đó phụ thuộc vào ngữ cảnh:
- Nếu truy vấn này chạy hàng nghìn lần mỗi giây, mức cải thiện ổn định 1.3 lần sẽ đáng kể khi tính tổng.
- Nếu nó chạy không thường xuyên, chi phí ghi để duy trì index trên mỗi INSERT/UPDATE có lẽ không đáng so với mức cải thiện đọc khiêm tốn.
- Index cũng tốn dung lượng ổ đĩa — vấn đề là liệu mức tăng tốc 20–30% có xứng đáng với chi phí lưu trữ và ghi hay không.

## Dọn dẹp

```sql
DROP INDEX idx_orders_status;
```
