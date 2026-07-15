-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. households Table
CREATE TABLE public.households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE,
    invite_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. profiles Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    name TEXT,
    role TEXT CHECK (role IN ('owner', 'member')) DEFAULT 'owner',
    notification_preferences JSONB DEFAULT '{"email": true, "push": true, "quiet_hours_enabled": false, "quiet_hours_start": "22:00", "quiet_hours_end": "08:00"}'::jsonb NOT NULL,
    timezone TEXT DEFAULT 'America/New_York' NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. user_settings Table
CREATE TABLE public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    theme TEXT DEFAULT 'dark' NOT NULL,
    dashboard_layout JSONB DEFAULT '[]'::jsonb NOT NULL,
    feature_flags JSONB DEFAULT '{"plaid_enabled": true, "ai_assistant_enabled": false, "push_notifications_enabled": true, "household_sharing_enabled": true}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. financial_connections Table
CREATE TABLE public.financial_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
    provider TEXT CHECK (provider IN ('plaid', 'mock')) NOT NULL,
    access_token TEXT NOT NULL, -- Encrypted value
    item_id TEXT NOT NULL,
    status TEXT CHECK (status IN ('active', 'error', 'reconnect_required')) DEFAULT 'active' NOT NULL,
    error_code TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_item_per_household UNIQUE (household_id, item_id)
);

-- 5. financial_accounts Table
CREATE TABLE public.financial_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES public.financial_connections(id) ON DELETE CASCADE,
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- checking, savings, credit, loan, investment, manual_asset, manual_liability
    subtype TEXT,       -- checking, savings, credit card, mortgage, auto, student, personal, etc.
    mask TEXT,          -- masked last 4 digits
    current_balance NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    available_balance NUMERIC(15, 2),
    credit_limit NUMERIC(15, 2),
    is_included_net_worth BOOLEAN DEFAULT true NOT NULL,
    is_included_spending BOOLEAN DEFAULT true NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. recurring_streams Table
CREATE TABLE public.recurring_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
    merchant_name TEXT NOT NULL,
    display_name TEXT,
    category TEXT NOT NULL,
    frequency TEXT CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually', 'semiannually', 'irregular')) NOT NULL,
    typical_amount NUMERIC(15, 2) NOT NULL,
    min_amount NUMERIC(15, 2),
    max_amount NUMERIC(15, 2),
    avg_amount NUMERIC(15, 2),
    expected_next_date DATE NOT NULL,
    date_tolerance INTEGER DEFAULT 3 NOT NULL, -- days tolerance
    amount_tolerance NUMERIC(5, 2) DEFAULT 0.10 NOT NULL, -- percentage tolerance (10%)
    account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
    autopay_likelihood NUMERIC(3, 2) DEFAULT 0.00 NOT NULL, -- probability 0 to 1
    confidence_score NUMERIC(3, 2) DEFAULT 0.00 NOT NULL, -- probability 0 to 1
    status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active' NOT NULL,
    user_confirmed BOOLEAN DEFAULT false NOT NULL,
    last_matching_transaction_id UUID, -- self reference handled separately if needed
    next_expected_transaction_id UUID,
    notification_preferences JSONB DEFAULT '{"alert_on_amount_change": true, "alert_on_missed": true}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. transactions Table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.financial_accounts(id) ON DELETE CASCADE NOT NULL,
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
    external_id TEXT, -- external Plaid/provider ID
    date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL, -- positive is expense, negative is income (Plaid standard or user preferences)
    description TEXT NOT NULL,
    normalized_merchant TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    pending BOOLEAN DEFAULT false NOT NULL,
    recurring_stream_id UUID REFERENCES public.recurring_streams(id) ON DELETE SET NULL,
    is_excluded_reports BOOLEAN DEFAULT false NOT NULL,
    notes TEXT,
    tags TEXT[] DEFAULT '{}'::text[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_external_id UNIQUE (external_id)
);

