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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          status: string
          token: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          status?: string
          token: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          status?: string
          token?: string
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          admin_user_id: string
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown | null
          last_activity: string
          session_token: string
          user_agent: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown | null
          last_activity?: string
          session_token: string
          user_agent?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          last_activity?: string
          session_token?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          last_login_at: string | null
          password_hash: string
          totp_secret: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          password_hash: string
          totp_secret?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          password_hash?: string
          totp_secret?: string | null
          updated_at?: string
        }
        Relationships: []
      }
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
      contact_enquiries: {
        Row: {
          created_at: string
          email: string
          enquiry_type: string
          id: string
          message: string
          name: string
          organization_id: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          enquiry_type?: string
          id?: string
          message: string
          name: string
          organization_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          enquiry_type?: string
          id?: string
          message?: string
          name?: string
          organization_id?: string | null
          phone?: string | null
          status?: string
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
          email_customization: Json | null
          event_date: string
          featured_image_url: string | null
          id: string
          logo_url: string | null
          name: string
          organization_id: string
          requires_approval: boolean | null
          status: string
          ticket_customization: Json | null
          ticket_delivery_method: string | null
          updated_at: string
          venue: string | null
          widget_customization: Json | null
        }
        Insert: {
          capacity?: number
          created_at?: string
          description?: string | null
          email_customization?: Json | null
          event_date: string
          featured_image_url?: string | null
          id?: string
          logo_url?: string | null
          name: string
          organization_id: string
          requires_approval?: boolean | null
          status?: string
          ticket_customization?: Json | null
          ticket_delivery_method?: string | null
          updated_at?: string
          venue?: string | null
          widget_customization?: Json | null
        }
        Update: {
          capacity?: number
          created_at?: string
          description?: string | null
          email_customization?: Json | null
          event_date?: string
          featured_image_url?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          organization_id?: string
          requires_approval?: boolean | null
          status?: string
          ticket_customization?: Json | null
          ticket_delivery_method?: string | null
          updated_at?: string
          venue?: string | null
          widget_customization?: Json | null
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
      merchandise: {
        Row: {
          category: string | null
          color_options: string[] | null
          created_at: string
          description: string | null
          event_id: string
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          size_options: string[] | null
          stock_quantity: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          color_options?: string[] | null
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          size_options?: string[] | null
          stock_quantity?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          color_options?: string[] | null
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          size_options?: string[] | null
          stock_quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchandise_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          item_type: string | null
          merchandise_id: string | null
          merchandise_options: Json | null
          order_id: string
          quantity: number
          ticket_type_id: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_type?: string | null
          merchandise_id?: string | null
          merchandise_options?: Json | null
          order_id: string
          quantity: number
          ticket_type_id?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          item_type?: string | null
          merchandise_id?: string | null
          merchandise_options?: Json | null
          order_id?: string
          quantity?: number
          ticket_type_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_merchandise_id_fkey"
            columns: ["merchandise_id"]
            isOneToOne: false
            referencedRelation: "merchandise"
            referencedColumns: ["id"]
          },
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
          custom_answers: Json | null
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
          custom_answers?: Json | null
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
          custom_answers?: Json | null
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
        ]
      }
      organization_invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string
          organization_id: string
          permissions:
            | Database["public"]["Enums"]["organization_permission"][]
            | null
          role: Database["public"]["Enums"]["organization_role"]
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invitation_token: string
          invited_by: string
          organization_id: string
          permissions?:
            | Database["public"]["Enums"]["organization_permission"][]
            | null
          role?: Database["public"]["Enums"]["organization_role"]
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string
          organization_id?: string
          permissions?:
            | Database["public"]["Enums"]["organization_permission"][]
            | null
          role?: Database["public"]["Enums"]["organization_role"]
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_users: {
        Row: {
          created_at: string | null
          id: string
          invited_by: string | null
          joined_at: string | null
          organization_id: string
          permissions:
            | Database["public"]["Enums"]["organization_permission"][]
            | null
          role: Database["public"]["Enums"]["organization_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id: string
          permissions?:
            | Database["public"]["Enums"]["organization_permission"][]
            | null
          role?: Database["public"]["Enums"]["organization_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string
          permissions?:
            | Database["public"]["Enums"]["organization_permission"][]
            | null
          role?: Database["public"]["Enums"]["organization_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          billing_setup_completed: boolean
          billing_setup_required: boolean
          brand_colors: Json | null
          city: string | null
          country: string | null
          created_at: string
          credit_card_processing_fee_percentage: number | null
          currency: string | null
          custom_css: string | null
          email: string
          id: string
          logo_url: string | null
          name: string
          payment_provider: string | null
          phone: string | null
          postal_code: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          billing_setup_completed?: boolean
          billing_setup_required?: boolean
          brand_colors?: Json | null
          city?: string | null
          country?: string | null
          created_at?: string
          credit_card_processing_fee_percentage?: number | null
          currency?: string | null
          custom_css?: string | null
          email: string
          id?: string
          logo_url?: string | null
          name: string
          payment_provider?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          billing_setup_completed?: boolean
          billing_setup_required?: boolean
          brand_colors?: Json | null
          city?: string | null
          country?: string | null
          created_at?: string
          credit_card_processing_fee_percentage?: number | null
          currency?: string | null
          custom_css?: string | null
          email?: string
          id?: string
          logo_url?: string | null
          name?: string
          payment_provider?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      payment_credentials: {
        Row: {
          apple_pay_merchant_id: string | null
          created_at: string
          id: string
          organization_id: string
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean | null
          stripe_publishable_key: string | null
          stripe_secret_key: string | null
          updated_at: string
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
          created_at?: string
          id?: string
          organization_id: string
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          updated_at?: string
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
          created_at?: string
          id?: string
          organization_id?: string
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          updated_at?: string
          windcave_api_key?: string | null
          windcave_enabled?: boolean | null
          windcave_endpoint?: string | null
          windcave_hit_key?: string | null
          windcave_hit_username?: string | null
          windcave_station_id?: string | null
          windcave_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_config: {
        Row: {
          created_at: string
          id: string
          platform_fee_fixed: number
          platform_fee_percentage: number
          stripe_platform_publishable_key: string | null
          stripe_platform_secret_key: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform_fee_fixed?: number
          platform_fee_percentage?: number
          stripe_platform_publishable_key?: string | null
          stripe_platform_secret_key?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          platform_fee_fixed?: number
          platform_fee_percentage?: number
          stripe_platform_publishable_key?: string | null
          stripe_platform_secret_key?: string | null
          updated_at?: string
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
      scheduled_posts: {
        Row: {
          content: string
          created_at: string | null
          error_message: string | null
          event_id: string | null
          id: string
          image_url: string | null
          link_url: string | null
          platform: string
          published_post_id: string | null
          scheduled_time: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          platform: string
          published_post_id?: string | null
          scheduled_time: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          platform?: string
          published_post_id?: string | null
          scheduled_time?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
      security_audit_log: {
        Row: {
          admin_user_id: string | null
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      social_connections: {
        Row: {
          access_token: string | null
          account_name: string
          account_type: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_connected: boolean | null
          last_sync: string | null
          platform: string
          refresh_token: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          account_name: string
          account_type: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_connected?: boolean | null
          last_sync?: string | null
          platform: string
          refresh_token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          account_name?: string
          account_type?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_connected?: boolean | null
          last_sync?: string | null
          platform?: string
          refresh_token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      xero_connections: {
        Row: {
          access_token: string | null
          connection_status: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          organization_id: string
          refresh_token: string | null
          sync_settings: Json | null
          tenant_id: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          connection_status?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          organization_id: string
          refresh_token?: string | null
          sync_settings?: Json | null
          tenant_id: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          connection_status?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          organization_id?: string
          refresh_token?: string | null
          sync_settings?: Json | null
          tenant_id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "xero_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      xero_sync_logs: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          id: string
          operation_type: string
          status: string
          sync_data: Json | null
          xero_connection_id: string
          xero_entity_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          operation_type: string
          status: string
          sync_data?: Json | null
          xero_connection_id: string
          xero_entity_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          operation_type?: string
          status?: string
          sync_data?: Json | null
          xero_connection_id?: string
          xero_entity_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xero_sync_logs_xero_connection_id_fkey"
            columns: ["xero_connection_id"]
            isOneToOne: false
            referencedRelation: "xero_connections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation_and_signup: {
        Args: { p_invitation_token: string; p_user_id: string }
        Returns: Json
      }
      accept_organization_invitation: {
        Args: { p_invitation_token: string }
        Returns: string
      }
      add_user_to_organization: {
        Args: {
          p_organization_id: string
          p_permissions?: Database["public"]["Enums"]["organization_permission"][]
          p_role?: Database["public"]["Enums"]["organization_role"]
          p_user_id: string
        }
        Returns: string
      }
      calculate_platform_fee: {
        Args:
          | Record<PropertyKey, never>
          | { order_id: number }
          | { transaction_amount: number }
        Returns: number
      }
      can_access_guest_data: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      check_billing_setup: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      check_user_permission: {
        Args: {
          p_organization_id: string
          p_permission: Database["public"]["Enums"]["organization_permission"]
          p_user_id: string
        }
        Returns: boolean
      }
      create_admin_session: {
        Args: {
          p_admin_id: string
          p_ip?: unknown
          p_token: string
          p_user_agent?: string
        }
        Returns: string
      }
      create_order_secure: {
        Args: {
          p_custom_answers?: Json
          p_customer_email: string
          p_customer_name: string
          p_customer_phone: string
          p_event_id: string
          p_total_amount: number
        }
        Returns: string
      }
      create_tickets_bulk: {
        Args: { tickets_data: Json }
        Returns: {
          checked_in: boolean | null
          created_at: string
          id: string
          order_item_id: string
          status: string
          ticket_code: string
          used_at: string | null
        }[]
      }
      generate_ticket_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_guest_status_for_event: {
        Args: { p_event_id: string }
        Returns: {
          check_in_notes: string
          checked_in: boolean
          checked_in_at: string
          checked_in_by: string
          customer_email: string
          customer_name: string
          customer_phone: string
          event_id: string
          event_name: string
          lanyard_printed: boolean
          order_date: string
          price: number
          quantity: number
          ticket_code: string
          ticket_id: string
          ticket_status: string
          ticket_type: string
        }[]
      }
      get_invitation_details: {
        Args: { p_invitation_token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          organization_id: string
          organization_name: string
          permissions: Database["public"]["Enums"]["organization_permission"][]
          role: Database["public"]["Enums"]["organization_role"]
        }[]
      }
      get_organization_payment_config: {
        Args: { p_organization_id: string }
        Returns: {
          apple_pay_merchant_id: string
          credit_card_processing_fee_percentage: number
          currency: string
          payment_provider: string
          stripe_publishable_key: string
          windcave_enabled: boolean
          windcave_endpoint: string
        }[]
      }
      get_payment_credentials_for_processing: {
        Args: { p_event_id?: string; p_organization_id: string }
        Returns: {
          stripe_account_id: string
          stripe_secret_key: string
          windcave_api_key: string
          windcave_endpoint: string
          windcave_hit_key: string
          windcave_hit_username: string
          windcave_station_id: string
          windcave_username: string
        }[]
      }
      get_user_organization_id: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_user_organization_role: {
        Args: { p_organization_id: string; p_user_id: string }
        Returns: Database["public"]["Enums"]["organization_role"]
      }
      invalidate_admin_session: {
        Args: { token: string }
        Returns: boolean
      }
      is_authenticated_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_admin_user_id: string
          p_event_data: Json
          p_event_type: string
          p_ip_address: unknown
          p_user_agent: string
          p_user_id: string
        }
        Returns: undefined
      }
      send_organization_invitation_with_user_add: {
        Args: {
          p_email: string
          p_invited_by?: string
          p_organization_id: string
          p_permissions?: Database["public"]["Enums"]["organization_permission"][]
          p_role?: Database["public"]["Enums"]["organization_role"]
        }
        Returns: string
      }
      update_organization_user_after_signup: {
        Args: { p_invitation_token: string; p_real_user_id: string }
        Returns: boolean
      }
      user_is_org_member: {
        Args: { p_organization_id: string; p_user_id: string }
        Returns: boolean
      }
      user_owns_organization: {
        Args: { org_id: string; user_uuid: string }
        Returns: boolean
      }
      validate_admin_session: {
        Args: { token: string }
        Returns: string
      }
      verify_ticket_code: {
        Args: { p_event_id: string; p_ticket_code: string }
        Returns: {
          customer_name: string
          error_message: string
          is_used: boolean
          is_valid: boolean
          ticket_id: string
          ticket_type: string
        }[]
      }
    }
    Enums: {
      organization_permission:
        | "manage_events"
        | "edit_events"
        | "view_events"
        | "manage_payments"
        | "view_payments"
        | "manage_users"
        | "view_analytics"
      organization_role: "owner" | "admin" | "editor" | "viewer"
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
      organization_permission: [
        "manage_events",
        "edit_events",
        "view_events",
        "manage_payments",
        "view_payments",
        "manage_users",
        "view_analytics",
      ],
      organization_role: ["owner", "admin", "editor", "viewer"],
    },
  },
} as const
