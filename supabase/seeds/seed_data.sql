-- 1. Create Demo User in auth.users
-- Password is 'password123'
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud,
    confirmation_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'demo@example.com',
    '$2a$10$TqyQp.L7e.5m.Xp5H5eQfeB3b8uXp5hZ5H7Jc5d5d5d5d5d5d5d5d', -- bcrypt hash for password123
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Demo Household User"}'::jsonb,
    now(),
    now(),
    'authenticated',
    'authenticated',
    ''
) ON CONFLICT (id) DO NOTHING;

-- 2. Populate financial details for Demo User's Household
DO $$
DECLARE
    demo_user_id UUID;
    demo_household_id UUID;
    
    -- Connection IDs
    plaid_conn_id UUID;
    manual_conn_id UUID;
    
    -- Account IDs
    chase_checking_id UUID;
    boa_checking_id UUID;
    apple_card_id UUID;
    rc_willey_card_id UUID;
    capone_card_id UUID;
    discover_card_id UUID;
    amex_card_id UUID;
    citi_card_id UUID;
    boa_rewards_card_id UUID;
    chase_freedom_card_id UUID;
    td_auto_loan_id UUID;
    valon_mortgage_loan_id UUID;
    
    -- Stream IDs
    salary_stream_id UUID;
    valon_stream_id UUID;
    td_auto_stream_id UUID;
    rc_willey_stream_id UUID;
    xfinity_stream_id UUID;
    enbridge_stream_id UUID;
    rocky_mtn_stream_id UUID;
    saratoga_stream_id UUID;
    netflix_stream_id UUID;
    google_one_stream_id UUID;
    vivint_stream_id UUID;
    vasa_stream_id UUID;
    
    -- Bill IDs
    valon_bill_id UUID;
    td_auto_bill_id UUID;
    rc_willey_bill_id UUID;
    xfinity_bill_id UUID;
    enbridge_bill_id UUID;
    rocky_mtn_bill_id UUID;
    saratoga_bill_id UUID;
    netflix_bill_id UUID;
    google_one_bill_id UUID;
    vivint_bill_id UUID;
    vasa_bill_id UUID;
    
    -- Date references
    today DATE := CURRENT_DATE;
    first_of_month DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
