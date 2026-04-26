// =====================================================================
// Supabase Database types — hand-mirrored after src/db/migrations/.
// La rulare contra unui Supabase real, înlocuiește acest fișier cu output-ul
// din `npm run db:types`. Forma respectă convenția generatorului
// (`Database['public']['Tables'][...]['Row' | 'Insert' | 'Update']`) ca
// substituirea să fie zero-effort.
// =====================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---------- Enums ----------------------------------------------------------
export type AccountType =
  | "checking"
  | "savings"
  | "credit_card"
  | "cash"
  | "investment"
  | "loan"
  | "wallet"
  | "meal_voucher";

export type CategoryType = "income" | "expense" | "transfer";
export type TxStatus = "cleared" | "pending" | "scheduled" | "void";
export type TxSource =
  | "manual"
  | "import"
  | "bank_sync"
  | "recurring"
  | "transfer";
export type RecurrenceFreq =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";
export type BankConnStatus =
  | "pending"
  | "active"
  | "expired"
  | "error"
  | "revoked";
export type Ownership = "mine" | "yours" | "shared";
export type HouseholdRole = "owner" | "admin" | "member" | "viewer";
export type GoalBucketType =
  | "standard"
  | "goal"
  | "monthly"
  | "goal_monthly"
  | "debt";

// ---------- Helpers --------------------------------------------------------
type Timestamp = string;
type DateString = string;
type Currency = string; // char(3)