-- Update recurring_streams last/next matching transaction FKs
ALTER TABLE public.recurring_streams 
ADD CONSTRAINT fk_last_matching_transaction 
FOREIGN KEY (last_matching_transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;

-- 8. bills Table
CREATE TABLE public.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    merchant_aliases TEXT[] DEFAULT '{}'::text[] NOT NULL,
    expected_amount NUMERIC(15, 2) NOT NULL,
    is_fixed BOOLEAN DEFAULT true NOT NULL,
    due_date_day INTEGER CHECK (due_date_day >= 1 AND due_date_day <= 31),
    frequency TEXT CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually', 'semiannually')) NOT NULL,
    account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
    autopay BOOLEAN DEFAULT false NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    active BOOLEAN DEFAULT true NOT NULL,
    reminder_schedule TEXT[] DEFAULT '{"1_day_before", "3_days_before"}'::text[] NOT NULL,
    matching_rules JSONB DEFAULT '{}'::jsonb NOT NULL,
    recurring_stream_id UUID REFERENCES public.recurring_streams(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. bill_occurrences Table
CREATE TABLE public.bill_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
    due_date DATE NOT NULL,
    expected_amount NUMERIC(15, 2) NOT NULL,
    status TEXT CHECK (status IN ('upcoming', 'due_soon', 'due_today', 'pending', 'paid', 'partially_paid', 'possibly_missed', 'overdue', 'skipped', 'cancelled', 'needs_review')) DEFAULT 'upcoming' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_due_date_per_bill UNIQUE (bill_id, due_date)
);

-- 10. payment_matches Table
CREATE TABLE public.payment_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occurrence_id UUID REFERENCES public.bill_occurrences(id) ON DELETE CASCADE NOT NULL,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
    match_score NUMERIC(5, 4) NOT NULL, -- e.g. 0.9500
    match_reason TEXT NOT NULL,
    auto_accepted BOOLEAN DEFAULT true NOT NULL,
    user_overridden BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_occurrence_match UNIQUE (occurrence_id)
);

-- 11. credit_cards Table
CREATE TABLE public.credit_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.financial_accounts(id) ON DELETE CASCADE UNIQUE NOT NULL,
    statement_balance NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    minimum_payment NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    due_date DATE,
    statement_closing_date DATE,
    utilization_alert_threshold NUMERIC(3, 2) DEFAULT 0.30 NOT NULL, -- 30% utilization alert
    auto_pay_status TEXT CHECK (auto_pay_status IN ('enabled', 'disabled', 'unknown')) DEFAULT 'unknown' NOT NULL,
    payment_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
    annual_fee NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    rewards_category TEXT,
    last_payment_date DATE,
    next_expected_payment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. installment_plans Table
CREATE TABLE public.installment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    original_purchase_amount NUMERIC(15, 2) NOT NULL,
    down_payment NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    financed_principal NUMERIC(15, 2) NOT NULL,
    interest_rate NUMERIC(5, 4) DEFAULT 0.0000 NOT NULL, -- e.g. 0.0000 for 0%
    apr NUMERIC(5, 4) DEFAULT 0.0000 NOT NULL,
    fees NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    regular_payment_amount NUMERIC(15, 2) NOT NULL,
    payment_frequency TEXT CHECK (payment_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually')) NOT NULL,
    total_scheduled_payments INTEGER NOT NULL,
    payments_completed INTEGER DEFAULT 0 NOT NULL,
    payments_remaining INTEGER NOT NULL,
    total_amount_paid NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    principal_paid NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    interest_paid NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    remaining_principal NUMERIC(15, 2) NOT NULL,
    current_payoff_amount NUMERIC(15, 2) NOT NULL,
    start_date DATE NOT NULL,
    next_due_date DATE,
    expected_payoff_date DATE,
    account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
    autopay BOOLEAN DEFAULT false NOT NULL,
    recurring_stream_id UUID REFERENCES public.recurring_streams(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. mortgage_details Table
CREATE TABLE public.mortgage_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.financial_accounts(id) ON DELETE CASCADE UNIQUE NOT NULL,
    property_name TEXT NOT NULL,
    estimated_property_value NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    original_loan_amount NUMERIC(15, 2) NOT NULL,
    current_principal NUMERIC(15, 2) NOT NULL,
    interest_rate NUMERIC(5, 4) NOT NULL,
    loan_term_months INTEGER NOT NULL,
    start_date DATE NOT NULL,
    monthly_payment NUMERIC(15, 2) NOT NULL,
    principal_and_interest_payment NUMERIC(15, 2) NOT NULL,
    escrow_payment NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    property_tax NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    home_insurance NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    hoa NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    pmi NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    extra_principal_payment NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    payments_completed INTEGER DEFAULT 0 NOT NULL,
    payments_remaining INTEGER NOT NULL,
    scheduled_payoff_date DATE NOT NULL,
    estimated_equity NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    interest_paid NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    principal_paid NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. income_streams Table
CREATE TABLE public.income_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
    source TEXT NOT NULL,
    typical_amount NUMERIC(15, 2) NOT NULL,
    frequency TEXT CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'semimonthly', 'annually', 'irregular')) NOT NULL,
    expected_next_date DATE NOT NULL,
    account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
    variance_threshold NUMERIC(5, 2) DEFAULT 0.10 NOT NULL,
    last_deposit_date DATE,
    missing_alert_sent BOOLEAN DEFAULT false NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. savings_goals Table
