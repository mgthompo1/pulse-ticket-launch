export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_generated_content: {
        Row: {
          content_type: string
          created_at: string
          generated_content: Json
          id: string
          input_data: Json
          used: boolean
          user_id: string | null
        }
        Insert: {
          content_type: string
          created_at?: string
          generated_content: Json
          id?: string
          input_data: Json
          used?: boolean
          user_id?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string
          generated_content?: Json
          id?: string
          input_data?: Json
          used?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      billing_customers: {
        Row: {
          billing_email: string
          billing_status: string
          created_at: string
          id: string
          organization_id: string
          payment_method_id: string | null
          stripe_customer_id: string
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          billing_email: string
          billing_status?: string
          created_at?: string
          id?: string
          organization_id: string
          payment_method_id?: string | null
          stripe_customer_id: string
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_email?: string
          billing_status?: string
          created_at?: string
          id?: string
          organization_id?: string
          payment_method_id?: string | null
          stripe_customer_id?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoices: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          created_at: string
          due_date: string | null
          id: string
          organization_id: string
          paid_at: string | null
          status: string
          stripe_invoice_id: string | null
          total_platform_fees: number
          total_transaction_volume: number
          total_transactions: number
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          due_date?: string | null
          id?: string
          organization_id: string
          paid_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          total_platform_fees?: number
          total_transaction_volume?: number
          total_transactions?: number
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          due_date?: string | null
          id?: string
          organization_id?: string
          paid_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          total_platform_fees?: number
          total_transaction_volume?: number
          total_transactions?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          messages: Json
          session_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          messages?: Json
          session_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          messages?: Json
          session_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          checked_in_at: string
          checked_in_by: string | null
          created_at: string
          id: string
          lanyard_printed: boolean | null
          notes: string | null
          ticket_id: string
        }
        Insert: {
          checked_in_at?: string
          checked_in_by?: string | null
          created_at?: string
          id?: string
          lanyard_printed?: boolean | null
          notes?: string | null
          ticket_id: string
        }
        Update: {
          checked_in_at?: string
          checked_in_by?: string | null
          created_at?: string
          id?: string
          lanyard_printed?: boolean | null
          notes?: string | null
          ticket_id?: string
        }
        Relationships: []
      }
      concession_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          event_id: string
          id: string
          name: string
          price: number
          stock_quantity: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          name: string
          price: number
          stock_quantity?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          name?: string
          price?: number
          stock_quantity?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      email_notifications: {
        Row: {
          email_type: string
          id: string
          order_id: string | null
          recipient_email: string
          sent_at: string
          status: string
          subject: string
        }
        Insert: {
          email_type: string
          id?: string
          order_id?: string | null
          recipient_email: string
          sent_at?: string
          status?: string
          subject: string
        }
        Update: {
          email_type?: string
          id?: string
          order_id?: string | null
          recipient_email?: string
          sent_at?: string
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number
          created_at: string
          description: string | null
          event_date: string
          featured_image_url: string | null
          id: string
          logo_url: string | null
          name: string
          organization_id: string
          requires_approval: boolean | null
          status: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          capacity?: number
          created_at?: string
          description?: string | null
          event_date: string
          featured_image_url?: string | null
          id?: string
          logo_url?: string | null
          name: string
          organization_id: string
          requires_approval?: boolean | null
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string
          description?: string | null
          event_date?: string
          featured_image_url?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          organization_id?: string
          requires_approval?: boolean | null
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_content: {
        Row: {
          content_type: string | null
          created_at: string | null
          description: string | null
          id: string
          key: string
          section: string
          updated_at: string | null
          value: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          section: string
          updated_at?: string | null
          value: string
        }
        Update: {
          content_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          section?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          quantity: number
          ticket_type_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          quantity: number
          ticket_type_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          quantity?: number
          ticket_type_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          event_id: string
          id: string
          status: string
          stripe_session_id: string | null
          total_amount: number
          updated_at: string
          windcave_session_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          event_id: string
          id?: string
          status?: string
          stripe_session_id?: string | null
          total_amount: number
          updated_at?: string
          windcave_session_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          event_id?: string
          id?: string
          status?: string
          stripe_session_id?: string | null
          total_amount?: number
          updated_at?: string
          windcave_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "guest_status_view"
            referencedColumns: ["event_id"]
          },
        ]
      }
      organizations: {
        Row: {
          apple_pay_merchant_id: string | null
          billing_setup_completed: boolean
          billing_setup_required: boolean
          brand_colors: Json | null
          created_at: string
          currency: string | null
          custom_css: string | null
          email: string
          id: string
          logo_url: string | null
          name: string
          payment_provider: string | null
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean | null
          updated_at: string
          user_id: string
          website: string | null
          windcave_api_key: string | null
          windcave_enabled: boolean | null
          windcave_endpoint: string | null
          windcave_hit_key: string | null
          windcave_hit_username: string | null
          windcave_station_id: string | null
          windcave_username: string | null
        }
        Insert: {
          apple_pay_merchant_id?: string | null
          billing_setup_completed?: boolean
          billing_setup_required?: boolean
          brand_colors?: Json | null
          created_at?: string
          currency?: string | null
          custom_css?: string | null
          email: string
          id?: string
          logo_url?: string | null
          name: string
          payment_provider?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          updated_at?: string
          user_id: string
          website?: string | null
          windcave_api_key?: string | null
          windcave_enabled?: boolean | null
          windcave_endpoint?: string | null
          windcave_hit_key?: string | null
          windcave_hit_username?: string | null
          windcave_station_id?: string | null
          windcave_username?: string | null
        }
        Update: {
          apple_pay_merchant_id?: string | null
          billing_setup_completed?: boolean
          billing_setup_required?: boolean
          brand_colors?: Json | null
          created_at?: string
          currency?: string | null
          custom_css?: string | null
          email?: string
          id?: string
          logo_url?: string | null
          name?: string
          payment_provider?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          updated_at?: string
          user_id?: string
          website?: string | null
          windcave_api_key?: string | null
          windcave_enabled?: boolean | null
          windcave_endpoint?: string | null
          windcave_hit_key?: string | null
          windcave_hit_username?: string | null
          windcave_station_id?: string | null
          windcave_username?: string | null
        }
        Relationships: []
      }
      pos_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_name: string | null
          event_id: string
          id: string
          items: Json
          payment_method: string
          status: string
          stripe_payment_intent_id: string | null
          total_amount: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          event_id: string
          id?: string
          items?: Json
          payment_method?: string
          status?: string
          stripe_payment_intent_id?: string | null
          total_amount: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          event_id?: string
          id?: string
          items?: Json
          payment_method?: string
          status?: string
          stripe_payment_intent_id?: string | null
          total_amount?: number
        }
        Relationships: []
      }
      seat_maps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          layout_data: Json
          name: string
          total_seats: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          layout_data?: Json
          name?: string
          total_seats?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          layout_data?: Json
          name?: string
          total_seats?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_maps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_maps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "guest_status_view"
            referencedColumns: ["event_id"]
          },
        ]
      }
      seats: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          price_override: number | null
          row_label: string
          seat_map_id: string
          seat_number: string
          seat_type: string
          section: string | null
          x_position: number
          y_position: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          price_override?: number | null
          row_label: string
          seat_map_id: string
          seat_number: string
          seat_type?: string
          section?: string | null
          x_position: number
          y_position: number
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          price_override?: number | null
          row_label?: string
          seat_map_id?: string
          seat_number?: string
          seat_type?: string
          section?: string | null
          x_position?: number
          y_position?: number
        }
        Relationships: [
          {
            foreignKeyName: "seats_seat_map_id_fkey"
            columns: ["seat_map_id"]
            isOneToOne: false
            referencedRelation: "seat_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          id: string
          name: string
          price: number
          quantity_available: number
          quantity_sold: number
          sale_end_date: string | null
          sale_start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          name: string
          price: number
          quantity_available: number
          quantity_sold?: number
          sale_end_date?: string | null
          sale_start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          name?: string
          price?: number
          quantity_available?: number
          quantity_sold?: number
          sale_end_date?: string | null
          sale_start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "guest_status_view"
            referencedColumns: ["event_id"]
          },
        ]
      }
      tickets: {
        Row: {
          checked_in: boolean | null
          created_at: string
          id: string
          order_item_id: string
          status: string
          ticket_code: string
          used_at: string | null
        }
        Insert: {
          checked_in?: boolean | null
          created_at?: string
          id?: string
          order_item_id: string
          status?: string
          ticket_code: string
          used_at?: string | null
        }
        Update: {
          checked_in?: boolean | null
          created_at?: string
          id?: string
          order_item_id?: string
          status?: string
          ticket_code?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_records: {
        Row: {
          billed: boolean
          billing_period_end: string
          billing_period_start: string
          created_at: string
          id: string
          invoice_id: string | null
          order_id: string | null
          organization_id: string
          platform_fee_fixed: number
          platform_fee_percentage: number
          total_platform_fee: number
          transaction_amount: number
        }
        Insert: {
          billed?: boolean
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          order_id?: string | null
          organization_id: string
          platform_fee_fixed?: number
          platform_fee_percentage?: number
          total_platform_fee: number
          transaction_amount: number
        }
        Update: {
          billed?: boolean
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          order_id?: string | null
          organization_id?: string
          platform_fee_fixed?: number
          platform_fee_percentage?: number
          total_platform_fee?: number
          transaction_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      guest_status_view: {
        Row: {
          check_in_notes: string | null
          checked_in: boolean | null
          checked_in_at: string | null
          checked_in_by: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          event_id: string | null
          event_name: string | null
          lanyard_printed: boolean | null
          order_date: string | null
          price: number | null
          quantity: number | null
          ticket_code: string | null
          ticket_id: string | null
          ticket_status: string | null
          ticket_type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_platform_fee: {
        Args: { order_id: number } | { transaction_amount: number }
        Returns: number
      }
      generate_ticket_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
