# Demo 8: Bảng nhỏ (500 dòng)

## Các truy vấn

```sql
-- Cách 1: SQL WHERE (không có index)
SELECT * FROM products WHERE category = 'Electronics';

-- Cách 2: Lấy tất cả các dòng, lọc bằng JavaScript
SELECT * FROM products;  -- sau đó: rows.filter(r => r.category === 'Electronics')

-- Cách 3: SQL WHERE (có index trên category)
SELECT * FROM products WHERE category = 'Electronics';
```

## Chuyện gì xảy ra

Cả ba cách đều trả về kết quả trong khoảng thời gian gần như nhau — thường dưới 1ms. Index không tạo ra sự khác biệt đáng kể nào.

## Tại sao index không giúp ích

Bảng `products` có 500 dòng. Toàn bộ bảng nằm gọn trong một vài trang đĩa (kích thước trang của PostgreSQL là 8KB). Đọc vài trang thì gần như tức thì.

Khi bảng nhỏ như vậy:
- **Sequential Scan** đọc 2-3 trang. Xong.
- **Index Scan** đọc index (1-2 trang), rồi lấy các dòng khớp từ bảng (1-2 trang). Tổng I/O bằng hoặc nhiều hơn mà không mang lại lợi ích thực tế.
- **Lấy tất cả dòng sang JavaScript** và lọc trong bộ nhớ cũng ổn vì lượng dữ liệu truyền tải và xử lý rất ít.

## Kết luận

Không cần đánh index cho bảng nhỏ. Một phản ứng phổ biến là "đánh index hết cho chắc" — nhưng đối với các bảng có hàng trăm hoặc thậm chí vài nghìn dòng, index thêm chi phí ghi (mỗi insert/update phải cập nhật index) mà không mang lại lợi ích đọc.

Nhỏ bao nhiêu thì gọi là "nhỏ"? Không có ngưỡng chính xác, nhưng như một hướng dẫn sơ bộ:
- **Dưới ~1.000 dòng**: Gần như không bao giờ đáng đánh index (ngoài primary key).
- **1.000–10.000 dòng**: Thường không đáng, trừ khi bảng được truy vấn lặp đi lặp lại trong vòng lặp (ví dụ: là bảng bên trong của Nested Loop join).
- **10.000+ dòng**: Bắt đầu cân nhắc đánh index cho các cột thường xuyên lọc hoặc join.

Các ngưỡng này cũng phụ thuộc vào độ rộng của dòng — một bảng có 5.000 dòng nhưng 50 cột mỗi dòng sẽ lớn hơn bảng có 5.000 dòng và 3 cột.

## Câu hỏi về lọc bằng JavaScript

Một câu hỏi phổ biến là nên lọc trong cơ sở dữ liệu hay trong mã ứng dụng. Đối với bảng nhỏ, không quan trọng — thời gian truyền mạng đến cơ sở dữ liệu có lẽ là chi phí lớn nhất dù bằng cách nào. Đối với bảng lớn, luôn lọc bằng SQL — bạn không muốn truyền hàng triệu dòng qua mạng chỉ để loại bỏ phần lớn trong ứng dụng.

## Dọn dẹp

```sql
DROP INDEX idx_products_category;
```
