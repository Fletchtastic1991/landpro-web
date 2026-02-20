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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analysis: {
        Row: {
          created_at: string
          hazards: Json | null
          id: string
          land_classification: Json | null
          path: Json | null
          project_id: string
        }
        Insert: {
          created_at?: string
          hazards?: Json | null
          id?: string
          land_classification?: Json | null
          path?: Json | null
          project_id: string
        }
        Update: {
          created_at?: string
          hazards?: Json | null
          id?: string
          land_classification?: Json | null
          path?: Json | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_jobs: {
        Row: {
          created_at: string
          id: string
          preprocess_path: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preprocess_path: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preprocess_path?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          client_name: string
          client_user_id: string | null
          created_at: string
          email: string
          id: string
          invitation_sent_at: string | null
          invitation_token: string | null
          landscaper_id: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          client_name: string
          client_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          invitation_sent_at?: string | null
          invitation_token?: string | null
          landscaper_id: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          client_name?: string
          client_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          invitation_sent_at?: string | null
          invitation_token?: string | null
          landscaper_id?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_landscaper_id_fkey"
            columns: ["landscaper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          quote_id: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_payment_link: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          due_date: string
          id?: string
          invoice_number: string
          issue_date?: string
          quote_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_payment_link?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          due_date?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          quote_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_payment_link?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_records: {
        Row: {
          category: Database["public"]["Enums"]["memory_category"]
          confidence: Database["public"]["Enums"]["memory_confidence"]
          parcel_id: string
          record_id: string
          source: string
          timestamp: string
          value: Json | null
        }
        Insert: {
          category: Database["public"]["Enums"]["memory_category"]
          confidence: Database["public"]["Enums"]["memory_confidence"]
          parcel_id: string
          record_id?: string
          source: string
          timestamp?: string
          value?: Json | null
        }
        Update: {
          category?: Database["public"]["Enums"]["memory_category"]
          confidence?: Database["public"]["Enums"]["memory_confidence"]
          parcel_id?: string
          record_id?: string
          source?: string
          timestamp?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "memory_records_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          id: string
          message: string
          quote_id: string | null
          read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          quote_id?: string | null
          read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          quote_id?: string | null
          read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      parcel_state_objects: {
        Row: {
          created_at: string
          derived_state: Json | null
          id: string
          last_updated: string
          linked_reports: Json | null
          parcel_id: string
        }
        Insert: {
          created_at?: string
          derived_state?: Json | null
          id?: string
          last_updated?: string
          linked_reports?: Json | null
          parcel_id: string
        }
        Update: {
          created_at?: string
          derived_state?: Json | null
          id?: string
          last_updated?: string
          linked_reports?: Json | null
          parcel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcel_state_objects_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          acreage: number | null
          boundary: Json | null
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acreage?: number | null
          boundary?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acreage?: number | null
          boundary?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          client_id: string | null
          client_name: string
          completion_time: string
          created_at: string
          equipment_cost: number
          id: string
          job_description: string
          labor_cost: number
          material_cost: number
          material_notes: string | null
          notes: string | null
          project_id: string | null
          property_size: string
          property_unit: string
          status: string
          total_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          client_name: string
          completion_time: string
          created_at?: string
          equipment_cost: number
          id?: string
          job_description: string
          labor_cost: number
          material_cost: number
          material_notes?: string | null
          notes?: string | null
          project_id?: string | null
          property_size: string
          property_unit: string
          status?: string
          total_cost: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          client_name?: string
          completion_time?: string
          created_at?: string
          equipment_cost?: number
          id?: string
          job_description?: string
          labor_cost?: number
          material_cost?: number
          material_notes?: string | null
          notes?: string | null
          project_id?: string | null
          property_size?: string
          property_unit?: string
          status?: string
          total_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      reality_events: {
        Row: {
          confidence_level: Database["public"]["Enums"]["memory_confidence"]
          description: string
          event_id: string
          event_type: string
          location: Json | null
          parcel_state_id: string
          source: Database["public"]["Enums"]["reality_event_source"]
          timestamp: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          confidence_level?: Database["public"]["Enums"]["memory_confidence"]
          description: string
          event_id?: string
          event_type: string
          location?: Json | null
          parcel_state_id: string
          source: Database["public"]["Enums"]["reality_event_source"]
          timestamp?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          confidence_level?: Database["public"]["Enums"]["memory_confidence"]
          description?: string
          event_id?: string
          event_type?: string
          location?: Json | null
          parcel_state_id?: string
          source?: Database["public"]["Enums"]["reality_event_source"]
          timestamp?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reality_events_parcel_state_id_fkey"
            columns: ["parcel_state_id"]
            isOneToOne: false
            referencedRelation: "parcel_state_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          pdf_url: string | null
          project_id: string
          report_json: Json
        }
        Insert: {
          created_at?: string
          id?: string
          pdf_url?: string | null
          project_id: string
          report_json: Json
        }
        Update: {
          created_at?: string
          id?: string
          pdf_url?: string | null
          project_id?: string
          report_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invoice_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      memory_category:
        | "geometry"
        | "topography"
        | "surface"
        | "access"
        | "restriction"
        | "infrastructure"
        | "observation"
        | "metadata"
      memory_confidence: "High" | "Medium" | "Low"
      reality_event_source: "user" | "system" | "pro" | "sensor"
      verification_status: "unverified" | "verified"
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
  public: {
    Enums: {
      app_role: ["admin", "user"],
      memory_category: [
        "geometry",
        "topography",
        "surface",
        "access",
        "restriction",
        "infrastructure",
        "observation",
        "metadata",
      ],
      memory_confidence: ["High", "Medium", "Low"],
      reality_event_source: ["user", "system", "pro", "sensor"],
      verification_status: ["unverified", "verified"],
    },
  },
} as const
