# Demo 2: Don hang theo customer_id (1 trieu dong)

## Cau truy van

```sql
-- customer_id thay doi moi lan chay; 37760 duoc dung lam vi du
SELECT * FROM orders WHERE customer_id = 37760;
```

## Dieu gi xay ra khi khong co Index

PostgreSQL phai quet toan bo 1.000.000 dong trong bang `orders` de tim ~20 dong thuoc ve khach hang nay. Ngay ca voi cac worker song song ho tro, no van dang doc va loai bo gan mot trieu dong.

Trong ket qua EXPLAIN, ban se thay dang nhu:

```
Parallel Seq Scan on orders
  Filter: (customer_id = 37760)
  Rows Removed by Filter: 333325   ← moi worker, tong cong ~1 trieu
```

## Tai sao Index giup ich

```sql
CREATE INDEX idx_orders_customer_id ON orders (customer_id);
```

Day la truong hop su dung index cho khoa ngoai rat pho bien. Cot `customer_id` tro nguoc ve bang `customers`, va ban thuong xuyen can hoi "cho toi tat ca don hang cua khach hang X."

Voi index, PostgreSQL tra cuu `customer_id = 37760` trong B-tree, tim ~20 vi tri dong khop, va chi lay nhung dong do. No chuyen tu viec quet 1 trieu dong xuong con doc khoang 20 dong.

## Tai sao day la ung vien tot cho viec danh Index

- **Do chon loc cuc cao**: 20 dong trong 1.000.000 — chi 0,002% cua bang.
- **Bang lon**: Voi 1 trieu dong, su khac biet giua quet toan bo bang va tra cuu co muc tieu la rat lon.
- **Mu hinh khoa ngoai**: Day la mot trong nhung ly do pho bien nhat de them index. PostgreSQL *khong* tu dong tao index tren cac cot khoa ngoai (khong giong khoa chinh). Neu ban dinh nghia rang buoc FK ma khong them index, moi lan tra cuu theo cot FK do se la quet toan bo bang.

Day thuong la index quan trong nhat ma ban co the them vao co so du lieu — va cung la mot trong nhung index hay bi quen nhat.

## Don dep

```sql
DROP INDEX idx_orders_customer_id;
```
