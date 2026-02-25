# Kiến thức cơ bản về Index

## Index là gì?

Hãy hình dung index trong cơ sở dữ liệu giống như phần mục lục ở cuối một cuốn sách giáo khoa. Nếu bạn muốn tìm mọi chỗ nhắc đến "PostgreSQL" trong một cuốn sách 500 trang, bạn có hai lựa chọn:

1. **Đọc từng trang một** — Bạn sẽ tìm được hết, nhưng rất chậm.
2. **Tra mục lục** — Mục lục cho bạn biết "PostgreSQL: trang 12, 47, 203" và bạn lật thẳng đến đó.

Index trong cơ sở dữ liệu hoạt động y như vậy. Nếu không có index, PostgreSQL phải đọc từng dòng một trong bảng để tìm dữ liệu bạn cần (gọi là **Sequential Scan**). Với index, nó có thể nhảy thẳng đến các dòng khớp điều kiện.

## Cách Index hoạt động (đơn giản hóa)

Khi bạn tạo index trên một cột — chẳng hạn `last_name` — PostgreSQL sẽ xây dựng một cấu trúc dữ liệu riêng biệt, đã được sắp xếp (thường là **B-tree**), ánh xạ các giá trị đến vị trí dòng tương ứng:

```
"Adams"   → row 4821
"Adams"   → row 31002
"Brown"   → row 156
"Brown"   → row 8934
"Chen"    → row 2201
...
```

B-tree là một cây cân bằng trong đó mỗi nút có thể có hàng trăm nút con. Điều này có nghĩa là PostgreSQL có thể tìm bất kỳ giá trị nào trong một bảng có cả tỷ dòng chỉ với 3 hoặc 4 "bước nhảy" xuống cây — thay vì kiểm tra từng dòng, nó thu hẹp phạm vi đến đúng vị trí gần như ngay lập tức.

> **Lưu ý:** PostgreSQL cũng hỗ trợ các loại index khác (Hash, GIN, GiST, BRIN, SP-GiST) cho các trường hợp chuyên biệt như tìm kiếm toàn văn bản hoặc dữ liệu không gian địa lý. B-tree là loại mặc định và đáp ứng phần lớn các trường hợp sử dụng, nên chúng ta sẽ tập trung vào nó ở đây.

## Khi nào Index có ích

Index hoạt động tốt nhất khi truy vấn của bạn có **tính chọn lọc cao** — nghĩa là nó chỉ trả về một phần nhỏ trong tổng số dòng:

- Tìm một khách hàng cụ thể theo tên trong 50.000 khách hàng
- Tìm 20 đơn hàng của một khách hàng trong 1.000.000 đơn hàng
- Lọc theo khoảng thời gian 7 ngày trong 3 năm dữ liệu

Càng nhiều dòng bị bỏ qua nhờ index, tốc độ cải thiện càng lớn.

## Khi nào Index không có ích

Index không phải phép màu. Chúng vô dụng — hoặc thậm chí gây hại — khi:

- **Tính chọn lọc thấp**: Nếu điều kiện lọc khớp với hơn 20% bảng (ví dụ lọc theo `status` khi chỉ có 5 giá trị), PostgreSQL biết rằng đọc tuần tự toàn bộ bảng sẽ nhanh hơn việc nhảy qua nhảy lại giữa index và các trang dữ liệu.
- **Bảng nhỏ**: Nếu bảng chỉ có 500 dòng, nó nằm gọn trong vài trang đĩa. Đọc hết vốn đã nhanh rồi — index không mang lại lợi ích đáng kể.
- **Bạn cần tất cả các dòng**: Các truy vấn như `COUNT(*) GROUP BY status` phải duyệt qua mọi dòng. Index không thể bỏ qua bất cứ thứ gì.


## Chi phí của Index

Index không miễn phí:
- Chúng chiếm dung lượng đĩa (một bản sao riêng của dữ liệu cột được đánh index, đã sắp xếp).
- Mỗi lệnh `INSERT`, `UPDATE`, hoặc `DELETE` cũng phải cập nhật tất cả các index liên quan, làm chậm thao tác ghi.
- Chúng làm tăng **chi phí VACUUM**. Tiến trình VACUUM của PostgreSQL (một bộ dọn dẹp chạy nền, thu hồi dung lượng từ các dòng đã xóa/cập nhật) phải dọn dẹp các mục chết trong mọi index trên bảng. Nhiều index hơn đồng nghĩa với VACUUM mất nhiều thời gian hơn, và nếu VACUUM không theo kịp, bạn có thể bị phình index.
- Một index không được sử dụng là chi phí thuần túy — tốn tài nguyên ghi, lưu trữ, và thời gian VACUUM mà không mang lại lợi ích đọc nào.

