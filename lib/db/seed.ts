import { DatabaseSync } from "node:sqlite";
import { getDb } from "./index";

export function seedDemoData(db?: DatabaseSync) {
  const database = db || getDb();

  const now = new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // 1. Seed Active Default Policy
  const existingPolicy = database.prepare("SELECT id FROM policies WHERE is_active = 1 LIMIT 1").get();
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
      currency: "USD",
    };

    const rawRules = "Max $150/month, electronics and books only, ask me before anything over $40, hard limit $100 per item, no Temu or AliExpress.";

    database.prepare(`
      INSERT INTO policies (id, user_id, raw_rules, structured_policy, is_active, created_at, updated_at)
      VALUES (?, 'demo_user', ?, ?, 1, datetime('now', '-3 days'), datetime('now', '-3 days'))
    `).run("policy_default", rawRules, JSON.stringify(defaultPolicy));
  }

  // 2. Seed Budget Ledger
  const existingLedger = database.prepare("SELECT month_year FROM budget_ledger WHERE month_year = ?").get(currentMonthYear);
  if (!existingLedger) {
    database.prepare(`
      INSERT INTO budget_ledger (month_year, user_id, budget_limit, total_spent, updated_at)
      VALUES (?, 'demo_user', 150.00, 18.99, datetime('now'))
    `).run(currentMonthYear);
  }

  // 3. Seed Sample Orders if empty
  const orderCount = (database.prepare("SELECT COUNT(*) as count FROM orders").get() as any)?.count || 0;
  if (orderCount === 0) {
    // Sample Past Captured Order (Within Budget)
    database.prepare(`
      INSERT INTO orders (
        id, user_id, paypal_order_id, paypal_capture_id, product_id, product_title,
        product_price, currency, category, merchant, product_url, product_image_url,
        decision, decision_reason, rule_fired, status, created_at, captured_at
      ) VALUES (
        'ord_demo_captured_1',
        'demo_user',
        '5O190127TN364715T',
        '2XX00000000000001',
        'prod_cable_usbc',
        'Braided High-Speed USB-C to USB-C Fast Charging Cable (6ft)',
        18.99,
        'USD',
        'electronics',
        'hardwarecentral.shop',
        'https://hardwarecentral.shop/products/usbc-cable-6ft',
        NULL,
        'AUTO_APPROVE',
        'Price ($18.99) is within auto-approval threshold ($40.00) and monthly budget ($150.00).',
        'RULE_AUTO_APPROVE_CRITERIA_MET',
        'CAPTURED',
        datetime('now', '-3 days'),
        datetime('now', '-3 days')
      )
    `).run();

    // Sample Pending Approval Order (Escalated > $40)
    database.prepare(`
      INSERT INTO orders (
        id, user_id, paypal_order_id, paypal_capture_id, product_id, product_title,
        product_price, currency, category, merchant, product_url, product_image_url,
        decision, decision_reason, rule_fired, status, created_at
      ) VALUES (
        'ord_demo_pending_2',
        'demo_user',
        NULL,
        NULL,
        'prod_seed_sample_kb',
        'Tenkeyless Compact Wired Mechanical Keyboard (RGB, Blue Switches)',
        64.99,
        'USD',
        'electronics',
        'keyboardforge.io',
        'https://keyboardforge.io/products/tkl-mechanical-kb',
        NULL,
        'NEEDS_APPROVAL',
        'Price ($64.99) exceeds auto-approval threshold of $40.00. Human confirmation required.',
        'RULE_THRESHOLD_EXCEEDED',
        'PENDING_APPROVAL',
        datetime('now', '-2 hours')
      )
    `).run();
  }

  // 4. Seed Audit Logs if empty
  const logCount = (database.prepare("SELECT COUNT(*) as count FROM audit_logs").get() as any)?.count || 0;
  if (logCount === 0) {
    database.prepare(`
      INSERT INTO audit_logs (id, order_id, event_type, severity, summary, payload, created_at)
      VALUES 
      ('log_init_1', NULL, 'POLICY_CONFIRMED', 'INFO', 'Activated initial spending policy: Max $150/mo, ask > $40', '{"maxMonthlyBudget":150,"requireApprovalAbove":40,"maxItemPrice":100}', datetime('now', '-3 days')),
      ('log_init_2', 'ord_demo_captured_1', 'PAYPAL_ORDER_CAPTURED', 'INFO', 'Captured $18.99 for Braided USB-C Cable (Capture ID: 2XX00000000000001)', '{"orderId":"ord_demo_captured_1","amount":18.99,"captureId":"2XX00000000000001"}', datetime('now', '-3 days')),
      ('log_init_3', 'ord_demo_pending_2', 'ORDER_ESCALATED', 'INFO', 'Purchase of Mechanical Keyboard ($64.99) escalated to human review: exceeds $40 limit', '{"orderId":"ord_demo_pending_2","amount":64.99,"rule":"RULE_THRESHOLD_EXCEEDED"}', datetime('now', '-2 hours'))
    `).run();
  }

  console.log("[SpendGuard DB] Seed complete: policy, ledger, sample orders, and audit trail initialized.");
}

// Allow direct execution: npx tsx lib/db/seed.ts
if (process.argv[1]?.includes("seed.ts")) {
  seedDemoData();
}
