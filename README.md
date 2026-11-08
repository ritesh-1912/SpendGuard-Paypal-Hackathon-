# SpendGuard 🛡️

> **PayPal AI Hackathon (Devpost)**  
> **Core Principle:** *The LLM proposes, deterministic code decides.*

SpendGuard gives AI shopping agents safe, constrained permission to purchase products within human-defined spending policies. Gemini parses user rules into structured JSON, an agent discovers products via the Channel3 API, and a 100% deterministic policy engine evaluates every purchase proposal before a single dollar is touched on PayPal.

---

## Architecture Overview

```
User Prompt ──> Channel3 Discovery ──> Pure Deterministic Policy Gate ──> PayPal Orders v2 Sandbox
                                       │ (AUTO_APPROVE / NEEDS_APPROVAL / BLOCKED)
                                       └──> Immutable SQLite Audit Log
```

- **Framework:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Database:** SQLite (`node:sqlite`) with WAL mode
- **Payments:** PayPal Orders v2 REST API (Sandbox)
- **Product Catalog:** Channel3 API (`https://api.trychannel3.com/v1`)
- **Testing:** 18 comprehensive deterministic policy test cases

---

## Quickstart Guide

### 1. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Open `.env` and configure your credentials:
```bash
# PayPal Sandbox Credentials (from developer.paypal.com/dashboard/applications/sandbox)
PAYPAL_ENVIRONMENT="sandbox"
PAYPAL_CLIENT_ID="your_sandbox_client_id"
PAYPAL_CLIENT_SECRET="your_sandbox_client_secret"

# Channel3 API Key (from trychannel3.com, optional - defaults to reference catalog)
CHANNEL3_API_KEY=""

# Testing toggle: set to false to enforce live PayPal sandbox calls
MOCK_PAYPAL_CAPTURE="false"
```

### 2. Run the Deterministic Policy Engine Test Suite
Run the 18 automated unit test cases:
```bash
npm test
```
All 18 tests execute in <150ms testing boundaries, currency mismatches, blacklists, and duplicate windows.

### 3. Start the Next.js Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Testing with PayPal Sandbox Buyer Account

1. **Active Guardrail Policy (Hard-coded Source of Truth):**
   - **Monthly Budget:** $150.00
   - **Approval Threshold:** Ask user before buying anything > $40.00
   - **Hard Max Limit:** Block anything > $100.00
   - **Allowed Categories:** `electronics`, `books`
   - **Blocked Categories:** `apparel`, `weapons`
   - **Blocked Merchants:** `temu.com`, `aliexpress.com`

2. **Scenario A: Auto-Approved Purchase (`AUTO_APPROVE`)**
   - Click the preset pill **"⚡ Under $40 (Auto-Approve)"** or search `"USB-C hub"`.
   - Click the **Anker USB-C Hub** ($39.99).
   - Observe the policy engine decision: **`AUTO_APPROVE`** (Rule: `RULE_AUTO_APPROVE_CRITERIA_MET`).
   - Click **"Create PayPal Sandbox Order ($39.99)"**.
   - SpendGuard calls PayPal `POST /v2/checkout/orders` and returns an active sandbox approval link.
   - Click **"Pay with PayPal Sandbox"** $\rightarrow$ Logs into PayPal Sandbox as test buyer $\rightarrow$ Click **"Complete Purchase"**.
   - PayPal redirects back to SpendGuard `/checkout/success` $\rightarrow$ Server executes `POST /v2/checkout/orders/{id}/capture`.
   - Observe the PayPal Capture ID (`2XX...`), the updated budget ledger ($39.99 spent / $110.01 remaining), and the audit log entry.

3. **Scenario B: Escalated Purchase (`NEEDS_APPROVAL`)**
   - Click **"⚠️ $65 Keyboard (Needs-Approval)"**.
   - Select the **Keychron Mechanical Keyboard** ($64.99).
   - Observe decision: **`NEEDS_APPROVAL`** (Rule: `RULE_THRESHOLD_EXCEEDED`).
   - Click **"Approve & Proceed to PayPal Sandbox ($64.99)"** to grant manual human permission.

4. **Scenario C: Deterministically Blocked Purchase (`BLOCKED`)**
   - Click **"🛑 $348 Headphones (Hard Cap)"** or **"🛑 Apparel (Category Blocked)"**.
   - Select the item $\rightarrow$ Decision is **`BLOCKED`**.
   - PayPal order creation is strictly locked; zero network calls to PayPal are permitted.

---

## License
MIT License. Open source for the PayPal AI Hackathon.
