import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  var __prisma: PrismaClient | undefined;
  var __pgPool: Pool | undefined;
}

const pool =
  globalThis.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") globalThis.__pgPool = pool;

const adapter = new PrismaPg(pool);

export const prisma = globalThis.__prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalThis.__prisma = prisma;

