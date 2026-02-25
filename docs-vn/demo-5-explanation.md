# Demo 5: Composite Index (customer_id, created_at)

## Cau truy van

```sql
-- customer_id thay doi moi lan chay; 37760 duoc dung lam vi du
SELECT * FROM orders
WHERE customer_id = 37760
  AND created_at BETWEEN '2024-01-01' AND '2024-03-31';
```

## So sanh nhung gi

Demo nay chay cung mot cau truy van theo ba cach:

1. **Khong co index** — Sequential Scan toan bo 1 trieu dong.
2. **Index don cot tren `customer_id`** — Tim ~20 don hang cua khach hang nay, roi loc theo ngay trong bo nho.
3. **Composite index tren `(customer_id, created_at)`** — Tim truc tiep tu index chi nhung don hang cua khach hang nay nam trong khoang ngay.

## Cach Index don cot hoat dong

```sql
CREATE INDEX idx_orders_customer_id ON orders (customer_id);
```

PostgreSQL su dung index de nhanh chong tim tat ca ~20 don hang cua khach hang 37760. Sau do no ap dung bo loc `created_at` cho 20 dong do trong bo nho. Ban se thay dieu nay trong ket qua EXPLAIN:

```
Bitmap Heap Scan on orders
  Recheck Cond: (customer_id = 37760)
  Filter: (created_at BETWEEN ...)
  Rows Removed by Filter: 22
```

Dong `Filter` co nghia la mot so dong da vuot qua tra cuu index nhung bi loai bo sau khi kiem tra ngay. Dieu nay khong sao khi ban chi loc 20 dong — nhung hay tuong tuong mot khach hang co 10.000 don hang ma ban chi muon 5 don tu tuan truoc.

## Cach Composite Index hoat dong

```sql
CREATE INDEX idx_orders_cust_date ON orders (customer_id, created_at);
```

Composite index duoc sap xep theo cot dau tien, roi theo cot thu hai trong moi gia tri cua cot dau tien. Hay nghi ve no nhu danh ba dien thoai sap xep theo ho, roi theo ten:

```
(customer 37760, 2023-11-15)
(customer 37760, 2024-01-22)  ← bat dau tai day
(customer 37760, 2024-02-10)  ← khop
(customer 37760, 2024-05-01)  ← dung tai day
(customer 37761, 2022-03-05)
```

PostgreSQL co the nhay den `customer_id = 37760` VA bat dau tai `created_at = 2024-01-01`, roi di chuyen tiep cho den khi vuot qua `2024-03-31`. No khong bao gio doc bat ky dong nao ngoai khoang chinh xac.

Trong ket qua EXPLAIN, ban se thay mot **Index Scan** sach se trong do ca hai dieu kien deu xuat hien trong `Index Cond` (khong phai la `Filter`):

```
Index Scan using idx_orders_cust_date
  Index Cond: ((customer_id = 37760) AND (created_at BETWEEN ...))
```

Khong co `Rows Removed by Filter` — moi dong ma index tra ve deu la ket qua khop.

## Tai sao dieu nay quan trong

Voi cau truy van cu the nay co ~20 don hang moi khach hang, su khac biet giua index don cot va composite la nho. Nhung nguyen tac nay ap dung manh me hon voi du lieu lon hon:

- Mot khach hang co 50.000 don hang ma ban muon 10 don tu tuan truoc: index don cot doc 50.000 dong, composite chi doc 10.
- Composite index da to chuc du lieu san de tra loi cau hoi "don hang cua khach hang nay trong khoang thoi gian nay la gi?"

## Thu tu cot rat quan trong

Thu tu cac cot trong composite index la rat quan trong. `(customer_id, created_at)` ho tro:

- `WHERE customer_id = ?` (su dung cot dau tien)
- `WHERE customer_id = ? AND created_at BETWEEN ...` (su dung ca hai cot)

Nhung no **khong** ho tro hieu qua:

- `WHERE created_at BETWEEN ...` don le (cot dau tien khong bi rang buoc, nen index khong the thu hep pham vi tim kiem)

Hay nghi ve no nhu danh ba dien thoai: ban co the tra cuu tat ca nguoi ho "Smith" hoac "Smith, John" — nhung ban khong the de dang tim tat ca nguoi ten "John" tren tat ca cac ho.

## Don dep

```sql
DROP INDEX idx_orders_customer_id;
DROP INDEX idx_orders_cust_date;
```
