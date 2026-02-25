# Demo 1: Tra cuu theo last_name (50k dong)

## Cau truy van

```sql
SELECT * FROM customers WHERE last_name = 'Swallows';
```

## Dieu gi xay ra khi khong co Index

PostgreSQL khong co cach nao tim cac dong co `last_name = 'Swallows'` ma khong doc tung dong mot trong bang `customers`. No thuc hien **Sequential Scan** — kiem tra tat ca 50.000 dong mot cach tuan tu va loai bo nhung dong khong khop.

Dieu nay giong nhu tim mot cai ten trong danh ba dien thoai chua duoc sap xep bang cach doc tung muc mot.

## Tai sao Index giup ich

Khi chung ta tao index tren `last_name`:

```sql
CREATE INDEX idx_customers_last_name ON customers (last_name);
```

PostgreSQL xay dung mot B-tree da sap xep chua tat ca cac gia tri last name. Bay gio khi ban tim kiem `'Swallows'`, no co the tra cuu gia tri trong cay va truy cap truc tiep den cac dong khop — ma khong can doc ~49.994 dong con lai.

Trong ket qua EXPLAIN, ban se thay Seq Scan duoc thay the boi **Bitmap Index Scan** (tra cuu cac muc khop trong index) tiep theo la **Bitmap Heap Scan** (lay cac dong thuc te).

## Tai sao day la ung vien tot cho viec danh Index

- **Do chon loc cao**: Mot ho cu the trong hang nghin gia tri khac nhau. Chi mot phan rat nho cac dong khop.
- **Bang co kich thuoc trung binh**: 50.000 dong la du de viec quet toan bo bang cham hon dang ke so voi tra cuu bang index.
- **Dieu kien bang**: `= 'Swallows'` la loai tra cuu index don gian va hieu qua nhat.

## Don dep

```sql
DROP INDEX idx_customers_last_name;
```
