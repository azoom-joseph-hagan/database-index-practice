# Demo 4: JOIN orders + order_items cho mot Khach hang

## Cau truy van

```sql
-- customer_id thay doi moi lan chay; 37760 duoc dung lam vi du
SELECT o.id, o.total_amount, oi.product_id, oi.quantity, oi.unit_price
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.customer_id = 37760;
```

## Dieu gi xay ra khi khong co Index

Khong co index, cau truy van nay rat ton kem. PostgreSQL phai:

1. Quet toan bo 1 trieu don hang de tim ~20 don hang cua khach hang nay.
2. Voi moi don hang trong 20 don do, tim cac `order_items` khop — nhung khong co index tren `order_id`, no phai quet toan bo 3 trieu order_items.

Trong thuc te, PostgreSQL toi uu hoa dieu nay — no khong thuc hien 20 lan quet toan bo rieng le. No thuong su dung **Hash Join** — quet bang orders de tim cac dong khop, xay dung bang bam, roi quet order_items va do tim trong bang bam. Nhung no van dang doc hang trieu dong tu ca hai bang.

## Tai sao cac Index giup ich

```sql
CREATE INDEX idx_orders_customer_id ON orders (customer_id);
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
```

Voi ca hai index, ke hoach thuc thi thay doi hoan toan:

1. Su dung index `customer_id` de tim ~20 don hang cua khach hang nay (thay vi quet 1 trieu dong).
2. Voi moi don hang trong 20 don do, su dung index `order_id` de tim ~3 order_items moi don (thay vi quet 3 trieu dong).

Dieu nay tro thanh **Nested Loop** voi **Index Scans** — ke hoach ly tuong cho loai join co do chon loc cao nhu the nay. PostgreSQL doc ~20 don hang + ~60 order_items thay vi tong cong 4 trieu dong.

Day la ly do demo nay thuong cho thay muc tang toc lon nhat (thuong tu 50-100 lan tro len).

## Tai sao day la ung vien tot cho viec danh Index

- **Cac cot join**: Bat ky cot nao duoc su dung trong dieu kien `JOIN ... ON` deu la ung vien manh cho viec danh index. Neu khong co, PostgreSQL co the phai quet toan bo bang cho moi lan do tim.
- **Do chon loc ket hop**: Menh de `WHERE` thu hep orders xuong ~20 dong, va phep join tiep tuc thu hep order_items xuong ~60 dong. Index cho phep PostgreSQL tan dung do chon loc nay o moi buoc.
- **Hai index phoi hop**: Demo nay cho thay cach cac index ket hop voi nhau. Mot index don le se giup ich, nhung ca hai cung nhau bien mot thao tac tren hang trieu dong thanh mot tra cuu duoi mili giay.

## Don dep

```sql
DROP INDEX idx_orders_customer_id;
DROP INDEX idx_order_items_order_id;
```
