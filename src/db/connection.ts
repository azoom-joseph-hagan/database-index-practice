import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

const pool = new pg.Pool({
  connectionString: "postgresql://postgres:postgres@localhost:5499/index_practice",
});

export const db = drizzle(pool, { schema });
export { pool };
