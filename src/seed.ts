import { seed } from "drizzle-seed";
import { db, pool } from "./db/connection.js";
import * as schema from "./db/schema.js";

async function main() {
  console.log("Resetting existing data...");
  await pool.query("TRUNCATE order_items, orders, products, customers RESTART IDENTITY CASCADE");

  console.log("Seeding customers (50,000) and products (500)...");
  console.log("This will also generate ~1M orders and ~3M order_items.");
  console.log("This may take a few minutes...\n");

  const statuses = ["pending", "processing", "shipped", "delivered", "cancelled"];

  const categories = [
    "Electronics",
    "Books",
    "Clothing",
    "Home & Garden",
    "Sports",
    "Toys",
    "Food",
    "Health",
    "Automotive",
    "Music",
  ];

  await seed(db, schema, { seed: 42 }).refine((f) => ({
    customers: {
      count: 50_000,
      columns: {
        firstName: f.firstName(),
        lastName: f.lastName(),
        email: f.email(),
        city: f.city(),
        country: f.valuesFromArray({
          values: [
            "United States",
            "United Kingdom",
            "Canada",
            "Germany",
            "France",
            "Australia",
            "Japan",
            "Brazil",
            "India",
            "Mexico",
          ],
        }),
      },
    },
    products: {
      count: 500,
      columns: {
        name: f.companyName(),
        category: f.valuesFromArray({ values: categories }),
        price: f.number({ minValue: 5, maxValue: 500, precision: 100 }),
      },
    },
    orders: {
      count: 1_000_000,
      columns: {
        status: f.valuesFromArray({ values: statuses }),
        totalAmount: f.number({ minValue: 10, maxValue: 2000, precision: 100 }),
        createdAt: f.date({
          minDate: "2022-01-01",
          maxDate: "2024-12-31",
        }),
      },
    },
    orderItems: {
      count: 3_000_000,
      columns: {
        quantity: f.int({ minValue: 1, maxValue: 10 }),
        unitPrice: f.number({ minValue: 5, maxValue: 500, precision: 100 }),
      },
    },
  }));

  // Print row counts
  const counts = await Promise.all([
    pool.query("SELECT COUNT(*) FROM customers"),
    pool.query("SELECT COUNT(*) FROM products"),
    pool.query("SELECT COUNT(*) FROM orders"),
    pool.query("SELECT COUNT(*) FROM order_items"),
  ]);

  console.log("\nSeeding complete!");
  console.log(`  customers:   ${Number(counts[0].rows[0].count).toLocaleString()}`);
  console.log(`  products:    ${Number(counts[1].rows[0].count).toLocaleString()}`);
  console.log(`  orders:      ${Number(counts[2].rows[0].count).toLocaleString()}`);
  console.log(`  order_items: ${Number(counts[3].rows[0].count).toLocaleString()}`);

  await pool.end();
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