CREATE TABLE public.savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    target_amount NUMERIC(15, 2) NOT NULL,
    current_amount NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    target_date DATE,
    monthly_target_contribution NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    linked_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
    priority INTEGER DEFAULT 1 NOT NULL,
    progress_percentage NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    on_track_status TEXT CHECK (on_track_status IN ('on_track', 'behind', 'completed', 'at_risk')) DEFAULT 'on_track' NOT NULL,
    estimated_completion_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 16. push_subscriptions Table
CREATE TABLE public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL,
    keys_p256dh TEXT NOT NULL,
    keys_auth TEXT NOT NULL,
    device_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_endpoint_per_user UNIQUE (profile_id, endpoint)
);

-- 17. transaction_rules Table
CREATE TABLE public.transaction_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
    pattern_type TEXT CHECK (pattern_type IN ('contains', 'exact', 'starts_with', 'ends_with')) NOT NULL,
    field_to_match TEXT CHECK (field_to_match IN ('description', 'merchant', 'amount')) NOT NULL,
    pattern TEXT NOT NULL,
    target_category TEXT NOT NULL,
    target_subcategory TEXT,
    target_merchant TEXT,
    priority INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 18. sync_jobs Table
CREATE TABLE public.sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
    job_type TEXT CHECK (job_type IN ('all', 'transactions', 'balances', 'liabilities')) NOT NULL,
    status TEXT CHECK (status IN ('queued', 'running', 'completed', 'failed')) DEFAULT 'queued' NOT NULL,
    error_details TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 19. webhook_events Table
CREATE TABLE public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL, -- plaid, etc.
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT CHECK (status IN ('pending', 'processed', 'failed', 'ignored')) DEFAULT 'pending' NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 20. assistant_conversations Table
CREATE TABLE public.assistant_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 21. assistant_messages Table
CREATE TABLE public.assistant_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.assistant_conversations(id) ON DELETE CASCADE NOT NULL,
    sender TEXT CHECK (sender IN ('user', 'assistant')) NOT NULL,
    content TEXT NOT NULL,
    sql_query_used TEXT,
    citations JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 22. audit_logs Table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_table TEXT NOT NULL,
    target_id UUID,
    details JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 23. notifications Table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb NOT NULL,
    type TEXT NOT NULL, -- bill_due, large_transaction, balance_alert, error, etc.
    status TEXT CHECK (status IN ('unread', 'read', 'archived', 'pending_delivery', 'delivery_failed')) DEFAULT 'unread' NOT NULL,
    dedup_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_dedup_hash_per_user UNIQUE (profile_id, dedup_hash)
);

