import "dotenv/config";
import { Pool } from "pg";
import { createBackendApp } from "./createApp";

const port = Number(process.env.API_PORT ?? 4000);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to start the backend server.");
}

const pool = new Pool({
  connectionString: databaseUrl,
});

const app = createBackendApp(pool);

app.listen(port, () => {
  console.log(`Backend API listening on http://localhost:${port}`);
});
