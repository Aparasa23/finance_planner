# Privacy Policy & Data Processing

This document outlines the privacy design and data processing boundaries of **Finance OS**.

---

## 1. Local-First Sandbox Mode

* **No Credentials Required**: Finance OS supports a zero-configuration sandbox mode. If no Supabase or Plaid API keys are detected, the app automatically runs in **Offline Sandbox Mode**.
* **Local Data Simulation**: All financial account balances, bills, and transaction streams rendered in sandbox mode are mock calculations resolved locally on the server. No real credentials or financial data are processed or transmitted.

---

## 2. Personal Supabase Instance Boundaries

When deployed in production, **Finance OS** connects to the user's private Supabase Postgres instance.

* **Private Ownership**: All decrypted transaction entries, profile settings, and subscription keys reside strictly in your private database. No central server or third-party host can inspect or read your household data.
* **No Telemetry**: The application does not collect usage patterns, feature clicks, or budget aggregates.

---

## 3. Financial Data Aggregation (Plaid)

* **Direct Token Exchanges**: Plaid link exchanges occur server-side directly between your Next.js server instance and Plaid's endpoints.
* **Read-Only Privileges**: Linked institution credentials are read-only. The system can sync balances and statements but possesses no payment capabilities or write permissions to change checking balances.
* **Disconnections**: Tapping "Disconnect Bank" completely deletes the active Plaid credentials (`access_token` and `item_id`) and associated synced transactions from your database.
