export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          archived_at: string | null
          bank_name: string | null
          color: string | null
          created_at: string
          currency: string
          current_balance: number
          household_id: string
          iban_encrypted: string | null
          iban_last4: string | null
          icon: string | null
          id: string
          initial_balance: number
          is_active: boolean
          is_shared: boolean
          name: string
          owner_id: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          bank_name?: string | null
          color?: string | null
          created_at?: string
          currency: string
          current_balance?: number
          household_id: string
          iban_encrypted?: string | null
          iban_last4?: string | null
          icon?: string | null
          id?: string
          initial_balance?: number
          is_active?: boolean
          is_shared?: boolean
          name: string
          owner_id?: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          bank_name?: string | null
          color?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          household_id?: string
          iban_encrypted?: string | null
          iban_last4?: string | null
          icon?: string | null
          id?: string
          initial_balance?: number
          is_active?: boolean
          is_shared?: boolean
          name?: string
          owner_id?: string | null
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          household_id: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          transaction_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          transaction_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          transaction_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_connections: {
        Row: {
          created_at: string
          expires_at: string | null
          household_id: string
          id: string
          institution_id: string
          institution_name: string | null
          last_sync_count: number
          last_sync_error: string | null
          last_sync_status: string | null
          last_synced_at: string | null
          provider: string
          requisition_id: string | null
          status: Database["public"]["Enums"]["bank_conn_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          household_id: string
          id?: string
          institution_id: string
          institution_name?: string | null
          last_sync_count?: number
          last_sync_error?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          provider?: string
          requisition_id?: string | null
          status?: Database["public"]["Enums"]["bank_conn_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          household_id?: string
          id?: string
          institution_id?: string
          institution_name?: string | null
          last_sync_count?: number
          last_sync_error?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          provider?: string
          requisition_id?: string | null
          status?: Database["public"]["Enums"]["bank_conn_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_connections_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          household_id: string
          id: string
          month: string
          rollover: boolean
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          household_id: string
          id?: string
          month: string
          rollover?: boolean
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          household_id?: string
          id?: string
          month?: string
          rollover?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          archived_at: string | null
          budget_amount: number | null
          color: string | null
          created_at: string
          household_id: string
          icon: string | null
          id: string
          is_system: boolean
          name: string
          parent_id: string | null
          type: Database["public"]["Enums"]["category_type"]
        }
        Insert: {
          archived_at?: string | null
          budget_amount?: number | null
          color?: string | null
          created_at?: string
          household_id: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name: string
          parent_id?: string | null
          type: Database["public"]["Enums"]["category_type"]
        }
        Update: {
          archived_at?: string | null
          budget_amount?: number | null
          color?: string | null
          created_at?: string
          household_id?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          parent_id?: string | null
          type?: Database["public"]["Enums"]["category_type"]
        }
        Relationships: [
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          role: string
          thread_id: string
          tool_calls: Json | null
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          role: string
          thread_id: string
          tool_calls?: Json | null
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          role?: string
          thread_id?: string
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          household_id: string
          id: string
          last_message_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          last_message_at?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          last_message_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      detected_subscriptions: {
        Row: {
          cadence: string
          created_at: string
          currency: string
          first_seen: string
          household_id: string
          id: string
          last_seen: string
          median_amount: number
          merchant_id: string | null
          occurrences_count: number
          payee: string
          price_hike_alert: number | null
          status: string
          updated_at: string
        }
        Insert: {
          cadence: string
          created_at?: string
          currency: string
          first_seen: string
          household_id: string
          id?: string
          last_seen: string
          median_amount: number
          merchant_id?: string | null
          occurrences_count: number
          payee: string
          price_hike_alert?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          cadence?: string
          created_at?: string
          currency?: string
          first_seen?: string
          household_id?: string
          id?: string
          last_seen?: string
          median_amount?: number
          merchant_id?: string | null
          occurrences_count?: number
          payee?: string
          price_hike_alert?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "detected_subscriptions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detected_subscriptions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      embedding_queue: {
        Row: {
          attempts: number
          enqueued_at: string
          error: string | null
          id: number
          processed_at: string | null
          transaction_id: string
        }
        Insert: {
          attempts?: number
          enqueued_at?: string
          error?: string | null
          id?: number
          processed_at?: string | null
          transaction_id: string
        }
        Update: {
          attempts?: number
          enqueued_at?: string
          error?: string | null
          id?: number
          processed_at?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "embedding_queue_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      eur_obligations: {
        Row: {
          account_id: string | null
          amount_eur: number
          category_id: string | null
          created_at: string | null
          day_of_month: number
          household_id: string
          id: string
          is_active: boolean | null
          label: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          amount_eur: number
          category_id?: string | null
          created_at?: string | null
          day_of_month: number
          household_id: string
          id?: string
          is_active?: boolean | null
          label: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          amount_eur?: number
          category_id?: string | null
          created_at?: string | null
          day_of_month?: number
          household_id?: string
          id?: string
          is_active?: boolean | null
          label?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eur_obligations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eur_obligations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eur_obligations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          base: string
          inserted_at: string
          quote: string
          rate: number
          rate_date: string
          source: string
        }
        Insert: {
          base: string
          inserted_at?: string
          quote: string
          rate: number
          rate_date: string
          source?: string
        }
        Update: {
          base?: string
          inserted_at?: string
          quote?: string
          rate?: number
          rate_date?: string
          source?: string
        }
        Relationships: []
      }
      fx_sync_log: {
        Row: {
          currencies_updated: number
          error: string | null
          id: number
          rate_date: string | null
          run_at: string
          source: string
          status: string
        }
        Insert: {
          currencies_updated?: number
          error?: string | null
          id?: number
          rate_date?: string | null
          run_at?: string
          source: string
          status: string
        }
        Update: {
          currencies_updated?: number
          error?: string | null
          id?: number
          rate_date?: string | null
          run_at?: string
          source?: string
          status?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          account_id: string | null
          archived_at: string | null
          bucket_type: string
          category_id: string | null
          created_at: string
          currency: string
          current_amount: number
          household_id: string
          id: string
          name: string
          target_amount: number
          target_date: string | null
        }
        Insert: {
          account_id?: string | null
          archived_at?: string | null
          bucket_type?: string
          category_id?: string | null
          created_at?: string
          currency?: string
          current_amount?: number
          household_id: string
          id?: string
          name: string
          target_amount: number
          target_date?: string | null
        }
        Update: {
          account_id?: string | null
          archived_at?: string | null
          bucket_type?: string
          category_id?: string | null
          created_at?: string
          currency?: string
          current_amount?: number
          household_id?: string
          id?: string
          name?: string
          target_amount?: number
          target_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string
          expires_at: string
          household_id: string
          id: string
          invited_email: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by: string
          expires_at?: string
          household_id: string
          id?: string
          invited_email: string
          role: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string
          household_id?: string
          id?: string
          invited_email?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          household_id: string
          joined_at?: string
          role: string
          user_id: string
        }
        Update: {
          household_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          base_currency: string
          created_at: string
          id: string
          locale: string
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          id?: string
          locale?: string
          name: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          id?: string
          locale?: string
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      income_streams: {
        Row: {
          cadence_days: number
          confidence: number
          created_at: string
          day_variance: number
          expected_amount: number
          expected_currency: string
          expected_day_of_month: number | null
          household_id: string
          id: string
          is_active: boolean
          last_seen_on: string | null
          name: string
          next_expected_on: string | null
          payer: string | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cadence_days?: number
          confidence?: number
          created_at?: string
          day_variance?: number
          expected_amount: number
          expected_currency?: string
          expected_day_of_month?: number | null
          household_id: string
          id?: string
          is_active?: boolean
          last_seen_on?: string | null
          name: string
          next_expected_on?: string | null
          payer?: string | null
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cadence_days?: number
          confidence?: number
          created_at?: string
          day_variance?: number
          expected_amount?: number
          expected_currency?: string
          expected_day_of_month?: number | null
          household_id?: string
          id?: string
          is_active?: boolean
          last_seen_on?: string | null
          name?: string
          next_expected_on?: string | null
          payer?: string | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_streams_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_voucher_lots: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          expires_on: string
          household_id: string
          id: string
          provider: string | null
          remaining: number
          source_transaction_id: string | null
          top_up_date: string
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          expires_on: string
          household_id: string
          id?: string
          provider?: string | null
          remaining: number
          source_transaction_id?: string | null
          top_up_date: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          expires_on?: string
          household_id?: string
          id?: string
          provider?: string | null
          remaining?: number
          source_transaction_id?: string | null
          top_up_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_voucher_lots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_voucher_lots_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_voucher_lots_source_transaction_id_fkey"
            columns: ["source_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          created_at: string
          default_category_id: string | null
          household_id: string
          id: string
          logo_url: string | null
          name: string
          normalized_name: string | null
          website: string | null
        }
        Insert: {
          created_at?: string
          default_category_id?: string | null
          household_id: string
          id?: string
          logo_url?: string | null
          name: string
          normalized_name?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string
          default_category_id?: string | null
          household_id?: string
          id?: string
          logo_url?: string | null
          name?: string
          normalized_name?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchants_default_category_id_fkey"
            columns: ["default_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchants_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          low_balance_threshold_minor: number
          push_anniversaries: boolean
          push_anomalies: boolean
          push_bank_reauth: boolean
          push_bills: boolean
          push_goal_milestones: boolean
          push_low_balance: boolean
          push_weekly_recap: boolean
          quiet_end: string | null
          quiet_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          low_balance_threshold_minor?: number
          push_anniversaries?: boolean
          push_anomalies?: boolean
          push_bank_reauth?: boolean
          push_bills?: boolean
          push_goal_milestones?: boolean
          push_low_balance?: boolean
          push_weekly_recap?: boolean
          quiet_end?: string | null
          quiet_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          low_balance_threshold_minor?: number
          push_anniversaries?: boolean
          push_anomalies?: boolean
          push_bank_reauth?: boolean
          push_bills?: boolean
          push_goal_milestones?: boolean
          push_low_balance?: boolean
          push_weekly_recap?: boolean
          quiet_end?: string | null
          quiet_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pension_contributions: {
        Row: {
          amount_eur: number
          amount_ron: number | null
          contribution_date: string
          created_at: string
          deductible: boolean
          household_id: string
          id: string
          notes: string | null
          provider: string | null
          user_id: string
          year: number | null
        }
        Insert: {
          amount_eur: number
          amount_ron?: number | null
          contribution_date: string
          created_at?: string
          deductible?: boolean
          household_id: string
          id?: string
          notes?: string | null
          provider?: string | null
          user_id: string
          year?: number | null
        }
        Update: {
          amount_eur?: number
          amount_ron?: number | null
          contribution_date?: string
          created_at?: string
          deductible?: boolean
          household_id?: string
          id?: string
          notes?: string | null
          provider?: string | null
          user_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pension_contributions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_household: string | null
          created_at: string
          default_currency: string | null
          full_name: string | null
          id: string
          language: string | null
          updated_at: string
        }
        Insert: {
          active_household?: string | null
          created_at?: string
          default_currency?: string | null
          full_name?: string | null
          id: string
          language?: string | null
          updated_at?: string
        }
        Update: {
          active_household?: string | null
          created_at?: string
          default_currency?: string | null
          full_name?: string | null
          id?: string
          language?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_household_fkey"
            columns: ["active_household"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quick_add_presets: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          currency: string
          emoji: string | null
          household_id: string
          id: string
          label: string
          position: number
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          currency?: string
          emoji?: string | null
          household_id: string
          id?: string
          label: string
          position?: number
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          emoji?: string | null
          household_id?: string
          id?: string
          label?: string
          position?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_add_presets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_add_presets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_add_presets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      recaps: {
        Row: {
          bullets: Json
          generated_at: string
          highlight: string | null
          household_id: string
          id: string
          period_end: string
          period_start: string
        }
        Insert: {
          bullets: Json
          generated_at?: string
          highlight?: string | null
          household_id: string
          id?: string
          period_end: string
          period_start: string
        }
        Update: {
          bullets?: Json
          generated_at?: string
          highlight?: string | null
          household_id?: string
          id?: string
          period_end?: string
          period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "recaps_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          currency: string
          end_date: string | null
          frequency: Database["public"]["Enums"]["recurrence_freq"]
          household_id: string
          id: string
          interval: number
          is_active: boolean
          last_run_at: string | null
          next_date: string
          payee: string | null
          start_date: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          currency: string
          end_date?: string | null
          frequency: Database["public"]["Enums"]["recurrence_freq"]
          household_id: string
          id?: string
          interval?: number
          is_active?: boolean
          last_run_at?: string | null
          next_date: string
          payee?: string | null
          start_date: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurrence_freq"]
          household_id?: string
          id?: string
          interval?: number
          is_active?: boolean
          last_run_at?: string | null
          next_date?: string
          payee?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      rules: {
        Row: {
          add_tags: string[]
          created_at: string
          household_id: string
          id: string
          is_active: boolean
          match_account_id: string | null
          match_currency: string | null
          match_max_amount: number | null
          match_min_amount: number | null
          match_payee_regex: string | null
          name: string
          priority: number
          set_category_id: string | null
          set_notes: string | null
        }
        Insert: {
          add_tags?: string[]
          created_at?: string
          household_id: string
          id?: string
          is_active?: boolean
          match_account_id?: string | null
          match_currency?: string | null
          match_max_amount?: number | null
          match_min_amount?: number | null
          match_payee_regex?: string | null
          name: string
          priority?: number
          set_category_id?: string | null
          set_notes?: string | null
        }
        Update: {
          add_tags?: string[]
          created_at?: string
          household_id?: string
          id?: string
          is_active?: boolean
          match_account_id?: string | null
          match_currency?: string | null
          match_max_amount?: number | null
          match_min_amount?: number | null
          match_payee_regex?: string | null
          name?: string
          priority?: number
          set_category_id?: string | null
          set_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rules_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rules_match_account_id_fkey"
            columns: ["match_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rules_set_category_id_fkey"
            columns: ["set_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          bank_connection_id: string | null
          base_amount: number | null
          category_id: string | null
          created_at: string
          currency: string
          embedding: string | null
          exchange_rate: number | null
          external_id: string | null
          household_id: string
          id: string
          is_transfer: boolean
          location: Json | null
          merchant_id: string | null
          notes: string | null
          occurred_on: string
          original_amount: number | null
          original_currency: string | null
          ownership: string
          payee: string | null
          posted_at: string | null
          receipt_url: string | null
          source: Database["public"]["Enums"]["tx_source"]
          status: Database["public"]["Enums"]["tx_status"]
          tags: string[]
          transfer_pair_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          bank_connection_id?: string | null
          base_amount?: number | null
          category_id?: string | null
          created_at?: string
          currency: string
          embedding?: string | null
          exchange_rate?: number | null
          external_id?: string | null
          household_id: string
          id?: string
          is_transfer?: boolean
          location?: Json | null
          merchant_id?: string | null
          notes?: string | null
          occurred_on: string
          original_amount?: number | null
          original_currency?: string | null
          ownership?: string
          payee?: string | null
          posted_at?: string | null
          receipt_url?: string | null
          source?: Database["public"]["Enums"]["tx_source"]
          status?: Database["public"]["Enums"]["tx_status"]
          tags?: string[]
          transfer_pair_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          bank_connection_id?: string | null
          base_amount?: number | null
          category_id?: string | null
          created_at?: string
          currency?: string
          embedding?: string | null
          exchange_rate?: number | null
          external_id?: string | null
          household_id?: string
          id?: string
          is_transfer?: boolean
          location?: Json | null
          merchant_id?: string | null
          notes?: string | null
          occurred_on?: string
          original_amount?: number | null
          original_currency?: string | null
          ownership?: string
          payee?: string | null
          posted_at?: string | null
          receipt_url?: string | null
          source?: Database["public"]["Enums"]["tx_source"]
          status?: Database["public"]["Enums"]["tx_status"]
          tags?: string[]
          transfer_pair_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_bank_connection_fk"
            columns: ["bank_connection_id"]
            isOneToOne: false
            referencedRelation: "bank_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_transfer_pair_id_fkey"
            columns: ["transfer_pair_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          archived_at: string | null
          base_currency: string
          budget_minor: number | null
          country_code: string | null
          created_at: string | null
          detected_automatically: boolean | null
          ended_on: string | null
          envelope_goal_id: string | null
          household_id: string
          id: string
          name: string
          started_on: string
          tag: string
        }
        Insert: {
          archived_at?: string | null
          base_currency?: string
          budget_minor?: number | null
          country_code?: string | null
          created_at?: string | null
          detected_automatically?: boolean | null
          ended_on?: string | null
          envelope_goal_id?: string | null
          household_id: string
          id?: string
          name: string
          started_on: string
          tag: string
        }
        Update: {
          archived_at?: string | null
          base_currency?: string
          budget_minor?: number | null
          country_code?: string | null
          created_at?: string | null
          detected_automatically?: boolean | null
          ended_on?: string | null
          envelope_goal_id?: string | null
          household_id?: string
          id?: string
          name?: string
          started_on?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_envelope_goal_id_fkey"
            columns: ["envelope_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      tx_comments: {
        Row: {
          body: string
          created_at: string
          emoji: string | null
          id: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          emoji?: string | null
          id?: string
          transaction_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          emoji?: string | null
          id?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tx_comments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      eur_obligations_fx_history: {
        Row: {
          amount_eur: number | null
          estimated_ron_minor: number | null
          eur_to_ron: number | null
          household_id: string | null
          id: string | null
          label: string | null
          rate_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eur_obligations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invite: {
        Args: { _token: string }
        Returns: {
          household_id: string
          role: string
        }[]
      }
      cashflow: {
        Args: { _from: string; _hh: string; _to: string }
        Returns: {
          category: string
          category_id: string
          expense: number
          income: number
          net: number
          tx_count: number
          type: Database["public"]["Enums"]["category_type"]
        }[]
      }
      decrypt_iban: { Args: { encrypted: string }; Returns: string }
      encrypt_iban: { Args: { iban: string }; Returns: string }
      fx_at: {
        Args: { _date: string; _from: string; _to: string }
        Returns: number
      }
      match_transactions: {
        Args: { _household: string; _limit?: number; _query_embedding: string }
        Returns: {
          amount: number
          category_id: string
          currency: string
          id: string
          notes: string
          occurred_on: string
          payee: string
          similarity: number
        }[]
      }
      seed_default_categories: {
        Args: { _household_id: string }
        Returns: undefined
      }
      seed_default_presets: {
        Args: { _household_id: string }
        Returns: undefined
      }
      seed_default_rules: {
        Args: { _household_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      account_type:
        | "checking"
        | "savings"
        | "credit_card"
        | "cash"
        | "investment"
        | "loan"
        | "wallet"
        | "meal_voucher"
      bank_conn_status: "pending" | "active" | "expired" | "error" | "revoked"
      category_type: "income" | "expense" | "transfer"
      recurrence_freq:
        | "daily"
        | "weekly"
        | "biweekly"
        | "monthly"
        | "quarterly"
        | "yearly"
      tx_source: "manual" | "import" | "bank_sync" | "recurring" | "transfer"
      tx_status: "cleared" | "pending" | "scheduled" | "void"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_type: [
        "checking",
        "savings",
        "credit_card",
        "cash",
        "investment",
        "loan",
        "wallet",
        "meal_voucher",
      ],
      bank_conn_status: ["pending", "active", "expired", "error", "revoked"],
      category_type: ["income", "expense", "transfer"],
      recurrence_freq: [
        "daily",
        "weekly",
        "biweekly",
        "monthly",
        "quarterly",
        "yearly",
      ],
      tx_source: ["manual", "import", "bank_sync", "recurring", "transfer"],
      tx_status: ["cleared", "pending", "scheduled", "void"],
    },
  },
} as const
