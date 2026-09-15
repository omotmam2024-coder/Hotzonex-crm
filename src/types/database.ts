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
    }
    Views: {
      [_ in never]: never
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
