import { getDb } from "./index";
import { Policy, EvaluationResult } from "../policy/types";

export interface OrderRecord {
  id: string;
  user_id: string;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  product_id: string;
  product_title: string;
  product_price: number;
  currency: string;
  category: string;
  merchant: string;
  product_url: string;
  product_image_url: string | null;
  decision: "AUTO_APPROVE" | "NEEDS_APPROVAL" | "BLOCKED";
  decision_reason: string;
  rule_fired: string | null;
  status: "PROPOSED" | "PENDING_APPROVAL" | "APPROVED" | "CREATED" | "CAPTURED" | "REFUNDED" | "REJECTED";
  created_at: string;
  captured_at: string | null;
  refunded_at: string | null;
}

export interface BudgetLedgerRecord {
  month_year: string;
  user_id: string;
  budget_limit: number;
  total_spent: number;
  updated_at: string;
}

export interface AuditLogRecord {
  id: string;
  order_id: string | null;
  event_type: string;
  severity: "INFO" | "WARN" | "ERROR";
  summary: string;
  payload: string;
  created_at: string;
}

export function getActivePolicy(): { id: string; raw_rules: string; policy: Policy } | null {
  const db = getDb();
  const row = db.prepare("SELECT id, raw_rules, structured_policy FROM policies WHERE is_active = 1 LIMIT 1").get() as any;
  if (!row) return null;

  return {
    id: row.id,
    raw_rules: row.raw_rules,
    policy: JSON.parse(row.structured_policy) as Policy,
  };
}

export function getCurrentBudgetLedger(): BudgetLedgerRecord {
  const db = getDb();
  const now = new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let row = db.prepare("SELECT * FROM budget_ledger WHERE month_year = ?").get(currentMonthYear) as any;
  if (!row) {
    const activePolicy = getActivePolicy();
    const limit = activePolicy?.policy.maxMonthlyBudget || 150.00;
    db.prepare(`
      INSERT INTO budget_ledger (month_year, user_id, budget_limit, total_spent, updated_at)
      VALUES (?, 'demo_user', ?, 0.0, datetime('now'))
    `).run(currentMonthYear, limit);
    row = db.prepare("SELECT * FROM budget_ledger WHERE month_year = ?").get(currentMonthYear) as any;
  }

  return {
    month_year: row.month_year,
    user_id: row.user_id,
    budget_limit: Number(row.budget_limit),
    total_spent: Number(row.total_spent),
    updated_at: row.updated_at,
  };
}

export function updateBudgetSpend(amountToAdd: number): void {
  const db = getDb();
  const now = new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  getCurrentBudgetLedger(); // Ensure row exists
  db.prepare(`
    UPDATE budget_ledger
    SET total_spent = total_spent + ?, updated_at = datetime('now')
    WHERE month_year = ?
  `).run(amountToAdd, currentMonthYear);
}

export function getRecentOrders(days: number = 30): OrderRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM orders 
    WHERE created_at >= datetime('now', '-' || ? || ' days')
    ORDER BY created_at DESC
  `).all(days) as any[];

  return rows.map((r) => ({
    ...r,
    product_price: Number(r.product_price),
  }));
}

export function insertOrder(order: Omit<OrderRecord, "created_at" | "captured_at" | "refunded_at">): OrderRecord {
  const db = getDb();
  db.prepare(`
    INSERT INTO orders (
      id, user_id, paypal_order_id, paypal_capture_id, product_id, product_title,
      product_price, currency, category, merchant, product_url, product_image_url,
      decision, decision_reason, rule_fired, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    order.id,
    order.user_id,
    order.paypal_order_id,
    order.paypal_capture_id,
    order.product_id,
    order.product_title,
    order.product_price,
    order.currency,
    order.category,
    order.merchant,
    order.product_url,
    order.product_image_url,
    order.decision,
    order.decision_reason,
    order.rule_fired,
    order.status
  );

  return db.prepare("SELECT * FROM orders WHERE id = ?").get(order.id) as any;
}

export function updateOrder(id: string, updates: Partial<OrderRecord>): void {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (fields.length === 0) return;

  values.push(id);
  db.prepare(`UPDATE orders SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

export function getOrderById(id: string): OrderRecord | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as any;
  if (!row) return null;
  return { ...row, product_price: Number(row.product_price) };
}

export function getOrderByPayPalOrderId(paypalOrderId: string): OrderRecord | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM orders WHERE paypal_order_id = ?").get(paypalOrderId) as any;
  if (!row) return null;
  return { ...row, product_price: Number(row.product_price) };
}

export function logAuditEvent(
  eventType: string,
  summary: string,
  payload: Record<string, any>,
  severity: "INFO" | "WARN" | "ERROR" = "INFO",
  orderId: string | null = null
): void {
  const db = getDb();
  const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Mask sensitive values if any leak into payload
  const safePayload = JSON.stringify(payload, (key, value) => {
    if (typeof key === "string" && /secret|token|password|auth|authorization/i.test(key)) {
      return "[REDACTED]";
    }
    return value;
  });

  db.prepare(`
    INSERT INTO audit_logs (id, order_id, event_type, severity, summary, payload, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(id, orderId, eventType, severity, summary, safePayload);
}

export function getAuditLogs(limit: number = 50): AuditLogRecord[] {
  const db = getDb();
  return db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?").all(limit) as any[];
}
