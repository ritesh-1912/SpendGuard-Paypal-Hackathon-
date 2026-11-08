# Project Brief: SpendGuard

> **Source of Truth** for every task in this repository.

**PROJECT:** "SpendGuard" (working name), for the PayPal AI Hackathon (Devpost). Hard deadline in 5 days, so scope discipline matters.  
**Repository:** https://github.com/ritesh-1912/SpendGuard-Paypal-Hackathon-.git

---

## Goal
Let users safely give an AI shopping agent permission to spend money. The user sets rules in plain language (e.g. "max $150/month, electronics and books only, ask me before anything over $40"). The agent finds products, and every purchase goes through a guardrail layer before PayPal is charged.

---

## Core Principle
**The LLM proposes, deterministic code decides.**  
Gemini parses rules and chooses products; a deterministic policy engine (not the LLM) approves, blocks, or escalates each purchase.

---

## User Flow
1. **Rule Setup:** User types spending rules. Gemini converts them to a structured policy JSON (structured output). The user reviews and confirms the parsed policy before it takes effect.
2. **Shopping Chat:** User chats with the agent: "buy a USB-C hub under $40".
3. **Product Discovery:** Agent searches products via the Channel3 API, picks candidates, and proposes a purchase with reasoning.
4. **Policy Evaluation:** Policy engine returns one of: `AUTO_APPROVE`, `NEEDS_APPROVAL`, `BLOCKED`, plus the exact rule that fired.
5. **Checkout & Capture:** For approved purchases, create a PayPal order (sandbox, Orders v2). The buyer approves in PayPal, then we capture.
6. **Audit Logging:** Every step is written to an audit log (what the agent proposed, which rule fired, decision, PayPal order/capture IDs).
7. **Dashboard:** Spend vs budget, pending approvals, audit log, policy editor.
8. **Webhooks:** PayPal webhooks update payment status.

---

## Stack
- **Framework & Language:** TypeScript, Next.js (App Router) full-stack
- **AI / LLM:** Gemini API with function calling for the agent
- **Payments:** PayPal REST API (sandbox, Orders v2) server-side
- **Product Catalog / Search:** Channel3 API
- **Database:** SQLite for storage
- **Deployment:** Render

---

## Scope & Priority

### Must Have
- End-to-end working flow
- Policy engine with tests
- Approval step
- Audit log
- Dashboard
- Render deploy
- README with setup + sandbox test instructions

### Nice to Have
- Refunds/undo within a time window
- Spending-by-category chart
- Webhook-driven status

### Out of Scope
- Real money
- User auth beyond a simple demo user
- Mobile layout

---

## Hackathon Rules to Respect
- PayPal integration must be central.
- The project must run end-to-end (no mockups).
- Public repo with an open-source license.
- No secrets in the repo.
- Judges may run it from the README.
- Judging is equally weighted on technical implementation, design, impact, innovation, and presentation.
