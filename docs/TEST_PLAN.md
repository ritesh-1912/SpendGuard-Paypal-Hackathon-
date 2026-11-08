# SpendGuard Test Plan & Judge Demo Walkthrough

> **Source Documents:** [`docs/PROJECT_BRIEF.md`](file:///Users/riteshgarg/Downloads/Paypal%20Hackathon/docs/PROJECT_BRIEF.md) | [`docs/ARCHITECTURE.md`](file:///Users/riteshgarg/Downloads/Paypal%20Hackathon/docs/ARCHITECTURE.md)  
> **Target:** 100% Deterministic Policy Engine Coverage & Seamless 5-Minute Judge Demo.

---

## Part 1: Deterministic Policy Engine Unit Test Cases

The test suite runs with **Vitest / Jest** without any network dependencies. All tests validate the pure function `evaluatePurchaseProposal()` in [`lib/policy/engine.ts`](file:///Users/riteshgarg/Downloads/Paypal%20Hackathon/lib/policy/engine.ts).

### Standard Reference Policy for Tests
```json
{
  "version": "1.0",
  "maxMonthlyBudget": 150.00,
  "requireApprovalAbove": 40.00,
  "maxItemPrice": 100.00,
  "allowedCategories": ["electronics", "books"],
  "blockedCategories": ["apparel", "weapons"],
  "allowedMerchants": ["amazon.com", "bestbuy.com", "target.com"],
  "blockedMerchants": ["temu.com", "aliexpress.com"],
  "allowDuplicatesWithinDays": 7,
  "currency": "USD"
}
```

---

### Test Matrix

| ID | Test Case Name | Input Item | Context (Spent / Recent) | Expected Decision | Expected `ruleFired` | Assertion Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Standard Auto-Approve | $25.00 USB Cable, Electronics, `amazon.com`, USD | Spent: $0.00, No recent orders | `AUTO_APPROVE` | `RULE_AUTO_APPROVE_CRITERIA_MET` | Price $\le$ $40, category allowed, budget healthy. |
| **TC-02** | Exceeds Approval Threshold | $55.00 Mechanical Keyboard, Electronics, `amazon.com`, USD | Spent: $20.00, No recent orders | `NEEDS_APPROVAL` | `RULE_THRESHOLD_EXCEEDED` | Price > $40 threshold, but $\le$ $100 max item ceiling and within $150 budget. |
| **TC-03** | Exceeds Hard Max Item Ceiling | $120.00 Noise Cancelling Headphones, Electronics, `amazon.com`, USD | Spent: $0.00, No recent orders | `BLOCKED` | `RULE_MAX_ITEM_PRICE_EXCEEDED` | Price > $100 `maxItemPrice`. Blocked even with $150 available budget. |
| **TC-04** | Monthly Budget Overflow | $35.00 Web Camera, Electronics, `bestbuy.com`, USD | Spent: $130.00, No recent orders | `BLOCKED` | `RULE_MONTHLY_BUDGET_EXCEEDED` | Spent ($130) + Item ($35) = $165 > $150 `maxMonthlyBudget`. Blocked. |
| **TC-05** | Exact Budget Boundary Match | $30.00 Ethernet Adapter, Electronics, `amazon.com`, USD | Spent: $120.00, No recent orders | `AUTO_APPROVE` | `RULE_AUTO_APPROVE_CRITERIA_MET` | Spent ($120) + Item ($30) = exactly $150.00. Exactly at budget limit must pass. |
| **TC-06** | Budget Boundary + $0.01 Overflow | $30.01 Ethernet Adapter, Electronics, `amazon.com`, USD | Spent: $120.00, No recent orders | `BLOCKED` | `RULE_MONTHLY_BUDGET_EXCEEDED` | Spent ($120) + Item ($30.01) = $150.01 > $150.00. $0.01 overflow must be blocked. |
| **TC-07** | Exact Threshold Boundary Match | $40.00 Bluetooth Mouse, Electronics, `target.com`, USD | Spent: $10.00, No recent orders | `AUTO_APPROVE` | `RULE_AUTO_APPROVE_CRITERIA_MET` | Price is exactly $40.00. Rule specifies *above* $40, so exactly $40 auto-approves. |
| **TC-08** | Threshold Boundary + $0.01 Escalation | $40.01 Bluetooth Mouse, Electronics, `target.com`, USD | Spent: $10.00, No recent orders | `NEEDS_APPROVAL` | `RULE_THRESHOLD_EXCEEDED` | Price ($40.01) > $40.00. Triggers human review escalation. |
| **TC-09** | Disallowed Category (Not in Whitelist) | $35.00 Coffee Beans, `groceries`, `amazon.com`, USD | Spent: $0.00, No recent orders | `BLOCKED` | `RULE_CATEGORY_NOT_ALLOWED` | `groceries` is not in `["electronics", "books"]`. |
| **TC-10** | Explicit Blacklisted Category | $30.00 Cotton T-Shirt, `apparel`, `target.com`, USD | Spent: $0.00, No recent orders | `BLOCKED` | `RULE_CATEGORY_BLOCKED` | `apparel` is explicitly blacklisted. |
| **TC-11** | Currency Mismatch | €35.00 Hardcover Novel, Books, `amazon.com`, EUR | Spent: $0.00, No recent orders | `BLOCKED` | `RULE_CURRENCY_MISMATCH` | EUR currency rejected when policy requires USD. |
| **TC-12** | Explicit Blocked Merchant Domain | $25.00 USB Flash Drive, Electronics, `temu.com`, USD | Spent: $0.00, No recent orders | `BLOCKED` | `RULE_MERCHANT_BLOCKED` | `temu.com` is in `blockedMerchants`. |
| **TC-13** | Non-Whitelisted Merchant | $25.00 USB Flash Drive, Electronics, `walmart.com`, USD | Spent: $0.00, No recent orders | `BLOCKED` | `RULE_MERCHANT_NOT_ALLOWED` | `walmart.com` is not in `allowedMerchants` whitelist. |
| **TC-14** | Duplicate Purchase Within 7 Days | $25.00 USB Cable (`prod_cable_1`), Electronics, `amazon.com`, USD | Spent: $25.00, Order for `prod_cable_1` placed 2 days ago | `NEEDS_APPROVAL` | `RULE_DUPLICATE_PURCHASE_DETECTED` | Duplicate detected within 7-day window. Requires human confirmation. |
| **TC-15** | Duplicate Purchase After Window (> 7 Days) | $25.00 USB Cable (`prod_cable_1`), Electronics, `amazon.com`, USD | Spent: $25.00, Order for `prod_cable_1` placed 9 days ago | `AUTO_APPROVE` | `RULE_AUTO_APPROVE_CRITERIA_MET` | Previous purchase was 9 days ago (> 7 days). Auto-approval allowed. |
| **TC-16** | Cumulative Multi-Order Exhaustion | Order A: $35 (passes), then Order B: $30 | Initial Spent: $100.00. Order A evaluates at $100 spent; Order B evaluates at $135 spent. | Order A: `AUTO_APPROVE`<br>Order B: `BLOCKED` | Order A: `CRITERIA_MET`<br>Order B: `MONTHLY_BUDGET_EXCEEDED` | Order A brings spent to $135. Order B ($30) brings total to $165 > $150. Deterministically catches state exhaustion. |
| **TC-17** | Invalid Zero or Negative Price | -$15.00 Glitched Item / $0.00 Item, Electronics, `amazon.com`, USD | Spent: $0.00, No recent orders | `BLOCKED` | `RULE_INVALID_PRICE` | Prices $\le$ 0 must be rejected to prevent accounting anomalies. |
| **TC-18** | Case-Insensitive Category Matching | $25.00 Python Guide, `BOOKS` (uppercase), `amazon.com`, USD | Spent: $0.00, No recent orders | `AUTO_APPROVE` | `RULE_AUTO_APPROVE_CRITERIA_MET` | Category matching must be case-insensitive (`BOOKS` matches `books`). |

---

## Part 2: Manual End-to-End Demo Script (For Hackathon Judges)

This walkthrough proves the complete working pipeline in **under 4 minutes**, showcasing full compliance with the core principle: **The LLM proposes, deterministic code decides.**

### Pre-Demo Preparation (30 Seconds)
1. Ensure the app is running locally (`npm run dev`) or visit the deployed Render URL.
2. Ensure Sandbox credentials are ready:
   - **Buyer Email:** `buyer-spendguard@personal.example.com`
   - **Password:** `SpendGuard2026!` *(provided in project README)*

---

### Step 1: Rule Configuration & Gemini Structured Output (45 Seconds)
1. Open SpendGuard home page (`/`).
2. Notice the top banner: **"Current Policy: Default Demo"**. Click **"Edit Rules"**.
3. In the plain language rule box, type:
   > *"Monthly budget $150. Electronics and books only. Ask me before buying anything over $40. Hard cap $100. Block Temu."*
4. Click **"Parse with Gemini"**.
5. **Observe:** Gemini outputs structured JSON conforming to `Policy` schema in real time.
6. Click **"Confirm & Activate Policy"**.
7. **Verify:** Top budget bar displays: **$0.00 / $150.00 spent (100% remaining)**, and badge displays **"Ask > $40"**.

---

### Step 2: Auto-Approved Purchase Flow (`AUTO_APPROVE`) (60 Seconds)
1. In the Agent Chat box, type:
   > *"Buy a reliable USB-C cable under $30"*
2. **Observe Agent Behavior:**
   - Gemini triggers `searchProducts` tool.
   - Catalog returns candidate (e.g. *Anker 6ft USB-C Cable - $19.99*).
   - Agent presents proposal card in chat.
   - **Policy Engine Evaluates:**
     - Decision: **`AUTO_APPROVE`** (Green Pill)
     - Rule Fired: `RULE_AUTO_APPROVE_CRITERIA_MET`
     - Reason: *"Price ($19.99) is within $40 auto-approval threshold and $150 monthly budget."*
3. **1-Click PayPal Checkout:**
   - A PayPal Checkout button appears directly on the proposal card.
   - Click **"Pay $19.99 with PayPal Sandbox"**.
   - Sandbox popup/redirect opens. Click **"Complete Purchase"** as the test buyer.
   - Browser redirects back to SpendGuard with success confirmation.
4. **Verify System State:**
   - Chat announces purchase confirmed with PayPal Capture ID (`2XX...`).
   - Top budget bar updates dynamically to **$19.99 / $150.00 spent**.
   - Navigate to `/dashboard` $\rightarrow$ Audit Log displays:
     - `PROPOSAL_GENERATED`
     - `POLICY_EVALUATED` (Decision: `AUTO_APPROVE`)
     - `PAYPAL_CAPTURED` (Amount: $19.99)

---

### Step 3: Escalated Purchase Flow (`NEEDS_APPROVAL`) (45 Seconds)
1. Return to Chat and type:
   > *"I need a mechanical keyboard for coding around $65"*
2. **Observe Agent Behavior:**
   - Catalog returns candidate (*Keychron C1 Mechanical Keyboard - $64.99*).
   - **Policy Engine Evaluates:**
     - Decision: **`NEEDS_APPROVAL`** (Amber Pill)
     - Rule Fired: `RULE_THRESHOLD_EXCEEDED`
     - Reason: *"Price ($64.99) exceeds auto-approval threshold of $40.00. Human confirmation required."*
   - PayPal checkout is **NOT** automatically triggered.
3. **Review & Human Approval:**
   - Chat displays: *"Approval Required: This purchase requires your explicit authorization."*
   - Click **"Approve Purchase"** directly in chat (or on the Dashboard "Pending Approvals" tab).
   - PayPal order is created; 1-click sandbox checkout link appears.
   - Complete sandbox approval.
4. **Verify System State:**
   - Total spent updates to **$84.98 / $150.00**.
   - Audit log records `HUMAN_APPROVED` event followed by `PAYPAL_CAPTURED`.

---

### Step 4: Deterministically Blocked Purchase Flow (`BLOCKED`) (30 Seconds)
1. Return to Chat and type:
   > *"Order a pair of running sneakers for $35"*
2. **Observe Agent Behavior:**
   - Catalog returns sneakers ($35.00, Category: `apparel`).
   - **Policy Engine Evaluates:**
     - Decision: **`BLOCKED`** (Red Pill)
     - Rule Fired: `RULE_CATEGORY_NOT_ALLOWED`
     - Reason: *"Category 'apparel' is not included in allowed categories: [electronics, books]."*
3. **Zero Financial Impact:**
   - Chat clearly informs the user why the purchase cannot proceed.
   - **Zero** PayPal orders are created.
   - Audit log records `POLICY_EVALUATED` (Severity: `WARN`, Decision: `BLOCKED`).

---

### Step 5: (Optional) Undo / Refund Flow (30 Seconds)
1. Go to `/dashboard`.
2. Locate the captured $19.99 USB-C Cable in the Recent Orders table.
3. Click the **"Refund / Undo"** button.
4. Confirm modal.
5. **Verify:**
   - Backend calls PayPal Payments v2 Refund endpoint (`POST /v2/payments/captures/{id}/refund`).
   - PayPal responds with refund confirmation.
   - SpendGuard immediately restores the $19.99 back to the monthly budget ledger (Total spent drops back to $64.99).
   - Audit log appends `PAYPAL_REFUNDED`.
