import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

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
  
  // Enable foreign keys and WAL mode for reliability
  db.exec("PRAGMA foreign_keys = ON;");
  
  initializeSchema(db);
  seedInitialData(db);

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
}

function seedInitialData(db: DatabaseSync) {
  // Check if active policy exists
  const existingPolicy = db.prepare("SELECT id FROM policies WHERE is_active = 1 LIMIT 1").get();
  
  if (!existingPolicy) {
    const defaultPolicy = {
      version: "1.0",
      maxMonthlyBudget: 150.00,
      requireApprovalAbove: 40.00,
      maxItemPrice: 100.00,
      allowedCategories: ["electronics", "books"],
      blockedCategories: ["apparel", "weapons"],
      allowedMerchants: [],
      blockedMerchants: ["temu.com", "aliexpress.com"],
      allowDuplicatesWithinDays: 7,
      currency: "USD"
    };

    const rawRules = "Max $150/month, electronics and books only, ask me before anything over $40, hard limit $100 per item, no Temu or AliExpress.";

    db.prepare(`
      INSERT INTO policies (id, user_id, raw_rules, structured_policy, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `).run("policy_default", "demo_user", rawRules, JSON.stringify(defaultPolicy));
  }

  // Ensure current month budget ledger exists
  const now = new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const existingLedger = db.prepare("SELECT month_year FROM budget_ledger WHERE month_year = ?").get(currentMonthYear);
  if (!existingLedger) {
    db.prepare(`
      INSERT INTO budget_ledger (month_year, user_id, budget_limit, total_spent, updated_at)
      VALUES (?, ?, 150.00, 0.0, datetime('now'))
    `).run(currentMonthYear, "demo_user");
  }
}
