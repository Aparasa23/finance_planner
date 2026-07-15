# Security & Threat Model

This document outlines the security architecture, data isolation policies, and mitigations implemented in **Finance OS**.

---

## 1. Household Multi-Tenant Isolation (Row-Level Security)

To prevent cross-tenant data leakage, the Supabase database enforces Row-Level Security (RLS) on all user-facing tables.

* **Tenant Key**: Every table (accounts, transactions, bills, plans) contains a `household_id` UUID column.
* **RLS Policies**: When a query is executed, Supabase evaluates the user session context `auth.uid()`, mapping it to their active profile:
  ```sql
  CREATE POLICY household_isolation_policy ON transactions
    FOR ALL
    TO authenticated
    USING (
      household_id = (SELECT household_id FROM profiles WHERE id = auth.uid())
    );
  ```
* **Bypass Mitigation**: Direct Supabase client queries originating from the browser can *never* read, insert, or modify data belonging to other households, regardless of query structure.

---

## 2. LLM Prompt Injection & SQL Safety

Conversational AI models can be vulnerable to prompt injection attacks where a user attempts to retrieve other users' data or run arbitrary SQL statements.

* **Zero Arbitrary Queries**: The Gemini model has *no* ability to write or execute SQL.
* **Allowlisted Context Tools**: The assistant can only query data by executing a strict set of predefined, read-only JavaScript tool handlers:
  * `getHouseholdAccounts`
  * `getHouseholdTransactions`
  * `getHouseholdBills`
  * `getHouseholdSavingsGoals`
* **Tenant Bound Parameters**: Every tool function is hardwired on the server to enforce the caller's verified `householdId` retrieved from Supabase Auth session metadata.

---

## 3. PWA lockscreen Redaction & Quiet Hours

Mobile notifications visible on lockscreens can leak private financial data (such as bank balances or large purchase transactions).

* **Dollar Value Redaction**: When enabled or during quiet hours, the notification dispatcher strips exact currency details, replacing `$\d+` matches with `[Amount]`.
* **Quiet Hours**: During local quiet periods (default 10 PM - 8 AM), push notifications are set to `silent: true` with low priority banners, avoiding disruption.
