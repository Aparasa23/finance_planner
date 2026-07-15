# Finance OS System Architecture

This document provides a technical design overview of the **Finance OS** application, outlining its system modules, database models, and execution lifecycles.

---

## 1. System Topology

```
+-------------------------------------------------------------+
|               Client Side (Android PWA / Web Browser)       |
|  - Next.js Client Views (Dashboard, Analytics, Savings)     |
|  - Service Worker (Offline pages, web push subscriptions)    |
+-------------------------------------------------------------+
                             | |
                   Secure HTTPS REST / Actions
                             | |
                             v
+-------------------------------------------------------------+
|                 Next.js App Router Server                   |
|  - Server Pages & Actions (Protected via middleware proxy)  |
|  - Sync & Forecaster engines (Plaid vs Mock)                |
|  - Gemini AI Assistant Coordinator (allowlisted tool rules) |
+-------------------------------------------------------------+
                             | |
                    PostgreSQL TCP / HTTPS
                             | |
                             v
+-------------------------------------------------------------+
|                 Supabase PostgreSQL Database                |
|  - Normalized financial tables (loans, bills, plans)       |
|  - Row-Level Security (RLS) household-level constraints    |
|  - Triggers (automatic profiles provisioning, audits)       |
+-------------------------------------------------------------+
```

---

## 2. Ingestion & Synchronization Flow

When Plaid emits a `TRANSACTIONS` or `SYNC_UPDATES_AVAILABLE` webhook, or the user clicks "Force Synchronize":

1. **Exchange Public Token**: Web link obtains a `public_token` and exchanges it for a persistent `access_token` stored under `financial_connections`.
2. **Retrieve Schema Delta**: Ingestion engine calls `syncTransactions(accessToken, cursor)` to parse added, modified, and removed entries.
3. **Normalize Categories**:
   * Evaluates custom household `transaction_rules`.
   * Matches string tokens (`contains`, `starts_with`, `ends_with`, `exact`) to apply custom categories and clean merchant names.
4. **Fuzzy Bill Matcher**:
   * Scans outstanding `bill_occurrences` within $\pm 7$ days.
   * Calculates scores: $45\% \text{ merchant similarity} + 35\% \text{ amount proximity} + 20\% \text{ date closeness}$.
   * Matches $\ge 85\%$ are marked **paid**, updating linked installment plan progress. Matches $\ge 60\%$ are flagged for **review**.

---

## 3. Projection Model

The **Forecasting Engine** projects liquid assets over 30 days:
$$\text{Projected Balance}(t) = \text{Starting Balance} + \sum_{i=1}^t \text{Paydays}(i) - \sum_{i=1}^t \text{Bills}(i)$$
* **Starting Balance**: Aggregate checking + savings balances.
* **Paydays**: Projected recurring income paydates calculated from historical gaps.
* **Overdraft Buffer**: If $\text{Projected Balance}(t) < \$100$, an overdraft risk marker is logged on date $t$, sending a PWA alert.
