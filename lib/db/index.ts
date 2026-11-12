import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { seedDemoData } from "./seed";

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = process.env.DATABASE_PATH || "./data/spendguard.db";
  const resolvedPath = path.resolve(process.cwd(), dbPath);
  const dir = path.dirname(resolvedPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(resolvedPath);
  db.exec("PRAGMA busy_timeout = 10000;");
  try {
    db.exec("PRAGMA journal_mode = WAL;");
  } catch {
    // If journal_mode transition is locked, continue with existing journal mode
  }
  db.exec("PRAGMA foreign_keys = ON;");
  
  initializeSchema(db);
  seedDemoData(db);

  dbInstance = db;
  return dbInstance;
}

function initializeSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS policies (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'demo_user',
      raw_rules TEXT NOT NULL,
      structured_policy TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT,
      user_id TEXT NOT NULL DEFAULT 'demo_user',
      paypal_order_id TEXT,
      paypal_capture_id TEXT,
      product_id TEXT NOT NULL,
      product_title TEXT NOT NULL,
      product_price REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      category TEXT NOT NULL,
      merchant TEXT NOT NULL,
      product_url TEXT NOT NULL,
      product_image_url TEXT,
      decision TEXT NOT NULL,
      decision_reason TEXT NOT NULL,
      rule_fired TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      captured_at TEXT,
      refunded_at TEXT
    );

    CREATE TABLE IF NOT EXISTS budget_ledger (
      month_year TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'demo_user',
      budget_limit REAL NOT NULL,
      total_spent REAL NOT NULL DEFAULT 0.0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'INFO',
      summary TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  try {
    db.exec("ALTER TABLE orders ADD COLUMN idempotency_key TEXT;");
  } catch {
    // Column already exists
  }

  try {
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;");
  } catch {
    // Index already exists
  }
}
