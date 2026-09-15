// Generated from the live schema via the Supabase MCP `generate_typescript_types`
// tool (equivalent to `supabase gen types typescript --project-id <ref>`).
// Do not hand-edit — regenerate after every migration.
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
  public: {
    Tables: {
      activities: {
        Row: {
          body: string | null
          created_at: string
          customer_id: string | null
          deal_id: string | null
          direction: Database["public"]["Enums"]["activity_direction"]
          duration_minutes: number | null
          id: string
          occurred_at: string
          outcome: string | null
          project_id: string | null
          subject: string | null
          ticket_id: string | null
          type: Database["public"]["Enums"]["activity_type"]
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          customer_id?: string | null
          deal_id?: string | null
          direction?: Database["public"]["Enums"]["activity_direction"]
          duration_minutes?: number | null
          id?: string
          occurred_at?: string
          outcome?: string | null
          project_id?: string | null
          subject?: string | null
          ticket_id?: string | null
          type: Database["public"]["Enums"]["activity_type"]
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          customer_id?: string | null
          deal_id?: string | null
          direction?: Database["public"]["Enums"]["activity_direction"]
          duration_minutes?: number | null
          id?: string
          occurred_at?: string
          outcome?: string | null
          project_id?: string | null
          subject?: string | null
          ticket_id?: string | null
          type?: Database["public"]["Enums"]["activity_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: number
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: number
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: number
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      counters: {
        Row: {
          current_value: number
          key: string
          padding: number
          prefix: string
        }
        Insert: {
          current_value?: number
          key: string
          padding?: number
          prefix: string
        }
        Update: {
          current_value?: number
          key?: string
          padding?: number
          prefix?: string
        }
        Relationships: []
      }
      customer_contacts: {
        Row: {
          created_at: string
          customer_id: string
          email: string | null
          id: string
          is_primary: boolean
          job_title: string | null
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          email?: string | null
          id?: string
          is_primary?: boolean
          job_title?: string | null
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          job_title?: string | null
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_files: {
        Row: {
          created_at: string
          customer_id: string
          doc_type: string | null
          file_name: string
          id: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          doc_type?: string | null
          file_name: string
          id?: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          doc_type?: string | null
          file_name?: string
          id?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_files_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          mentioned_user_ids: string[]
          pinned: boolean
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          mentioned_user_ids?: string[]
          pinned?: boolean
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          mentioned_user_ids?: string[]
          pinned?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_text: string | null
          area: string | null
          business_name: string | null
          business_units: Database["public"]["Enums"]["business_unit"][]
          created_at: string
          created_by: string | null
          customer_code: string | null
          deleted_at: string | null
          display_name: string | null
          email: string | null
          full_name: string | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          last_contact_at: string | null
          location_id: string | null
          notes: string | null
          opted_out: boolean
          owner_id: string | null
          phone_alt: string | null
          phone_primary: string
          preferred_language: string
          source: string | null
          status: Database["public"]["Enums"]["customer_status"]
          tags: string[]
          type: Database["public"]["Enums"]["customer_type"]
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address_text?: string | null
          area?: string | null
          business_name?: string | null
          business_units?: Database["public"]["Enums"]["business_unit"][]
          created_at?: string
          created_by?: string | null
          customer_code?: string | null
          deleted_at?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          last_contact_at?: string | null
          location_id?: string | null
          notes?: string | null
          opted_out?: boolean
          owner_id?: string | null
          phone_alt?: string | null
          phone_primary: string
          preferred_language?: string
          source?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          tags?: string[]
          type?: Database["public"]["Enums"]["customer_type"]
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address_text?: string | null
          area?: string | null
          business_name?: string | null
          business_units?: Database["public"]["Enums"]["business_unit"][]
          created_at?: string
          created_by?: string | null
          customer_code?: string | null
          deleted_at?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          last_contact_at?: string | null
          location_id?: string | null
          notes?: string | null
          opted_out?: boolean
          owner_id?: string | null
          phone_alt?: string | null
          phone_primary?: string
          preferred_language?: string
          source?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          tags?: string[]
          type?: Database["public"]["Enums"]["customer_type"]
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          business_unit: Database["public"]["Enums"]["business_unit"]
          closed_at: string | null
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_code"]
          customer_id: string
          deal_code: string | null
          deleted_at: string | null
          expected_close: string | null
          id: string
          last_activity_at: string | null
          location_id: string | null
          lost_reason: string | null
          owner_id: string | null
          pipeline_id: string
          probability: number | null
          source: string | null
          stage_id: string
          status: Database["public"]["Enums"]["deal_status"]
          title: string
          updated_at: string
          value: number
        }
        Insert: {
          business_unit: Database["public"]["Enums"]["business_unit"]
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          customer_id: string
          deal_code?: string | null
          deleted_at?: string | null
          expected_close?: string | null
          id?: string
          last_activity_at?: string | null
          location_id?: string | null
          lost_reason?: string | null
          owner_id?: string | null
          pipeline_id: string
          probability?: number | null
          source?: string | null
          stage_id: string
          status?: Database["public"]["Enums"]["deal_status"]
          title: string
          updated_at?: string
          value?: number
        }
        Update: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          customer_id?: string
          deal_code?: string | null
          deleted_at?: string | null
          expected_close?: string | null
          id?: string
          last_activity_at?: string | null
          location_id?: string | null
          lost_reason?: string | null
          owner_id?: string | null
          pipeline_id?: string
          probability?: number | null
          source?: string | null
          stage_id?: string
          status?: Database["public"]["Enums"]["deal_status"]
          title?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      error_log: {
        Row: {
          context: Json | null
          created_at: string
          id: number
          message: string
          route: string | null
          stack: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: number
          message: string
          route?: string | null
          stack?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: number
          message?: string
          route?: string | null
          stack?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      fx_rates: {
        Row: {
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          ssp_per_usd: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_date: string
          id?: string
          ssp_per_usd: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          ssp_per_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "fx_rates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      installations: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_code"]
          customer_id: string
          deal_id: string | null
          equipment: Json
          gps_lat: number | null
          gps_lng: number | null
          id: string
          install_fee: number
          job_code: string | null
          job_type: string
          location_id: string | null
          notes: string | null
          photo_paths: string[]
          scheduled_at: string | null
          signature_path: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["installation_status"]
          subscription_id: string | null
          technician_id: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          customer_id: string
          deal_id?: string | null
          equipment?: Json
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          install_fee?: number
          job_code?: string | null
          job_type?: string
          location_id?: string | null
          notes?: string | null
          photo_paths?: string[]
          scheduled_at?: string | null
          signature_path?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["installation_status"]
          subscription_id?: string | null
          technician_id?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          customer_id?: string
          deal_id?: string | null
          equipment?: Json
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          install_fee?: number
          job_code?: string | null
          job_type?: string
          location_id?: string | null
          notes?: string | null
          photo_paths?: string[]
          scheduled_at?: string | null
          signature_path?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["installation_status"]
          subscription_id?: string | null
          technician_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installations_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installations_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "v_subscriptions_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installations_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          code: string | null
          created_at: string
          gps_lat: number | null
          gps_lng: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          customer_id: string | null
          deleted_at: string | null
          fx_rate_used: number | null
          id: string
          location_id: string | null
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          payment_number: string | null
          received_at: string
          received_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          customer_id?: string | null
          deleted_at?: string | null
          fx_rate_used?: number | null
          id?: string
          location_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_number?: string | null
          received_at?: string
          received_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          customer_id?: string | null
          deleted_at?: string | null
          fx_rate_used?: number | null
          id?: string
          location_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_number?: string | null
          received_at?: string
          received_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          id: string
          is_lost: boolean
          is_won: boolean
          name: string
          pipeline_id: string
          probability: number
          sort_order: number
        }
        Insert: {
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name: string
          pipeline_id: string
          probability?: number
          sort_order?: number
        }
        Update: {
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name?: string
          pipeline_id?: string
          probability?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          business_unit: Database["public"]["Enums"]["business_unit"]
          id: string
          is_default: boolean
          name: string
        }
        Insert: {
          business_unit: Database["public"]["Enums"]["business_unit"]
          id?: string
          is_default?: boolean
          name: string
        }
        Update: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          id?: string
          is_default?: boolean
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_units: Database["public"]["Enums"]["business_unit"][]
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          last_seen_at: string | null
          location_ids: string[]
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          business_units?: Database["public"]["Enums"]["business_unit"][]
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          last_seen_at?: string | null
          location_ids?: string[]
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          business_units?: Database["public"]["Enums"]["business_unit"][]
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          location_ids?: string[]
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      reseller_settlements: {
        Row: {
          amount_paid: number
          commission: number
          created_at: string
          created_by: string | null
          gross_amount: number
          id: string
          period_end: string
          period_start: string
          reseller_id: string
          settled_at: string | null
          vouchers_sold: number
        }
        Insert: {
          amount_paid?: number
          commission?: number
          created_at?: string
          created_by?: string | null
          gross_amount?: number
          id?: string
          period_end: string
          period_start: string
          reseller_id: string
          settled_at?: string | null
          vouchers_sold?: number
        }
        Update: {
          amount_paid?: number
          commission?: number
          created_at?: string
          created_by?: string | null
          gross_amount?: number
          id?: string
          period_end?: string
          period_start?: string
          reseller_id?: string
          settled_at?: string | null
          vouchers_sold?: number
        }
        Relationships: [
          {
            foreignKeyName: "reseller_settlements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_settlements_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      resellers: {
        Row: {
          commission_rate: number
          created_at: string
          customer_id: string | null
          id: string
          is_active: boolean
          location_id: string | null
          name: string
          notes: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          is_active?: boolean
          location_id?: string | null
          name: string
          notes?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          is_active?: boolean
          location_id?: string | null
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resellers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resellers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_plans: {
        Row: {
          business_unit: Database["public"]["Enums"]["business_unit"]
          code: string
          created_at: string
          data_cap_mb: number | null
          description: string | null
          device_limit: number
          duration_days: number | null
          duration_hours: number | null
          id: string
          is_active: boolean
          name: string
          price_ssp: number
          price_usd: number | null
          reorder_level: number
          speed_mbps: number | null
          updated_at: string
        }
        Insert: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          code: string
          created_at?: string
          data_cap_mb?: number | null
          description?: string | null
          device_limit?: number
          duration_days?: number | null
          duration_hours?: number | null
          id?: string
          is_active?: boolean
          name: string
          price_ssp?: number
          price_usd?: number | null
          reorder_level?: number
          speed_mbps?: number | null
          updated_at?: string
        }
        Update: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          code?: string
          created_at?: string
          data_cap_mb?: number | null
          description?: string | null
          device_limit?: number
          duration_days?: number | null
          duration_hours?: number | null
          id?: string
          is_active?: boolean
          name?: string
          price_ssp?: number
          price_usd?: number | null
          reorder_level?: number
          speed_mbps?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          auto_renew: boolean
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_code"]
          customer_id: string
          deleted_at: string | null
          end_date: string
          id: string
          last_reminder_at: string | null
          location_id: string | null
          mac_address: string | null
          monthly_fee: number
          plan_id: string
          router_username: string | null
          start_date: string
          static_ip: unknown
          status: Database["public"]["Enums"]["subscription_status"]
          subscription_code: string | null
          suspend_reason: string | null
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          customer_id: string
          deleted_at?: string | null
          end_date: string
          id?: string
          last_reminder_at?: string | null
          location_id?: string | null
          mac_address?: string | null
          monthly_fee?: number
          plan_id: string
          router_username?: string | null
          start_date?: string
          static_ip?: unknown
          status?: Database["public"]["Enums"]["subscription_status"]
          subscription_code?: string | null
          suspend_reason?: string | null
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          customer_id?: string
          deleted_at?: string | null
          end_date?: string
          id?: string
          last_reminder_at?: string | null
          location_id?: string | null
          mac_address?: string | null
          monthly_fee?: number
          plan_id?: string
          router_username?: string | null
          start_date?: string
          static_ip?: unknown
          status?: Database["public"]["Enums"]["subscription_status"]
          subscription_code?: string | null
          suspend_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          due_at: string | null
          id: string
          priority: Database["public"]["Enums"]["priority_level"]
          related_id: string | null
          related_type: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          related_id?: string | null
          related_type?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          related_id?: string | null
          related_type?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_batches: {
        Row: {
          batch_code: string | null
          created_at: string
          generated_by: string | null
          id: string
          location_id: string | null
          notes: string | null
          plan_id: string
          quantity: number
          reseller_id: string | null
        }
        Insert: {
          batch_code?: string | null
          created_at?: string
          generated_by?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          plan_id: string
          quantity: number
          reseller_id?: string | null
        }
        Update: {
          batch_code?: string | null
          created_at?: string
          generated_by?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          plan_id?: string
          quantity?: number
          reseller_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voucher_batches_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_batches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_batches_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_batches_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          batch_id: string | null
          code: string
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          customer_id: string | null
          expires_at: string | null
          id: string
          location_id: string | null
          plan_id: string
          price_sold: number | null
          reseller_id: string | null
          sold_at: string | null
          sold_by: string | null
          status: Database["public"]["Enums"]["voucher_status"]
          updated_at: string
          used_at: string | null
          void_reason: string | null
        }
        Insert: {
          batch_id?: string | null
          code: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          customer_id?: string | null
          expires_at?: string | null
          id?: string
          location_id?: string | null
          plan_id: string
          price_sold?: number | null
          reseller_id?: string | null
          sold_at?: string | null
          sold_by?: string | null
          status?: Database["public"]["Enums"]["voucher_status"]
          updated_at?: string
          used_at?: string | null
          void_reason?: string | null
        }
        Update: {
          batch_id?: string | null
          code?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          customer_id?: string | null
          expires_at?: string | null
          id?: string
          location_id?: string | null
          plan_id?: string
          price_sold?: number | null
          reseller_id?: string | null
          sold_at?: string | null
          sold_by?: string | null
          status?: Database["public"]["Enums"]["voucher_status"]
          updated_at?: string
          used_at?: string | null
          void_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "voucher_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_sold_by_fkey"
            columns: ["sold_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_subscriptions_expiring: {
        Row: {
          auto_renew: boolean | null
          created_at: string | null
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_code"] | null
          customer_id: string | null
          days_left: number | null
          deleted_at: string | null
          display_name: string | null
          end_date: string | null
          id: string | null
          last_reminder_at: string | null
          location_id: string | null
          mac_address: string | null
          monthly_fee: number | null
          phone_primary: string | null
          plan_id: string | null
          plan_name: string | null
          router_username: string | null
          start_date: string | null
          static_ip: unknown
          status: Database["public"]["Enums"]["subscription_status"] | null
          subscription_code: string | null
          suspend_reason: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      v_voucher_stock: {
        Row: {
          allocated: number | null
          available: number | null
          location_id: string | null
          location_name: string | null
          plan_id: string | null
          plan_name: string | null
          reorder_level: number | null
          sold: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auth_locations: { Args: never; Returns: string[] }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      auth_units: {
        Args: never
        Returns: Database["public"]["Enums"]["business_unit"][]
      }
      can_write: { Args: never; Returns: boolean }
      fn_expiry_sweep: { Args: never; Returns: undefined }
      fn_generate_voucher_batch: {
        Args: {
          p_location_id: string
          p_notes?: string
          p_plan_id: string
          p_quantity: number
          p_reseller_id?: string
        }
        Returns: string
      }
      fn_renew_subscription: {
        Args: {
          p_amount?: number
          p_method?: Database["public"]["Enums"]["payment_method"]
          p_months?: number
          p_subscription_id: string
        }
        Returns: Json
      }
      fn_resume_subscription: {
        Args: { p_subscription_id: string }
        Returns: undefined
      }
      fn_sell_voucher: {
        Args: {
          p_code: string
          p_customer_id?: string
          p_location_id?: string
          p_method?: Database["public"]["Enums"]["payment_method"]
          p_price: number
        }
        Returns: Json
      }
      fn_suspend_subscription: {
        Args: { p_reason: string; p_subscription_id: string }
        Returns: undefined
      }
      fn_update_installation_status: {
        Args: {
          p_gps_lat?: number
          p_gps_lng?: number
          p_installation_id: string
          p_notes?: string
          p_payment_method?: Database["public"]["Enums"]["payment_method"]
          p_photo_paths?: string[]
          p_record_payment?: boolean
          p_signature_path?: string
          p_status: Database["public"]["Enums"]["installation_status"]
        }
        Returns: Json
      }
      fn_void_voucher: {
        Args: { p_reason: string; p_voucher_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_first_run: { Args: never; Returns: boolean }
      next_code: { Args: { p_key: string }; Returns: string }
      row_visible: {
        Args: {
          p_creator: string
          p_location: string
          p_owner: string
          p_units: Database["public"]["Enums"]["business_unit"][]
        }
        Returns: boolean
      }
    }
    Enums: {
      activity_direction: "inbound" | "outbound" | "internal"
      activity_type:
        | "call"
        | "whatsapp"
        | "sms"
        | "email"
        | "visit"
        | "meeting"
        | "note"
        | "system"
      booking_status:
        | "enquiry"
        | "tentative"
        | "confirmed"
        | "completed"
        | "cancelled"
      business_unit: "wifi" | "services" | "refreshment"
      campaign_status:
        | "draft"
        | "scheduled"
        | "running"
        | "completed"
        | "cancelled"
      currency_code: "SSP" | "USD"
      customer_status:
        | "lead"
        | "prospect"
        | "active"
        | "dormant"
        | "churned"
        | "blacklisted"
      customer_type:
        | "individual"
        | "business"
        | "ngo"
        | "government"
        | "reseller"
      deal_status: "open" | "won" | "lost"
      installation_status:
        | "scheduled"
        | "en_route"
        | "in_progress"
        | "completed"
        | "failed"
        | "cancelled"
      invoice_status: "draft" | "sent" | "partial" | "paid" | "overdue" | "void"
      message_channel: "whatsapp" | "sms" | "email"
      message_status: "queued" | "sent" | "failed" | "delivered" | "read"
      milestone_status: "pending" | "in_progress" | "completed" | "cancelled"
      payment_method:
        | "cash"
        | "mobile_money"
        | "bank_transfer"
        | "agent_code"
        | "credit"
        | "other"
      priority_level: "low" | "normal" | "high" | "urgent"
      project_status:
        | "discovery"
        | "in_progress"
        | "review"
        | "delivered"
        | "closed"
        | "on_hold"
      subscription_status:
        | "pending"
        | "active"
        | "expiring_soon"
        | "expired"
        | "suspended"
        | "cancelled"
      supplier_order_status: "ordered" | "received" | "partial" | "cancelled"
      task_status: "open" | "in_progress" | "done" | "cancelled"
      ticket_channel:
        | "walk_in"
        | "call"
        | "whatsapp"
        | "sms"
        | "field"
        | "email"
      ticket_status:
        | "new"
        | "open"
        | "pending_customer"
        | "escalated"
        | "resolved"
        | "closed"
      user_role:
        | "owner"
        | "admin"
        | "manager"
        | "agent"
        | "technician"
        | "viewer"
      voucher_status:
        | "available"
        | "allocated"
        | "sold"
        | "used"
        | "expired"
        | "void"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_direction: ["inbound", "outbound", "internal"],
      activity_type: [
        "call",
        "whatsapp",
        "sms",
        "email",
        "visit",
        "meeting",
        "note",
        "system",
      ],
      booking_status: [
        "enquiry",
        "tentative",
        "confirmed",
        "completed",
        "cancelled",
      ],
      business_unit: ["wifi", "services", "refreshment"],
      campaign_status: [
        "draft",
        "scheduled",
        "running",
        "completed",
        "cancelled",
      ],
      currency_code: ["SSP", "USD"],
      customer_status: [
        "lead",
        "prospect",
        "active",
        "dormant",
        "churned",
        "blacklisted",
      ],
      customer_type: [
        "individual",
        "business",
        "ngo",
        "government",
        "reseller",
      ],
      deal_status: ["open", "won", "lost"],
      installation_status: [
        "scheduled",
        "en_route",
        "in_progress",
        "completed",
        "failed",
        "cancelled",
      ],
      invoice_status: ["draft", "sent", "partial", "paid", "overdue", "void"],
      message_channel: ["whatsapp", "sms", "email"],
      message_status: ["queued", "sent", "failed", "delivered", "read"],
      milestone_status: ["pending", "in_progress", "completed", "cancelled"],
      payment_method: [
        "cash",
        "mobile_money",
        "bank_transfer",
        "agent_code",
        "credit",
        "other",
      ],
      priority_level: ["low", "normal", "high", "urgent"],
      project_status: [
        "discovery",
        "in_progress",
        "review",
        "delivered",
        "closed",
        "on_hold",
      ],
      subscription_status: [
        "pending",
        "active",
        "expiring_soon",
        "expired",
        "suspended",
        "cancelled",
      ],
      supplier_order_status: ["ordered", "received", "partial", "cancelled"],
      task_status: ["open", "in_progress", "done", "cancelled"],
      ticket_channel: ["walk_in", "call", "whatsapp", "sms", "field", "email"],
      ticket_status: [
        "new",
        "open",
        "pending_customer",
        "escalated",
        "resolved",
        "closed",
      ],
      user_role: ["owner", "admin", "manager", "agent", "technician", "viewer"],
      voucher_status: [
        "available",
        "allocated",
        "sold",
        "used",
        "expired",
        "void",
      ],
    },
  },
} as const
