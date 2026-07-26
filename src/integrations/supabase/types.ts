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
      contracts: {
        Row: {
          admin_notes: string | null
          body: string
          created_at: string
          created_by: string
          customer_response_note: string | null
          decided_at: string | null
          id: string
          order_id: string
          quote_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["contract_status"]
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          admin_notes?: string | null
          body: string
          created_at?: string
          created_by: string
          customer_response_note?: string | null
          decided_at?: string | null
          id?: string
          order_id: string
          quote_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          title: string
          updated_at?: string
          version: number
        }
        Update: {
          admin_notes?: string | null
          body?: string
          created_at?: string
          created_by?: string
          customer_response_note?: string | null
          decided_at?: string | null
          id?: string
          order_id?: string
          quote_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          id: string
          ip: string | null
          method: string
          mobile: string
          success: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          ip?: string | null
          method: string
          mobile: string
          success: boolean
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string | null
          method?: string
          mobile?: string
          success?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_files: {
        Row: {
          content_type: string
          created_at: string
          file_name: string
          id: string
          kind: string
          order_id: string
          owner_id: string
          size_bytes: number
          storage_path: string
          uploaded_by_role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          content_type: string
          created_at?: string
          file_name: string
          id?: string
          kind: string
          order_id: string
          owner_id: string
          size_bytes: number
          storage_path: string
          uploaded_by_role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          content_type?: string
          created_at?: string
          file_name?: string
          id?: string
          kind?: string
          order_id?: string
          owner_id?: string
          size_bytes?: number
          storage_path?: string
          uploaded_by_role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "order_files_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          order_id: string
          read_at: string | null
          sender_id: string
          sender_role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          order_id: string
          read_at?: string | null
          sender_id: string
          sender_role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          order_id?: string
          read_at?: string | null
          sender_id?: string
          sender_role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          aerial: boolean
          best_call_time: string | null
          budget_note: string | null
          cameras_count: number | null
          city: string | null
          clips_count: number | null
          consent_ai_use: boolean
          consent_face_voice_simulation: boolean
          consent_file_ownership: boolean
          consent_publish_portfolio: boolean
          consent_terms: boolean
          created_at: string
          customer_id: string
          customer_notes: string | null
          description: string | null
          duration_min: number | null
          event_date: string | null
          expectations: string | null
          id: string
          needs_audio: boolean
          needs_lighting: boolean
          order_code: string
          orientation: string | null
          package_key: string | null
          preferred_contact: string | null
          project_title: string
          quality: string | null
          reels_count: number | null
          rush: boolean
          scriptwriting: boolean
          service_type: string
          shooting_days: number | null
          status: Database["public"]["Enums"]["order_status"]
          style: string | null
          submitted_at: string | null
          subtitles: boolean
          team_hours: number | null
          updated_at: string
          voiceover: boolean
        }
        Insert: {
          address?: string | null
          aerial?: boolean
          best_call_time?: string | null
          budget_note?: string | null
          cameras_count?: number | null
          city?: string | null
          clips_count?: number | null
          consent_ai_use?: boolean
          consent_face_voice_simulation?: boolean
          consent_file_ownership?: boolean
          consent_publish_portfolio?: boolean
          consent_terms?: boolean
          created_at?: string
          customer_id: string
          customer_notes?: string | null
          description?: string | null
          duration_min?: number | null
          event_date?: string | null
          expectations?: string | null
          id?: string
          needs_audio?: boolean
          needs_lighting?: boolean
          order_code: string
          orientation?: string | null
          package_key?: string | null
          preferred_contact?: string | null
          project_title: string
          quality?: string | null
          reels_count?: number | null
          rush?: boolean
          scriptwriting?: boolean
          service_type: string
          shooting_days?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          style?: string | null
          submitted_at?: string | null
          subtitles?: boolean
          team_hours?: number | null
          updated_at?: string
          voiceover?: boolean
        }
        Update: {
          address?: string | null
          aerial?: boolean
          best_call_time?: string | null
          budget_note?: string | null
          cameras_count?: number | null
          city?: string | null
          clips_count?: number | null
          consent_ai_use?: boolean
          consent_face_voice_simulation?: boolean
          consent_file_ownership?: boolean
          consent_publish_portfolio?: boolean
          consent_terms?: boolean
          created_at?: string
          customer_id?: string
          customer_notes?: string | null
          description?: string | null
          duration_min?: number | null
          event_date?: string | null
          expectations?: string | null
          id?: string
          needs_audio?: boolean
          needs_lighting?: boolean
          order_code?: string
          orientation?: string | null
          package_key?: string | null
          preferred_contact?: string | null
          project_title?: string
          quality?: string | null
          reels_count?: number | null
          rush?: boolean
          scriptwriting?: boolean
          service_type?: string
          shooting_days?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          style?: string | null
          submitted_at?: string | null
          subtitles?: boolean
          team_hours?: number | null
          updated_at?: string
          voiceover?: boolean
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          mobile: string
          purpose: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          mobile: string
          purpose: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          mobile?: string
          purpose?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          admin_notes: string | null
          amount_toman: number
          created_at: string
          customer_id: string
          id: string
          kind: Database["public"]["Enums"]["payment_kind"]
          note: string | null
          order_id: string
          paid_at: string | null
          receipt_path: string | null
          reference_no: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount_toman: number
          created_at?: string
          customer_id: string
          id?: string
          kind: Database["public"]["Enums"]["payment_kind"]
          note?: string | null
          order_id: string
          paid_at?: string | null
          receipt_path?: string | null
          reference_no?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount_toman?: number
          created_at?: string
          customer_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          note?: string | null
          order_id?: string
          paid_at?: string | null
          receipt_path?: string | null
          reference_no?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          mobile: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          mobile: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          mobile?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_deliverables: {
        Row: {
          content_type: string
          created_at: string
          file_name: string
          id: string
          is_final_output: boolean
          milestone_id: string
          notes: string | null
          order_id: string
          size_bytes: number
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          content_type: string
          created_at?: string
          file_name: string
          id?: string
          is_final_output?: boolean
          milestone_id: string
          notes?: string | null
          order_id: string
          size_bytes: number
          storage_path: string
          uploaded_by: string
        }
        Update: {
          content_type?: string
          created_at?: string
          file_name?: string
          id?: string
          is_final_output?: boolean
          milestone_id?: string
          notes?: string | null
          order_id?: string
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_deliverables_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_deliverables_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          accepted_at: string | null
          admin_notes: string | null
          created_at: string
          customer_notes: string | null
          delivered_at: string | null
          description: string | null
          id: string
          key: Database["public"]["Enums"]["milestone_key"]
          order_id: string
          sort_order: number
          status: Database["public"]["Enums"]["milestone_status"]
          title: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          admin_notes?: string | null
          created_at?: string
          customer_notes?: string | null
          delivered_at?: string | null
          description?: string | null
          id?: string
          key: Database["public"]["Enums"]["milestone_key"]
          order_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["milestone_status"]
          title: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          admin_notes?: string | null
          created_at?: string
          customer_notes?: string | null
          delivered_at?: string | null
          description?: string | null
          id?: string
          key?: Database["public"]["Enums"]["milestone_key"]
          order_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["milestone_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          amount_toman: number
          created_at: string
          description: string | null
          id: string
          quantity: number
          quote_id: string
          sort_order: number
          title: string
          unit_price_toman: number
        }
        Insert: {
          amount_toman: number
          created_at?: string
          description?: string | null
          id?: string
          quantity?: number
          quote_id: string
          sort_order?: number
          title: string
          unit_price_toman: number
        }
        Update: {
          amount_toman?: number
          created_at?: string
          description?: string | null
          id?: string
          quantity?: number
          quote_id?: string
          sort_order?: number
          title?: string
          unit_price_toman?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          admin_notes: string | null
          created_at: string
          created_by: string
          customer_response_note: string | null
          decided_at: string | null
          deposit_toman: number
          discount_toman: number
          expires_at: string | null
          id: string
          order_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          subtotal_toman: number
          tax_toman: number
          total_toman: number
          updated_at: string
          version: number
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          created_by: string
          customer_response_note?: string | null
          decided_at?: string | null
          deposit_toman?: number
          discount_toman?: number
          expires_at?: string | null
          id?: string
          order_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal_toman?: number
          tax_toman?: number
          total_toman?: number
          updated_at?: string
          version: number
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          created_by?: string
          customer_response_note?: string | null
          decided_at?: string | null
          deposit_toman?: number
          discount_toman?: number
          expires_at?: string | null
          id?: string
          order_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal_toman?: number
          tax_toman?: number
          total_toman?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          bucket: string
          created_at: string
          id: string
          key: string
        }
        Insert: {
          bucket: string
          created_at?: string
          id?: string
          key: string
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          key?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      bootstrap_project_milestones: {
        Args: { _order_id: string }
        Returns: undefined
      }
      generate_order_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_contract_version: { Args: { _order_id: string }; Returns: number }
      next_quote_version: { Args: { _order_id: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "customer"
      contract_status: "draft" | "sent" | "approved" | "rejected" | "superseded"
      milestone_key:
        | "kickoff"
        | "initial_cut"
        | "revision_1"
        | "revision_2"
        | "final_output"
        | "settlement"
      milestone_status:
        | "pending"
        | "in_progress"
        | "delivered"
        | "accepted"
        | "revision_requested"
        | "skipped"
      order_status:
        | "draft"
        | "submitted"
        | "quoted"
        | "contract_pending"
        | "contract_approved"
        | "payment_pending"
        | "in_production"
        | "initial_delivered"
        | "revisions"
        | "final_delivered"
        | "completed"
        | "cancelled"
      payment_kind: "deposit" | "final"
      payment_status: "pending" | "approved" | "rejected" | "cancelled"
      quote_status:
        | "draft"
        | "sent"
        | "approved"
        | "rejected"
        | "revision_requested"
        | "superseded"
        | "expired"
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
      app_role: ["admin", "customer"],
      contract_status: ["draft", "sent", "approved", "rejected", "superseded"],
      milestone_key: [
        "kickoff",
        "initial_cut",
        "revision_1",
        "revision_2",
        "final_output",
        "settlement",
      ],
      milestone_status: [
        "pending",
        "in_progress",
        "delivered",
        "accepted",
        "revision_requested",
        "skipped",
      ],
      order_status: [
        "draft",
        "submitted",
        "quoted",
        "contract_pending",
        "contract_approved",
        "payment_pending",
        "in_production",
        "initial_delivered",
        "revisions",
        "final_delivered",
        "completed",
        "cancelled",
      ],
      payment_kind: ["deposit", "final"],
      payment_status: ["pending", "approved", "rejected", "cancelled"],
      quote_status: [
        "draft",
        "sent",
        "approved",
        "rejected",
        "revision_requested",
        "superseded",
        "expired",
      ],
    },
  },
} as const
