# Production Deployment Guide

Follow these steps to deploy **Finance OS** to production using **Supabase** and **Vercel**.

---

## 1. Supabase Project Setup

1. **Create Database**: Create a new project in the [Supabase Dashboard](https://supabase.com).
2. **Apply Migrations**:
   * Navigate to the SQL Editor in your Supabase project.
   * Paste and execute the contents of the initial migration file:
     [`supabase/migrations/20260714000000_initial_schema.sql`](file:///Users/ajayparasa/Documents/Code/finance_planner/supabase/migrations/20260714000000_initial_schema.sql)
3. **Optional (Local Sandbox Test)**:
   * To pre-populate your sandbox database with realistic, relative 90-day test data, execute:
     [`supabase/seeds/seed_data.sql`](file:///Users/ajayparasa/Documents/Code/finance_planner/supabase/seeds/seed_data.sql)

---

## 2. VAPID Keys Generation (Web Push)

To enable push notifications, you need Web Push VAPID keys. You can generate them by running:

```bash
npx web-push generate-vapid-keys
```

Copy the generated public and private keys into your environment configuration.

---

## 3. Environment Variables Configuration

Configure the following environment variables in your deployment dashboard (e.g. Vercel Project Settings -> Environment Variables):

```ini
# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Required for webhook updates and background sync

# Plaid API Credentials
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
PLAID_ENV=sandbox  # sandbox, development, or production
PLAID_PRODUCTS=auth,transactions,liabilities
PLAID_COUNTRY_CODES=US

# Web Push VAPID Keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-generated-public-key
VAPID_PRIVATE_KEY=your-generated-private-key

# Gemini AI Assistant API Key
GEMINI_API_KEY=your-gemini-api-key

# General Config
NEXT_PUBLIC_APP_URL=https://your-app-domain.vercel.app
```

---

## 4. Deploying to Vercel

1. Import your `finance_planner` repository in the [Vercel Dashboard](https://vercel.com).
2. Attach the environment variables listed above.
3. Click **Deploy**.
4. Once deployed, copy your production domain URL (e.g., `https://your-app-domain.vercel.app`).
5. Update your `NEXT_PUBLIC_APP_URL` environment variable in Vercel to match this production domain URL, and trigger a redeploy.
6. Register the webhook endpoint in your Plaid developer console:
   `https://your-app-domain.vercel.app/api/webhooks/plaid`
