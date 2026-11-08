# SpendGuard Architecture Document

> **Source of Truth:** [`docs/PROJECT_BRIEF.md`](file:///Users/riteshgarg/Downloads/Paypal%20Hackathon/docs/PROJECT_BRIEF.md)  
> **Feasibility Assessment:** [`docs/FEASIBILITY.md`](file:///Users/riteshgarg/Downloads/Paypal%20Hackathon/docs/FEASIBILITY.md)  
> **Core Principle:** *The LLM proposes, deterministic code decides.*

---

## 1. System Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Next.js App Router (Browser Client)"]
        UI_Chat["Agent Chat UI (/page.tsx)"]
        UI_Dash["Dashboard (/dashboard)"]
        UI_Policy["Policy Editor Modal"]
        UI_Approvals["Pending Approvals Panel"]
    end

    subgraph Server["SpendGuard Next.js Backend (Server-Side)"]
        API_Chat["/api/agent/chat"]
        API_Policy["/api/policy (GET/POST/parse)"]
        API_Orders["/api/orders (create/approve/capture/refund)"]
        API_Webhooks["/api/webhooks/paypal"]
        
        AgentLoop["Agent Coordinator\n(Orchestration Loop)"]
        PolicyEngine["Deterministic Policy Engine\n(Pure Logic & Rule Attribution)"]
        CatalogAdapter["Catalog Service\n(Channel3 API + Mock Fallback)"]
        PayPalService["PayPal Client Service\n(Orders v2, Payments v2, OAuth2)"]
    end

    subgraph Database["Persistent Storage (SQLite)"]
        DB_Policies[("policies")]
        DB_Orders[("orders")]
        DB_Audit[("audit_logs")]
        DB_Ledger[("budget_ledger")]
    end

    subgraph External["External Services"]
        Gemini["Google Gemini 2.5 Flash\n(Structured Outputs & Tool Calling)"]
        Channel3["Channel3 API\n(Live Product Search)"]
        PayPalAPI["PayPal Sandbox REST API\n(Orders v2, Payments v2, Webhooks)"]
    end

    %% User Interactions
    UI_Policy -->|1. Natural language rules| API_Policy
    API_Policy -->|Structured Output| Gemini
    Gemini -->|Parsed Policy JSON| API_Policy
    API_Policy -->|Persist confirmed policy| DB_Policies

    UI_Chat -->|2. 'Buy USB-C hub under $40'| API_Chat
    API_Chat --> AgentLoop
    AgentLoop -->|Function Calling: searchProducts| Gemini
    Gemini -->|Tool Invocation| AgentLoop
    AgentLoop --> CatalogAdapter
    CatalogAdapter -->|HTTP POST /v1/search| Channel3
    CatalogAdapter -.->|Fallback if no key| CatalogAdapter
    Channel3 -->|Product results| CatalogAdapter
    CatalogAdapter --> AgentLoop
    AgentLoop -->|Tool Response| Gemini
    Gemini -->|Structured Purchase Proposal| AgentLoop

    %% Policy Engine Gate
    AgentLoop -->|3. Evaluate Proposal| PolicyEngine
    PolicyEngine -->|Query active policy & monthly spend| DB_Policies
    PolicyEngine -->|Check budget ledger| DB_Ledger
    PolicyEngine -->|Returns AUTO_APPROVE / NEEDS_APPROVAL / BLOCKED| AgentLoop
    AgentLoop -->|Write Evaluation Event| DB_Audit

    %% Execution Paths
    alt Decision: BLOCKED
        AgentLoop -->|Return rejection + rule fired| UI_Chat
    else Decision: NEEDS_APPROVAL
        AgentLoop -->|Stage order: PENDING_APPROVAL| DB_Orders
        AgentLoop -->|Return approval prompt| UI_Chat
        UI_Approvals -->|User Clicks Approve| API_Orders
    else Decision: AUTO_APPROVE or Manually Approved
        AgentLoop -->|Create PayPal Order| PayPalService
        PayPalService -->|POST /v2/checkout/orders| PayPalAPI
        PayPalAPI -->|Order ID + Approve Link| PayPalService
        PayPalService -->|Persist order: CREATED| DB_Orders
        PayPalService -->|1-Click Sandbox Checkout Link| UI_Chat
        UI_Chat -->|Buyer approves in PayPal| PayPalAPI
        PayPalAPI -->|Redirect to /checkout/success| UI_Chat
        UI_Chat -->|Trigger Capture| API_Orders
        API_Orders -->|POST /v2/checkout/orders/{id}/capture| PayPalService
        PayPalService -->|Capture success| PayPalAPI
        PayPalService -->|Update status: CAPTURED| DB_Orders
        PayPalService -->|Deduct budget| DB_Ledger
        PayPalService -->|Write audit record| DB_Audit
    end

    %% Webhook Sync
    PayPalAPI -->|Webhook Event POST| API_Webhooks
    API_Webhooks -->|Verify Signature| PayPalAPI
    API_Webhooks -->|Update status & ledger| DB_Orders
    API_Webhooks -->|Log webhook event| DB_Audit

    %% Dashboard sync
    UI_Dash -->|Read Metrics & Logs| DB_Orders
    UI_Dash --> DB_Ledger
    UI_Dash --> DB_Audit
```

---

## 2. Directory Structure

```
SpendGuard-Paypal-Hackathon/
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── docs/
│   ├── PROJECT_BRIEF.md
│   ├── FEASIBILITY.md
│   ├── ARCHITECTURE.md
│   ├── TASKS.md
│   └── TEST_PLAN.md
├── app/
│   ├── layout.tsx
│   ├── page.tsx                     # Main page: Unified Shopping Agent Chat & Quick View
│   ├── globals.css
│   ├── dashboard/
│   │   └── page.tsx                 # Full Dashboard: Spend vs Budget, Approvals, Audit Log
│   ├── checkout/
│   │   ├── success/page.tsx         # PayPal return landing page (triggers capture confirmation)
│   │   └── cancel/page.tsx          # PayPal cancel landing page
│   └── api/
│       ├── policy/
│       │   ├── parse/route.ts       # POST: Gemini structured output rule parser
│       │   └── route.ts             # GET active policy, POST update active policy
│       ├── agent/
│       │   └── chat/route.ts        # POST: Shopping agent conversation loop
│       ├── orders/
│       │   ├── route.ts             # GET orders list, POST stage new order
│       │   ├── [id]/
│       │   │   ├── approve/route.ts # POST: Human approvals for NEEDS_APPROVAL items
│       │   │   ├── capture/route.ts # POST: PayPal capture order execution
│       │   │   └── refund/route.ts  # POST: PayPal refund execution & budget reversal
│       ├── webhooks/
│       │   └── paypal/route.ts      # POST: PayPal webhook verification & state handler
│       ├── audit/
│       │   └── route.ts             # GET: Paginated audit log records
│       └── dashboard/
│           └── metrics/route.ts     # GET: Aggregated spend, budget, and pending count
├── components/
│   ├── Navigation.tsx               # Top header with budget indicator & nav pills
│   ├── chat/
│   │   ├── ChatInterface.tsx        # Agent conversational message feed
│   │   ├── ProductProposalCard.tsx  # Product card displaying policy decision badge
│   │   └── PolicyBadge.tsx          # Visual pills: AUTO_APPROVE, NEEDS_APPROVAL, BLOCKED
│   ├── dashboard/
│   │   ├── BudgetOverview.tsx       # Progress bar: Spend vs Monthly Budget
│   │   ├── PendingApprovals.tsx     # One-click approve/reject queue
│   │   ├── AuditLogTable.tsx        # Searchable timeline of policy decisions & PayPal events
│   │   └── SpendingByCategory.tsx   # Visual breakdown of approved spend
│   └── policy/
│       ├── PolicyEditorModal.tsx    # Natural language rule prompt + confirmed JSON viewer
│       └── RuleCard.tsx             # Visual breakdown of active constraints
├── lib/
│   ├── db/
│   │   ├── index.ts                 # SQLite connection instance (better-sqlite3)
│   │   ├── schema.ts                # Table creation SQL & migration helpers
│   │   └── seed.ts                  # Seed script for demo policies & sample audit events
│   ├── policy/
│   │   ├── types.ts                 # TypeScript interfaces for Policy, Decision, Evaluation
│   │   ├── schema.ts                # JSON Schema & Zod validator for Policy
│   │   ├── parser.ts                # Gemini Structured Output parser client
│   │   └── engine.ts                # Deterministic Policy Evaluation Engine (Pure function)
│   ├── agent/
│   │   ├── gemini.ts                # Google Gen AI SDK client initialization
│   │   ├── coordinator.ts           # Agent loop handling multi-turn tool calling
│   │   └── tools.ts                 # Declarations for searchProducts and getBudgetSummary
│   ├── catalog/
│   │   ├── types.ts                 # Unified product & offer interfaces
│   │   ├── channel3.ts              # Live Channel3 REST client (POST /v1/search)
│   │   ├── mockCatalog.ts           # Offline curated catalog fallback (15 realistic items)
│   │   └── index.ts                 # Factory: returns Channel3 or Mock based on env
│   └── paypal/
│       ├── types.ts                 # PayPal order, capture, refund, and webhook types
│       ├── auth.ts                  # OAuth2 client_credentials token cache manager
│       ├── orders.ts                # Create order and capture order REST calls
│       ├── refunds.ts               # Captures refund REST call
│       └── webhooks.ts              # Signature verification and event dispatching
└── tests/
    ├── policy-engine.test.ts        # 17 comprehensive deterministic policy test cases
    ├── policy-parser.test.ts        # Gemini structured output response parsing test
    └── paypal-signature.test.ts     # Webhook verification unit test
```

---

## 3. Data Model (SQLite Schema)

SpendGuard uses SQLite via `better-sqlite3` for synchronous, rock-solid, zero-network-latency storage.

### Table: `policies`
Stores active and historical policy definitions.
```sql
CREATE TABLE IF NOT EXISTS policies (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'demo_user',
    raw_rules TEXT NOT NULL,                     -- Natural language input from user
    structured_policy TEXT NOT NULL,             -- JSON serialized Policy object
    is_active INTEGER NOT NULL DEFAULT 1,        -- 1 = active policy, 0 = archived
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Table: `orders`
Tracks product proposals, policy evaluations, and PayPal transaction records.
```sql
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,                         -- Internal UUID: ord_xxx
    user_id TEXT NOT NULL DEFAULT 'demo_user',
    paypal_order_id TEXT,                        -- PayPal Order ID (e.g., 5O190127TN364715T)
    paypal_capture_id TEXT,                      -- PayPal Capture ID (e.g., 2XX00000000000000)
    product_id TEXT NOT NULL,                    -- Catalog product ID
    product_title TEXT NOT NULL,
    product_price REAL NOT NULL,                 -- Unit price in USD
    currency TEXT NOT NULL DEFAULT 'USD',
    category TEXT NOT NULL,                      -- Classified category (e.g., electronics, books)
    merchant TEXT NOT NULL,                      -- Retailer domain (e.g., amazon.com, bestbuy.com)
    product_url TEXT NOT NULL,
    product_image_url TEXT,
    decision TEXT NOT NULL,                      -- 'AUTO_APPROVE' | 'NEEDS_APPROVAL' | 'BLOCKED'
    decision_reason TEXT NOT NULL,               -- Human-readable rationale
    rule_fired TEXT,                             -- Identifier or text of the specific rule
    status TEXT NOT NULL,                        -- 'PROPOSED' | 'PENDING_APPROVAL' | 'APPROVED' | 'CREATED' | 'CAPTURED' | 'REFUNDED' | 'REJECTED'
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    captured_at TEXT,
    refunded_at TEXT
);
```

### Table: `budget_ledger`
Maintains current monthly budget caps and actual aggregated spend to guarantee lightning-fast deterministic calculations.
```sql
CREATE TABLE IF NOT EXISTS budget_ledger (
    month_year TEXT PRIMARY KEY,                 -- Format: 'YYYY-MM' (e.g., '2026-11')
    user_id TEXT NOT NULL DEFAULT 'demo_user',
    budget_limit REAL NOT NULL,                  -- Monthly ceiling in USD
    total_spent REAL NOT NULL DEFAULT 0.0,       -- Sum of all captured orders minus refunds
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Table: `audit_logs`
Immutable compliance ledger. Every agent proposal, policy decision, approval, and PayPal event is appended here.
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,                         -- log_xxx
    order_id TEXT,                               -- Foreign key reference to orders.id (nullable)
    event_type TEXT NOT NULL,                    -- Enum: RULE_PARSED, POLICY_SAVED, PROPOSAL_GENERATED, POLICY_EVALUATED, HUMAN_APPROVED, HUMAN_REJECTED, PAYPAL_ORDER_CREATED, PAYPAL_CAPTURED, PAYPAL_REFUNDED, WEBHOOK_VERIFIED
    severity TEXT NOT NULL DEFAULT 'INFO',       -- 'INFO' | 'WARN' | 'ERROR'
    summary TEXT NOT NULL,                       -- Short human-readable headline
    payload TEXT NOT NULL,                       -- JSON string containing event metadata
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 4. API Routes Specification

| Method | Endpoint | Request Body | Response Body | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/policy/parse` | `{ rawRules: string }` | `{ success: boolean, parsedPolicy: Policy }` | Sends user's natural language to Gemini structured outputs; returns strictly validated JSON policy. |
| `GET` | `/api/policy` | *None* | `{ policy: Policy, rawRules: string, updatedAt: string }` | Retrieves current active policy. |
| `POST` | `/api/policy` | `{ rawRules: string, policy: Policy }` | `{ success: boolean, policyId: string }` | Saves and activates a user-confirmed policy. Updates `budget_ledger`. |
| `POST` | `/api/agent/chat` | `{ message: string, history: Message[] }` | `{ reply: string, proposal?: Proposal, evaluation?: EvaluationResult }` | Runs Gemini shopping loop, searches Channel3, proposes candidate, runs deterministic policy check. |
| `GET` | `/api/orders` | Query params: `?status=PENDING_APPROVAL` | `{ orders: OrderRecord[] }` | Lists orders filtered by status (default all). |
| `POST` | `/api/orders/[id]/approve` | *None* | `{ success: boolean, paypalOrderId: string, approveUrl: string }` | User approves a `NEEDS_APPROVAL` item. Backend creates PayPal order and returns sandbox approval link. |
| `POST` | `/api/orders/[id]/capture` | *None* | `{ success: boolean, captureId: string, status: string }` | Executes `POST /v2/checkout/orders/{id}/capture` on PayPal after buyer confirmation; updates ledger. |
| `POST` | `/api/orders/[id]/refund` | `{ reason?: string }` | `{ success: boolean, refundId: string }` | Executes `POST /v2/payments/captures/{id}/refund`, restores budget balance in ledger. |
| `POST` | `/api/webhooks/paypal` | Raw PayPal Webhook JSON + Headers | `{ status: "received" }` | Validates PayPal signature; handles `PAYMENT.CAPTURE.COMPLETED` and `PAYMENT.CAPTURE.REFUNDED`. |
| `GET` | `/api/audit` | Query params: `?limit=50&offset=0` | `{ logs: AuditLogRecord[], total: number }` | Returns paginated audit trail. |
| `GET` | `/api/dashboard/metrics` | *None* | `{ monthlyBudget: number, totalSpent: number, remaining: number, pendingCount: number, recentOrders: OrderRecord[] }` | Fast summary data for top metrics cards. |

---

## 5. Policy JSON Schema & Examples

### Schema Definition (TypeScript & JSON Schema)

```typescript
export interface Policy {
  version: "1.0";
  maxMonthlyBudget: number;           // Total monthly ceiling in USD
  requireApprovalAbove: number;       // Items with price > threshold require explicit human approval
  maxItemPrice: number;               // Hard ceiling: items exceeding this are automatically BLOCKED
  allowedCategories: string[];        // Whitelisted categories (e.g. ["electronics", "books"])
  blockedCategories?: string[];       // Explicit blacklisted categories (e.g. ["apparel", "weapons"])
  allowedMerchants?: string[];        // If specified, only these retailer domains are allowed
  blockedMerchants?: string[];        // Disallowed domains (e.g. ["temu.com", "aliexpress.com"])
  allowDuplicatesWithinDays?: number; // Days to restrict repurchasing the same item (e.g. 7)
  currency: "USD";                    // Standardized sandbox currency
}
```

### JSON Schema (for Gemini Structured Outputs):
```json
{
  "type": "object",
  "properties": {
    "version": { "type": "string", "enum": ["1.0"] },
    "maxMonthlyBudget": { "type": "number", "description": "Max budget per month in USD" },
    "requireApprovalAbove": { "type": "number", "description": "Items over this price need human approval" },
    "maxItemPrice": { "type": "number", "description": "Hard limit: any single item above this is blocked" },
    "allowedCategories": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Categories permitted for purchase (lowercase)"
    },
    "blockedCategories": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Categories strictly prohibited"
    },
    "allowedMerchants": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Allowed merchant domains (e.g. amazon.com)"
    },
    "blockedMerchants": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Blocked merchant domains"
    },
    "allowDuplicatesWithinDays": { "type": "number", "description": "Duplicate prevention window in days" },
    "currency": { "type": "string", "enum": ["USD"] }
  },
  "required": ["version", "maxMonthlyBudget", "requireApprovalAbove", "maxItemPrice", "allowedCategories", "currency"],
  "additionalProperties": false
}
```

### Example Policy 1: Strict Developer Tech Budget
> *"Max $150/month, electronics and books only, ask me before anything over $40, hard limit $100 per item, no purchases from Temu or AliExpress."*
```json
{
  "version": "1.0",
  "maxMonthlyBudget": 150.00,
  "requireApprovalAbove": 40.00,
  "maxItemPrice": 100.00,
  "allowedCategories": ["electronics", "books"],
  "blockedCategories": ["apparel", "gaming", "toys"],
  "blockedMerchants": ["temu.com", "aliexpress.com"],
  "allowDuplicatesWithinDays": 7,
  "currency": "USD"
}
```

### Example Policy 2: Generous Home Office Supplies
> *"Max $500 per month for office supplies, hardware, and furniture. Auto-approve under $75. Anything over $75 requires my permission. Nothing over $300 allowed. Amazon and Best Buy only."*
```json
{
  "version": "1.0",
  "maxMonthlyBudget": 500.00,
  "requireApprovalAbove": 75.00,
  "maxItemPrice": 300.00,
  "allowedCategories": ["office supplies", "hardware", "furniture"],
  "allowedMerchants": ["amazon.com", "bestbuy.com"],
  "blockedCategories": ["gift cards", "software", "entertainment"],
  "allowDuplicatesWithinDays": 14,
  "currency": "USD"
}
```

### Example Policy 3: Micro-Snack & Pantry Bot
> *"Max $60 a month for snacks, coffee, and pantry essentials. Anything up to $15 is auto-approved. Ask me if it's over $15. Block anything over $30. Prevent duplicate orders within 5 days."*
```json
{
  "version": "1.0",
  "maxMonthlyBudget": 60.00,
  "requireApprovalAbove": 15.00,
  "maxItemPrice": 30.00,
  "allowedCategories": ["snacks", "coffee", "pantry"],
  "blockedCategories": ["alcohol", "tobacco", "supplements"],
  "allowDuplicatesWithinDays": 5,
  "currency": "USD"
}
```

---

## 6. Policy-Evaluation Algorithm (Pseudocode)

This function contains **zero LLM code**. It is 100% deterministic, testable, and auditable.

```typescript
function evaluatePurchaseProposal(
  proposal: {
    productId: string;
    productTitle: string;
    price: number;
    currency: string;
    category: string;
    merchantDomain: string;
  },
  policy: Policy,
  context: {
    currentMonthSpent: number;
    recentOrders: OrderRecord[]; // Orders in last N days
  }
): EvaluationResult {
  // 1. Currency Check
  if (proposal.currency !== policy.currency) {
    return {
      decision: "BLOCKED",
      ruleFired: "RULE_CURRENCY_MISMATCH",
      reason: `Currency ${proposal.currency} does not match required policy currency ${policy.currency}.`
    };
  }

  // 2. Non-positive or Anomaly Price Check
  if (proposal.price <= 0) {
    return {
      decision: "BLOCKED",
      ruleFired: "RULE_INVALID_PRICE",
      reason: `Invalid product price: $${proposal.price}. Must be greater than 0.`
    };
  }

  // 3. Hard Max Item Price Ceiling
  if (proposal.price > policy.maxItemPrice) {
    return {
      decision: "BLOCKED",
      ruleFired: "RULE_MAX_ITEM_PRICE_EXCEEDED",
      reason: `Item price ($${proposal.price}) exceeds hard maximum limit of $${policy.maxItemPrice}.`
    };
  }

  // 4. Monthly Budget Overflow Check
  const projectedTotal = context.currentMonthSpent + proposal.price;
  if (projectedTotal > policy.maxMonthlyBudget) {
    const remaining = Math.max(0, policy.maxMonthlyBudget - context.currentMonthSpent);
    return {
      decision: "BLOCKED",
      ruleFired: "RULE_MONTHLY_BUDGET_EXCEEDED",
      reason: `Purchase of $${proposal.price} exceeds remaining monthly budget of $${remaining.toFixed(2)} (Spent: $${context.currentMonthSpent.toFixed(2)} / Cap: $${policy.maxMonthlyBudget.toFixed(2)}).`
    };
  }

  // 5. Merchant Domain Blacklist Check
  if (policy.blockedMerchants && policy.blockedMerchants.length > 0) {
    const isBlocked = policy.blockedMerchants.some(m => 
      proposal.merchantDomain.toLowerCase().includes(m.toLowerCase())
    );
    if (isBlocked) {
      return {
        decision: "BLOCKED",
        ruleFired: "RULE_MERCHANT_BLOCKED",
        reason: `Merchant ${proposal.merchantDomain} is explicitly prohibited by policy.`
      };
    }
  }

  // 6. Merchant Domain Whitelist Check
  if (policy.allowedMerchants && policy.allowedMerchants.length > 0) {
    const isAllowed = policy.allowedMerchants.some(m => 
      proposal.merchantDomain.toLowerCase().includes(m.toLowerCase())
    );
    if (!isAllowed) {
      return {
        decision: "BLOCKED",
        ruleFired: "RULE_MERCHANT_NOT_ALLOWED",
        reason: `Merchant ${proposal.merchantDomain} is not in the approved merchant list.`
      };
    }
  }

  // 7. Explicit Category Blacklist Check
  if (policy.blockedCategories && policy.blockedCategories.length > 0) {
    const isCategoryBlocked = policy.blockedCategories.some(cat => 
      proposal.category.toLowerCase().includes(cat.toLowerCase())
    );
    if (isCategoryBlocked) {
      return {
        decision: "BLOCKED",
        ruleFired: "RULE_CATEGORY_BLOCKED",
        reason: `Category '${proposal.category}' is explicitly blacklisted.`
      };
    }
  }

  // 8. Category Whitelist Check
  const isCategoryAllowed = policy.allowedCategories.some(cat => 
    proposal.category.toLowerCase().includes(cat.toLowerCase())
  );
  if (!isCategoryAllowed) {
    return {
      decision: "BLOCKED",
      ruleFired: "RULE_CATEGORY_NOT_ALLOWED",
      reason: `Category '${proposal.category}' is not included in allowed categories: [${policy.allowedCategories.join(", ")}].`
    };
  }

  // 9. Duplicate Purchase Detection Check
  if (policy.allowDuplicatesWithinDays && policy.allowDuplicatesWithinDays > 0) {
    const duplicateWindowMs = policy.allowDuplicatesWithinDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    const recentDuplicate = context.recentOrders.find(order => {
      const orderTime = new Date(order.created_at).getTime();
      return (
        order.product_id === proposal.productId &&
        (now - orderTime) < duplicateWindowMs &&
        order.status !== "REJECTED" &&
        order.status !== "REFUNDED"
      );
    });

    if (recentDuplicate) {
      return {
        decision: "NEEDS_APPROVAL",
        ruleFired: "RULE_DUPLICATE_PURCHASE_DETECTED",
        reason: `Duplicate detected: this item was already ordered within the last ${policy.allowDuplicatesWithinDays} days (Order ID: ${recentDuplicate.id}). Requires manual confirmation.`
      };
    }
  }

  // 10. Approval Threshold Check
  if (proposal.price > policy.requireApprovalAbove) {
    return {
      decision: "NEEDS_APPROVAL",
      ruleFired: "RULE_THRESHOLD_EXCEEDED",
      reason: `Price ($${proposal.price}) exceeds the auto-approval threshold of $${policy.requireApprovalAbove}. Human confirmation required.`
    };
  }

  // 11. Auto Approval Passed
  return {
    decision: "AUTO_APPROVE",
    ruleFired: "RULE_AUTO_APPROVE_CRITERIA_MET",
    reason: `Price ($${proposal.price}) is within auto-approval threshold ($${policy.requireApprovalAbove}) and monthly budget ($${policy.maxMonthlyBudget}).`
  };
}
```

---

## 7. Agent Tool Specifications

The LLM is granted **strictly discovery and context tools**. It has zero access to payment or execution endpoints.

### Tool 1: `searchProducts`
Queries the product catalog (Channel3 API or offline fallback) to find matching items.
- **Name:** `searchProducts`
- **Description:** `"Search live e-commerce products by keyword query, optional category, and budget ceiling."`
- **Input Parameters:**
  ```json
  {
    "type": "OBJECT",
    "properties": {
      "query": { "type": "STRING", "description": "Search keyword, e.g. 'USB-C hub', 'Python cookbook'" },
      "category": { "type": "STRING", "description": "Optional category filter, e.g. 'electronics'" },
      "maxPrice": { "type": "NUMBER", "description": "Optional upper bound for price filter in USD" }
    },
    "required": ["query"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "OBJECT",
    "properties": {
      "results": {
        "type": "ARRAY",
        "items": {
          "type": "OBJECT",
          "properties": {
            "productId": { "type": "STRING" },
            "title": { "type": "STRING" },
            "price": { "type": "NUMBER" },
            "currency": { "type": "STRING" },
            "category": { "type": "STRING" },
            "merchant": { "type": "STRING" },
            "url": { "type": "STRING" },
            "imageUrl": { "type": "STRING" },
            "availability": { "type": "STRING" }
          }
        }
      }
    }
  }
  ```

### Tool 2: `getBudgetSummary`
Allows the agent to check remaining monthly budget and active policy limits to guide its product recommendations.
- **Name:** `getBudgetSummary`
- **Description:** `"Retrieve the user's active spending limits, remaining monthly budget, and auto-approval thresholds."`
- **Input Parameters:**
  ```json
  {
    "type": "OBJECT",
    "properties": {}
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "OBJECT",
    "properties": {
      "monthlyBudget": { "type": "NUMBER" },
      "totalSpentThisMonth": { "type": "NUMBER" },
      "remainingBudget": { "type": "NUMBER" },
      "autoApprovalLimit": { "type": "NUMBER" },
      "allowedCategories": { "type": "ARRAY", "items": { "type": "STRING" } }
    }
  }
  ```

---

## 8. Environment Variables (`.env.example`)

```bash
# ==============================================================================
# SpendGuard Environment Configuration (.env.example)
# PayPal AI Hackathon (Devpost)
# ==============================================================================

# Application Base URL (Used for PayPal return_url and webhook registration)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ------------------------------------------------------------------------------
# Google Gemini API
# Required for structured policy parsing & conversational agent loop
# ------------------------------------------------------------------------------
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"
GEMINI_MODEL="gemini-2.5-flash"

# ------------------------------------------------------------------------------
# PayPal REST API (Sandbox)
# Obtain from https://developer.paypal.com/dashboard/applications/sandbox
# ------------------------------------------------------------------------------
PAYPAL_ENVIRONMENT="sandbox"
PAYPAL_CLIENT_ID="AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
PAYPAL_CLIENT_SECRET="EYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY"
PAYPAL_WEBHOOK_ID="WH-ZZZZZZZZZZZZZZZZZ"

# ------------------------------------------------------------------------------
# Channel3 Product Search API
# Obtain from https://trychannel3.com (1,000 monthly free tier credits)
# If empty, SpendGuard automatically falls back to curated mock catalog
# ------------------------------------------------------------------------------
CHANNEL3_API_KEY=""
CHANNEL3_BASE_URL="https://api.trychannel3.com/v1"

# ------------------------------------------------------------------------------
# Database Configuration
# Local SQLite database file path (persisted in container / workspace)
# ------------------------------------------------------------------------------
DATABASE_PATH="./data/spendguard.db"

# ------------------------------------------------------------------------------
# Development & Testing Flags
# ------------------------------------------------------------------------------
# Set to "true" to bypass live PayPal sandbox calls for instant mock captures in tests
MOCK_PAYPAL_CAPTURE="false"