Đây là lý do bạn không nên đánh index mọi thứ. Chỉ đánh index các cột mà bạn thực sự lọc, join, hoặc sắp xếp trong các truy vấn quan trọng về hiệu suất.

---

# Cách đọc EXPLAIN ANALYZE

`EXPLAIN ANALYZE` là cách PostgreSQL cho bạn thấy chính xác nó đã thực thi một truy vấn như thế nào — chiến lược nào được chọn và mỗi bước mất bao lâu. Đây là một trong những công cụ hữu ích nhất để hiểu hiệu suất truy vấn.

## Cách chạy

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;
```

Phần `EXPLAIN` hiển thị kế hoạch thực thi. Phần `ANALYZE` thực sự chạy truy vấn và bổ sung các con số thời gian thực.

## Đọc kết quả đầu ra

Đây là một kết quả đầu ra điển hình:

```
Seq Scan on orders  (cost=0.00..20457.00 rows=21 width=31) (actual time=0.03..85.12 rows=24 loops=1)
  Filter: (customer_id = 42)
  Rows Removed by Filter: 999976
Planning Time: 0.05 ms
Execution Time: 85.15 ms
```

Hãy phân tích từng phần:

### Loại Scan

Các từ đầu tiên cho bạn biết PostgreSQL truy cập dữ liệu *bằng cách nào*:

| Loại Scan | Ý nghĩa | Khi nào xuất hiện |
|-----------|----------|-------------------|
| **Seq Scan** | Đọc từng dòng trong bảng, lần lượt từng dòng | Không có index phù hợp, hoặc truy vấn không đủ chọn lọc để index có ích |
| **Index Scan** | Tra cứu dòng qua index, sau đó lấy dữ liệu đầy đủ của dòng | Truy vấn có tính chọn lọc cao với index phù hợp |
| **Bitmap Index Scan** + **Bitmap Heap Scan** | Quét index trước để xây dựng "bản đồ" các dòng khớp, sau đó đọc chúng theo lô | Quá nhiều dòng cho Index Scan (mỗi dòng là một lần nhảy I/O ngẫu nhiên) nhưng đủ ít để đọc toàn bộ bảng là lãng phí. Khoảng: vài trăm đến vài nghìn dòng từ một bảng lớn. |
| **Index Only Scan** | Trả lời truy vấn hoàn toàn từ index mà không cần truy cập bảng | Index chứa tất cả các cột mà truy vấn cần. **Lưu ý:** Nếu bảng có nhiều thao tác ghi gần đây và VACUUM chưa chạy, PostgreSQL có thể vẫn cần kiểm tra bảng để xác minh khả năng hiển thị dòng — hãy chú ý số lượng `Heap Fetches` cao, nghĩa là nó đang quay lại truy cập bảng. |

### Ước tính chi phí

```
(cost=0.00..20457.00 rows=21 width=31)
```

- `cost=0.00..20457.00` — Chi phí *ước tính* của PostgreSQL để bắt đầu trả kết quả (`0.00`) và tổng chi phí (`20457.00`). Đây không phải mili-giây — chúng là đơn vị nội bộ được tính từ mô hình chi phí của PostgreSQL (dựa trên các tham số như `seq_page_cost` và `random_page_cost`). Hữu ích khi so sánh các kế hoạch với nhau, không phải để đo thời gian tuyệt đối.
- `rows=21` — Số dòng PostgreSQL *ước tính* sẽ tìm thấy.
- `width=31` — Kích thước trung bình của dòng tính bằng byte.

### Thời gian thực tế

```
(actual time=0.03..85.12 rows=24 loops=1)
```

- `actual time=0.03..85.12` — Mili-giây thực tế. Thời gian để trả dòng đầu tiên (`0.03`) và tất cả các dòng (`85.12`).
- `rows=24` — Số dòng *thực sự* tìm được (so sánh với ước tính ở trên).
- `loops=1` — Số lần bước này được thực thi. Trong các Nested Loop hoặc truy vấn song song, con số này có thể lớn hơn 1.

### Dòng Filter

```
Filter: (customer_id = 42)
Rows Removed by Filter: 999976
```

Điều này cho bạn biết PostgreSQL đã đọc các dòng rồi loại bỏ những dòng không khớp. Số `Rows Removed by Filter` cao trên một Seq Scan là tín hiệu rõ ràng rằng cần thêm index — nó có nghĩa là PostgreSQL đã kiểm tra gần một triệu dòng chỉ để tìm 24 dòng.

### Kế hoạch lồng nhau

Kế hoạch được hiển thị dưới dạng cây. Các dòng thụt vào là các thao tác con:

```
Nested Loop  (cost=4.59..516.91 rows=63 width=24) (actual time=0.04..1.27 rows=68 loops=1)
  ->  Bitmap Heap Scan on orders  (cost=4.59..85.61 rows=21 width=10) (actual time=0.03..0.21 rows=24 loops=1)
        Recheck Cond: (customer_id = 37760)
        ->  Bitmap Index Scan on idx_orders_customer_id  ...
  ->  Index Scan using idx_order_items_order_id on order_items  (cost=0.43..20.50 rows=4 width=18) (actual time=0.03..0.04 rows=3 loops=24)
