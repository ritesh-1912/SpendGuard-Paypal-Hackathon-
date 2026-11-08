# SpendGuard

> **PayPal AI Hackathon (Devpost)**  
> **Core Principle:** *The LLM proposes, deterministic code decides.*  
> **Repository:** [https://github.com/ritesh-1912/SpendGuard-Paypal-Hackathon-.git](https://github.com/ritesh-1912/SpendGuard-Paypal-Hackathon-.git)  
> **License:** [MIT](LICENSE)

---

## Overview

Autonomous AI shopping agents can discover products and draft purchase proposals, but giving an LLM direct access to credit cards or checkout credentials introduces severe financial risk. Prompt injection, non-deterministic reasoning, and unconstrained tool execution can result in unintended purchases or budget depletion.

SpendGuard implements a strict architectural boundary:
1. **The LLM proposes:** Gemini parses user-defined spending rules and queries product catalogs.
2. **Deterministic code decides:** A pure TypeScript policy engine with zero network access evaluates every purchase proposal against the user's spending limits.
3. **PayPal executes:** Only approved purchases create PayPal Orders v2 sandbox sessions. The agent holds no credentials and cannot initiate checkout directly.

```mermaid
flowchart LR
    A["User Prompt\n'Buy a USB-C hub under $40'"] --> B["Gemini 2.5 Flash\n(Catalog Search Tool)"]
    B --> C["Channel3 API\n(Product Discovery)"]
    C --> D["Deterministic Policy Engine\n(Zero-Network Module)"]
    D -->|AUTO_APPROVE| E["PayPal Orders v2\n(Sandbox Create & Capture)"]
    D -->|NEEDS_APPROVAL| F["Pending Approvals Queue\n(User Review Required)"]
    D -->|BLOCKED| G["Purchase Blocked\n(Zero PayPal Calls)"]
    E --> H["SQLite Audit Log\n& Budget Ledger"]
```

---

## Architectural Decision: Model Proposes, Deterministic Code Decides

In SpendGuard, the AI model never holds authorization to spend money. The separation of responsibilities is enforced at the code level:

- **Why the LLM is restricted to proposing:** Large language models excel at semantic interpretation—understanding natural language instructions, mapping categories, and parsing user intents. However, LLMs are fundamentally probabilistic and susceptible to prompt injection, hallucinated parameters, and out-of-order execution. Giving an LLM direct tool access to payment endpoints creates an uncontained failure surface.
- **Why deterministic code decides:** Financial policies require mathematical certainty. A monthly budget ceiling, a per-item price cap, merchant blacklists, and duplicate purchase windows must evaluate identically every time, without model drift or nondeterminism. In SpendGuard, policy evaluation runs in a standalone, synchronous TypeScript module (`lib/policy/engine.ts`) with no network access and no external dependencies.
- **The safety boundary:** The agent loop (`lib/agent/coordinator.ts`) exposes only discovery tools (`searchProducts`, `getBudgetSummary`). It cannot call PayPal. Every proposal returned by the agent must pass through the deterministic policy engine before any PayPal order creation API is invoked.

---

## PayPal APIs and AI Tools Used

### 1. PayPal REST APIs (Sandbox)
- **Orders v2 (`POST /v2/checkout/orders`)**: Created with `intent: "CAPTURE"`, purchase unit details, and a return URL. Returns the buyer approval link.
- **Order Capture (`POST /v2/checkout/orders/{id}/capture`)**: Captures authorized funds upon buyer return, saves the capture ID, and updates the SQLite budget ledger.
- **OAuth 2.0 Client Credentials (`POST /v1/oauth2/token`)**: Server-side authentication with token caching and refresh. Secrets remain server-side in `.env` and are never exposed to the client.
- **Payments v2 Refunds (`POST /v2/payments/captures/{id}/refund`)**: Allows transaction refunds and credits the amount back to the monthly budget ledger.
- **Webhooks & Signature Verification (`POST /v1/notifications/verify-webhook-signature`)**: Handles `PAYMENT.CAPTURE.COMPLETED` and `PAYMENT.CAPTURE.REFUNDED` events, verifying transmission headers before updating order status.

### 2. Google Gemini 2.5 Flash
- **Structured Output Policy Parser (`lib/policy/parser.ts`)**: Uses `responseMimeType: "application/json"` with a strict JSON schema to convert plain-language rules into structured policy objects. The parsed policy requires explicit user confirmation before becoming active.
- **Agent Loop with Function Calling (`lib/agent/coordinator.ts`)**: Uses Gemini tool calling to search the Channel3 catalog. Tool responses are evaluated through the policy engine before any PayPal call is made.

---

## Judge Quickstart (Local Run in Under 10 Minutes)

### Prerequisites
- **Node.js**: `v22.5.0` or higher (tested on Node v22 and v24 with native `node:sqlite`)
- **npm**: `v10.0.0` or higher

### Step 1: Clone and Install
```bash
git clone https://github.com/ritesh-1912/SpendGuard-Paypal-Hackathon-.git
cd SpendGuard-Paypal-Hackathon-
npm install
```

### Step 2: Configure Environment Variables
Copy the template file to `.env`:
```bash
cp .env.example .env
```

Configure `.env` for either live sandbox mode or offline demo mode:

#### Option A: Live PayPal Sandbox Mode (Recommended)
Add sandbox credentials from [developer.paypal.com/dashboard/applications/sandbox](https://developer.paypal.com/dashboard/applications/sandbox):
```bash
NEXT_PUBLIC_APP_URL="http://localhost:3000"
PAYPAL_ENVIRONMENT="sandbox"
PAYPAL_CLIENT_ID="<your_sandbox_client_id>"
PAYPAL_CLIENT_SECRET="<your_sandbox_client_secret>"
PAYPAL_WEBHOOK_ID=""

# Optional: Gemini API key (built-in regex parser runs if empty)
GEMINI_API_KEY="<your_gemini_api_key>"
GEMINI_MODEL="gemini-2.5-flash"

# Optional: Channel3 API key (curated catalog runs if empty)
CHANNEL3_API_KEY=""

DATABASE_PATH="./data/spendguard.db"
MOCK_PAYPAL_CAPTURE="false"
```

#### Option B: Offline Demo Mode (No API Keys Required)
To run the full flow with offline sample catalog and mock checkout:
```bash
DEMO_OFFLINE="true"
MOCK_PAYPAL_CAPTURE="true"
```

### Step 3: Run the Test Suite
Run the 38 unit tests covering policy rules, startup validation, idempotency, failure cases, and health checks:
```bash
npm test
```
All 38 tests pass in under 300ms.

### Step 4: Start the Application
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## PayPal Sandbox Test Credentials

When testing live sandbox checkouts, use a PayPal Sandbox Personal (Buyer) account created in your [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/accounts):

| Field | Sandbox Test Value |
| :--- | :--- |
| **Buyer Email** | `buyer-spendguard@personal.example.com` *(or your sandbox personal account)* |
| **Password** | Your sandbox account password |
| **Environment** | PayPal Sandbox (`api-m.sandbox.paypal.com`) |

---

## Step-by-Step Demo Walkthrough

### 1. Policy Editor & Confirmation
1. In the top navigation, click **Policy**.
2. Notice the side-by-side view: plain-language input on the left, parsed JSON on the right.
3. Select the preset **Strict tech ($150)** or enter:
   > *"Max $150/month, electronics and books only, ask me before anything over $40, hard limit $100 per item, no Temu or AliExpress."*
4. Click **Parse into policy JSON**.
5. Review the structured rules (Monthly cap: $150, Ask above: $40, Ceiling: $100).
6. Click **Confirm and activate policy**.
7. The active policy banner updates immediately.

### 2. Auto-Approved Purchase (`AUTO_APPROVE`)
1. Switch to the **Chat** tab.
2. Click the example pill **USB-C Hub ($38.50 - Auto-approve)** or type:
   > *"Buy a multiport USB-C hub under $40"*
3. The agent searches the catalog and proposes an 8-in-1 USB-C Hub ($38.50).
4. The policy engine evaluates the proposal:
   - Status: `AUTO_APPROVE`
   - Rule fired: `RULE_AUTO_APPROVE_CRITERIA_MET`
   - Reason: Within auto-approval threshold ($40.00) and monthly budget ($150.00).
5. Click **Create PayPal sandbox order ($38.50)**.
6. Click **Complete sandbox checkout** to open the PayPal sandbox approval flow.
7. After approval, PayPal redirects to `/checkout/success`, and the payment is captured.
8. Click **Return to dashboard** to verify updated spend ($38.50) and remaining budget.

### 3. Escalated Purchase Requiring Human Approval (`NEEDS_APPROVAL`)
1. In the **Chat** tab, click **Keyboard ($64.20 - Needs approval)**.
2. The agent proposes a Mechanical Keyboard ($64.20).
3. The policy engine evaluates the proposal:
   - Status: `NEEDS_APPROVAL`
   - Rule fired: `RULE_THRESHOLD_EXCEEDED`
   - Reason: Price ($64.20) exceeds auto-approval threshold of $40.00.
4. Switch to the **Dashboard** tab.
5. In the **Pending approvals** queue, review the item and click **Approve & Pay ($64.20)**.
6. A PayPal sandbox session is created only upon manual approval.

### 4. Blocked Purchase (`BLOCKED`)
1. In the **Chat** tab, click **Running shoes (Blocked category)** or type:
   > *"Buy lightweight running shoes"*
2. The agent discovers shoes in the `apparel` category.
3. The policy engine evaluates the proposal:
   - Status: `BLOCKED BY POLICY`
   - Rule fired: `RULE_CATEGORY_BLOCKED`
   - Reason: Category 'apparel' is not in the allowed categories list.
4. Checkout is disabled. Zero network calls to PayPal are made.

### 5. Audit Log Inspection
1. Click the **Audit log** tab.
2. View chronological records: `RULE_PARSED`, `POLICY_CONFIRMED`, `AGENT_PROPOSAL`, `PAYPAL_ORDER_CREATED`, `PAYPAL_ORDER_CAPTURED`.
3. Click any row to inspect the JSON payload containing internal IDs, PayPal capture IDs, and rule attribution.
4. Filter events using the search bar (e.g., search `CAPTURE` or `BLOCKED`).

---

## Limitations

- **Sandbox only:** All transactions execute against the PayPal Sandbox environment (`api-m.sandbox.paypal.com`). No real money is transferred.
- **Single demo user:** Authentication is scoped to a single local user session for hackathon evaluation; multi-tenant user authentication is not implemented.
- **Ephemeral storage on Render:** Render free-tier web services use ephemeral disk storage that resets upon container restart. SpendGuard handles this by automatically running `lib/db/seed.ts` on cold start to initialize the database with baseline policy and transaction data.
- **Desktop viewport:** The interface is designed for desktop browser evaluation (1280px+); a responsive mobile layout was not prioritized within the 5-day hackathon scope.
- **Channel3 catalog fallback:** If a Channel3 API key is not supplied, the catalog provider falls back to a curated local inventory of realistic hardware, electronics, and office supplies.

---

## Render Deployment and Webhooks

### Render Configuration (`render.yaml`)
A `render.yaml` specification is included in the repository:
- **Runtime:** Node.js
- **Build command:** `npm install && npm run build`
- **Start command:** `npm start`
- **Port:** Configured via `PORT` (defaults to 3000)

### Database Seeding
The SQLite database automatically seeds default records on first run. To manually re-seed:
```bash
npm run seed
```

### PayPal Webhook Setup for Deployed URL
1. Log in to [developer.paypal.com](https://developer.paypal.com) > **Apps & Credentials** > select your app.
2. Click **Add Webhook**.
3. Set the Webhook URL:
   ```
   https://<your-render-app-url>.onrender.com/api/webhooks/paypal
   ```
4. Subscribe to events:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.REFUNDED`
   - `CHECKOUT.ORDER.APPROVED`
5. Copy the **Webhook ID** into Render environment variables as `PAYPAL_WEBHOOK_ID`.
6. Webhook payloads are verified server-side via PayPal's `POST /v1/notifications/verify-webhook-signature` endpoint.

---

## Health Monitoring

A read-only health endpoint is available at `/api/health` to monitor service connectivity:
- **Database:** Executes a test query against SQLite with latency measurement.
- **PayPal Auth:** Validates client credentials against the PayPal sandbox OAuth endpoint.
- **Channel3:** Verifies API reachability and key authorization.

```bash
curl http://localhost:3000/api/health
```

Example response:
```json
{
  "status": "healthy",
  "timestamp": "2026-11-08T16:30:00.000Z",
  "version": "0.1.0",
  "services": {
    "database": { "status": "reachable", "latencyMs": 1 },
    "paypal": { "status": "reachable", "environment": "sandbox", "latencyMs": 142 },
    "channel3": { "status": "reachable", "latencyMs": 85 }
  }
}
```

---

## Security and Repository Hygiene

- **No secrets in repository:** Verified with `git log -p`. All credentials (`PAYPAL_CLIENT_SECRET`, `GEMINI_API_KEY`) reside exclusively in `.env` (git-ignored) and are masked in audit payloads.
- **Open-source license:** Released under the [MIT License](LICENSE).
- **Executable implementation:** End-to-end integration with SQLite storage, live PayPal Orders v2 sandbox checkout, and Gemini tool calling.
- **No third-party trademarks:** Generic SVG icons are used in place of retailer logos.

---

## Technical Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 15.5 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS, Lucide React Icons |
| **Database** | SQLite via native `node:sqlite` |
| **AI / LLM** | Google Gemini 2.5 Flash (`@google/genai`) with Structured Outputs & Function Calling |
| **Payments** | PayPal REST API (Orders v2 Sandbox, Payments v2, OAuth2, Webhooks) |
| **Catalog** | Channel3 Search API (`https://api.trychannel3.com/v1`) with offline fallback |
| **Deployment** | Render (`render.yaml`) |