-- Create triggers to automatically maintain updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON public.households FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_connections_updated_at BEFORE UPDATE ON public.financial_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_accounts_updated_at BEFORE UPDATE ON public.financial_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recurring_streams_updated_at BEFORE UPDATE ON public.recurring_streams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bill_occurrences_updated_at BEFORE UPDATE ON public.bill_occurrences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_matches_updated_at BEFORE UPDATE ON public.payment_matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credit_cards_updated_at BEFORE UPDATE ON public.credit_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_installment_plans_updated_at BEFORE UPDATE ON public.installment_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mortgage_details_updated_at BEFORE UPDATE ON public.mortgage_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_income_streams_updated_at BEFORE UPDATE ON public.income_streams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_savings_goals_updated_at BEFORE UPDATE ON public.savings_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transaction_rules_updated_at BEFORE UPDATE ON public.transaction_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assistant_conversations_updated_at BEFORE UPDATE ON public.assistant_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically create a profile and user_settings row for new signup in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_household_id UUID;
    household_name TEXT;
BEGIN
    -- Create a default household for the new user
    household_name := COALESCE(NEW.raw_user_meta_data->>'name', 'My Household');
    INSERT INTO public.households (name)
    VALUES (household_name)
    RETURNING id INTO new_household_id;

    -- Insert into public.profiles
    INSERT INTO public.profiles (id, household_id, email, name, role)
    VALUES (
        NEW.id,
        new_household_id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        'owner'
    );

    -- Insert default user settings
    INSERT INTO public.user_settings (profile_id)
    VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes for performance
CREATE INDEX idx_profiles_household_id ON public.profiles(household_id);
CREATE INDEX idx_financial_connections_household_id ON public.financial_connections(household_id);
CREATE INDEX idx_financial_accounts_connection_id ON public.financial_accounts(connection_id);
CREATE INDEX idx_financial_accounts_household_id ON public.financial_accounts(household_id);
CREATE INDEX idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX idx_transactions_household_id ON public.transactions(household_id);
CREATE INDEX idx_transactions_date ON public.transactions(date);
CREATE INDEX idx_transactions_recurring_stream_id ON public.transactions(recurring_stream_id);
CREATE INDEX idx_recurring_streams_household_id ON public.recurring_streams(household_id);
CREATE INDEX idx_bills_household_id ON public.bills(household_id);
CREATE INDEX idx_bill_occurrences_bill_id ON public.bill_occurrences(bill_id);
CREATE INDEX idx_bill_occurrences_due_date ON public.bill_occurrences(due_date);
CREATE INDEX idx_payment_matches_occurrence_id ON public.payment_matches(occurrence_id);
CREATE INDEX idx_payment_matches_transaction_id ON public.payment_matches(transaction_id);
CREATE INDEX idx_credit_cards_account_id ON public.credit_cards(account_id);
CREATE INDEX idx_installment_plans_household_id ON public.installment_plans(household_id);
CREATE INDEX idx_mortgage_details_account_id ON public.mortgage_details(account_id);
CREATE INDEX idx_income_streams_household_id ON public.income_streams(household_id);
CREATE INDEX idx_savings_goals_household_id ON public.savings_goals(household_id);
CREATE INDEX idx_push_subscriptions_profile_id ON public.push_subscriptions(profile_id);
CREATE INDEX idx_transaction_rules_household_id ON public.transaction_rules(household_id);
CREATE INDEX idx_notifications_profile_id ON public.notifications(profile_id);

-- Enable Row-Level Security on all public tables
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mortgage_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY; -- webhook logs might not contain household_id, secure differently
ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper SQL Functions for Policies to prevent recursion
CREATE OR REPLACE FUNCTION public.get_user_household()
RETURNS UUID AS $$
    SELECT household_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS Policies

-- Households
CREATE POLICY household_access ON public.households
    FOR ALL TO authenticated
    USING (id = public.get_user_household());

-- Profiles
CREATE POLICY profile_self ON public.profiles
    FOR ALL TO authenticated
    USING (id = auth.uid());

CREATE POLICY profile_household_members ON public.profiles
    FOR SELECT TO authenticated
    USING (household_id = public.get_user_household());

-- User Settings
CREATE POLICY user_settings_self ON public.user_settings
    FOR ALL TO authenticated
    USING (profile_id = auth.uid());