BEGIN
    -- Fetch the first user in auth.users
    SELECT id INTO demo_user_id FROM auth.users ORDER BY created_at LIMIT 1;

    -- Fetch the household created by handle_new_user trigger
    SELECT household_id INTO demo_household_id FROM public.profiles WHERE id = demo_user_id;
    
    -- Verify household exists
    IF demo_household_id IS NULL THEN
        RAISE EXCEPTION 'No user profiles found. Please register an account on the website first!';
    END IF;
    
    -- Clear out existing seed data for this household to prevent duplicates
    DELETE FROM public.financial_connections WHERE household_id = demo_household_id;
    DELETE FROM public.recurring_streams WHERE household_id = demo_household_id;
    DELETE FROM public.bills WHERE household_id = demo_household_id;
    DELETE FROM public.savings_goals WHERE household_id = demo_household_id;
    
    -- Create Financial Connections
    INSERT INTO public.financial_connections (household_id, provider, access_token, item_id, status)
    VALUES (demo_household_id, 'plaid', 'enc_mock_token_chase', 'item_chase_main', 'active')
    RETURNING id INTO plaid_conn_id;

    INSERT INTO public.financial_connections (household_id, provider, access_token, item_id, status)
    VALUES (demo_household_id, 'mock', 'enc_mock_manual_token', 'item_manual_connections', 'active')
    RETURNING id INTO manual_conn_id;

    -- Create Checking/Depository accounts
    INSERT INTO public.financial_accounts (connection_id, household_id, name, type, subtype, mask, current_balance, available_balance)
    VALUES (plaid_conn_id, demo_household_id, 'Chase Checking Account', 'depository', 'checking', '4820', 6245.50, 6200.20)
    RETURNING id INTO chase_checking_id;

    INSERT INTO public.financial_accounts (connection_id, household_id, name, type, subtype, mask, current_balance, available_balance)
    VALUES (plaid_conn_id, demo_household_id, 'Bank of America Checking', 'depository', 'checking', '8910', 2150.00, 2150.00)
    RETURNING id INTO boa_checking_id;

    -- Create Credit Cards (Matching your exact balances and limits)
    INSERT INTO public.financial_accounts (connection_id, household_id, name, type, subtype, mask, current_balance, available_balance, credit_limit)
    VALUES (plaid_conn_id, demo_household_id, 'Apple Card', 'credit', 'credit card', '1284', 4813.00, 3937.00, 8750.00)
    RETURNING id INTO apple_card_id;

    INSERT INTO public.financial_accounts (connection_id, household_id, name, type, subtype, mask, current_balance, available_balance, credit_limit)
    VALUES (plaid_conn_id, demo_household_id, 'R C WILLEY', 'credit', 'credit card', '3190', 4139.00, 2861.00, 7000.00)
    RETURNING id INTO rc_willey_card_id;

    INSERT INTO public.financial_accounts (connection_id, household_id, name, type, subtype, mask, current_balance, available_balance, credit_limit)
    VALUES (plaid_conn_id, demo_household_id, 'Capital One Venture X', 'credit', 'credit card', '9821', 1799.22, 18200.78, 20000.00)
    RETURNING id INTO capone_card_id;

    INSERT INTO public.financial_accounts (connection_id, household_id, name, type, subtype, mask, current_balance, available_balance, credit_limit)
    VALUES (plaid_conn_id, demo_household_id, 'Discover it® Chrome', 'credit', 'credit card', '6251', 353.00, 9647.00, 10000.00)
    RETURNING id INTO discover_card_id;

    INSERT INTO public.financial_accounts (connection_id, household_id, name, type, subtype, mask, current_balance, available_balance, credit_limit)
    VALUES (plaid_conn_id, demo_household_id, 'Blue Cash Preferred® Card from American Express', 'credit', 'credit card', '4291', 296.25, 34703.75, 35000.00)
    RETURNING id INTO amex_card_id;

    INSERT INTO public.financial_accounts (connection_id, household_id, name, type, subtype, mask, current_balance, available_balance, credit_limit)
    VALUES (plaid_conn_id, demo_household_id, 'Citi Simplicity® Card', 'credit', 'credit card', '8401', 276.00, 9724.00, 10000.00)
    RETURNING id INTO citi_card_id;

    INSERT INTO public.financial_accounts (connection_id, household_id, name, type, subtype, mask, current_balance, available_balance, credit_limit)
    VALUES (plaid_conn_id, demo_household_id, 'Bank of America® Unlimited Cash Rewards credit card', 'credit', 'credit card', '1109', 0.00, 18600.00, 18600.00)
    RETURNING id INTO boa_rewards_card_id;

    INSERT INTO public.financial_accounts (connection_id, household_id, name, type, subtype, mask, current_balance, available_balance, credit_limit)
    VALUES (plaid_conn_id, demo_household_id, 'Chase Freedom Unlimited®', 'credit', 'credit card', '7392', 0.00, 15000.00, 15000.00)
    RETURNING id INTO chase_freedom_card_id;

    -- Create Loans
    INSERT INTO public.financial_accounts (connection_id, household_id, name, type, subtype, mask, current_balance)
    VALUES (manual_conn_id, demo_household_id, 'TD AUTO FIN', 'loan', 'auto', '5820', 13261.00)
    RETURNING id INTO td_auto_loan_id;

    INSERT INTO public.financial_accounts (connection_id, household_id, name, type, subtype, mask, current_balance)
    VALUES (manual_conn_id, demo_household_id, 'Valon Mortgage', 'loan', 'mortgage', '7920', 324500.00)
    RETURNING id INTO valon_mortgage_loan_id;

    -- Update user settings flags
    UPDATE public.user_settings 
    SET theme = 'dark', feature_flags = '{"plaid_enabled": true, "ai_assistant_enabled": true, "push_notifications_enabled": true, "household_sharing_enabled": true}'::jsonb
    WHERE profile_id = demo_user_id;

    -- Create Recurring Streams
    -- 1. Mortgage
    INSERT INTO public.recurring_streams (household_id, merchant_name, display_name, category, frequency, typical_amount, expected_next_date, account_id, confidence_score, status, user_confirmed)
    VALUES (demo_household_id, 'Valon Mortgage', 'Valon Mortgage Payment', 'Housing', 'monthly', 3062.79, first_of_month + 11, chase_checking_id, 0.99, 'active', true)
    RETURNING id INTO valon_stream_id;

    -- 2. TD Auto Finance
    INSERT INTO public.recurring_streams (household_id, merchant_name, display_name, category, frequency, typical_amount, expected_next_date, account_id, confidence_score, status, user_confirmed)
    VALUES (demo_household_id, 'TD Auto Finance', 'Car Loan Payment', 'Transportation', 'monthly', 660.62, first_of_month + 27, chase_checking_id, 0.99, 'active', true)
    RETURNING id INTO td_auto_stream_id;

    -- 3. RC Willey
    INSERT INTO public.recurring_streams (household_id, merchant_name, display_name, category, frequency, typical_amount, expected_next_date, account_id, confidence_score, status, user_confirmed)
    VALUES (demo_household_id, 'RC Willey Financing', 'RC Willey Financing', 'Financing', 'monthly', 517.43, first_of_month + 15, chase_checking_id, 0.95, 'active', true)
    RETURNING id INTO rc_willey_stream_id;

    -- 4. Comcast
    INSERT INTO public.recurring_streams (household_id, merchant_name, display_name, category, frequency, typical_amount, expected_next_date, account_id, confidence_score, status, user_confirmed)
    VALUES (demo_household_id, 'Xfinity Comcast', 'Comcast Internet', 'Utilities', 'monthly', 51.13, first_of_month + 7, chase_checking_id, 0.99, 'active', true)
    RETURNING id INTO xfinity_stream_id;

    -- 5. Enbridge Gas
    INSERT INTO public.recurring_streams (household_id, merchant_name, display_name, category, frequency, typical_amount, expected_next_date, account_id, confidence_score, status, user_confirmed)
    VALUES (demo_household_id, 'Enbridge Gas', 'Enbridge Gas Utilities', 'Utilities', 'monthly', 61.97, first_of_month + 14, chase_checking_id, 0.95, 'active', true)
    RETURNING id INTO enbridge_stream_id;

    -- 6. Rocky Mountain Power
    INSERT INTO public.recurring_streams (household_id, merchant_name, display_name, category, frequency, typical_amount, expected_next_date, account_id, confidence_score, status, user_confirmed)
    VALUES (demo_household_id, 'Rocky Mountain Power', 'Electricity', 'Utilities', 'monthly', 78.57, first_of_month + 17, chase_checking_id, 0.95, 'active', true)
    RETURNING id INTO rocky_mtn_stream_id;

    -- 7. Saratoga Springs
    INSERT INTO public.recurring_streams (household_id, merchant_name, display_name, category, frequency, typical_amount, expected_next_date, account_id, confidence_score, status, user_confirmed)
    VALUES (demo_household_id, 'City of Saratoga Springs', 'Water Utilities', 'Utilities', 'monthly', 122.40, first_of_month + 16, chase_checking_id, 0.95, 'active', true)
    RETURNING id INTO saratoga_stream_id;

    -- 8. Netflix
    INSERT INTO public.recurring_streams (household_id, merchant_name, display_name, category, frequency, typical_amount, expected_next_date, account_id, confidence_score, status, user_confirmed)
    VALUES (demo_household_id, 'Netflix', 'Netflix Subscription', 'Subscriptions', 'monthly', 29.00, first_of_month, boa_checking_id, 0.99, 'active', true)
    RETURNING id INTO netflix_stream_id;

    -- 9. Google One
    INSERT INTO public.recurring_streams (household_id, merchant_name, display_name, category, frequency, typical_amount, expected_next_date, account_id, confidence_score, status, user_confirmed)
    VALUES (demo_household_id, 'Google One', 'Google Storage', 'Subscriptions', 'monthly', 0.53, first_of_month + 20, chase_checking_id, 0.95, 'active', true)
    RETURNING id INTO google_one_stream_id;

    -- 10. Vivint
    INSERT INTO public.recurring_streams (household_id, merchant_name, display_name, category, frequency, typical_amount, expected_next_date, account_id, confidence_score, status, user_confirmed)
    VALUES (demo_household_id, 'Vivint', 'Vivint Home Security', 'Home Security', 'monthly', 28.65, first_of_month + 1, chase_checking_id, 0.99, 'active', true)
    RETURNING id INTO vivint_stream_id;

    -- 11. VASA Fitness
    INSERT INTO public.recurring_streams (household_id, merchant_name, display_name, category, frequency, typical_amount, expected_next_date, account_id, confidence_score, status, user_confirmed)
    VALUES (demo_household_id, 'VASA Fitness', 'Gym Membership', 'Membership', 'monthly', 26.85, first_of_month + 7, boa_checking_id, 0.99, 'active', true)
    RETURNING id INTO vasa_stream_id;

    -- 12. Income Paycheck
    INSERT INTO public.recurring_streams (household_id, merchant_name, display_name, category, frequency, typical_amount, expected_next_date, account_id, confidence_score, status, user_confirmed)
    VALUES (demo_household_id, 'Employer Paycheck', 'Employer Paycheck', 'Income', 'biweekly', 4500.00, today + INTERVAL '2 days', chase_checking_id, 0.99, 'active', true)
    RETURNING id INTO salary_stream_id;

    -- Create Bills & Subscriptions
    INSERT INTO public.bills (household_id, name, category, expected_amount, due_date_day, frequency, account_id, autopay, start_date, active, recurring_stream_id)
    VALUES (demo_household_id, 'Valon Mortgage', 'Housing', 3062.79, 12, 'monthly', chase_checking_id, true, today - INTERVAL '60 days', true, valon_stream_id)
    RETURNING id INTO valon_bill_id;

    INSERT INTO public.bills (household_id, name, category, expected_amount, due_date_day, frequency, account_id, autopay, start_date, active, recurring_stream_id)
    VALUES (demo_household_id, 'TD Auto Finance', 'Transportation', 660.62, 28, 'monthly', chase_checking_id, true, today - INTERVAL '60 days', true, td_auto_stream_id)
    RETURNING id INTO td_auto_bill_id;

    INSERT INTO public.bills (household_id, name, category, expected_amount, due_date_day, frequency, account_id, autopay, start_date, active, recurring_stream_id)
    VALUES (demo_household_id, 'RC Willey Financing', 'Financing', 517.43, 16, 'monthly', chase_checking_id, false, today - INTERVAL '60 days', true, rc_willey_stream_id)
    RETURNING id INTO rc_willey_bill_id;

    INSERT INTO public.bills (household_id, name, category, expected_amount, due_date_day, frequency, account_id, autopay, start_date, active, recurring_stream_id)
    VALUES (demo_household_id, 'Xfinity / Comcast', 'Utilities', 51.13, 8, 'monthly', chase_checking_id, true, today - INTERVAL '60 days', true, xfinity_stream_id)
    RETURNING id INTO xfinity_bill_id;

    INSERT INTO public.bills (household_id, name, category, expected_amount, due_date_day, frequency, account_id, autopay, start_date, active, recurring_stream_id)
    VALUES (demo_household_id, 'Enbridge Gas', 'Utilities', 61.97, 15, 'monthly', chase_checking_id, true, today - INTERVAL '60 days', true, enbridge_stream_id)
    RETURNING id INTO enbridge_bill_id;

    INSERT INTO public.bills (household_id, name, category, expected_amount, due_date_day, frequency, account_id, autopay, start_date, active, recurring_stream_id)
    VALUES (demo_household_id, 'Rocky Mountain Power', 'Utilities', 78.57, 18, 'monthly', chase_checking_id, true, today - INTERVAL '60 days', true, rocky_mtn_stream_id)
    RETURNING id INTO rocky_mtn_bill_id;

    INSERT INTO public.bills (household_id, name, category, expected_amount, due_date_day, frequency, account_id, autopay, start_date, active, recurring_stream_id)
    VALUES (demo_household_id, 'City of Saratoga Springs', 'Utilities', 122.40, 17, 'monthly', chase_checking_id, true, today - INTERVAL '60 days', true, saratoga_stream_id)
    RETURNING id INTO saratoga_bill_id;

    INSERT INTO public.bills (household_id, name, category, expected_amount, due_date_day, frequency, account_id, autopay, start_date, active, recurring_stream_id)
    VALUES (demo_household_id, 'Netflix', 'Subscriptions', 29.00, 1, 'monthly', boa_checking_id, true, today - INTERVAL '60 days', true, netflix_stream_id)
    RETURNING id INTO netflix_bill_id;

    INSERT INTO public.bills (household_id, name, category, expected_amount, due_date_day, frequency, account_id, autopay, start_date, active, recurring_stream_id)
    VALUES (demo_household_id, 'Google One', 'Subscriptions', 0.53, 21, 'monthly', chase_checking_id, true, today - INTERVAL '60 days', true, google_one_stream_id)
    RETURNING id INTO google_one_bill_id;

    INSERT INTO public.bills (household_id, name, category, expected_amount, due_date_day, frequency, account_id, autopay, start_date, active, recurring_stream_id)
    VALUES (demo_household_id, 'Vivint', 'Home Security', 28.65, 2, 'monthly', chase_checking_id, true, today - INTERVAL '60 days', true, vivint_stream_id)
    RETURNING id INTO vivint_bill_id;

    INSERT INTO public.bills (household_id, name, category, expected_amount, due_date_day, frequency, account_id, autopay, start_date, active, recurring_stream_id)
    VALUES (demo_household_id, 'VASA Fitness', 'Membership', 26.85, 8, 'monthly', boa_checking_id, true, today - INTERVAL '60 days', true, vasa_stream_id)
    RETURNING id INTO vasa_bill_id;

    -- Create Bill Occurrences
    -- Valon Mortgage (Paid)
    INSERT INTO public.bill_occurrences (bill_id, due_date, expected_amount, status)
    VALUES (valon_bill_id, first_of_month + 11, 3062.79, 'paid');

    -- TD Auto (Upcoming)
    INSERT INTO public.bill_occurrences (bill_id, due_date, expected_amount, status)
    VALUES (td_auto_bill_id, first_of_month + 27, 660.62, 'upcoming');

    -- RC Willey (Upcoming)
    INSERT INTO public.bill_occurrences (bill_id, due_date, expected_amount, status)
    VALUES (rc_willey_bill_id, first_of_month + 15, 517.43, 'upcoming');

    -- Comcast (Paid)
    INSERT INTO public.bill_occurrences (bill_id, due_date, expected_amount, status)
    VALUES (xfinity_bill_id, first_of_month + 7, 51.13, 'paid');

    -- Enbridge Gas (Upcoming)
    INSERT INTO public.bill_occurrences (bill_id, due_date, expected_amount, status)
    VALUES (enbridge_bill_id, first_of_month + 14, 61.97, 'upcoming');

    -- Rocky Mountain Power (Upcoming)
    INSERT INTO public.bill_occurrences (bill_id, due_date, expected_amount, status)
    VALUES (rocky_mtn_bill_id, first_of_month + 17, 78.57, 'upcoming');

    -- Saratoga Springs (Upcoming)
    INSERT INTO public.bill_occurrences (bill_id, due_date, expected_amount, status)
    VALUES (saratoga_bill_id, first_of_month + 16, 122.40, 'upcoming');

    -- Netflix (Paid)
    INSERT INTO public.bill_occurrences (bill_id, due_date, expected_amount, status)
    VALUES (netflix_bill_id, first_of_month, 29.00, 'paid');

    -- Google One (Upcoming)
    INSERT INTO public.bill_occurrences (bill_id, due_date, expected_amount, status)
    VALUES (google_one_bill_id, first_of_month + 20, 0.53, 'upcoming');

    -- Vivint (Paid)
    INSERT INTO public.bill_occurrences (bill_id, due_date, expected_amount, status)
    VALUES (vivint_bill_id, first_of_month + 1, 28.65, 'paid');

    -- VASA Fitness (Paid)
    INSERT INTO public.bill_occurrences (bill_id, due_date, expected_amount, status)
    VALUES (vasa_bill_id, first_of_month + 7, 26.85, 'paid');

    -- Create Transactions matching paid bills
    INSERT INTO public.transactions (account_id, household_id, date, amount, description, normalized_merchant, category, pending)
    VALUES (chase_checking_id, demo_household_id, first_of_month + 11, 3062.79, 'VALON MORTGAGE ELECTRONIC PYMT', 'Valon Mortgage', 'Housing', false);

    INSERT INTO public.transactions (account_id, household_id, date, amount, description, normalized_merchant, category, pending)
    VALUES (chase_checking_id, demo_household_id, first_of_month + 7, 51.13, 'XFINITY COMCAST AUTO-PAYMENT', 'Xfinity / Comcast', 'Utilities', false);

    INSERT INTO public.transactions (account_id, household_id, date, amount, description, normalized_merchant, category, pending)
    VALUES (boa_checking_id, demo_household_id, first_of_month, 29.00, 'NETFLIX.COM INTERNET SUB', 'Netflix', 'Subscriptions', false);

    INSERT INTO public.transactions (account_id, household_id, date, amount, description, normalized_merchant, category, pending)
    VALUES (chase_checking_id, demo_household_id, first_of_month + 1, 28.65, 'VIVINT HOME SECURITY MONTHLY', 'Vivint', 'Home Security', false);

    INSERT INTO public.transactions (account_id, household_id, date, amount, description, normalized_merchant, category, pending)
    VALUES (boa_checking_id, demo_household_id, first_of_month + 7, 26.85, 'VASA FITNESS DUES ACH', 'VASA Fitness', 'Membership', false);

    -- Create Installment Plans
    INSERT INTO public.installment_plans (
        household_id, name, provider, original_purchase_amount, financed_principal, 
        remaining_principal, current_payoff_amount, regular_payment_amount, payment_frequency,
        total_scheduled_payments, payments_completed, payments_remaining, start_date, expected_payoff_date
    )
    VALUES (
        demo_household_id, 'RC Willey Financing', 'RC Willey Inc', 6000.00, 6000.00, 
        4139.00, 4139.00, 517.43, 'monthly',
        12, 4, 8, today - INTERVAL '120 days', today + INTERVAL '240 days'
    )
    RETURNING id INTO rc_willey_stream_id;

    INSERT INTO public.installment_plans (
        household_id, name, provider, original_purchase_amount, financed_principal, 
        remaining_principal, current_payoff_amount, regular_payment_amount, payment_frequency,
        total_scheduled_payments, payments_completed, payments_remaining, start_date, expected_payoff_date
    )
    VALUES (
        demo_household_id, 'TD Auto Finance Car Loan', 'TD Auto Finance', 40000.00, 40000.00, 
        13261.00, 13261.00, 660.62, 'monthly',
        36, 24, 12, today - INTERVAL '730 days', today + INTERVAL '365 days'
    );

    -- Create Savings Goals
    INSERT INTO public.savings_goals (household_id, name, category, target_amount, current_amount, target_date, monthly_target_contribution, on_track_status)
    VALUES (demo_household_id, 'Emergency Fund', 'Savings', 30000.00, 15450.00, '2026-12-31', 500.00, 'on_track');

END $$;
