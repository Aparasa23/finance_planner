export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      households: {
        Row: {
          id: string
          name: string
          invite_code: string | null
          invite_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          invite_code?: string | null
          invite_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          invite_code?: string | null
          invite_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          household_id: string | null
          email: string
          name: string | null
          role: string
          notification_preferences: Json
          timezone: string
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          household_id?: string | null
          email: string
          name?: string | null
          role?: string
          notification_preferences?: Json
          timezone?: string
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string | null
          email?: string
          name?: string | null
          role?: string
          notification_preferences?: Json
          timezone?: string
          currency?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_settings: {
        Row: {
          id: string
          profile_id: string
          theme: string
          dashboard_layout: Json
          feature_flags: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          theme?: string
          dashboard_layout?: Json
          feature_flags?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          theme?: string
          dashboard_layout?: Json
          feature_flags?: Json
          created_at?: string
          updated_at?: string
        }
      }
      financial_connections: {
        Row: {
          id: string
          household_id: string
          provider: string
          access_token: string
          item_id: string
          status: string
          error_code: string | null
          last_synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          provider: string
          access_token: string
          item_id: string
          status?: string
          error_code?: string | null
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          provider?: string
          access_token?: string
          item_id?: string
          status?: string
          error_code?: string | null
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      financial_accounts: {
        Row: {
          id: string
          connection_id: string | null
          household_id: string
          name: string
          type: string
          subtype: string | null
          mask: string | null
          current_balance: number
          available_balance: number | null
          credit_limit: number | null
          is_included_net_worth: boolean
          is_included_spending: boolean
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          connection_id?: string | null
          household_id: string
          name: string
          type: string
          subtype?: string | null
          mask?: string | null
          current_balance?: number
          available_balance?: number | null
          credit_limit?: number | null
          is_included_net_worth?: boolean
          is_included_spending?: boolean
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          connection_id?: string | null
          household_id?: string
          name?: string
          type?: string
          subtype?: string | null
          mask?: string | null
          current_balance?: number
          available_balance?: number | null
          credit_limit?: number | null
          is_included_net_worth?: boolean
          is_included_spending?: boolean
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          account_id: string
          household_id: string
          external_id: string | null
          date: string
          amount: number
          description: string
          normalized_merchant: string
          category: string
          subcategory: string | null
          pending: boolean
          recurring_stream_id: string | null
          is_excluded_reports: boolean
          notes: string | null
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          household_id: string
          external_id?: string | null
          date: string
          amount: number
          description: string
          normalized_merchant: string
          category: string
          subcategory?: string | null
          pending?: boolean
          recurring_stream_id?: string | null
          is_excluded_reports?: boolean
          notes?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          household_id?: string
          external_id?: string | null
          date?: string
          amount?: number
          description?: string
          normalized_merchant?: string
          category?: string
          subcategory?: string | null
          pending?: boolean
          recurring_stream_id?: string | null
          is_excluded_reports?: boolean
          notes?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      recurring_streams: {
        Row: {
          id: string
          household_id: string
          merchant_name: string
          display_name: string | null
          category: string
          frequency: string
          typical_amount: number
          min_amount: number | null
          max_amount: number | null
          avg_amount: number | null
          expected_next_date: string
          date_tolerance: number
          amount_tolerance: number
          account_id: string | null
          autopay_likelihood: number
          confidence_score: number
          status: string
          user_confirmed: boolean
          last_matching_transaction_id: string | null
          next_expected_transaction_id: string | null
          notification_preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          merchant_name: string
          display_name?: string | null
          category: string
          frequency: string
          typical_amount: number
          min_amount?: number | null
          max_amount?: number | null
          avg_amount?: number | null
          expected_next_date: string
          date_tolerance?: number
          amount_tolerance?: number
          account_id?: string | null
          autopay_likelihood?: number
          confidence_score?: number
          status?: string
          user_confirmed?: boolean
          last_matching_transaction_id?: string | null
          next_expected_transaction_id?: string | null
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          merchant_name?: string
          display_name?: string | null
          category?: string
          frequency?: string
          typical_amount?: number
          min_amount?: number | null
          max_amount?: number | null
          avg_amount?: number | null
          expected_next_date?: string
          date_tolerance?: number
          amount_tolerance?: number
          account_id?: string | null
          autopay_likelihood?: number
          confidence_score?: number
          status?: string
          user_confirmed?: boolean
          last_matching_transaction_id?: string | null
          next_expected_transaction_id?: string | null
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
      bills: {
        Row: {
          id: string
          household_id: string
          name: string
          category: string
          merchant_aliases: string[]
          expected_amount: number
          is_fixed: boolean
          due_date_day: number | null
          frequency: string
          account_id: string | null
          autopay: boolean
          start_date: string
          end_date: string | null
          active: boolean
          reminder_schedule: string[]
          matching_rules: Json
          recurring_stream_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          category: string
          merchant_aliases?: string[]
          expected_amount: number
          is_fixed?: boolean
          due_date_day?: number | null
          frequency: string
          account_id?: string | null
          autopay?: boolean
          start_date: string
          end_date?: string | null
          active?: boolean
          reminder_schedule?: string[]
          matching_rules?: Json
          recurring_stream_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          category?: string
          merchant_aliases?: string[]
          expected_amount?: number
          is_fixed?: boolean
          due_date_day?: number | null
          frequency?: string
          account_id?: string | null
          autopay?: boolean
          start_date?: string
          end_date?: string | null
          active?: boolean
          reminder_schedule?: string[]
          matching_rules?: Json
          recurring_stream_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bill_occurrences: {
        Row: {
          id: string
          bill_id: string
          due_date: string
          expected_amount: number
          status:
            | string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bill_id: string
          due_date: string
          expected_amount: number
          status?:
            | string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bill_id?: string
          due_date?: string
          expected_amount?: number
          status?:
            | string
          created_at?: string
          updated_at?: string
        }
      }
      payment_matches: {
        Row: {
          id: string
          occurrence_id: string
          transaction_id: string
          match_score: number
          match_reason: string
          auto_accepted: boolean
          user_overridden: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          occurrence_id: string
          transaction_id: string
          match_score: number
          match_reason: string
          auto_accepted?: boolean
          user_overridden?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          occurrence_id?: string
          transaction_id?: string
          match_score?: number
          match_reason?: string
          auto_accepted?: boolean
          user_overridden?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      credit_cards: {
        Row: {
          id: string
          account_id: string
          statement_balance: number
          minimum_payment: number
          due_date: string | null
          statement_closing_date: string | null
          utilization_alert_threshold: number
          auto_pay_status: string
          payment_account_id: string | null
          annual_fee: number
          rewards_category: string | null
          last_payment_date: string | null
          next_expected_payment_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          statement_balance?: number
          minimum_payment?: number
          due_date?: string | null
          statement_closing_date?: string | null
          utilization_alert_threshold?: number
          auto_pay_status?: string
          payment_account_id?: string | null
          annual_fee?: number
          rewards_category?: string | null
          last_payment_date?: string | null
          next_expected_payment_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          statement_balance?: number
          minimum_payment?: number
          due_date?: string | null
          statement_closing_date?: string | null
          utilization_alert_threshold?: number
          auto_pay_status?: string
          payment_account_id?: string | null
          annual_fee?: number
          rewards_category?: string | null
          last_payment_date?: string | null
          next_expected_payment_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      installment_plans: {
        Row: {
          id: string
          household_id: string
          name: string
          provider: string
          original_purchase_amount: number
          down_payment: number
          financed_principal: number
          interest_rate: number
          apr: number
          fees: number
          regular_payment_amount: number
          payment_frequency: string
          total_scheduled_payments: number
          payments_completed: number
          payments_remaining: number
          total_amount_paid: number
          principal_paid: number
          interest_paid: number
          remaining_principal: number
          current_payoff_amount: number
          start_date: string
          next_due_date: string | null
          expected_payoff_date: string | null
          account_id: string | null
          autopay: boolean
          recurring_stream_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          provider: string
          original_purchase_amount: number
          down_payment?: number
          financed_principal: number
          interest_rate?: number
          apr?: number
          fees?: number
          regular_payment_amount: number
          payment_frequency: string
          total_scheduled_payments: number
          payments_completed?: number
          payments_remaining: number
          total_amount_paid?: number
          principal_paid?: number
          interest_paid?: number
          remaining_principal: number
          current_payoff_amount: number
          start_date: string
          next_due_date?: string | null
          expected_payoff_date?: string | null
          account_id?: string | null
          autopay?: boolean
          recurring_stream_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          provider?: string
          original_purchase_amount?: number
          down_payment?: number
          financed_principal?: number
          interest_rate?: number
          apr?: number
          fees?: number
          regular_payment_amount?: number
          payment_frequency?: string
          total_scheduled_payments?: number
          payments_completed?: number
          payments_remaining?: number
          total_amount_paid?: number
          principal_paid?: number
          interest_paid?: number
          remaining_principal?: number
          current_payoff_amount?: number
          start_date?: string
          next_due_date?: string | null
          expected_payoff_date?: string | null
          account_id?: string | null
          autopay?: boolean
          recurring_stream_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      mortgage_details: {
        Row: {
          id: string
          account_id: string
          property_name: string
          estimated_property_value: number
          original_loan_amount: number
          current_principal: number
          interest_rate: number
          loan_term_months: number
          start_date: string
          monthly_payment: number
          principal_and_interest_payment: number
          escrow_payment: number
          property_tax: number
          home_insurance: number
          hoa: number
          pmi: number
          extra_principal_payment: number
          payments_completed: number
          payments_remaining: number
          scheduled_payoff_date: string
          estimated_equity: number
          interest_paid: number
          principal_paid: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          property_name: string
          estimated_property_value?: number
          original_loan_amount: number
          current_principal: number
          interest_rate: number
          loan_term_months: number
          start_date: string
          monthly_payment: number
          principal_and_interest_payment: number
          escrow_payment?: number
          property_tax?: number
          home_insurance?: number
          hoa?: number
          pmi?: number
          extra_principal_payment?: number
          payments_completed?: number
          payments_remaining: number
          scheduled_payoff_date: string
          estimated_equity?: number
          interest_paid?: number
          principal_paid?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          property_name?: string
          estimated_property_value?: number
          original_loan_amount?: number
          current_principal?: number
          interest_rate?: number
          loan_term_months?: number
          start_date?: string
          monthly_payment?: number
          principal_and_interest_payment?: number
          escrow_payment?: number
          property_tax?: number
          home_insurance?: number
          hoa?: number
          pmi?: number
          extra_principal_payment?: number
          payments_completed?: number
          payments_remaining?: number
          scheduled_payoff_date?: string
          estimated_equity?: number
          interest_paid?: number
          principal_paid?: number
          created_at?: string
          updated_at?: string
        }
      }
      income_streams: {
        Row: {
          id: string
          household_id: string
          source: string
          typical_amount: number
          frequency: string
          expected_next_date: string
          account_id: string | null
          variance_threshold: number
          last_deposit_date: string | null
          missing_alert_sent: boolean
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          source: string
          typical_amount: number
          frequency: string
          expected_next_date: string
          account_id?: string | null
          variance_threshold?: number
          last_deposit_date?: string | null
          missing_alert_sent?: boolean
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          source?: string
          typical_amount?: number
          frequency?: string
          expected_next_date?: string
          account_id?: string | null
          variance_threshold?: number
          last_deposit_date?: string | null
          missing_alert_sent?: boolean
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      savings_goals: {
        Row: {
          id: string
          household_id: string
          name: string
          category: string
          target_amount: number
          current_amount: number
          target_date: string | null
          monthly_target_contribution: number
          linked_account_id: string | null
          priority: number
          progress_percentage: number
          on_track_status: string
          estimated_completion_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          category: string
          target_amount: number
          current_amount?: number
          target_date?: string | null
          monthly_target_contribution?: number
          linked_account_id?: string | null
          priority?: number
          progress_percentage?: number
          on_track_status?: string
          estimated_completion_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          category?: string
          target_amount?: number
          current_amount?: number
          target_date?: string | null
          monthly_target_contribution?: number
          linked_account_id?: string | null
          priority?: number
          progress_percentage?: number
          on_track_status?: string
          estimated_completion_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          profile_id: string
          endpoint: string
          keys_p256dh: string
          keys_auth: string
          device_info: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          endpoint: string
          keys_p256dh: string
          keys_auth: string
          device_info?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          endpoint?: string
          keys_p256dh?: string
          keys_auth?: string
          device_info?: Json
          created_at?: string
          updated_at?: string
        }
      }
      transaction_rules: {
        Row: {
          id: string
          household_id: string
          pattern_type: string
          field_to_match: string
          pattern: string
          target_category: string
          target_subcategory: string | null
          target_merchant: string | null
          priority: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          pattern_type: string
          field_to_match: string
          pattern: string
          target_category: string
          target_subcategory?: string | null
          target_merchant?: string | null
          priority?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          pattern_type?: string
          field_to_match?: string
          pattern?: string
          target_category?: string
          target_subcategory?: string | null
          target_merchant?: string | null
          priority?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          profile_id: string
          title: string
          body: string
          payload: Json
          type: string
          status: string
          dedup_hash: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          title: string
          body: string
          payload?: Json
          type: string
          status?: string
          dedup_hash?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          title?: string
          body?: string
          payload?: Json
          type?: string
          status?: string
          dedup_hash?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