-- Financial Connections
CREATE POLICY connections_household ON public.financial_connections
    FOR ALL TO authenticated
    USING (household_id = public.get_user_household());

-- Financial Accounts
CREATE POLICY accounts_household ON public.financial_accounts
    FOR ALL TO authenticated
    USING (household_id = public.get_user_household());

-- Recurring Streams
CREATE POLICY streams_household ON public.recurring_streams
    FOR ALL TO authenticated
    USING (household_id = public.get_user_household());

-- Transactions
CREATE POLICY transactions_household ON public.transactions
    FOR ALL TO authenticated
    USING (household_id = public.get_user_household());

-- Bills
CREATE POLICY bills_household ON public.bills
    FOR ALL TO authenticated
    USING (household_id = public.get_user_household());

-- Bill Occurrences
CREATE POLICY occurrences_household ON public.bill_occurrences
    FOR ALL TO authenticated
    USING (
        bill_id IN (
            SELECT id FROM public.bills WHERE household_id = public.get_user_household()
        )
    );

-- Payment Matches
CREATE POLICY matches_household ON public.payment_matches
    FOR ALL TO authenticated
    USING (
        occurrence_id IN (
            SELECT o.id FROM public.bill_occurrences o
            JOIN public.bills b ON o.bill_id = b.id
            WHERE b.household_id = public.get_user_household()
        )
    );

-- Credit Cards
CREATE POLICY credit_cards_household ON public.credit_cards
    FOR ALL TO authenticated
    USING (
        account_id IN (
            SELECT id FROM public.financial_accounts WHERE household_id = public.get_user_household()
        )
    );

-- Installment Plans
CREATE POLICY installment_plans_household ON public.installment_plans
    FOR ALL TO authenticated
    USING (household_id = public.get_user_household());

-- Mortgage Details
CREATE POLICY mortgage_details_household ON public.mortgage_details
    FOR ALL TO authenticated
    USING (
        account_id IN (
            SELECT id FROM public.financial_accounts WHERE household_id = public.get_user_household()
        )
    );

-- Income Streams
CREATE POLICY income_streams_household ON public.income_streams
    FOR ALL TO authenticated
    USING (household_id = public.get_user_household());

-- Savings Goals
CREATE POLICY savings_goals_household ON public.savings_goals
    FOR ALL TO authenticated
    USING (household_id = public.get_user_household());

-- Push Subscriptions
CREATE POLICY push_subscriptions_self ON public.push_subscriptions
    FOR ALL TO authenticated
    USING (profile_id = auth.uid());

-- Transaction Rules
CREATE POLICY transaction_rules_household ON public.transaction_rules
    FOR ALL TO authenticated
    USING (household_id = public.get_user_household());

-- Sync Jobs
CREATE POLICY sync_jobs_household ON public.sync_jobs
    FOR ALL TO authenticated
    USING (household_id = public.get_user_household());

-- Webhook Events (Only service role or admin should write/update, but we can allow reading for debugging logs associated with their household if they own the connection)
-- To keep it secure, webhook_events is restricted to admin/service role. Let's write RLS:
CREATE POLICY webhook_events_service_role ON public.webhook_events
    FOR ALL TO service_role
    USING (true);

-- Assistant Conversations
CREATE POLICY assistant_conversations_self ON public.assistant_conversations
    FOR ALL TO authenticated
    USING (profile_id = auth.uid());

-- Assistant Messages
CREATE POLICY assistant_messages_self ON public.assistant_messages
    FOR ALL TO authenticated
    USING (
        conversation_id IN (
            SELECT id FROM public.assistant_conversations WHERE profile_id = auth.uid()
        )
    );

-- Audit Logs
CREATE POLICY audit_logs_household ON public.audit_logs
    FOR SELECT TO authenticated
    USING (household_id = public.get_user_household());

CREATE POLICY audit_logs_insert ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (household_id = public.get_user_household() AND profile_id = auth.uid());

-- Notifications
CREATE POLICY notifications_self ON public.notifications
    FOR ALL TO authenticated
    USING (profile_id = auth.uid());
