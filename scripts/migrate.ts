import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";

import { connect } from "./db-connect";

const { db, sqlite, file } = connect();

migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
sqlite.close();

console.log(`Migrationen angewendet auf ${file}`);