```

Đọc từ dưới lên: các thao tác trong cùng được thực hiện trước. Ở đây, PostgreSQL:
1. Sử dụng index để tìm các order ID khớp điều kiện
2. Lấy các dòng order tương ứng
3. Với mỗi order, sử dụng một index khác để tìm các order_items của nó
4. Kết hợp chúng lại bằng Nested Loop



## Tại sao thời gian truy vấn đơn lẻ có thể gây hiểu lầm

Một truy vấn mất 15ms trông ổn khi chạy một mình. Nhưng trong môi trường production, có hai yếu tố khiến nó tệ hơn nhiều:

### Độ trễ mạng

Các demo này chạy cục bộ — ứng dụng và cơ sở dữ liệu nằm trên cùng một máy, nên gần như không có độ trễ mạng. Trong production, cơ sở dữ liệu thường nằm trên một server riêng. Mỗi truy vấn thêm một **vòng lặp mạng** từ 1–5ms (cùng data center) hoặc 20–50ms+ (khác vùng).

Với 5ms chi phí mạng cộng thêm cho mỗi truy vấn:

- **Truy vấn có index**: 0.02ms DB + 5ms mạng = **~5ms tổng**
- **Truy vấn không có index**: 15ms DB + 5ms mạng = **~20ms tổng**

Chênh lệch tổng thời gian trông nhỏ (4 lần). Nhưng cơ sở dữ liệu đang làm việc **gấp 750 lần** cho truy vấn không có index — và khối lượng công việc đó tích lũy nhanh khi nhiều request đến cùng lúc.

### Chi phí tích lũy dưới tải

Cơ sở dữ liệu không phục vụ từng request một. Nếu 100 request đến cùng một endpoint:

- **Không có index**: 15ms × 100 = **1,5 giây** thời gian cơ sở dữ liệu
- **Có index**: 0.02ms × 100 = **2 mili-giây**

Mỗi truy vấn chậm cũng giữ kết nối cơ sở dữ liệu lâu hơn. Hầu hết ứng dụng sử dụng connection pool từ 10–20 kết nối — khi những kết nối này bị chiếm bởi các truy vấn chậm, các request mới phải xếp hàng và người dùng sẽ gặp timeout. Truy vấn có index giải phóng kết nối gần như ngay lập tức, giữ cho pool luôn sẵn sàng.

Các demo minh họa điều này trực tiếp — sau mỗi EXPLAIN ANALYZE, bạn sẽ thấy phần "If 100 requests hit this endpoint" hiển thị thời gian tích lũy thực tế. Demo 4 (truy vấn JOIN) là ấn tượng nhất: ~7 giây không có index so với ~40ms có index.

Một index bị thiếu là vô hình trong quá trình phát triển nhưng làm suy giảm toàn bộ ứng dụng dưới lưu lượng production.

## Tra cứu nhanh

| Bạn thấy gì | Ý nghĩa | Nên làm gì |
|-------------|----------|-------------|
| `Seq Scan` + `Rows Removed by Filter` cao | Quét toàn bộ bảng, loại bỏ hầu hết các dòng | Thêm index trên cột được lọc |
| `Seq Scan` trên bảng nhỏ | Quét toàn bộ, nhưng bảng rất nhỏ | Không cần làm gì — vốn đã nhanh |
| `Seq Scan` + bộ lọc tính chọn lọc thấp | Quét toàn bộ, nhưng phần lớn dòng đều khớp | Không cần làm gì — index cũng không giúp ích |
| `Index Scan` hoặc `Bitmap Heap Scan` | Đang sử dụng index hiệu quả | Không cần hành động |
| `rows` ước tính khác xa `rows` thực tế | Thống kê đã cũ | Chạy `ANALYZE tablename` |
| `Nested Loop` với `Seq Scan` trên bảng bên trong | Quét toàn bộ bảng lặp lại bên trong một join | Thêm index trên cột join |
