# SpendGuard Implementation Tasks & Roadmap

> **Total MUST Work:** ~30 focused hours  
> **Target Dates:** Nov 8 – Nov 11, 2026 (Hard Hackathon Deadline)  
> **Source Documents:** [`docs/PROJECT_BRIEF.md`](file:///Users/riteshgarg/Downloads/Paypal%20Hackathon/docs/PROJECT_BRIEF.md) | [`docs/ARCHITECTURE.md`](file:///Users/riteshgarg/Downloads/Paypal%20Hackathon/docs/ARCHITECTURE.md)

---

## Workload Summary

| Day | Focus Area | MUST Hours | NICE Hours |
| :--- | :--- | :--- | :--- |
| **Nov 8 (Day 1)** | Scaffolding, SQLite Schema, Deterministic Policy Engine & Tests | 7.5h | 1.0h |
| **Nov 9 (Day 2)** | Gemini Structured Outputs, Channel3 Search & Agent Loop | 7.5h | 1.0h |
| **Nov 10 (Day 3)** | PayPal Sandbox Orders v2, 1-Click Capture & Audit Logging | 7.5h | 4.0h |
| **Nov 11 (Day 4)** | Full-Stack UI, Dashboard, Render Deploy & Judge Documentation | 7.5h | 2.5h |
| **Totals** | | **30.0h** | **8.5h** |

---

## Nov 8 (Day 1): Scaffolding, Data Layer, Policy Engine & Test Suite

### Task 1.1: Project Scaffolding & Dependencies
- [ ] **[MUST - 1.5h]** Initialize Next.js 15 (App Router) with TypeScript, Tailwind CSS, and Lucide React icons.
- [ ] **[MUST - 0.5h]** Configure `.env.example`, `.gitignore`, and Vitest test runner with TypeScript support.
- *Dependencies:* None.

### Task 1.2: SQLite Database Schema & Client
- [ ] **[MUST - 1.5h]** Implement `lib/db/index.ts` using `better-sqlite3` and create tables (`policies`, `orders`, `budget_ledger`, `audit_logs`).
- [ ] **[MUST - 0.5h]** Create `lib/db/schema.ts` with typed helpers for insert, update, and query operations.
- [ ] **[NICE - 1.0h]** Implement `lib/db/seed.ts` to pre-populate demo budget ($150 limit) and sample past transactions.
- *Dependencies:* Task 1.1.

### Task 1.3: Deterministic Policy Engine
- [ ] **[MUST - 2.0h]** Implement pure deterministic evaluation function in `lib/policy/engine.ts`:
  - Currency validation.
  - Non-positive price rejection.
  - Hard max item ceiling (`maxItemPrice`).
  - Monthly budget limit (`maxMonthlyBudget` vs `currentMonthSpent`).
  - Merchant blacklist and whitelist.
  - Category blacklist and whitelist.
  - Duplicate purchase detection within `allowDuplicatesWithinDays`.
  - Approval threshold check (`requireApprovalAbove`).
  - Output typed `EvaluationResult` (`AUTO_APPROVE`, `NEEDS_APPROVAL`, `BLOCKED`) with exact `ruleFired` attribution.
- *Dependencies:* Task 1.2.

### Task 1.4: Policy Engine Test Suite
- [ ] **[MUST - 2.0h]** Create `tests/policy-engine.test.ts` covering all 17 test cases outlined in `docs/TEST_PLAN.md` (exact budget limits, category mismatches, currency mismatch, duplicate items, boundary values). Ensure 100% test pass rate.
- *Dependencies:* Task 1.3.

**Day 1 Milestone:** A fully test-covered, deterministic policy engine running against a local SQLite database.

---

## Nov 9 (Day 2): Gemini Policy Parser, Catalog & Agent Loop

### Task 2.1: Gemini Structured Output Rule Parser
- [ ] **[MUST - 2.0h]** Implement `lib/policy/parser.ts` and `POST /api/policy/parse`:
  - Call Gemini 2.5 Flash using `responseMimeType: "application/json"` and strict `responseSchema`.
  - Parse natural language rules into typed `Policy` object.
  - Validate output with fallback defaults.
- [ ] **[MUST - 0.5h]** Implement `GET /api/policy` and `POST /api/policy` to retrieve and persist confirmed active policies.
- *Dependencies:* Task 1.2, Task 1.3.

### Task 2.2: Channel3 Catalog Client & Mock Catalog Fallback
- [ ] **[MUST - 1.5h]** Implement `lib/catalog/channel3.ts` to call `POST https://api.trychannel3.com/v1/search` and extract items from `offers[]`.
- [ ] **[MUST - 0.5h]** Implement `lib/catalog/mockCatalog.ts` containing 15 realistic items across electronics, books, office supplies, and apparel.
- [ ] **[MUST - 0.5h]** Implement factory `lib/catalog/index.ts` to automatically route requests to Mock Catalog if `CHANNEL3_API_KEY` is not provided.
- *Dependencies:* Task 1.1.

### Task 2.3: Agent Coordinator Loop & Tool Calling
- [ ] **[MUST - 2.5h]** Implement `lib/agent/coordinator.ts`:
  - Define `searchProducts` and `getBudgetSummary` tools.
  - Handle multi-turn tool calling with Gemini.
  - Intercept the candidate product proposal *before returning to client* and run it through `evaluatePurchaseProposal()`.
  - Format response with both natural language explanation and structured proposal card data.
- *Dependencies:* Task 2.1, Task 2.2, Task 1.3.

### Task 2.4: Agent Chat API Route
- [ ] **[MUST - 1.0h]** Implement `POST /api/agent/chat` connecting the Next.js API route to `coordinator.ts` and logging `PROPOSAL_GENERATED` and `POLICY_EVALUATED` in `audit_logs`.
- [ ] **[NICE - 1.0h]** Auto-infer category tags from product titles using a lightweight lookup.
- *Dependencies:* Task 2.3.

**Day 2 Milestone:** Users can type plain-language rules to produce verified policy JSON, and chat with an agent that searches live/mock products and runs them through the policy gate.

---

## Nov 10 (Day 3): PayPal Sandbox, 1-Click Capture & Audit Subsystem

### Task 3.1: PayPal Client & OAuth2 Cache
- [ ] **[MUST - 1.5h]** Implement `lib/paypal/auth.ts`:
  - Generate OAuth2 bearer token from PayPal sandbox (`/v1/oauth2/token`).
  - Cache access token in memory with automatic refresh prior to expiration.
- *Dependencies:* Task 1.1.

### Task 3.2: Orders v2 Creation & Capture Backend
- [ ] **[MUST - 2.0h]** Implement `lib/paypal/orders.ts`:
  - `createPayPalOrder(orderData)`: `POST /v2/checkout/orders` with `intent: "CAPTURE"` and `application_context`.
  - `capturePayPalOrder(paypalOrderId)`: `POST /v2/checkout/orders/{id}/capture`.
- [ ] **[MUST - 1.0h]** Implement API routes:
  - `POST /api/orders`: Stage order and create PayPal sandbox order.
  - `POST /api/orders/[id]/capture`: Capture PayPal order, deduct from `budget_ledger`, and update status.
  - `POST /api/orders/[id]/approve`: Allow manual human approval of `NEEDS_APPROVAL` items.
- *Dependencies:* Task 3.1, Task 1.2.

### Task 3.3: 1-Click Sandbox Checkout & Return Flow
- [ ] **[MUST - 1.0h]** Create `/checkout/success/page.tsx` that reads `token` (`order_id`) from PayPal query parameters, triggers backend capture, and displays transaction confirmation.
- [ ] **[MUST - 0.5h]** Create `/checkout/cancel/page.tsx` handling cancelled sandbox transactions.
- *Dependencies:* Task 3.2.

### Task 3.4: Immutable Audit Logging Subsystem
- [ ] **[MUST - 1.5h]** Implement `logAuditEvent()` utility helper across all critical boundaries:
  - Policy confirmed / updated.
  - Agent search & proposal.
  - Policy engine evaluation with rule fired.
  - PayPal order created & captured.
- [ ] **[MUST - 0.5h]** Implement `GET /api/audit` route with filtering and ordering.
- *Dependencies:* Task 1.2, Task 3.2.

### Task 3.5: PayPal Refunds & Undo (NICE TO HAVE)
- [ ] **[NICE - 2.0h]** Implement `lib/paypal/refunds.ts` and `POST /api/orders/[id]/refund`:
  - Execute `POST /v2/payments/captures/{capture_id}/refund`.
  - Restore budget amount in `budget_ledger`.
  - Update order status to `REFUNDED` and write `PAYPAL_REFUNDED` audit log.
- *Dependencies:* Task 3.2, Task 3.4.

### Task 3.6: PayPal Webhooks Verification (NICE TO HAVE)
- [ ] **[NICE - 2.0h]** Implement `POST /api/webhooks/paypal`:
  - Verify signature via `POST /v1/notifications/verify-webhook-signature`.
  - Handle `PAYMENT.CAPTURE.COMPLETED` and `PAYMENT.CAPTURE.REFUNDED` to sync ledger.
- *Dependencies:* Task 3.2, Task 3.4.

**Day 3 Milestone:** Complete financial loop operational in sandbox—agent proposals generate real PayPal sandbox orders, buyer approves in 1-click, capture finalizes, and all actions are recorded in the audit log.

---

## Nov 11 (Day 4): Frontend UI, Dashboard, Deployment & Demo

### Task 4.1: Top Navigation & Budget Bar
- [ ] **[MUST - 1.5h]** Build `components/Navigation.tsx` and `BudgetOverview.tsx`:
  - Real-time spend vs monthly budget progress bar.
  - Active policy badge (e.g. "Max $150/mo • Ask > $40").
  - Quick link to Policy Editor modal.
- *Dependencies:* Task 1.2, Task 2.1.

### Task 4.2: Conversational Agent Chat Interface
- [ ] **[MUST - 2.5h]** Build `components/chat/ChatInterface.tsx` and `ProductProposalCard.tsx`:
  - Chat input with suggested prompt pills (e.g., "Buy Anker USB-C Hub under $40", "Buy $200 Drone").
  - Message feed with streaming/loading indicators.
  - Proposal card with item image, price, merchant, policy badge (`AUTO_APPROVE`, `NEEDS_APPROVAL`, `BLOCKED`), and rule explanation.
  - Active **"Pay with PayPal Sandbox"** 1-click button for approved items.
- *Dependencies:* Task 2.4, Task 3.3.

### Task 4.3: Dashboard: Approvals & Audit Log Table
- [ ] **[MUST - 1.5h]** Build `app/dashboard/page.tsx`:
  - `PendingApprovals.tsx`: List of escalated items requiring human review with 1-click "Approve & Pay" or "Reject".
  - `AuditLogTable.tsx`: Searchable chronological table of all agent actions, rule evaluations, and PayPal capture IDs.
- *Dependencies:* Task 3.2, Task 3.4.

### Task 4.4: Render Deployment Configuration
- [ ] **[MUST - 1.0h]** Configure Render deployment:
  - Add `render.yaml` or setup Build (`npm install && npm run build`) and Start (`npm start`) commands.
  - Configure environment variables in Render dashboard.
  - Ensure SQLite file directory (`./data`) is created automatically on boot with seed fallback.
- *Dependencies:* All previous MUST tasks.

### Task 4.5: README & Judge Verification Guide
- [ ] **[MUST - 1.0h]** Create comprehensive, judge-friendly `README.md`:
  - Quick overview and architecture summary.
  - 3-step local setup instructions.
  - Pre-configured Sandbox test credentials for judges.
  - Step-by-step walkthrough script for hackathon judges to verify AUTO_APPROVE, NEEDS_APPROVAL, and BLOCKED flows.
- *Dependencies:* Task 4.4.

### Task 4.6: Spending-by-Category Chart (NICE TO HAVE)
- [ ] **[NICE - 1.5h]** Build visual spending breakdown component using CSS/SVG progress bars in `SpendingByCategory.tsx`.
- *Dependencies:* Task 4.3.

### Task 4.7: Interactive Policy Confirmation Modal (NICE TO HAVE)
- [ ] **[NICE - 1.0h]** Add modal allowing users to edit the parsed JSON fields directly before saving.
- *Dependencies:* Task 2.1.

**Day 4 Milestone:** Production-ready application live on Render, fully documented with a judge walkthrough guide and zero mockups.
