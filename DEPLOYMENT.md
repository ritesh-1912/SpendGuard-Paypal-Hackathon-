# Deployment Guide

This guide covers deploying SpendGuard to Render and configuring PayPal webhooks.

---

## Architecture and Ephemeral Storage

SpendGuard runs as a Node.js web service on Render:
- **Build command:** `npm install && npm run build`
- **Start command:** `npm start`
- **Node runtime:** Node.js 22.x (required for native `node:sqlite`)

### SQLite Persistence Note
Render free-tier instances run on ephemeral containers that reset their local filesystems on redeployment or restart. SpendGuard handles this automatically:
- When the database file does not exist, `lib/db/index.ts` automatically runs `initializeSchema()` and `seedDemoData()`.
- The database is immediately initialized with a working default policy ($150/month, ask above $40), an active budget ledger, sample past transactions, and baseline audit logs.
- The demo environment is always functional upon deployment without manual intervention.

---

## Deployment Options

### Option A: Blueprint Deploy (Recommended)
Render automatically detects the included `render.yaml` specification:

1. Push this repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New** > **Blueprint**.
3. Connect your repository. Render will parse `render.yaml` and prompt for sensitive environment variables.
4. Fill in the required environment variables (see table below) and click **Apply**.

### Option B: Manual Web Service Setup
1. In the [Render Dashboard](https://dashboard.render.com), click **New** > **Web Service**.
2. Connect your repository.
3. Configure settings:
   - **Name:** `spendguard`
   - **Environment:** `Node`
   - **Region:** Any (e.g. `Oregon`)
   - **Branch:** `main`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free
4. Add the environment variables listed below.

---

## Environment Variables

| Variable | Required | Description | Example / Default |
| :--- | :--- | :--- | :--- |
| `NODE_VERSION` | Yes | Node.js version | `22.13.0` |
| `NEXT_PUBLIC_APP_URL` | Yes | Public HTTPS URL of the deployed application | `https://spendguard.onrender.com` |
| `PAYPAL_ENVIRONMENT` | Yes | PayPal environment mode | `sandbox` |
| `PAYPAL_CLIENT_ID` | Yes | PayPal REST app client ID | From PayPal Developer Dashboard |
| `PAYPAL_CLIENT_SECRET` | Yes | PayPal REST app client secret | From PayPal Developer Dashboard |
| `PAYPAL_WEBHOOK_ID` | Post-deploy | Webhook ID generated after URL registration | Leave blank initially; add after Step 4 |
| `GEMINI_API_KEY` | Conditional | Google Gemini API key (required if `DEMO_OFFLINE=false`) | From Google AI Studio |
| `GEMINI_MODEL` | No | Gemini model name | `gemini-2.5-flash` |
| `CHANNEL3_API_KEY` | Conditional | Channel3 product search API key | From trychannel3.com |
| `CHANNEL3_BASE_URL` | No | Channel3 API base endpoint | `https://api.trychannel3.com/v1` |
| `DEMO_OFFLINE` | No | Enable curated sample catalog if API keys are omitted | `false` (set `true` for offline mode) |
| `DATABASE_PATH` | No | SQLite database file location | `./data/spendguard.db` |
| `MOCK_PAYPAL_CAPTURE`| No | Mock sandbox checkout without live PayPal API | `false` |

---

## PayPal Webhook Registration

After your service is deployed and has a public URL (e.g. `https://spendguard.onrender.com`), register the webhook in the PayPal Developer Dashboard:

### Step 1: Open Your Sandbox App
1. Go to the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications/sandbox).
2. Under **REST API apps**, select the application associated with your `PAYPAL_CLIENT_ID`.

### Step 2: Add Webhook Endpoint
1. Scroll down to the **Webhooks** section.
2. Click **Add Webhook**.
3. Enter the Webhook URL:
   ```
   https://<your-service-name>.onrender.com/api/webhooks/paypal
   ```

### Step 3: Select Webhook Events
Check the boxes for the following events:
- **Payment capture completed** (`PAYMENT.CAPTURE.COMPLETED`)
- **Payment capture refunded** (`PAYMENT.CAPTURE.REFUNDED`)
- **Checkout order approved** (`CHECKOUT.ORDER.APPROVED`)

### Step 4: Save and Copy Webhook ID
1. Click **Save**.
2. Copy the generated **Webhook ID** displayed in the table (format: `9AB12345CD67890EF`).

### Step 5: Update Render Environment Variables
1. Return to your Render Dashboard > select your `spendguard` service > **Environment**.
2. Set `PAYPAL_WEBHOOK_ID` to the copied Webhook ID.
3. Save changes. Render will automatically redeploy the service with webhook signature verification enabled.

---

## Post-Deployment Verification

1. **Health Check:**
   Open `https://<your-service-name>.onrender.com/api/health` in your browser or run:
   ```bash
   curl https://<your-service-name>.onrender.com/api/health
   ```
   Verify that `status` returns `"healthy"` and all services (database, PayPal, Channel3) are reachable.

2. **Policy Configuration:**
   Navigate to the **Policy** tab and verify the default active spending rules render.

3. **Purchase Flow:**
   In the **Chat** tab, click **USB-C Hub ($38.50 - Auto-approve)**, generate a PayPal sandbox order, and verify redirection through PayPal sandbox checkout.
