# Demo 3: Truy van khoang ngay tren orders.created_at

## Cau truy van

```sql
SELECT * FROM orders WHERE created_at BETWEEN '2024-06-01' AND '2024-06-07';
```

## Dieu gi xay ra khi khong co Index

PostgreSQL doc toan bo 1.000.000 dong va kiem tra xem `created_at` cua moi dong co nam trong khoang 7 ngay hay khong. Cac don hang trai dai khoang 3 nam (2022-2024), nen mot tuan chi chiem khoang 0,6% du lieu — nhung neu khong co index, PostgreSQL khong biet nhung dong do nam o dau va phai kiem tra tat ca.

## Tai sao Index giup ich

```sql
CREATE INDEX idx_orders_created_at ON orders (created_at);
```

B-tree index tren cot timestamp giu cac gia tri duoc sap xep theo thu tu thoi gian. PostgreSQL co the nhay thang den `2024-06-01` trong cay, roi di chuyen tiep qua index cho den khi vuot qua `2024-06-07`. No chi doc cac dong trong khoang hep do.

Trong ket qua EXPLAIN, ban se thay Seq Scan duoc thay the boi **Bitmap Index Scan** voi `Index Cond` hien thi ca hai gioi han cua khoang.

## Tai sao day la ung vien tot cho viec danh Index

- **Truy van khoang**: B-tree index xu ly `BETWEEN`, `>`, `<`, `>=`, `<=` hieu qua vi du lieu da duoc sap xep. PostgreSQL co the tim diem bat dau va quet tien — khong can kiem tra tung dong.
- **Khoang hep so voi pham vi rong**: 7 ngay trong ~1.095 ngay co nghia la chung ta chi truy cap duoi 1% du lieu. Khoang cang hep so voi tong pham vi thi index cang huu ich.
- **Mu hinh pho bien**: Loc theo khoang ngay la mot trong nhung thao tac thuong gap nhat trong cac ung dung thuc te — loc don hang theo ngay, tim hoat dong gan day, tao bao cao cho mot khoang thoi gian. Hau nhu luon dang de danh index cho cac cot ngay ma ban loc tren do.

## Don dep

```sql
DROP INDEX idx_orders_created_at;
```
