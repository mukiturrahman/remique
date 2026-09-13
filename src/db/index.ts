import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
}

const globalForDb = globalThis as unknown as {
    postgresClient?: ReturnType<typeof postgres>;
};

const client =
    globalForDb.postgresClient ??
    postgres(connectionString, {
        prepare: false,
        max: 5,
        connect_timeout: 10,
        idle_timeout: 20,
    });

if (process.env.NODE_ENV !== "production") {
    globalForDb.postgresClient = client;
}

export const db = drizzle(client, { schema });