// ---------- Database -------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      households: {
        Row: {
          id: string;
          name: string;
          base_currency: Currency;
          locale: string;
          timezone: string;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          name: string;
          base_currency?: Currency;
          locale?: string;
          timezone?: string;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: {
          id?: string;
          name?: string;
          base_currency?: Currency;
          locale?: string;
          timezone?: string;
          updated_at?: Timestamp;
        };
        Relationships: [];
      };

      household_members: {
        Row: {
          household_id: string;
          user_id: string;
          role: HouseholdRole;
          joined_at: Timestamp;
        };
        Insert: {
          household_id: string;
          user_id: string;
          role: HouseholdRole;
          joined_at?: Timestamp;
        };
        Update: {
          role?: HouseholdRole;
        };
        Relationships: [];
      };

      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          default_currency: Currency | null;
          language: string | null;
          active_household: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          default_currency?: Currency | null;
          language?: string | null;
          active_household?: string | null;
        };
        Update: {
          full_name?: string | null;
          default_currency?: Currency | null;
          language?: string | null;
          active_household?: string | null;
          updated_at?: Timestamp;
        };
        Relationships: [];
      };

      accounts: {
        Row: {
          id: string;
          household_id: string;
          owner_id: string | null;
          name: string;
          type: AccountType;
          currency: Currency;
          bank_name: string | null;
          iban_last4: string | null;
          iban_encrypted: string | null;
          initial_balance: number;
          current_balance: number;
          is_shared: boolean;
          is_active: boolean;
          color: string | null;
          icon: string | null;
          archived_at: Timestamp | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          household_id: string;
          owner_id?: string | null;
          name: string;
          type: AccountType;
          currency: Currency;
          bank_name?: string | null;
          iban_last4?: string | null;
          iban_encrypted?: string | null;
          initial_balance?: number;
          current_balance?: number;
          is_shared?: boolean;
          is_active?: boolean;
          color?: string | null;
          icon?: string | null;
          archived_at?: Timestamp | null;
        };
        Update: {
          name?: string;
          type?: AccountType;
          currency?: Currency;
          bank_name?: string | null;
          iban_last4?: string | null;
          iban_encrypted?: string | null;
          initial_balance?: number;
          current_balance?: number;
          is_shared?: boolean;
          is_active?: boolean;
          color?: string | null;
          icon?: string | null;
          archived_at?: Timestamp | null;
          updated_at?: Timestamp;
        };
        Relationships: [];
      };

      categories: {
        Row: {
          id: string;
          household_id: string;
          parent_id: string | null;
          name: string;
          type: CategoryType;
          icon: string | null;
          color: string | null;
          budget_amount: number | null;
          is_system: boolean;
          archived_at: Timestamp | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          household_id: string;
          parent_id?: string | null;
          name: string;
          type: CategoryType;
          icon?: string | null;
          color?: string | null;
          budget_amount?: number | null;
          is_system?: boolean;
          archived_at?: Timestamp | null;
        };
        Update: {
          name?: string;
          type?: CategoryType;
          icon?: string | null;
          color?: string | null;
          budget_amount?: number | null;
          is_system?: boolean;
          archived_at?: Timestamp | null;
        };
        Relationships: [];
      };

      merchants: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          normalized_name: string;
          logo_url: string | null;
          default_category_id: string | null;
          website: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          logo_url?: string | null;
          default_category_id?: string | null;
          website?: string | null;
        };
        Update: {
          name?: string;
          logo_url?: string | null;
          default_category_id?: string | null;
          website?: string | null;
        };
        Relationships: [];
      };

      transactions: {
        Row: {
          id: string;
          household_id: string;
          account_id: string;
          user_id: string;
          occurred_on: DateString;
          posted_at: Timestamp | null;
          amount: number;
          currency: Currency;
          original_amount: number | null;
          original_currency: Currency | null;
          exchange_rate: number | null;
          base_amount: number | null;
          payee: string | null;
          merchant_id: string | null;
          category_id: string | null;
          notes: string | null;
          tags: string[];
          status: TxStatus;
          source: TxSource;
          external_id: string | null;
          bank_connection_id: string | null;
          is_transfer: boolean;
          transfer_pair_id: string | null;
          receipt_url: string | null;
          location: Json | null;
          ownership: Ownership;
          embedding: string | null; // pgvector serialized
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          household_id: string;
          account_id: string;
          user_id: string;
          occurred_on: DateString;
          posted_at?: Timestamp | null;
          amount: number;
          currency: Currency;
          original_amount?: number | null;
          original_currency?: Currency | null;
          exchange_rate?: number | null;
          base_amount?: number | null;
          payee?: string | null;
          merchant_id?: string | null;
          category_id?: string | null;
          notes?: string | null;
          tags?: string[];
          status?: TxStatus;
          source?: TxSource;
          external_id?: string | null;
          bank_connection_id?: string | null;
          is_transfer?: boolean;
          transfer_pair_id?: string | null;
          receipt_url?: string | null;
          location?: Json | null;
          ownership?: Ownership;
          embedding?: string | null;
        };
        Update: {
          account_id?: string;
          occurred_on?: DateString;
          posted_at?: Timestamp | null;
          amount?: number;
          currency?: Currency;
          original_amount?: number | null;
          original_currency?: Currency | null;
          exchange_rate?: number | null;
          base_amount?: number | null;
          payee?: string | null;
          merchant_id?: string | null;
          category_id?: string | null;
          notes?: string | null;
          tags?: string[];
          status?: TxStatus;
          source?: TxSource;
          external_id?: string | null;
          bank_connection_id?: string | null;
          is_transfer?: boolean;
          transfer_pair_id?: string | null;
          receipt_url?: string | null;
          location?: Json | null;
          ownership?: Ownership;
          embedding?: string | null;
          updated_at?: Timestamp;
        };
        Relationships: [];
      };

      budgets: {
        Row: {
          id: string;
          household_id: string;
          category_id: string | null;
          month: DateString;
          amount: number;
          rollover: boolean;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          household_id: string;
          category_id?: string | null;
          month: DateString;
          amount: number;
          rollover?: boolean;
        };
        Update: {
          amount?: number;
          rollover?: boolean;
        };
        Relationships: [];
      };

      goals: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          target_amount: number;
          current_amount: number;
          currency: Currency;
          target_date: DateString | null;
          account_id: string | null;
          category_id: string | null;
          bucket_type: GoalBucketType;
          archived_at: Timestamp | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          target_amount: number;
          current_amount?: number;
          currency?: Currency;
          target_date?: DateString | null;
          account_id?: string | null;
          category_id?: string | null;
          bucket_type?: GoalBucketType;
          archived_at?: Timestamp | null;
        };
        Update: {
          name?: string;
          target_amount?: number;
          current_amount?: number;
          currency?: Currency;
          target_date?: DateString | null;
          account_id?: string | null;
          category_id?: string | null;
          bucket_type?: GoalBucketType;
          archived_at?: Timestamp | null;
        };
        Relationships: [];
      };

      recurring_transactions: {
        Row: {
          id: string;
          household_id: string;
          account_id: string | null;
          category_id: string | null;
          payee: string | null;
          amount: number;
          currency: Currency;
          frequency: RecurrenceFreq;
          interval: number;
          start_date: DateString;
          end_date: DateString | null;
          next_date: DateString;
          last_run_at: Timestamp | null;
          is_active: boolean;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          household_id: string;
          account_id?: string | null;
          category_id?: string | null;
          payee?: string | null;
          amount: number;
          currency: Currency;
          frequency: RecurrenceFreq;
          interval?: number;
          start_date: DateString;
          end_date?: DateString | null;
          next_date: DateString;
          last_run_at?: Timestamp | null;
          is_active?: boolean;
        };
        Update: {
          payee?: string | null;
          amount?: number;
          currency?: Currency;
          frequency?: RecurrenceFreq;
          interval?: number;
          start_date?: DateString;
          end_date?: DateString | null;
          next_date?: DateString;
          last_run_at?: Timestamp | null;
          is_active?: boolean;
        };
        Relationships: [];
      };

      rules: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          priority: number;
          is_active: boolean;
          match_payee_regex: string | null;
          match_account_id: string | null;
          match_min_amount: number | null;
          match_max_amount: number | null;
          match_currency: Currency | null;
          set_category_id: string | null;
          add_tags: string[];
          set_notes: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          priority?: number;
          is_active?: boolean;
          match_payee_regex?: string | null;
          match_account_id?: string | null;
          match_min_amount?: number | null;
          match_max_amount?: number | null;
          match_currency?: Currency | null;
          set_category_id?: string | null;
          add_tags?: string[];
          set_notes?: string | null;
        };
        Update: {
          name?: string;
          priority?: number;
          is_active?: boolean;
          match_payee_regex?: string | null;
          match_account_id?: string | null;
          match_min_amount?: number | null;
          match_max_amount?: number | null;
          match_currency?: Currency | null;
          set_category_id?: string | null;
          add_tags?: string[];
          set_notes?: string | null;
        };
        Relationships: [];
      };

      exchange_rates: {
        Row: {
          rate_date: DateString;
          base: Currency;
          quote: Currency;
          rate: number;
          source: string;
          inserted_at: Timestamp;
        };
        Insert: {
          rate_date: DateString;
          base: Currency;
          quote: Currency;
          rate: number;
          source?: string;
        };
        Update: {
          rate?: number;
          source?: string;
        };
        Relationships: [];
      };

      bank_connections: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          provider: string;
          institution_id: string;
          institution_name: string | null;
          requisition_id: string | null;
          status: BankConnStatus;
          expires_at: Timestamp | null;
          last_synced_at: Timestamp | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          provider?: string;
          institution_id: string;
          institution_name?: string | null;
          requisition_id?: string | null;
          status?: BankConnStatus;
          expires_at?: Timestamp | null;
          last_synced_at?: Timestamp | null;
        };
        Update: {
          provider?: string;
          institution_id?: string;
          institution_name?: string | null;
          requisition_id?: string | null;
          status?: BankConnStatus;
          expires_at?: Timestamp | null;
          last_synced_at?: Timestamp | null;
        };
        Relationships: [];
      };

      attachments: {
        Row: {
          id: string;
          household_id: string;
          transaction_id: string | null;
          storage_path: string;
          mime_type: string | null;
          size_bytes: number | null;
          uploaded_by: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          household_id: string;
          transaction_id?: string | null;
          storage_path: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          uploaded_by?: string | null;
        };
        Update: {
          transaction_id?: string | null;
          storage_path?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
        };
        Relationships: [];
      };

      tx_comments: {
        Row: {
          id: string;
          transaction_id: string;
          user_id: string;
          body: string;
          emoji: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          user_id: string;
          body: string;
          emoji?: string | null;
        };
        Update: {
          body?: string;
          emoji?: string | null;
        };
        Relationships: [];
      };

      quick_add_presets: {
        Row: {
          id: string;
          household_id: string;
          user_id: string | null;
          label: string;
          emoji: string | null;
          amount: number;
          currency: Currency;
          account_id: string | null;
          category_id: string | null;
          position: number;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id?: string | null;
          label: string;
          emoji?: string | null;
          amount: number;
          currency?: Currency;
          account_id?: string | null;
          category_id?: string | null;
          position?: number;
        };
        Update: {
          label?: string;
          emoji?: string | null;
          amount?: number;
          currency?: Currency;
          account_id?: string | null;
          category_id?: string | null;
          position?: number;
        };
        Relationships: [];
      };

      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
        };
        Update: {
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
        };
        Relationships: [];
      };

      household_invites: {
        Row: {
          id: string;
          household_id: string;
          invited_email: string;
          role: "admin" | "member" | "viewer";
          token: string;
          expires_at: Timestamp;
          accepted_at: Timestamp | null;
          created_by: string;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          household_id: string;
          invited_email: string;
          role: "admin" | "member" | "viewer";
          token: string;
          expires_at?: Timestamp;
          accepted_at?: Timestamp | null;
          created_by: string;
        };
        Update: {
          accepted_at?: Timestamp | null;
          expires_at?: Timestamp;
          role?: "admin" | "member" | "viewer";
        };
        Relationships: [];
      };

      fx_sync_log: {
        Row: {
          id: number;
          run_at: Timestamp;
          status: "ok" | "partial" | "error";
          source: "BNR" | "Frankfurter" | "manual" | "historical";
          currencies_updated: number;
          rate_date: DateString | null;
          error: string | null;
        };
        Insert: {
          id?: number;
          run_at?: Timestamp;
          status: "ok" | "partial" | "error";
          source: "BNR" | "Frankfurter" | "manual" | "historical";
          currencies_updated?: number;
          rate_date?: DateString | null;
          error?: string | null;
        };
        Update: {
          status?: "ok" | "partial" | "error";
          source?: "BNR" | "Frankfurter" | "manual" | "historical";
          currencies_updated?: number;
          rate_date?: DateString | null;
          error?: string | null;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;

    Functions: {
      encrypt_iban: {
        Args: { iban: string };
        Returns: string | null;
      };
      decrypt_iban: {
        Args: { encrypted: string };
        Returns: string | null;
      };
      fx_at: {
        Args: {
          _from: string;
          _to: string;
          _date: string;
        };
        Returns: number | null;
      };
      match_transactions: {
        Args: {
          _household: string;
          _query_embedding: string;
          _limit?: number;
        };
        Returns: {
          id: string;
          occurred_on: DateString;
          amount: number;
          currency: Currency;
          payee: string | null;
          notes: string | null;
          category_id: string | null;
          similarity: number;
        }[];
      };
      cashflow: {
        Args: {
          _hh: string;
          _from: string;
          _to: string;
        };
        Returns: {
          category_id: string | null;
          category: string;
          type: CategoryType;
          income: number;
          expense: number;
          net: number;
          tx_count: number;
        }[];
      };
      budget_progress: {
        Args: {
          _hh: string;
          _month: string;
        };
        Returns: {
          category_id: string;
          budget_amount: number;
          rollover: boolean;
          spent: number;
          rollover_in: number;
          available: number;
        }[];
      };
      month_income: {
        Args: {
          _hh: string;
          _month: string;
        };
        Returns: number;
      };
      accept_invite: {
        Args: { _token: string };
        Returns: {
          household_id: string;
          role: "admin" | "member" | "viewer";
        }[];
      };
    };

    Enums: {
      account_type: AccountType;
      category_type: CategoryType;
      tx_status: TxStatus;
      tx_source: TxSource;
      recurrence_freq: RecurrenceFreq;
      bank_conn_status: BankConnStatus;
    };

    CompositeTypes: Record<string, never>;
  };
}
