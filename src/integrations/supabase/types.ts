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
      abandoned_carts: {
        Row: {
          cart_items: Json
          cart_total: number | null
          created_at: string | null
          customer_email: string
          customer_name: string | null
          customer_phone: string | null
          device_type: string | null
          emails_sent: number | null
          event_id: string
          expires_at: string | null
          id: string
          last_email_sent_at: string | null
          next_email_at: string | null
          organization_id: string
          recovered_at: string | null
          recovered_order_id: string | null
          session_id: string | null
          source_url: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          cart_items?: Json
          cart_total?: number | null
          created_at?: string | null
          customer_email: string
          customer_name?: string | null
          customer_phone?: string | null
          device_type?: string | null
          emails_sent?: number | null
          event_id: string
          expires_at?: string | null
          id?: string
          last_email_sent_at?: string | null
          next_email_at?: string | null
          organization_id: string
          recovered_at?: string | null
          recovered_order_id?: string | null
          session_id?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          cart_items?: Json
          cart_total?: number | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string | null
          customer_phone?: string | null
          device_type?: string | null
          emails_sent?: number | null
          event_id?: string
          expires_at?: string | null
          id?: string
          last_email_sent_at?: string | null
          next_email_at?: string | null
          organization_id?: string
          recovered_at?: string | null
          recovered_order_id?: string | null
          session_id?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_carts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_recovered_order_id_fkey"
            columns: ["recovered_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
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
          ip_address: unknown
          last_activity: string
          session_token: string
          user_agent: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown
          last_activity?: string
          session_token: string
          user_agent?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
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
      announcements: {
        Row: {
          active: boolean
          created_at: string
          id: string
          message: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          message: string
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          message?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      attraction_bookings: {
        Row: {
          attraction_id: string
          booking_reference: string
          booking_slot_id: string
          booking_status: string | null
          created_at: string | null
          currency: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          organization_id: string
          party_size: number
          payment_method: string | null
          payment_status: string | null
          special_requests: string | null
          stripe_payment_intent_id: string | null
          total_amount: number
          updated_at: string | null
          windcave_session_id: string | null
        }
        Insert: {
          attraction_id: string
          booking_reference: string
          booking_slot_id: string
          booking_status?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          party_size?: number
          payment_method?: string | null
          payment_status?: string | null
          special_requests?: string | null
          stripe_payment_intent_id?: string | null
          total_amount: number
          updated_at?: string | null
          windcave_session_id?: string | null
        }
        Update: {
          attraction_id?: string
          booking_reference?: string
          booking_slot_id?: string
          booking_status?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          party_size?: number
          payment_method?: string | null
          payment_status?: string | null
          special_requests?: string | null
          stripe_payment_intent_id?: string | null
          total_amount?: number
          updated_at?: string | null
          windcave_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attraction_bookings_attraction_id_fkey"
            columns: ["attraction_id"]
            isOneToOne: false
            referencedRelation: "attractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attraction_bookings_booking_slot_id_fkey"
            columns: ["booking_slot_id"]
            isOneToOne: false
            referencedRelation: "booking_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attraction_bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attraction_resources: {
        Row: {
          attraction_id: string
          capacity: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          resource_data: Json | null
          updated_at: string | null
        }
        Insert: {
          attraction_id: string
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          resource_data?: Json | null
          updated_at?: string | null
        }
        Update: {
          attraction_id?: string
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          resource_data?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attraction_resources_attraction_id_fkey"
            columns: ["attraction_id"]
            isOneToOne: false
            referencedRelation: "attractions"
            referencedColumns: ["id"]
          },
        ]
      }
      attractions: {
        Row: {
          advance_booking_days: number | null
          attraction_type: string
          base_price: number
          blackout_dates: Json | null
          booking_customization: Json | null
          created_at: string | null
          currency: string | null
          description: string | null
          duration_minutes: number
          email_customization: Json | null
          featured_image_url: string | null
          id: string
          logo_url: string | null
          max_concurrent_bookings: number | null
          name: string
          operating_hours: Json | null
          organization_id: string
          status: string | null
          updated_at: string | null
          venue: string | null
          widget_customization: Json | null
        }
        Insert: {
          advance_booking_days?: number | null
          attraction_type: string
          base_price: number
          blackout_dates?: Json | null
          booking_customization?: Json | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration_minutes?: number
          email_customization?: Json | null
          featured_image_url?: string | null
          id?: string
          logo_url?: string | null
          max_concurrent_bookings?: number | null
          name: string
          operating_hours?: Json | null
          organization_id: string
          status?: string | null
          updated_at?: string | null
          venue?: string | null
          widget_customization?: Json | null
        }
        Update: {
          advance_booking_days?: number | null
          attraction_type?: string
          base_price?: number
          blackout_dates?: Json | null
          booking_customization?: Json | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration_minutes?: number
          email_customization?: Json | null
          featured_image_url?: string | null
          id?: string
          logo_url?: string | null
          max_concurrent_bookings?: number | null
          name?: string
          operating_hours?: Json | null
          organization_id?: string
          status?: string | null
          updated_at?: string | null
          venue?: string | null
          widget_customization?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "attractions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          admin_id: string | null
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      billing_customers: {
        Row: {
          billing_email: string
          billing_interval_days: number
          billing_status: string
          billing_suspended: boolean
          created_at: string
          id: string
          last_billed_at: string | null
          next_billing_at: string | null
          organization_id: string
          payment_method_id: string | null
          stripe_customer_id: string
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          billing_email: string
          billing_interval_days?: number
          billing_status?: string
          billing_suspended?: boolean
          created_at?: string
          id?: string
          last_billed_at?: string | null
          next_billing_at?: string | null
          organization_id: string
          payment_method_id?: string | null
          stripe_customer_id: string
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_email?: string
          billing_interval_days?: number
          billing_status?: string
          billing_suspended?: boolean
          created_at?: string
          id?: string
          last_billed_at?: string | null
          next_billing_at?: string | null
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
      booking_add_ons: {
        Row: {
          booking_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_add_ons_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "attraction_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_slots: {
        Row: {
          attraction_id: string
          created_at: string | null
          current_bookings: number | null
          end_time: string
          id: string
          max_capacity: number
          price_override: number | null
          resource_id: string | null
          start_time: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          attraction_id: string
          created_at?: string | null
          current_bookings?: number | null
          end_time: string
          id?: string
          max_capacity?: number
          price_override?: number | null
          resource_id?: string | null
          start_time: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          attraction_id?: string
          created_at?: string | null
          current_bookings?: number | null
          end_time?: string
          id?: string
          max_capacity?: number
          price_override?: number | null
          resource_id?: string | null
          start_time?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_slots_attraction_id_fkey"
            columns: ["attraction_id"]
            isOneToOne: false
            referencedRelation: "attractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_slots_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "attraction_resources"
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
      code_deployments: {
        Row: {
          author_email: string | null
          author_name: string | null
          branch: string | null
          commit_hash: string
          commit_message: string | null
          created_at: string | null
          deletions: number | null
          deployed_at: string | null
          deployed_by: string | null
          environment: string | null
          files_changed: number | null
          id: string
          insertions: number | null
          status: string | null
        }
        Insert: {
          author_email?: string | null
          author_name?: string | null
          branch?: string | null
          commit_hash: string
          commit_message?: string | null
          created_at?: string | null
          deletions?: number | null
          deployed_at?: string | null
          deployed_by?: string | null
          environment?: string | null
          files_changed?: number | null
          id?: string
          insertions?: number | null
          status?: string | null
        }
        Update: {
          author_email?: string | null
          author_name?: string | null
          branch?: string | null
          commit_hash?: string
          commit_message?: string | null
          created_at?: string | null
          deletions?: number | null
          deployed_at?: string | null
          deployed_by?: string | null
          environment?: string | null
          files_changed?: number | null
          id?: string
          insertions?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "code_deployments_deployed_by_fkey"
            columns: ["deployed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
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
          admin_notes: string | null
          admin_response: string | null
          created_at: string
          email: string
          enquiry_type: string
          id: string
          message: string
          name: string
          organization_id: string | null
          phone: string | null
          responded_at: string | null
          responded_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          admin_response?: string | null
          created_at?: string
          email: string
          enquiry_type?: string
          id?: string
          message: string
          name: string
          organization_id?: string | null
          phone?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          admin_response?: string | null
          created_at?: string
          email?: string
          enquiry_type?: string
          id?: string
          message?: string
          name?: string
          organization_id?: string | null
          phone?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_events: {
        Row: {
          attendance_marked_at: string | null
          attended: boolean | null
          contact_id: string
          created_at: string | null
          event_id: string
          id: string
          order_id: string
          seat_info: string | null
          ticket_type: string | null
        }
        Insert: {
          attendance_marked_at?: string | null
          attended?: boolean | null
          contact_id: string
          created_at?: string | null
          event_id: string
          id?: string
          order_id: string
          seat_info?: string | null
          ticket_type?: string | null
        }
        Update: {
          attendance_marked_at?: string | null
          attended?: boolean | null
          contact_id?: string
          created_at?: string | null
          event_id?: string
          id?: string
          order_id?: string
          seat_info?: string | null
          ticket_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_limited"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string
          events_attended: number | null
          external_crm_id: string | null
          external_crm_type: string | null
          first_name: string | null
          full_name: string | null
          hubspot_contact_id: string | null
          id: string
          last_event_date: string | null
          last_name: string | null
          last_order_date: string | null
          lifetime_value: number | null
          notes: string | null
          organization_id: string
          payment_methods: Json | null
          phone: string | null
          postal_code: string | null
          tags: string[] | null
          total_donations: number | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          events_attended?: number | null
          external_crm_id?: string | null
          external_crm_type?: string | null
          first_name?: string | null
          full_name?: string | null
          hubspot_contact_id?: string | null
          id?: string
          last_event_date?: string | null
          last_name?: string | null
          last_order_date?: string | null
          lifetime_value?: number | null
          notes?: string | null
          organization_id: string
          payment_methods?: Json | null
          phone?: string | null
          postal_code?: string | null
          tags?: string[] | null
          total_donations?: number | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          events_attended?: number | null
          external_crm_id?: string | null
          external_crm_type?: string | null
          first_name?: string | null
          full_name?: string | null
          hubspot_contact_id?: string | null
          id?: string
          last_event_date?: string | null
          last_name?: string | null
          last_order_date?: string | null
          lifetime_value?: number | null
          notes?: string | null
          organization_id?: string
          payment_methods?: Json | null
          phone?: string | null
          postal_code?: string | null
          tags?: string[] | null
          total_donations?: number | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_connections: {
        Row: {
          access_token: string | null
          connected_user_email: string | null
          connection_status: string
          created_at: string
          crm_type: string
          external_account_id: string | null
          external_account_name: string | null
          id: string
          last_error: string | null
          last_sync_at: string | null
          organization_id: string
          refresh_token: string | null
          sync_contacts_enabled: boolean | null
          sync_lists_enabled: boolean | null
          sync_timeline_enabled: boolean | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          connected_user_email?: string | null
          connection_status?: string
          created_at?: string
          crm_type: string
          external_account_id?: string | null
          external_account_name?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          organization_id: string
          refresh_token?: string | null
          sync_contacts_enabled?: boolean | null
          sync_lists_enabled?: boolean | null
          sync_timeline_enabled?: boolean | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          connected_user_email?: string | null
          connection_status?: string
          created_at?: string
          crm_type?: string
          external_account_id?: string | null
          external_account_name?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          organization_id?: string
          refresh_token?: string | null
          sync_contacts_enabled?: boolean | null
          sync_lists_enabled?: boolean | null
          sync_timeline_enabled?: boolean | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_emails: {
        Row: {
          body_html: string
          body_text: string | null
          clicked_at: string | null
          contact_id: string
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          opened_at: string | null
          order_id: string | null
          organization_id: string
          recipient_email: string
          recipient_name: string | null
          resend_email_id: string | null
          sender_email: string
          sender_name: string | null
          sent_at: string | null
          sent_by_user_id: string | null
          status: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          body_html: string
          body_text?: string | null
          clicked_at?: string | null
          contact_id: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          opened_at?: string | null
          order_id?: string | null
          organization_id: string
          recipient_email: string
          recipient_name?: string | null
          resend_email_id?: string | null
          sender_email: string
          sender_name?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          body_html?: string
          body_text?: string | null
          clicked_at?: string | null
          contact_id?: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          opened_at?: string | null
          order_id?: string | null
          organization_id?: string
          recipient_email?: string
          recipient_name?: string | null
          resend_email_id?: string | null
          sender_email?: string
          sender_name?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_emails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_emails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_limited"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_emails_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_emails_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          campaign_name: string | null
          contact_id: string
          created_at: string | null
          currency: string | null
          donation_date: string | null
          id: string
          is_recurring: boolean | null
          order_id: string | null
          organization_id: string
          payment_status: string | null
          receipt_sent: boolean | null
          receipt_sent_at: string | null
          recurring_frequency: string | null
          stripe_payment_id: string | null
          tax_receipt_number: string | null
          updated_at: string | null
          windcave_payment_id: string | null
        }
        Insert: {
          amount: number
          campaign_name?: string | null
          contact_id: string
          created_at?: string | null
          currency?: string | null
          donation_date?: string | null
          id?: string
          is_recurring?: boolean | null
          order_id?: string | null
          organization_id: string
          payment_status?: string | null
          receipt_sent?: boolean | null
          receipt_sent_at?: string | null
          recurring_frequency?: string | null
          stripe_payment_id?: string | null
          tax_receipt_number?: string | null
          updated_at?: string | null
          windcave_payment_id?: string | null
        }
        Update: {
          amount?: number
          campaign_name?: string | null
          contact_id?: string
          created_at?: string | null
          currency?: string | null
          donation_date?: string | null
          id?: string
          is_recurring?: boolean | null
          order_id?: string | null
          organization_id?: string
          payment_status?: string | null
          receipt_sent?: boolean | null
          receipt_sent_at?: string | null
          recurring_frequency?: string | null
          stripe_payment_id?: string | null
          tax_receipt_number?: string | null
          updated_at?: string | null
          windcave_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_limited"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      error_logs: {
        Row: {
          context: Json | null
          created_at: string | null
          error_message: string
          error_stack: string | null
          function_name: string | null
          id: string
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          error_message: string
          error_stack?: string | null
          function_name?: string | null
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          error_message?: string
          error_stack?: string | null
          function_name?: string | null
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      event_attendee_notes: {
        Row: {
          content: string
          created_at: string
          crm_engagement_id: string | null
          crm_synced: boolean | null
          event_invite_id: string
          id: string
          is_private: boolean | null
          location: string | null
          note_type: string
          noted_at: string
          noted_by: string
          session_name: string | null
        }
        Insert: {
          content: string
          created_at?: string
          crm_engagement_id?: string | null
          crm_synced?: boolean | null
          event_invite_id: string
          id?: string
          is_private?: boolean | null
          location?: string | null
          note_type: string
          noted_at?: string
          noted_by: string
          session_name?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          crm_engagement_id?: string | null
          crm_synced?: boolean | null
          event_invite_id?: string
          id?: string
          is_private?: boolean | null
          location?: string | null
          note_type?: string
          noted_at?: string
          noted_by?: string
          session_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_attendee_notes_event_invite_id_fkey"
            columns: ["event_invite_id"]
            isOneToOne: false
            referencedRelation: "event_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      event_invites: {
        Row: {
          check_in_method: string | null
          checked_in: boolean | null
          checked_in_at: string | null
          checked_in_by: string | null
          company: string | null
          contact_id: string | null
          created_at: string
          crm_contact_id: string | null
          crm_context: Json | null
          crm_sync_error: string | null
          crm_sync_status: string | null
          crm_synced_at: string | null
          crm_type: string | null
          data_processing_consent: boolean | null
          dietary_requirements: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          engagement_score: number | null
          event_id: string
          first_name: string | null
          follow_up_date: string | null
          follow_up_owner: string | null
          follow_up_priority: string | null
          group_id: string | null
          id: string
          invite_clicked_at: string | null
          invite_opened_at: string | null
          invite_sent_at: string | null
          invite_sent_via: string | null
          invite_status: string
          job_title: string | null
          last_name: string | null
          medical_notes: string | null
          outcome_tag: string | null
          outcome_tagged_at: string | null
          outcome_tagged_by: string | null
          phone: string | null
          registered_at: string | null
          registration_source: string | null
          special_needs: string | null
          ticket_id: string | null
          tracking_consent: boolean | null
          tracking_consent_at: string | null
          unique_invite_code: string | null
          updated_at: string
          waiver_document_id: string | null
          waiver_signed_at: string | null
          waiver_signed_by: string | null
          waiver_status: string | null
        }
        Insert: {
          check_in_method?: string | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          company?: string | null
          contact_id?: string | null
          created_at?: string
          crm_contact_id?: string | null
          crm_context?: Json | null
          crm_sync_error?: string | null
          crm_sync_status?: string | null
          crm_synced_at?: string | null
          crm_type?: string | null
          data_processing_consent?: boolean | null
          dietary_requirements?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          engagement_score?: number | null
          event_id: string
          first_name?: string | null
          follow_up_date?: string | null
          follow_up_owner?: string | null
          follow_up_priority?: string | null
          group_id?: string | null
          id?: string
          invite_clicked_at?: string | null
          invite_opened_at?: string | null
          invite_sent_at?: string | null
          invite_sent_via?: string | null
          invite_status?: string
          job_title?: string | null
          last_name?: string | null
          medical_notes?: string | null
          outcome_tag?: string | null
          outcome_tagged_at?: string | null
          outcome_tagged_by?: string | null
          phone?: string | null
          registered_at?: string | null
          registration_source?: string | null
          special_needs?: string | null
          ticket_id?: string | null
          tracking_consent?: boolean | null
          tracking_consent_at?: string | null
          unique_invite_code?: string | null
          updated_at?: string
          waiver_document_id?: string | null
          waiver_signed_at?: string | null
          waiver_signed_by?: string | null
          waiver_status?: string | null
        }
        Update: {
          check_in_method?: string | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          company?: string | null
          contact_id?: string | null
          created_at?: string
          crm_contact_id?: string | null
          crm_context?: Json | null
          crm_sync_error?: string | null
          crm_sync_status?: string | null
          crm_synced_at?: string | null
          crm_type?: string | null
          data_processing_consent?: boolean | null
          dietary_requirements?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          engagement_score?: number | null
          event_id?: string
          first_name?: string | null
          follow_up_date?: string | null
          follow_up_owner?: string | null
          follow_up_priority?: string | null
          group_id?: string | null
          id?: string
          invite_clicked_at?: string | null
          invite_opened_at?: string | null
          invite_sent_at?: string | null
          invite_sent_via?: string | null
          invite_status?: string
          job_title?: string | null
          last_name?: string | null
          medical_notes?: string | null
          outcome_tag?: string | null
          outcome_tagged_at?: string | null
          outcome_tagged_by?: string | null
          phone?: string | null
          registered_at?: string | null
          registration_source?: string | null
          special_needs?: string | null
          ticket_id?: string | null
          tracking_consent?: boolean | null
          tracking_consent_at?: string | null
          unique_invite_code?: string | null
          updated_at?: string
          waiver_document_id?: string | null
          waiver_signed_at?: string | null
          waiver_signed_by?: string | null
          waiver_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_invites_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invites_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_limited"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invites_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      event_playbook_summaries: {
        Row: {
          attended_deal_value: number | null
          avg_engagement_score: number | null
          calculated_at: string
          created_at: string
          crm_sync_status: string | null
          event_id: string
          follow_ups_completed: number | null
          hot_leads_deal_value: number | null
          id: string
          last_crm_sync_at: string | null
          outcome_counts: Json | null
          total_attended: number | null
          total_deal_value: number | null
          total_declined: number | null
          total_follow_ups_scheduled: number | null
          total_invited: number | null
          total_no_show: number | null
          total_registered: number | null
          updated_at: string
        }
        Insert: {
          attended_deal_value?: number | null
          avg_engagement_score?: number | null
          calculated_at?: string
          created_at?: string
          crm_sync_status?: string | null
          event_id: string
          follow_ups_completed?: number | null
          hot_leads_deal_value?: number | null
          id?: string
          last_crm_sync_at?: string | null
          outcome_counts?: Json | null
          total_attended?: number | null
          total_deal_value?: number | null
          total_declined?: number | null
          total_follow_ups_scheduled?: number | null
          total_invited?: number | null
          total_no_show?: number | null
          total_registered?: number | null
          updated_at?: string
        }
        Update: {
          attended_deal_value?: number | null
          avg_engagement_score?: number | null
          calculated_at?: string
          created_at?: string
          crm_sync_status?: string | null
          event_id?: string
          follow_ups_completed?: number | null
          hot_leads_deal_value?: number | null
          id?: string
          last_crm_sync_at?: string | null
          outcome_counts?: Json | null
          total_attended?: number | null
          total_deal_value?: number | null
          total_declined?: number | null
          total_follow_ups_scheduled?: number | null
          total_invited?: number | null
          total_no_show?: number | null
          total_registered?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_playbook_summaries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_playbooks: {
        Row: {
          color: string | null
          created_at: string
          crm_settings: Json | null
          default_settings: Json
          description: string | null
          follow_up_settings: Json | null
          icon: string | null
          id: string
          is_system_template: boolean | null
          name: string
          organization_id: string
          outcome_tags: Json
          playbook_type: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          crm_settings?: Json | null
          default_settings?: Json
          description?: string | null
          follow_up_settings?: Json | null
          icon?: string | null
          id?: string
          is_system_template?: boolean | null
          name: string
          organization_id: string
          outcome_tags?: Json
          playbook_type: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          crm_settings?: Json | null
          default_settings?: Json
          description?: string | null
          follow_up_settings?: Json | null
          icon?: string | null
          id?: string
          is_system_template?: boolean | null
          name?: string
          organization_id?: string
          outcome_tags?: Json
          playbook_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_playbooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_schedule: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          end_time: string | null
          event_id: string
          id: string
          is_break: boolean | null
          is_visible_to_attendees: boolean | null
          location: string | null
          sort_order: number | null
          speaker: string | null
          start_time: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_id: string
          id?: string
          is_break?: boolean | null
          is_visible_to_attendees?: boolean | null
          location?: string | null
          sort_order?: number | null
          speaker?: string | null
          start_time: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_id?: string
          id?: string
          is_break?: boolean | null
          is_visible_to_attendees?: boolean | null
          location?: string | null
          sort_order?: number | null
          speaker?: string | null
          start_time?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_schedule_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_series: {
        Row: {
          auto_generate_events: boolean | null
          created_at: string | null
          description: string | null
          generate_ahead_days: number | null
          id: string
          max_occurrences: number | null
          name: string
          organization_id: string
          recurrence_day_of_month: number | null
          recurrence_days: number[] | null
          recurrence_interval: number | null
          recurrence_type: string
          recurrence_week_of_month: number | null
          series_end_date: string | null
          series_start_date: string
          status: string
          template_capacity: number | null
          template_description: string | null
          template_logo_url: string | null
          template_ticket_types: Json | null
          template_venue: string | null
          template_widget_customization: Json | null
          updated_at: string | null
        }
        Insert: {
          auto_generate_events?: boolean | null
          created_at?: string | null
          description?: string | null
          generate_ahead_days?: number | null
          id?: string
          max_occurrences?: number | null
          name: string
          organization_id: string
          recurrence_day_of_month?: number | null
          recurrence_days?: number[] | null
          recurrence_interval?: number | null
          recurrence_type: string
          recurrence_week_of_month?: number | null
          series_end_date?: string | null
          series_start_date: string
          status?: string
          template_capacity?: number | null
          template_description?: string | null
          template_logo_url?: string | null
          template_ticket_types?: Json | null
          template_venue?: string | null
          template_widget_customization?: Json | null
          updated_at?: string | null
        }
        Update: {
          auto_generate_events?: boolean | null
          created_at?: string | null
          description?: string | null
          generate_ahead_days?: number | null
          id?: string
          max_occurrences?: number | null
          name?: string
          organization_id?: string
          recurrence_day_of_month?: number | null
          recurrence_days?: number[] | null
          recurrence_interval?: number | null
          recurrence_type?: string
          recurrence_week_of_month?: number | null
          series_end_date?: string | null
          series_start_date?: string
          status?: string
          template_capacity?: number | null
          template_description?: string | null
          template_logo_url?: string | null
          template_ticket_types?: Json | null
          template_venue?: string | null
          template_widget_customization?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_series_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_templates: {
        Row: {
          auto_create_days_ahead: number | null
          auto_create_enabled: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          email_customization: Json | null
          id: string
          is_active: boolean | null
          last_auto_created_at: string | null
          name: string
          organization_id: string
          recurrence_count: number | null
          recurrence_day_of_month: number | null
          recurrence_days_of_week: number[] | null
          recurrence_enabled: boolean | null
          recurrence_end_date: string | null
          recurrence_pattern: string | null
          template_data: Json
          ticket_customization: Json | null
          ticket_types: Json | null
          times_used: number | null
          updated_at: string | null
          widget_customization: Json | null
        }
        Insert: {
          auto_create_days_ahead?: number | null
          auto_create_enabled?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email_customization?: Json | null
          id?: string
          is_active?: boolean | null
          last_auto_created_at?: string | null
          name: string
          organization_id: string
          recurrence_count?: number | null
          recurrence_day_of_month?: number | null
          recurrence_days_of_week?: number[] | null
          recurrence_enabled?: boolean | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          template_data?: Json
          ticket_customization?: Json | null
          ticket_types?: Json | null
          times_used?: number | null
          updated_at?: string | null
          widget_customization?: Json | null
        }
        Update: {
          auto_create_days_ahead?: number | null
          auto_create_enabled?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email_customization?: Json | null
          id?: string
          is_active?: boolean | null
          last_auto_created_at?: string | null
          name?: string
          organization_id?: string
          recurrence_count?: number | null
          recurrence_day_of_month?: number | null
          recurrence_days_of_week?: number[] | null
          recurrence_enabled?: boolean | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          template_data?: Json
          ticket_customization?: Json | null
          ticket_types?: Json | null
          times_used?: number | null
          updated_at?: string | null
          widget_customization?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "event_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          abandoned_cart_delay_minutes: number | null
          abandoned_cart_discount_code: string | null
          abandoned_cart_discount_enabled: boolean | null
          abandoned_cart_discount_percent: number | null
          abandoned_cart_email_content: string | null
          abandoned_cart_email_subject: string | null
          abandoned_cart_enabled: boolean | null
          access_password: string | null
          access_type: string | null
          capacity: number
          collect_dietary_requirements: boolean | null
          collect_emergency_contact: boolean | null
          collect_medical_info: boolean | null
          created_at: string
          description: string | null
          donation_description: string | null
          donation_suggested_amounts: string[] | null
          donation_title: string | null
          donations_enabled: boolean | null
          email_customization: Json | null
          engagement_tracking_consent_text: string | null
          event_date: string
          event_end_date: string | null
          featured_image_url: string | null
          id: string
          invite_capacity: number | null
          is_series_template: boolean | null
          logo_url: string | null
          name: string
          organization_id: string
          playbook_id: string | null
          pricing_type: string | null
          refund_deadline_hours: number | null
          refund_percentage: number | null
          refund_policy: string | null
          refund_policy_text: string | null
          refund_to_voucher_enabled: boolean | null
          require_waiver: boolean | null
          requires_approval: boolean | null
          series_id: string | null
          series_occurrence_number: number | null
          status: string
          survey_enabled: boolean | null
          survey_id: string | null
          ticket_customization: Json | null
          ticket_delivery_method: string | null
          track_engagement: boolean | null
          transfer_deadline_hours: number | null
          transfer_fee: number | null
          transfer_fee_type: string | null
          transfers_enabled: boolean | null
          updated_at: string
          upgrade_deadline_hours: number | null
          upgrade_fee: number | null
          upgrade_fee_type: string | null
          upgrades_enabled: boolean | null
          venue: string | null
          venue_address: string | null
          venue_lat: number | null
          venue_lng: number | null
          venue_place_id: string | null
          waitlist_auto_offer: boolean | null
          waitlist_enabled: boolean | null
          waitlist_message: string | null
          waitlist_offer_hours: number | null
          waiver_instructions: string | null
          waiver_template_id: string | null
          widget_customization: Json | null
        }
        Insert: {
          abandoned_cart_delay_minutes?: number | null
          abandoned_cart_discount_code?: string | null
          abandoned_cart_discount_enabled?: boolean | null
          abandoned_cart_discount_percent?: number | null
          abandoned_cart_email_content?: string | null
          abandoned_cart_email_subject?: string | null
          abandoned_cart_enabled?: boolean | null
          access_password?: string | null
          access_type?: string | null
          capacity?: number
          collect_dietary_requirements?: boolean | null
          collect_emergency_contact?: boolean | null
          collect_medical_info?: boolean | null
          created_at?: string
          description?: string | null
          donation_description?: string | null
          donation_suggested_amounts?: string[] | null
          donation_title?: string | null
          donations_enabled?: boolean | null
          email_customization?: Json | null
          engagement_tracking_consent_text?: string | null
          event_date: string
          event_end_date?: string | null
          featured_image_url?: string | null
          id?: string
          invite_capacity?: number | null
          is_series_template?: boolean | null
          logo_url?: string | null
          name: string
          organization_id: string
          playbook_id?: string | null
          pricing_type?: string | null
          refund_deadline_hours?: number | null
          refund_percentage?: number | null
          refund_policy?: string | null
          refund_policy_text?: string | null
          refund_to_voucher_enabled?: boolean | null
          require_waiver?: boolean | null
          requires_approval?: boolean | null
          series_id?: string | null
          series_occurrence_number?: number | null
          status?: string
          survey_enabled?: boolean | null
          survey_id?: string | null
          ticket_customization?: Json | null
          ticket_delivery_method?: string | null
          track_engagement?: boolean | null
          transfer_deadline_hours?: number | null
          transfer_fee?: number | null
          transfer_fee_type?: string | null
          transfers_enabled?: boolean | null
          updated_at?: string
          upgrade_deadline_hours?: number | null
          upgrade_fee?: number | null
          upgrade_fee_type?: string | null
          upgrades_enabled?: boolean | null
          venue?: string | null
          venue_address?: string | null
          venue_lat?: number | null
          venue_lng?: number | null
          venue_place_id?: string | null
          waitlist_auto_offer?: boolean | null
          waitlist_enabled?: boolean | null
          waitlist_message?: string | null
          waitlist_offer_hours?: number | null
          waiver_instructions?: string | null
          waiver_template_id?: string | null
          widget_customization?: Json | null
        }
        Update: {
          abandoned_cart_delay_minutes?: number | null
          abandoned_cart_discount_code?: string | null
          abandoned_cart_discount_enabled?: boolean | null
          abandoned_cart_discount_percent?: number | null
          abandoned_cart_email_content?: string | null
          abandoned_cart_email_subject?: string | null
          abandoned_cart_enabled?: boolean | null
          access_password?: string | null
          access_type?: string | null
          capacity?: number
          collect_dietary_requirements?: boolean | null
          collect_emergency_contact?: boolean | null
          collect_medical_info?: boolean | null
          created_at?: string
          description?: string | null
          donation_description?: string | null
          donation_suggested_amounts?: string[] | null
          donation_title?: string | null
          donations_enabled?: boolean | null
          email_customization?: Json | null
          engagement_tracking_consent_text?: string | null
          event_date?: string
          event_end_date?: string | null
          featured_image_url?: string | null
          id?: string
          invite_capacity?: number | null
          is_series_template?: boolean | null
          logo_url?: string | null
          name?: string
          organization_id?: string
          playbook_id?: string | null
          pricing_type?: string | null
          refund_deadline_hours?: number | null
          refund_percentage?: number | null
          refund_policy?: string | null
          refund_policy_text?: string | null
          refund_to_voucher_enabled?: boolean | null
          require_waiver?: boolean | null
          requires_approval?: boolean | null
          series_id?: string | null
          series_occurrence_number?: number | null
          status?: string
          survey_enabled?: boolean | null
          survey_id?: string | null
          ticket_customization?: Json | null
          ticket_delivery_method?: string | null
          track_engagement?: boolean | null
          transfer_deadline_hours?: number | null
          transfer_fee?: number | null
          transfer_fee_type?: string | null
          transfers_enabled?: boolean | null
          updated_at?: string
          upgrade_deadline_hours?: number | null
          upgrade_fee?: number | null
          upgrade_fee_type?: string | null
          upgrades_enabled?: boolean | null
          venue?: string | null
          venue_address?: string | null
          venue_lat?: number | null
          venue_lng?: number | null
          venue_place_id?: string | null
          waitlist_auto_offer?: boolean | null
          waitlist_enabled?: boolean | null
          waitlist_message?: string | null
          waitlist_offer_hours?: number | null
          waiver_instructions?: string | null
          waiver_template_id?: string | null
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
          {
            foreignKeyName: "events_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "event_playbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      group_activity_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          group_id: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          group_id: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          group_id?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_activity_log_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_coordinators: {
        Row: {
          can_apply_discounts: boolean | null
          can_manage_coordinators: boolean | null
          can_view_reports: boolean | null
          created_at: string | null
          created_by: string | null
          group_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          can_apply_discounts?: boolean | null
          can_manage_coordinators?: boolean | null
          can_view_reports?: boolean | null
          created_at?: string | null
          created_by?: string | null
          group_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          can_apply_discounts?: boolean | null
          can_manage_coordinators?: boolean | null
          can_view_reports?: boolean | null
          created_at?: string | null
          created_by?: string | null
          group_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_coordinators_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_discount_tiers: {
        Row: {
          active: boolean
          applies_to_ticket_types: string[] | null
          created_at: string
          discount_type: string
          discount_value: number
          event_id: string
          id: string
          min_quantity: number
          organization_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          applies_to_ticket_types?: string[] | null
          created_at?: string
          discount_type: string
          discount_value: number
          event_id: string
          id?: string
          min_quantity: number
          organization_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          applies_to_ticket_types?: string[] | null
          created_at?: string
          discount_type?: string
          discount_value?: number
          event_id?: string
          id?: string
          min_quantity?: number
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_discount_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_discount_tiers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invoice_line_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          quantity: number
          sale_id: string | null
          total_amount: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          sale_id?: string | null
          total_amount: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          sale_id?: string | null
          total_amount?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "group_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invoice_line_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "group_ticket_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invoices: {
        Row: {
          amount_owed: number
          amount_paid: number
          billing_period_end: string | null
          billing_period_start: string | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          event_id: string | null
          group_id: string
          id: string
          invoice_number: string | null
          notes: string | null
          paid_date: string | null
          payment_link: string | null
          pdf_url: string | null
          status: string
          total_discounts_given: number
          total_revenue: number
          total_tickets_sold: number
          updated_at: string | null
        }
        Insert: {
          amount_owed?: number
          amount_paid?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          event_id?: string | null
          group_id: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          paid_date?: string | null
          payment_link?: string | null
          pdf_url?: string | null
          status?: string
          total_discounts_given?: number
          total_revenue?: number
          total_tickets_sold?: number
          updated_at?: string | null
        }
        Update: {
          amount_owed?: number
          amount_paid?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          event_id?: string | null
          group_id?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          paid_date?: string | null
          payment_link?: string | null
          pdf_url?: string | null
          status?: string
          total_discounts_given?: number
          total_revenue?: number
          total_tickets_sold?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_invoices_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invoices_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_ticket_allocations: {
        Row: {
          allocated_quantity: number
          created_at: string | null
          created_by: string | null
          event_id: string
          full_price: number
          group_id: string
          id: string
          is_active: boolean | null
          minimum_price: number | null
          notes: string | null
          reserved_quantity: number
          ticket_type_id: string | null
          updated_at: string | null
          used_quantity: number
        }
        Insert: {
          allocated_quantity: number
          created_at?: string | null
          created_by?: string | null
          event_id: string
          full_price: number
          group_id: string
          id?: string
          is_active?: boolean | null
          minimum_price?: number | null
          notes?: string | null
          reserved_quantity?: number
          ticket_type_id?: string | null
          updated_at?: string | null
          used_quantity?: number
        }
        Update: {
          allocated_quantity?: number
          created_at?: string | null
          created_by?: string | null
          event_id?: string
          full_price?: number
          group_id?: string
          id?: string
          is_active?: boolean | null
          minimum_price?: number | null
          notes?: string | null
          reserved_quantity?: number
          ticket_type_id?: string | null
          updated_at?: string | null
          used_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_ticket_allocations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_ticket_allocations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_ticket_allocations_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      group_ticket_sales: {
        Row: {
          allocation_id: string
          applied_by: string | null
          created_at: string | null
          discount_amount: number | null
          discount_code: string | null
          discount_reason: string | null
          full_price: number
          group_id: string
          id: string
          paid_price: number
          payment_status: string
          ticket_id: string
        }
        Insert: {
          allocation_id: string
          applied_by?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_code?: string | null
          discount_reason?: string | null
          full_price: number
          group_id: string
          id?: string
          paid_price: number
          payment_status?: string
          ticket_id: string
        }
        Update: {
          allocation_id?: string
          applied_by?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_code?: string | null
          discount_reason?: string | null
          full_price?: number
          group_id?: string
          id?: string
          paid_price?: number
          payment_status?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_ticket_sales_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "group_ticket_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_ticket_sales_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_ticket_sales_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          billing_address: string | null
          billing_contact_email: string | null
          billing_contact_name: string | null
          contact_email: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          organization_id: string
          passkey: string | null
          settings: Json | null
          updated_at: string | null
          url_slug: string | null
        }
        Insert: {
          billing_address?: string | null
          billing_contact_email?: string | null
          billing_contact_name?: string | null
          contact_email: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          organization_id: string
          passkey?: string | null
          settings?: Json | null
          updated_at?: string | null
          url_slug?: string | null
        }
        Update: {
          billing_address?: string | null
          billing_contact_email?: string | null
          billing_contact_name?: string | null
          contact_email?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          organization_id?: string
          passkey?: string | null
          settings?: Json | null
          updated_at?: string | null
          url_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hubspot_connections: {
        Row: {
          access_token: string
          connection_status: string
          created_at: string
          hub_domain: string | null
          hub_id: string
          id: string
          last_error: string | null
          last_sync_at: string | null
          organization_id: string
          refresh_token: string
          sync_settings: Json
          token_expires_at: string
          updated_at: string
          user_email: string | null
        }
        Insert: {
          access_token: string
          connection_status?: string
          created_at?: string
          hub_domain?: string | null
          hub_id: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          organization_id: string
          refresh_token: string
          sync_settings?: Json
          token_expires_at: string
          updated_at?: string
          user_email?: string | null
        }
        Update: {
          access_token?: string
          connection_status?: string
          created_at?: string
          hub_domain?: string | null
          hub_id?: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          organization_id?: string
          refresh_token?: string
          sync_settings?: Json
          token_expires_at?: string
          updated_at?: string
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hubspot_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hubspot_contact_mappings: {
        Row: {
          created_at: string
          hubspot_connection_id: string
          hubspot_contact_id: string
          id: string
          last_pulled_at: string | null
          last_pushed_at: string | null
          push_hash: string | null
          ticketflo_contact_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hubspot_connection_id: string
          hubspot_contact_id: string
          id?: string
          last_pulled_at?: string | null
          last_pushed_at?: string | null
          push_hash?: string | null
          ticketflo_contact_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hubspot_connection_id?: string
          hubspot_contact_id?: string
          id?: string
          last_pulled_at?: string | null
          last_pushed_at?: string | null
          push_hash?: string | null
          ticketflo_contact_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hubspot_contact_mappings_hubspot_connection_id_fkey"
            columns: ["hubspot_connection_id"]
            isOneToOne: false
            referencedRelation: "hubspot_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hubspot_contact_mappings_ticketflo_contact_id_fkey"
            columns: ["ticketflo_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hubspot_contact_mappings_ticketflo_contact_id_fkey"
            columns: ["ticketflo_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_limited"
            referencedColumns: ["id"]
          },
        ]
      }
      hubspot_field_mappings: {
        Row: {
          created_at: string
          hubspot_connection_id: string
          hubspot_property: string
          id: string
          is_custom_property: boolean
          is_enabled: boolean
          sync_direction: string
          ticketflo_field: string
          transform_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          hubspot_connection_id: string
          hubspot_property: string
          id?: string
          is_custom_property?: boolean
          is_enabled?: boolean
          sync_direction?: string
          ticketflo_field: string
          transform_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          hubspot_connection_id?: string
          hubspot_property?: string
          id?: string
          is_custom_property?: boolean
          is_enabled?: boolean
          sync_direction?: string
          ticketflo_field?: string
          transform_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hubspot_field_mappings_hubspot_connection_id_fkey"
            columns: ["hubspot_connection_id"]
            isOneToOne: false
            referencedRelation: "hubspot_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      hubspot_sync_logs: {
        Row: {
          created_at: string
          error_details: Json | null
          error_message: string | null
          hubspot_connection_id: string
          hubspot_contact_id: string | null
          id: string
          operation_type: string
          records_created: number | null
          records_failed: number | null
          records_processed: number | null
          records_updated: number | null
          request_data: Json | null
          response_data: Json | null
          status: string
          ticketflo_contact_id: string | null
        }
        Insert: {
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          hubspot_connection_id: string
          hubspot_contact_id?: string | null
          id?: string
          operation_type: string
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          request_data?: Json | null
          response_data?: Json | null
          status?: string
          ticketflo_contact_id?: string | null
        }
        Update: {
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          hubspot_connection_id?: string
          hubspot_contact_id?: string | null
          id?: string
          operation_type?: string
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          request_data?: Json | null
          response_data?: Json | null
          status?: string
          ticketflo_contact_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hubspot_sync_logs_hubspot_connection_id_fkey"
            columns: ["hubspot_connection_id"]
            isOneToOne: false
            referencedRelation: "hubspot_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hubspot_sync_logs_ticketflo_contact_id_fkey"
            columns: ["ticketflo_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hubspot_sync_logs_ticketflo_contact_id_fkey"
            columns: ["ticketflo_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_limited"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_auth_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          organization_id: string
          partner_platform: string
          redirect_uri: string
          scopes: string[] | null
          state: string | null
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at?: string
          id?: string
          organization_id: string
          partner_platform: string
          redirect_uri: string
          scopes?: string[] | null
          state?: string | null
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          organization_id?: string
          partner_platform?: string
          redirect_uri?: string
          scopes?: string[] | null
          state?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_auth_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          organization_id: string
          partner_organization_id: string | null
          partner_platform: string
          revoked_at: string | null
          scopes: string[] | null
          token_hash: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          organization_id: string
          partner_organization_id?: string | null
          partner_platform: string
          revoked_at?: string | null
          scopes?: string[] | null
          token_hash: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          organization_id?: string
          partner_organization_id?: string | null
          partner_platform?: string
          revoked_at?: string | null
          scopes?: string[] | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      issuing_activity_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_type: string
          actor_user_id: string | null
          card_id: string | null
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string | null
          group_id: string | null
          id: string
          metadata: Json | null
          organization_id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_type: string
          actor_user_id?: string | null
          card_id?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          group_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_type?: string
          actor_user_id?: string | null
          card_id?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          group_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issuing_activity_log_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "issuing_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issuing_activity_log_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issuing_activity_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      issuing_card_loads: {
        Row: {
          amount: number
          card_id: string
          completed_at: string | null
          created_at: string | null
          currency: string
          group_id: string | null
          id: string
          loaded_by: string | null
          metadata: Json | null
          notes: string | null
          organization_id: string
          parent_email: string | null
          payment_status: string | null
          source_type: string
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          topup_token: string | null
          topup_token_expires_at: string | null
          topup_token_used_at: string | null
        }
        Insert: {
          amount: number
          card_id: string
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          group_id?: string | null
          id?: string
          loaded_by?: string | null
          metadata?: Json | null
          notes?: string | null
          organization_id: string
          parent_email?: string | null
          payment_status?: string | null
          source_type: string
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          topup_token?: string | null
          topup_token_expires_at?: string | null
          topup_token_used_at?: string | null
        }
        Update: {
          amount?: number
          card_id?: string
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          group_id?: string | null
          id?: string
          loaded_by?: string | null
          metadata?: Json | null
          notes?: string | null
          organization_id?: string
          parent_email?: string | null
          payment_status?: string | null
          source_type?: string
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          topup_token?: string | null
          topup_token_expires_at?: string | null
          topup_token_used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issuing_card_loads_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "issuing_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issuing_card_loads_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issuing_card_loads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      issuing_cards: {
        Row: {
          allowed_countries: string[] | null
          allowed_merchant_categories: string[] | null
          blocked_merchant_categories: string[] | null
          cancellation_reason: string | null
          cancelled_at: string | null
          card_exp_month: number
          card_exp_year: number
          card_last4: string
          card_status: string
          card_type: string
          cardholder_dob: string | null
          cardholder_email: string | null
          cardholder_name: string
          cardholder_phone: string | null
          created_at: string | null
          current_balance: number
          expires_at: string | null
          group_id: string | null
          id: string
          initial_balance: number
          issued_at: string | null
          issued_by: string | null
          metadata: Json | null
          notes: string | null
          organization_id: string
          purpose: string | null
          spending_limit_amount: number | null
          spending_limit_interval: string | null
          stripe_card_id: string
          stripe_cardholder_id: string
          total_authorized: number
          total_spent: number
          updated_at: string | null
        }
        Insert: {
          allowed_countries?: string[] | null
          allowed_merchant_categories?: string[] | null
          blocked_merchant_categories?: string[] | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          card_exp_month: number
          card_exp_year: number
          card_last4: string
          card_status?: string
          card_type: string
          cardholder_dob?: string | null
          cardholder_email?: string | null
          cardholder_name: string
          cardholder_phone?: string | null
          created_at?: string | null
          current_balance?: number
          expires_at?: string | null
          group_id?: string | null
          id?: string
          initial_balance?: number
          issued_at?: string | null
          issued_by?: string | null
          metadata?: Json | null
          notes?: string | null
          organization_id: string
          purpose?: string | null
          spending_limit_amount?: number | null
          spending_limit_interval?: string | null
          stripe_card_id: string
          stripe_cardholder_id: string
          total_authorized?: number
          total_spent?: number
          updated_at?: string | null
        }
        Update: {
          allowed_countries?: string[] | null
          allowed_merchant_categories?: string[] | null
          blocked_merchant_categories?: string[] | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          card_exp_month?: number
          card_exp_year?: number
          card_last4?: string
          card_status?: string
          card_type?: string
          cardholder_dob?: string | null
          cardholder_email?: string | null
          cardholder_name?: string
          cardholder_phone?: string | null
          created_at?: string | null
          current_balance?: number
          expires_at?: string | null
          group_id?: string | null
          id?: string
          initial_balance?: number
          issued_at?: string | null
          issued_by?: string | null
          metadata?: Json | null
          notes?: string | null
          organization_id?: string
          purpose?: string | null
          spending_limit_amount?: number | null
          spending_limit_interval?: string | null
          stripe_card_id?: string
          stripe_cardholder_id?: string
          total_authorized?: number
          total_spent?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issuing_cards_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issuing_cards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      issuing_interchange_payouts: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          metadata: Json | null
          notes: string | null
          organization_id: string
          organization_share: number
          organization_share_percentage: number | null
          payout_date: string | null
          payout_method: string | null
          payout_status: string
          period_end: string
          period_start: string
          platform_share: number
          platform_share_percentage: number | null
          stripe_payout_id: string | null
          total_interchange_earned: number
          total_transaction_volume: number
          total_transactions: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          organization_id: string
          organization_share?: number
          organization_share_percentage?: number | null
          payout_date?: string | null
          payout_method?: string | null
          payout_status?: string
          period_end: string
          period_start: string
          platform_share?: number
          platform_share_percentage?: number | null
          stripe_payout_id?: string | null
          total_interchange_earned?: number
          total_transaction_volume?: number
          total_transactions?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          organization_id?: string
          organization_share?: number
          organization_share_percentage?: number | null
          payout_date?: string | null
          payout_method?: string | null
          payout_status?: string
          period_end?: string
          period_start?: string
          platform_share?: number
          platform_share_percentage?: number | null
          stripe_payout_id?: string | null
          total_interchange_earned?: number
          total_transaction_volume?: number
          total_transactions?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issuing_interchange_payouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      issuing_transactions: {
        Row: {
          amount: number
          approved: boolean | null
          authorization_status: string | null
          authorized_at: string | null
          captured_at: string | null
          card_id: string
          created_at: string | null
          currency: string
          decline_reason: string | null
          group_id: string | null
          id: string
          interchange_amount: number | null
          interchange_rate: number | null
          merchant_category: string | null
          merchant_category_code: string | null
          merchant_city: string | null
          merchant_country: string | null
          merchant_name: string | null
          merchant_postal_code: string | null
          merchant_state: string | null
          metadata: Json | null
          organization_id: string
          stripe_authorization_id: string | null
          stripe_transaction_id: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          approved?: boolean | null
          authorization_status?: string | null
          authorized_at?: string | null
          captured_at?: string | null
          card_id: string
          created_at?: string | null
          currency?: string
          decline_reason?: string | null
          group_id?: string | null
          id?: string
          interchange_amount?: number | null
          interchange_rate?: number | null
          merchant_category?: string | null
          merchant_category_code?: string | null
          merchant_city?: string | null
          merchant_country?: string | null
          merchant_name?: string | null
          merchant_postal_code?: string | null
          merchant_state?: string | null
          metadata?: Json | null
          organization_id: string
          stripe_authorization_id?: string | null
          stripe_transaction_id?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          approved?: boolean | null
          authorization_status?: string | null
          authorized_at?: string | null
          captured_at?: string | null
          card_id?: string
          created_at?: string | null
          currency?: string
          decline_reason?: string | null
          group_id?: string | null
          id?: string
          interchange_amount?: number | null
          interchange_rate?: number | null
          merchant_category?: string | null
          merchant_category_code?: string | null
          merchant_city?: string | null
          merchant_country?: string | null
          merchant_name?: string | null
          merchant_postal_code?: string | null
          merchant_state?: string | null
          metadata?: Json | null
          organization_id?: string
          stripe_authorization_id?: string | null
          stripe_transaction_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "issuing_transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "issuing_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issuing_transactions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issuing_transactions_organization_id_fkey"
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
      lanyard_templates: {
        Row: {
          background: Json
          blocks: Json
          created_at: string | null
          dimensions: Json
          id: string
          is_default: boolean | null
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          background?: Json
          blocks?: Json
          created_at?: string | null
          dimensions?: Json
          id: string
          is_default?: boolean | null
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          background?: Json
          blocks?: Json
          created_at?: string | null
          dimensions?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lanyard_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          attendees: Json | null
          booking_fee: number | null
          booking_fee_amount: number | null
          booking_fee_enabled: boolean | null
          booking_fee_tax: number | null
          card_brand: string | null
          card_last_four: string | null
          created_at: string
          custom_answers: Json | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          donation_amount: number | null
          event_id: string
          group_discount_applied: number | null
          id: string
          payment_method_id: string | null
          payment_method_type: string | null
          processing_fee: number | null
          processing_fee_amount: number | null
          promo_code_discount: number | null
          promo_code_id: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          subtotal: number | null
          subtotal_amount: number | null
          tax_amount: number | null
          tax_inclusive: boolean | null
          tax_name: string | null
          tax_on_addons: number | null
          tax_on_donations: number | null
          tax_on_fees: number | null
          tax_on_tickets: number | null
          tax_rate: number | null
          total_amount: number
          updated_at: string
          voucher_discount: number | null
          voucher_id: string | null
          windcave_session_id: string | null
        }
        Insert: {
          attendees?: Json | null
          booking_fee?: number | null
          booking_fee_amount?: number | null
          booking_fee_enabled?: boolean | null
          booking_fee_tax?: number | null
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string
          custom_answers?: Json | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          donation_amount?: number | null
          event_id: string
          group_discount_applied?: number | null
          id?: string
          payment_method_id?: string | null
          payment_method_type?: string | null
          processing_fee?: number | null
          processing_fee_amount?: number | null
          promo_code_discount?: number | null
          promo_code_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal?: number | null
          subtotal_amount?: number | null
          tax_amount?: number | null
          tax_inclusive?: boolean | null
          tax_name?: string | null
          tax_on_addons?: number | null
          tax_on_donations?: number | null
          tax_on_fees?: number | null
          tax_on_tickets?: number | null
          tax_rate?: number | null
          total_amount: number
          updated_at?: string
          voucher_discount?: number | null
          voucher_id?: string | null
          windcave_session_id?: string | null
        }
        Update: {
          attendees?: Json | null
          booking_fee?: number | null
          booking_fee_amount?: number | null
          booking_fee_enabled?: boolean | null
          booking_fee_tax?: number | null
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string
          custom_answers?: Json | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          donation_amount?: number | null
          event_id?: string
          group_discount_applied?: number | null
          id?: string
          payment_method_id?: string | null
          payment_method_type?: string | null
          processing_fee?: number | null
          processing_fee_amount?: number | null
          promo_code_discount?: number | null
          promo_code_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal?: number | null
          subtotal_amount?: number | null
          tax_amount?: number | null
          tax_inclusive?: boolean | null
          tax_name?: string | null
          tax_on_addons?: number | null
          tax_on_donations?: number | null
          tax_on_fees?: number | null
          tax_on_tickets?: number | null
          tax_rate?: number | null
          total_amount?: number
          updated_at?: string
          voucher_discount?: number | null
          voucher_id?: string | null
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
            foreignKeyName: "orders_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
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
          billing_suspended: boolean
          billing_suspended_at: string | null
          billing_suspended_by: string | null
          billing_suspended_reason: string | null
          brand_colors: Json | null
          city: string | null
          country: string | null
          created_at: string
          credit_card_processing_fee_percentage: number | null
          crm_enabled: boolean | null
          currency: string | null
          custom_css: string | null
          dashboard_config: Json | null
          email: string
          groups_enabled: boolean | null
          id: string
          issuing_enabled: boolean | null
          logo_url: string | null
          name: string
          payment_provider: string | null
          phone: string | null
          playbooks_enabled: boolean | null
          playbooks_terms_accepted_at: string | null
          playbooks_terms_accepted_by: string | null
          postal_code: string | null
          stripe_access_token: string | null
          stripe_account_id: string | null
          stripe_booking_fee_enabled: boolean | null
          stripe_refresh_token: string | null
          stripe_scope: string | null
          stripe_terminal_location_id: string | null
          stripe_test_mode: boolean | null
          system_type: string | null
          tax_country: string | null
          tax_enabled: boolean | null
          tax_inclusive: boolean | null
          tax_name: string | null
          tax_number: string | null
          tax_rate: number | null
          tax_region: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          billing_setup_completed?: boolean
          billing_setup_required?: boolean
          billing_suspended?: boolean
          billing_suspended_at?: string | null
          billing_suspended_by?: string | null
          billing_suspended_reason?: string | null
          brand_colors?: Json | null
          city?: string | null
          country?: string | null
          created_at?: string
          credit_card_processing_fee_percentage?: number | null
          crm_enabled?: boolean | null
          currency?: string | null
          custom_css?: string | null
          dashboard_config?: Json | null
          email: string
          groups_enabled?: boolean | null
          id?: string
          issuing_enabled?: boolean | null
          logo_url?: string | null
          name: string
          payment_provider?: string | null
          phone?: string | null
          playbooks_enabled?: boolean | null
          playbooks_terms_accepted_at?: string | null
          playbooks_terms_accepted_by?: string | null
          postal_code?: string | null
          stripe_access_token?: string | null
          stripe_account_id?: string | null
          stripe_booking_fee_enabled?: boolean | null
          stripe_refresh_token?: string | null
          stripe_scope?: string | null
          stripe_terminal_location_id?: string | null
          stripe_test_mode?: boolean | null
          system_type?: string | null
          tax_country?: string | null
          tax_enabled?: boolean | null
          tax_inclusive?: boolean | null
          tax_name?: string | null
          tax_number?: string | null
          tax_rate?: number | null
          tax_region?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          billing_setup_completed?: boolean
          billing_setup_required?: boolean
          billing_suspended?: boolean
          billing_suspended_at?: string | null
          billing_suspended_by?: string | null
          billing_suspended_reason?: string | null
          brand_colors?: Json | null
          city?: string | null
          country?: string | null
          created_at?: string
          credit_card_processing_fee_percentage?: number | null
          crm_enabled?: boolean | null
          currency?: string | null
          custom_css?: string | null
          dashboard_config?: Json | null
          email?: string
          groups_enabled?: boolean | null
          id?: string
          issuing_enabled?: boolean | null
          logo_url?: string | null
          name?: string
          payment_provider?: string | null
          phone?: string | null
          playbooks_enabled?: boolean | null
          playbooks_terms_accepted_at?: string | null
          playbooks_terms_accepted_by?: string | null
          postal_code?: string | null
          stripe_access_token?: string | null
          stripe_account_id?: string | null
          stripe_booking_fee_enabled?: boolean | null
          stripe_refresh_token?: string | null
          stripe_scope?: string | null
          stripe_terminal_location_id?: string | null
          stripe_test_mode?: boolean | null
          system_type?: string | null
          tax_country?: string | null
          tax_enabled?: boolean | null
          tax_inclusive?: boolean | null
          tax_name?: string | null
          tax_number?: string | null
          tax_rate?: number | null
          tax_region?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
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
          enable_apple_pay: boolean | null
          enable_google_pay: boolean | null
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
          enable_apple_pay?: boolean | null
          enable_google_pay?: boolean | null
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
          enable_apple_pay?: boolean | null
          enable_google_pay?: boolean | null
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
      payment_intents_log: {
        Row: {
          amount: number | null
          client_secret: string | null
          created_at: string | null
          currency: string | null
          id: string
          idempotency_key: string
          metadata: Json | null
          order_id: string | null
          payment_intent_id: string | null
          processed_at: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          client_secret?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          idempotency_key: string
          metadata?: Json | null
          order_id?: string | null
          payment_intent_id?: string | null
          processed_at?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          client_secret?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          idempotency_key?: string
          metadata?: Json | null
          order_id?: string | null
          payment_intent_id?: string | null
          processed_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_fees_breakdown: {
        Row: {
          amount: number
          created_at: string
          currency: string
          fee_description: string | null
          fee_type: string
          id: string
          payment_intent_id: string | null
          payout_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          fee_description?: string | null
          fee_type: string
          id?: string
          payment_intent_id?: string | null
          payout_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          fee_description?: string | null
          fee_type?: string
          id?: string
          payment_intent_id?: string | null
          payout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_fees_breakdown_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_line_items: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          fee_amount: number
          gross_amount: number
          id: string
          metadata: Json | null
          net_amount: number
          order_id: string | null
          payment_intent_id: string | null
          payout_id: string
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          fee_amount?: number
          gross_amount: number
          id?: string
          metadata?: Json | null
          net_amount: number
          order_id?: string | null
          payment_intent_id?: string | null
          payout_id: string
          transaction_date: string
          transaction_type: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          fee_amount?: number
          gross_amount?: number
          id?: string
          metadata?: Json | null
          net_amount?: number
          order_id?: string | null
          payment_intent_id?: string | null
          payout_id?: string
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_line_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_line_items_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          adjustments_amount: number
          arrival_date: string | null
          bank_account_last4: string | null
          bank_name: string | null
          created_at: string
          currency: string
          description: string | null
          gross_amount: number
          id: string
          metadata: Json | null
          net_amount: number
          organization_id: string
          payment_processor: string
          payout_date: string
          payout_status: string
          platform_fees: number
          processor_account_id: string | null
          processor_fees: number
          processor_payout_id: string
          refunds_amount: number
          statement_descriptor: string | null
          updated_at: string
        }
        Insert: {
          adjustments_amount?: number
          arrival_date?: string | null
          bank_account_last4?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          gross_amount: number
          id?: string
          metadata?: Json | null
          net_amount: number
          organization_id: string
          payment_processor: string
          payout_date: string
          payout_status?: string
          platform_fees?: number
          processor_account_id?: string | null
          processor_fees?: number
          processor_payout_id: string
          refunds_amount?: number
          statement_descriptor?: string | null
          updated_at?: string
        }
        Update: {
          adjustments_amount?: number
          arrival_date?: string | null
          bank_account_last4?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          gross_amount?: number
          id?: string
          metadata?: Json | null
          net_amount?: number
          organization_id?: string
          payment_processor?: string
          payout_date?: string
          payout_status?: string
          platform_fees?: number
          processor_account_id?: string | null
          processor_fees?: number
          processor_payout_id?: string
          refunds_amount?: number
          statement_descriptor?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_config: {
        Row: {
          created_at: string
          deployment_alert_emails: string[] | null
          deployment_email_alerts_enabled: boolean | null
          id: string
          platform_fee_fixed: number
          platform_fee_percentage: number
          stripe_platform_publishable_key: string | null
          stripe_platform_secret_key: string | null
          stripe_test_mode: boolean | null
          stripe_test_publishable_key: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deployment_alert_emails?: string[] | null
          deployment_email_alerts_enabled?: boolean | null
          id?: string
          platform_fee_fixed?: number
          platform_fee_percentage?: number
          stripe_platform_publishable_key?: string | null
          stripe_platform_secret_key?: string | null
          stripe_test_mode?: boolean | null
          stripe_test_publishable_key?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deployment_alert_emails?: string[] | null
          deployment_email_alerts_enabled?: boolean | null
          id?: string
          platform_fee_fixed?: number
          platform_fee_percentage?: number
          stripe_platform_publishable_key?: string | null
          stripe_platform_secret_key?: string | null
          stripe_test_mode?: boolean | null
          stripe_test_publishable_key?: string | null
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
      promo_code_usage: {
        Row: {
          customer_email: string
          discount_applied: number
          id: string
          order_id: string
          promo_code_id: string
          used_at: string
        }
        Insert: {
          customer_email: string
          discount_applied: number
          id?: string
          order_id: string
          promo_code_id: string
          used_at?: string
        }
        Update: {
          customer_email?: string
          discount_applied?: number
          id?: string
          order_id?: string
          promo_code_id?: string
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          active: boolean
          applies_to_ticket_types: string[] | null
          code: string
          created_at: string
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          event_id: string | null
          group_id: string | null
          id: string
          max_uses: number | null
          max_uses_per_customer: number | null
          min_purchase_amount: number | null
          min_tickets: number | null
          notification_email: string | null
          organization_id: string
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          applies_to_ticket_types?: string[] | null
          code: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type: string
          discount_value: number
          event_id?: string | null
          group_id?: string | null
          id?: string
          max_uses?: number | null
          max_uses_per_customer?: number | null
          min_purchase_amount?: number | null
          min_tickets?: number | null
          notification_email?: string | null
          organization_id: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          applies_to_ticket_types?: string[] | null
          code?: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          event_id?: string | null
          group_id?: string | null
          id?: string
          max_uses?: number | null
          max_uses_per_customer?: number | null
          min_purchase_amount?: number | null
          min_tickets?: number | null
          notification_email?: string | null
          organization_id?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      promotional_emails: {
        Row: {
          actual_send_time: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          emails_bounced: number | null
          emails_clicked: number | null
          emails_delivered: number | null
          emails_failed: number | null
          emails_opened: number | null
          emails_sent: number | null
          event_id: string
          failed_count: number | null
          id: string
          organization_id: string
          recipient_type: string
          recipients_count: number | null
          scheduled_send_time: string | null
          send_immediately: boolean | null
          sent_at: string | null
          sent_count: number | null
          status: string
          subject_line: string
          template: Json
          ticket_type_id: string | null
          total_recipients: number | null
          updated_at: string | null
        }
        Insert: {
          actual_send_time?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          emails_bounced?: number | null
          emails_clicked?: number | null
          emails_delivered?: number | null
          emails_failed?: number | null
          emails_opened?: number | null
          emails_sent?: number | null
          event_id: string
          failed_count?: number | null
          id?: string
          organization_id: string
          recipient_type?: string
          recipients_count?: number | null
          scheduled_send_time?: string | null
          send_immediately?: boolean | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject_line: string
          template?: Json
          ticket_type_id?: string | null
          total_recipients?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_send_time?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          emails_bounced?: number | null
          emails_clicked?: number | null
          emails_delivered?: number | null
          emails_failed?: number | null
          emails_opened?: number | null
          emails_sent?: number | null
          event_id?: string
          failed_count?: number | null
          id?: string
          organization_id?: string
          recipient_type?: string
          recipients_count?: number | null
          scheduled_send_time?: string | null
          send_immediately?: boolean | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject_line?: string
          template?: Json
          ticket_type_id?: string | null
          total_recipients?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotional_emails_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotional_emails_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotional_emails_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          admin_notes: string | null
          approved_amount: number | null
          created_at: string | null
          customer_email: string
          customer_name: string
          customer_notes: string | null
          event_id: string
          id: string
          order_id: string
          processed_at: string | null
          processed_by: string | null
          reason: string
          reason_category: string | null
          refund_method: string | null
          refund_type: string
          requested_amount: number
          status: string
          stripe_refund_id: string | null
          ticket_ids: string[] | null
          updated_at: string | null
          voucher_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          approved_amount?: number | null
          created_at?: string | null
          customer_email: string
          customer_name: string
          customer_notes?: string | null
          event_id: string
          id?: string
          order_id: string
          processed_at?: string | null
          processed_by?: string | null
          reason: string
          reason_category?: string | null
          refund_method?: string | null
          refund_type: string
          requested_amount: number
          status?: string
          stripe_refund_id?: string | null
          ticket_ids?: string[] | null
          updated_at?: string | null
          voucher_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          approved_amount?: number | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          customer_notes?: string | null
          event_id?: string
          id?: string
          order_id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          reason_category?: string | null
          refund_method?: string | null
          refund_type?: string
          requested_amount?: number
          status?: string
          stripe_refund_id?: string | null
          ticket_ids?: string[] | null
          updated_at?: string | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_email_analytics: {
        Row: {
          bounce_rate: number | null
          bounces: number | null
          campaign_id: string
          click_rate: number | null
          created_at: string | null
          date: string
          delivery_rate: number | null
          emails_clicked: number | null
          emails_delivered: number | null
          emails_opened: number | null
          emails_sent: number | null
          id: string
          open_rate: number | null
          unsubscribes: number | null
        }
        Insert: {
          bounce_rate?: number | null
          bounces?: number | null
          campaign_id: string
          click_rate?: number | null
          created_at?: string | null
          date: string
          delivery_rate?: number | null
          emails_clicked?: number | null
          emails_delivered?: number | null
          emails_opened?: number | null
          emails_sent?: number | null
          id?: string
          open_rate?: number | null
          unsubscribes?: number | null
        }
        Update: {
          bounce_rate?: number | null
          bounces?: number | null
          campaign_id?: string
          click_rate?: number | null
          created_at?: string | null
          date?: string
          delivery_rate?: number | null
          emails_clicked?: number | null
          emails_delivered?: number | null
          emails_opened?: number | null
          emails_sent?: number | null
          id?: string
          open_rate?: number | null
          unsubscribes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_email_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "reminder_email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_email_campaigns: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          emails_clicked: number | null
          emails_delivered: number | null
          emails_opened: number | null
          emails_sent: number | null
          event_id: string
          id: string
          name: string
          organization_id: string
          recipient_filter: Json | null
          recipient_type: string | null
          send_datetime: string | null
          send_timing: string
          send_value: number | null
          status: string | null
          subject_line: string
          template: Json
          timezone: string | null
          total_recipients: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          emails_clicked?: number | null
          emails_delivered?: number | null
          emails_opened?: number | null
          emails_sent?: number | null
          event_id: string
          id?: string
          name: string
          organization_id: string
          recipient_filter?: Json | null
          recipient_type?: string | null
          send_datetime?: string | null
          send_timing: string
          send_value?: number | null
          status?: string | null
          subject_line: string
          template: Json
          timezone?: string | null
          total_recipients?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          emails_clicked?: number | null
          emails_delivered?: number | null
          emails_opened?: number | null
          emails_sent?: number | null
          event_id?: string
          id?: string
          name?: string
          organization_id?: string
          recipient_filter?: Json | null
          recipient_type?: string | null
          send_datetime?: string | null
          send_timing?: string
          send_value?: number | null
          status?: string | null
          subject_line?: string
          template?: Json
          timezone?: string | null
          total_recipients?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_email_campaigns_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_email_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_email_jobs: {
        Row: {
          campaign_id: string
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          recipients_processed: number | null
          scheduled_for: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          campaign_id: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          recipients_processed?: number | null
          scheduled_for: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          campaign_id?: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          recipients_processed?: number | null
          scheduled_for?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_email_jobs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "reminder_email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_email_recipients: {
        Row: {
          bounce_reason: string | null
          campaign_id: string
          clicked_at: string | null
          created_at: string | null
          customer_name: string | null
          delivered_at: string | null
          email: string
          email_service_id: string | null
          error_message: string | null
          id: string
          opened_at: string | null
          order_id: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          bounce_reason?: string | null
          campaign_id: string
          clicked_at?: string | null
          created_at?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          email: string
          email_service_id?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          order_id: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          bounce_reason?: string | null
          campaign_id?: string
          clicked_at?: string | null
          created_at?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          email?: string
          email_service_id?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          order_id?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_email_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "reminder_email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_email_recipients_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_posts: {
        Row: {
          connection_id: string | null
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
          connection_id?: string | null
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
          connection_id?: string | null
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
            foreignKeyName: "scheduled_posts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
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
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      series_pass_checkins: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          event_id: string
          id: string
          pass_holder_id: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          event_id: string
          id?: string
          pass_holder_id: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          event_id?: string
          id?: string
          pass_holder_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_pass_checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_pass_checkins_pass_holder_id_fkey"
            columns: ["pass_holder_id"]
            isOneToOne: false
            referencedRelation: "series_pass_holders"
            referencedColumns: ["id"]
          },
        ]
      }
      series_pass_holders: {
        Row: {
          created_at: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          events_attended: number | null
          events_remaining: number | null
          id: string
          order_id: string | null
          pass_code: string
          series_pass_id: string
          status: string | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          events_attended?: number | null
          events_remaining?: number | null
          id?: string
          order_id?: string | null
          pass_code: string
          series_pass_id: string
          status?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          events_attended?: number | null
          events_remaining?: number | null
          id?: string
          order_id?: string | null
          pass_code?: string
          series_pass_id?: string
          status?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "series_pass_holders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_pass_holders_series_pass_id_fkey"
            columns: ["series_pass_id"]
            isOneToOne: false
            referencedRelation: "series_passes"
            referencedColumns: ["id"]
          },
        ]
      }
      series_passes: {
        Row: {
          created_at: string | null
          description: string | null
          event_count: number | null
          id: string
          name: string
          pass_type: string
          price: number
          quantity_available: number | null
          quantity_sold: number | null
          series_id: string
          status: string | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_count?: number | null
          id?: string
          name: string
          pass_type: string
          price: number
          quantity_available?: number | null
          quantity_sold?: number | null
          series_id: string
          status?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_count?: number | null
          id?: string
          name?: string
          pass_type?: string
          price?: number
          quantity_available?: number | null
          quantity_sold?: number | null
          series_id?: string
          status?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "series_passes_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id"]
          },
        ]
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
      survey_emails: {
        Row: {
          clicked_at: string | null
          created_at: string | null
          customer_email: string
          customer_name: string | null
          id: string
          is_reminder: boolean | null
          opened_at: string | null
          order_id: string | null
          sent_at: string | null
          status: string | null
          survey_id: string
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string | null
          customer_email: string
          customer_name?: string | null
          id?: string
          is_reminder?: boolean | null
          opened_at?: string | null
          order_id?: string | null
          sent_at?: string | null
          status?: string | null
          survey_id: string
        }
        Update: {
          clicked_at?: string | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string | null
          id?: string
          is_reminder?: boolean | null
          opened_at?: string | null
          order_id?: string | null
          sent_at?: string | null
          status?: string | null
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_emails_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_emails_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          customer_email: string
          customer_name: string | null
          device_type: string | null
          event_id: string
          id: string
          nps_score: number | null
          order_id: string | null
          overall_rating: number | null
          responses: Json
          source: string | null
          started_at: string | null
          survey_id: string
          time_to_complete_seconds: number | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          customer_email: string
          customer_name?: string | null
          device_type?: string | null
          event_id: string
          id?: string
          nps_score?: number | null
          order_id?: string | null
          overall_rating?: number | null
          responses?: Json
          source?: string | null
          started_at?: string | null
          survey_id: string
          time_to_complete_seconds?: number | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string | null
          device_type?: string | null
          event_id?: string
          id?: string
          nps_score?: number | null
          order_id?: string | null
          overall_rating?: number | null
          responses?: Json
          source?: string | null
          started_at?: string | null
          survey_id?: string
          time_to_complete_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string | null
          description: string | null
          event_id: string
          id: string
          incentive_enabled: boolean | null
          incentive_type: string | null
          incentive_value: string | null
          is_active: boolean | null
          last_sent_at: string | null
          organization_id: string
          questions: Json
          reminder_delay_hours: number | null
          reminder_enabled: boolean | null
          send_delay_hours: number | null
          thank_you_message: string | null
          thank_you_title: string | null
          title: string
          total_reminders_sent: number | null
          total_responses: number | null
          total_sent: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_id: string
          id?: string
          incentive_enabled?: boolean | null
          incentive_type?: string | null
          incentive_value?: string | null
          is_active?: boolean | null
          last_sent_at?: string | null
          organization_id: string
          questions?: Json
          reminder_delay_hours?: number | null
          reminder_enabled?: boolean | null
          send_delay_hours?: number | null
          thank_you_message?: string | null
          thank_you_title?: string | null
          title?: string
          total_reminders_sent?: number | null
          total_responses?: number | null
          total_sent?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_id?: string
          id?: string
          incentive_enabled?: boolean | null
          incentive_type?: string | null
          incentive_value?: string | null
          is_active?: boolean | null
          last_sent_at?: string | null
          organization_id?: string
          questions?: Json
          reminder_delay_hours?: number | null
          reminder_enabled?: boolean | null
          send_delay_hours?: number | null
          thank_you_message?: string | null
          thank_you_title?: string | null
          title?: string
          total_reminders_sent?: number | null
          total_responses?: number | null
          total_sent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_presets: {
        Row: {
          country_code: string
          country_name: string
          created_at: string | null
          display_order: number | null
          id: string
          notes: string | null
          region: string | null
          tax_inclusive: boolean
          tax_name: string
          tax_rate: number
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          notes?: string | null
          region?: string | null
          tax_inclusive: boolean
          tax_name: string
          tax_rate: number
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          notes?: string | null
          region?: string | null
          tax_inclusive?: boolean
          tax_name?: string
          tax_rate?: number
        }
        Relationships: []
      }
      template_events: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          template_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          template_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "event_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_reservations: {
        Row: {
          customer_email: string | null
          event_id: string
          expires_at: string
          id: string
          quantity: number
          reserved_at: string
          session_id: string
          status: string
          ticket_type_id: string
        }
        Insert: {
          customer_email?: string | null
          event_id: string
          expires_at?: string
          id?: string
          quantity: number
          reserved_at?: string
          session_id: string
          status?: string
          ticket_type_id: string
        }
        Update: {
          customer_email?: string | null
          event_id?: string
          expires_at?: string
          id?: string
          quantity?: number
          reserved_at?: string
          session_id?: string
          status?: string
          ticket_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_reservations_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_transfers: {
        Row: {
          accept_url: string | null
          accepted_at: string | null
          completed_at: string | null
          created_at: string | null
          event_id: string
          expires_at: string | null
          from_email: string
          from_name: string
          id: string
          initiated_at: string | null
          new_ticket_code: string | null
          new_ticket_id: string | null
          order_id: string
          status: string
          ticket_id: string
          to_email: string
          to_name: string
          to_phone: string | null
          transfer_token: string
          updated_at: string | null
        }
        Insert: {
          accept_url?: string | null
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          event_id: string
          expires_at?: string | null
          from_email: string
          from_name: string
          id?: string
          initiated_at?: string | null
          new_ticket_code?: string | null
          new_ticket_id?: string | null
          order_id: string
          status?: string
          ticket_id: string
          to_email: string
          to_name: string
          to_phone?: string | null
          transfer_token: string
          updated_at?: string | null
        }
        Update: {
          accept_url?: string | null
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          event_id?: string
          expires_at?: string | null
          from_email?: string
          from_name?: string
          id?: string
          initiated_at?: string | null
          new_ticket_code?: string | null
          new_ticket_id?: string | null
          order_id?: string
          status?: string
          ticket_id?: string
          to_email?: string
          to_name?: string
          to_phone?: string | null
          transfer_token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_transfers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_transfers_new_ticket_id_fkey"
            columns: ["new_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_transfers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_transfers_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          attendees_per_ticket: number
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
          use_assigned_seating: boolean
        }
        Insert: {
          attendees_per_ticket?: number
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
          use_assigned_seating?: boolean
        }
        Update: {
          attendees_per_ticket?: number
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
          use_assigned_seating?: boolean
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
      ticket_upgrade_paths: {
        Row: {
          created_at: string | null
          custom_fee: number | null
          enabled: boolean | null
          event_id: string
          from_ticket_type_id: string
          id: string
          to_ticket_type_id: string
        }
        Insert: {
          created_at?: string | null
          custom_fee?: number | null
          enabled?: boolean | null
          event_id: string
          from_ticket_type_id: string
          id?: string
          to_ticket_type_id: string
        }
        Update: {
          created_at?: string | null
          custom_fee?: number | null
          enabled?: boolean | null
          event_id?: string
          from_ticket_type_id?: string
          id?: string
          to_ticket_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_upgrade_paths_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_upgrade_paths_from_ticket_type_id_fkey"
            columns: ["from_ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_upgrade_paths_to_ticket_type_id_fkey"
            columns: ["to_ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_upgrades: {
        Row: {
          completed_at: string | null
          created_at: string | null
          customer_email: string
          customer_name: string
          event_id: string
          from_ticket_type_id: string
          id: string
          new_price: number
          new_ticket_code: string | null
          new_ticket_id: string | null
          order_id: string
          original_price: number
          payment_token: string | null
          payment_url: string | null
          price_difference: number
          status: string
          stripe_payment_intent_id: string | null
          ticket_id: string
          to_ticket_type_id: string
          total_to_pay: number
          updated_at: string | null
          upgrade_fee: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          customer_email: string
          customer_name: string
          event_id: string
          from_ticket_type_id: string
          id?: string
          new_price: number
          new_ticket_code?: string | null
          new_ticket_id?: string | null
          order_id: string
          original_price: number
          payment_token?: string | null
          payment_url?: string | null
          price_difference: number
          status?: string
          stripe_payment_intent_id?: string | null
          ticket_id: string
          to_ticket_type_id: string
          total_to_pay: number
          updated_at?: string | null
          upgrade_fee?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          event_id?: string
          from_ticket_type_id?: string
          id?: string
          new_price?: number
          new_ticket_code?: string | null
          new_ticket_id?: string | null
          order_id?: string
          original_price?: number
          payment_token?: string | null
          payment_url?: string | null
          price_difference?: number
          status?: string
          stripe_payment_intent_id?: string | null
          ticket_id?: string
          to_ticket_type_id?: string
          total_to_pay?: number
          updated_at?: string | null
          upgrade_fee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_upgrades_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_upgrades_from_ticket_type_id_fkey"
            columns: ["from_ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_upgrades_new_ticket_id_fkey"
            columns: ["new_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_upgrades_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_upgrades_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_upgrades_to_ticket_type_id_fkey"
            columns: ["to_ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          attendee_email: string | null
          attendee_name: string | null
          attendee_phone: string | null
          checked_in: boolean | null
          created_at: string
          id: string
          order_item_id: string
          seat_id: string | null
          status: string
          ticket_code: string
          used_at: string | null
        }
        Insert: {
          attendee_email?: string | null
          attendee_name?: string | null
          attendee_phone?: string | null
          checked_in?: boolean | null
          created_at?: string
          id?: string
          order_item_id: string
          seat_id?: string | null
          status?: string
          ticket_code: string
          used_at?: string | null
        }
        Update: {
          attendee_email?: string | null
          attendee_name?: string | null
          attendee_phone?: string | null
          checked_in?: boolean | null
          created_at?: string
          id?: string
          order_item_id?: string
          seat_id?: string | null
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
          {
            foreignKeyName: "tickets_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
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
      voucher_usage: {
        Row: {
          amount_used: number
          id: string
          order_id: string
          used_at: string | null
          voucher_id: string
        }
        Insert: {
          amount_used: number
          id?: string
          order_id: string
          used_at?: string | null
          voucher_id: string
        }
        Update: {
          amount_used?: number
          id?: string
          order_id?: string
          used_at?: string | null
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_usage_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          customer_email: string | null
          customer_name: string | null
          event_id: string | null
          free_ticket_count: number | null
          id: string
          max_uses: number | null
          min_purchase_amount: number | null
          notes: string | null
          organization_id: string
          original_value: number
          percentage_value: number | null
          remaining_value: number
          source: string | null
          source_order_id: string | null
          source_refund_id: string | null
          status: string
          ticket_type_id: string | null
          type: string
          updated_at: string | null
          uses_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          event_id?: string | null
          free_ticket_count?: number | null
          id?: string
          max_uses?: number | null
          min_purchase_amount?: number | null
          notes?: string | null
          organization_id: string
          original_value: number
          percentage_value?: number | null
          remaining_value: number
          source?: string | null
          source_order_id?: string | null
          source_refund_id?: string | null
          status?: string
          ticket_type_id?: string | null
          type: string
          updated_at?: string | null
          uses_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          event_id?: string | null
          free_ticket_count?: number | null
          id?: string
          max_uses?: number | null
          min_purchase_amount?: number | null
          notes?: string | null
          organization_id?: string
          original_value?: number
          percentage_value?: number | null
          remaining_value?: number
          source?: string | null
          source_order_id?: string | null
          source_refund_id?: string | null
          status?: string
          ticket_type_id?: string | null
          type?: string
          updated_at?: string | null
          uses_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_source_refund_id_fkey"
            columns: ["source_refund_id"]
            isOneToOne: false
            referencedRelation: "refund_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_entries: {
        Row: {
          converted_order_id: string | null
          created_at: string | null
          email: string
          event_id: string
          id: string
          name: string
          notes: string | null
          offer_expires_at: string | null
          offer_sent_at: string | null
          offer_token: string | null
          phone: string | null
          position: number | null
          quantity: number
          status: string
          ticket_type_id: string | null
          updated_at: string | null
        }
        Insert: {
          converted_order_id?: string | null
          created_at?: string | null
          email: string
          event_id: string
          id?: string
          name: string
          notes?: string | null
          offer_expires_at?: string | null
          offer_sent_at?: string | null
          offer_token?: string | null
          phone?: string | null
          position?: number | null
          quantity?: number
          status?: string
          ticket_type_id?: string | null
          updated_at?: string | null
        }
        Update: {
          converted_order_id?: string | null
          created_at?: string | null
          email?: string
          event_id?: string
          id?: string
          name?: string
          notes?: string | null
          offer_expires_at?: string | null
          offer_sent_at?: string | null
          offer_token?: string | null
          phone?: string | null
          position?: number | null
          quantity?: number
          status?: string
          ticket_type_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      waiver_signatures: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          event_id: string
          id: string
          ip_address: string | null
          organization_id: string
          signature_data: string
          signature_type: string
          signed_at: string | null
          signer_email: string | null
          signer_name: string
          ticket_id: string
          user_agent: string | null
          waiver_content_snapshot: string
          waiver_template_id: string
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          event_id: string
          id?: string
          ip_address?: string | null
          organization_id: string
          signature_data: string
          signature_type?: string
          signed_at?: string | null
          signer_email?: string | null
          signer_name: string
          ticket_id: string
          user_agent?: string | null
          waiver_content_snapshot: string
          waiver_template_id: string
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          event_id?: string
          id?: string
          ip_address?: string | null
          organization_id?: string
          signature_data?: string
          signature_type?: string
          signed_at?: string | null
          signer_email?: string | null
          signer_name?: string
          ticket_id?: string
          user_agent?: string | null
          waiver_content_snapshot?: string
          waiver_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiver_signatures_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_signatures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_signatures_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_signatures_waiver_template_id_fkey"
            columns: ["waiver_template_id"]
            isOneToOne: false
            referencedRelation: "waiver_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      waiver_templates: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          event_id: string | null
          id: string
          is_active: boolean
          organization_id: string
          require_date_of_birth: boolean
          require_emergency_contact: boolean
          require_signature: boolean
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          require_date_of_birth?: boolean
          require_emergency_contact?: boolean
          require_signature?: boolean
          title?: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          require_date_of_birth?: boolean
          require_emergency_contact?: boolean
          require_signature?: boolean
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waiver_templates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json | null
          processed_at: string | null
          processing_status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          processing_status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          processing_status?: string | null
        }
        Relationships: []
      }
      widget_sessions: {
        Row: {
          browser: string | null
          cart_value: number | null
          checkout_started_at: string | null
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string | null
          device_type: string | null
          event_id: string
          exit_step: string | null
          id: string
          ip_address: string | null
          latitude: number | null
          longitude: number | null
          page_views: number | null
          payment_initiated_at: string | null
          purchase_completed_at: string | null
          referrer: string | null
          region: string | null
          session_id: string
          ticket_selected_at: string | null
          tickets_selected: Json | null
          time_on_widget_seconds: number | null
          updated_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_timezone: string | null
          widget_loaded_at: string | null
        }
        Insert: {
          browser?: string | null
          cart_value?: number | null
          checkout_started_at?: string | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          device_type?: string | null
          event_id: string
          exit_step?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          page_views?: number | null
          payment_initiated_at?: string | null
          purchase_completed_at?: string | null
          referrer?: string | null
          region?: string | null
          session_id: string
          ticket_selected_at?: string | null
          tickets_selected?: Json | null
          time_on_widget_seconds?: number | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_timezone?: string | null
          widget_loaded_at?: string | null
        }
        Update: {
          browser?: string | null
          cart_value?: number | null
          checkout_started_at?: string | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          device_type?: string | null
          event_id?: string
          exit_step?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          page_views?: number | null
          payment_initiated_at?: string | null
          purchase_completed_at?: string | null
          referrer?: string | null
          region?: string | null
          session_id?: string
          ticket_selected_at?: string | null
          tickets_selected?: Json | null
          time_on_widget_seconds?: number | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_timezone?: string | null
          widget_loaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "widget_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
      contacts_limited: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          events_attended: number | null
          first_name: string | null
          id: string | null
          last_event_date: string | null
          last_name: string | null
          last_order_date: string | null
          lifetime_value: number | null
          organization_id: string | null
          phone: string | null
          postal_code: string | null
          tags: string[] | null
          total_donations: number | null
          total_orders: number | null
          total_spent: number | null
        }
        Insert: {
          address?: never
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: never
          events_attended?: number | null
          first_name?: never
          id?: string | null
          last_event_date?: string | null
          last_name?: never
          last_order_date?: string | null
          lifetime_value?: number | null
          organization_id?: string | null
          phone?: never
          postal_code?: never
          tags?: string[] | null
          total_donations?: number | null
          total_orders?: number | null
          total_spent?: number | null
        }
        Update: {
          address?: never
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: never
          events_attended?: number | null
          first_name?: never
          id?: string | null
          last_event_date?: string | null
          last_name?: never
          last_order_date?: string | null
          lifetime_value?: number | null
          organization_id?: string | null
          phone?: never
          postal_code?: never
          tags?: string[] | null
          total_donations?: number | null
          total_orders?: number | null
          total_spent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      issuing_interchange_balances: {
        Row: {
          active_cards: number | null
          available_balance: number | null
          organization_id: string | null
          organization_name: string | null
          pending_payout: number | null
          total_interchange_earned: number | null
          total_transactions: number | null
          total_volume: number | null
        }
        Relationships: [
          {
            foreignKeyName: "issuing_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      calculate_event_playbook_summary: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      calculate_group_discount: {
        Args: { p_event_id: string; p_subtotal: number; p_ticket_count: number }
        Returns: number
      }
      calculate_next_email_at: {
        Args: {
          p_cart_created_at: string
          p_delay_minutes: number
          p_emails_sent: number
          p_last_email_sent_at: string
        }
        Returns: string
      }
      calculate_platform_fee:
        | { Args: never; Returns: number }
        | { Args: { order_id: number }; Returns: number }
        | { Args: { transaction_amount: number }; Returns: number }
      can_access_guest_data: { Args: { p_event_id: string }; Returns: boolean }
      cancel_reservation: { Args: { p_session_id: string }; Returns: boolean }
      check_billing_setup: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      check_contact_access: {
        Args: {
          p_contact_id: string
          p_required_permission?: string
          p_user_id: string
        }
        Returns: boolean
      }
      check_event_access: {
        Args: { p_event_id: string; p_user_id: string }
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
      cleanup_expired_reservations: { Args: never; Returns: undefined }
      complete_reservation: {
        Args: { p_order_id: string; p_reservation_id: string }
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
      create_default_playbooks_for_org: {
        Args: { p_organization_id: string }
        Returns: undefined
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
      create_refund_voucher: {
        Args: {
          p_amount: number
          p_customer_email: string
          p_customer_name: string
          p_organization_id: string
          p_refund_id: string
          p_valid_days?: number
        }
        Returns: string
      }
      create_tickets_bulk: {
        Args: { tickets_data: Json }
        Returns: {
          attendee_email: string | null
          attendee_name: string | null
          attendee_phone: string | null
          checked_in: boolean | null
          created_at: string
          id: string
          order_item_id: string
          seat_id: string | null
          status: string
          ticket_code: string
          used_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "tickets"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_series_events: { Args: { p_series_id: string }; Returns: number }
      generate_ticket_code: { Args: never; Returns: string }
      generate_voucher_code: { Args: never; Returns: string }
      get_challenge_for_verify: {
        Args: { p_challenge_type: string; p_user_id: string }
        Returns: {
          challenge: string
          challenge_type: string
          created_at: string
          expires_at: string
          id: string
          used: boolean
          user_id: string
        }[]
      }
      get_current_user_email: { Args: never; Returns: string }
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
      get_organization_stats: {
        Args: { p_organization_id: string }
        Returns: {
          active_events: number
          billing_status: string
          is_trial: boolean
          next_billing_date: string
          pending_invoices: number
          total_events: number
          total_orders: number
          total_platform_fees: number
          total_revenue: number
          total_tickets_sold: number
          trial_days_remaining: number
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
      get_payout_summary: {
        Args: {
          p_end_date?: string
          p_organization_id: string
          p_start_date?: string
        }
        Returns: {
          paid_amount: number
          pending_amount: number
          total_fees: number
          total_gross: number
          total_net: number
          total_payouts: number
        }[]
      }
      get_public_payment_config: {
        Args: { p_event_id: string }
        Returns: {
          apple_pay_merchant_id: string
          credit_card_processing_fee_percentage: number
          currency: string
          payment_provider: string
          stripe_account_id: string
          stripe_publishable_key: string
          windcave_enabled: boolean
        }[]
      }
      get_reservation_stats: {
        Args: never
        Returns: {
          active_count: number
          completed_count: number
          expired_count: number
          oldest_active_reservation: string
        }[]
      }
      get_user_credential_by_id: {
        Args: { p_credential_id: string; p_user_id: string }
        Returns: {
          created_at: string
          credential_backed_up: boolean
          credential_counter: number
          credential_device_type: string
          credential_id: string
          credential_name: string
          credential_public_key: string
          credential_transports: string[]
          id: string
          last_used: string
          user_id: string
        }[]
      }
      get_user_credentials: { Args: { p_user_id: string }; Returns: Json }
      get_user_organization_id: { Args: { user_uuid: string }; Returns: string }
      get_user_organization_role: {
        Args: { p_organization_id: string; p_user_id: string }
        Returns: Database["public"]["Enums"]["organization_role"]
      }
      increment_promo_code_usage: {
        Args: {
          p_customer_email: string
          p_discount_applied: number
          p_order_id: string
          p_promo_code_id: string
        }
        Returns: boolean
      }
      insert_user_credential_full: {
        Args: {
          p_credential_backed_up: boolean
          p_credential_counter: number
          p_credential_device_type: string
          p_credential_id: string
          p_credential_name: string
          p_credential_public_key: string
          p_credential_transports: string[]
          p_user_id: string
        }
        Returns: Json
      }
      invalidate_admin_session: { Args: { token: string }; Returns: boolean }
      is_authenticated_admin: { Args: never; Returns: boolean }
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
      process_ready_abandoned_carts: { Args: never; Returns: undefined }
      process_waitlist_offers: {
        Args: {
          p_available_count: number
          p_event_id: string
          p_ticket_type_id: string
        }
        Returns: number
      }
      reserve_tickets: {
        Args: {
          p_customer_email?: string
          p_event_id: string
          p_quantity: number
          p_session_id: string
          p_ticket_type_id: string
        }
        Returns: {
          available_quantity: number
          error_message: string
          reservation_id: string
          success: boolean
        }[]
      }
      seed_system_playbooks: { Args: never; Returns: undefined }
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
      update_credential_counter_and_used: {
        Args: { p_credential_id: string; p_new_counter: number }
        Returns: Json
      }
      update_organization_user_after_signup: {
        Args: { p_invitation_token: string; p_real_user_id: string }
        Returns: boolean
      }
      user_can_access_event: { Args: { event_id: string }; Returns: boolean }
      user_can_access_ticket: { Args: { ticket_id: string }; Returns: boolean }
      user_can_manage_crm: {
        Args: { org_id: string; user_id_param: string }
        Returns: boolean
      }
      user_has_crm_access: {
        Args: { org_id: string; user_id_param: string }
        Returns: boolean
      }
      user_is_org_member: {
        Args: { org_id: string; user_id: string }
        Returns: boolean
      }
      user_owns_organization: {
        Args: { org_id: string; user_uuid: string }
        Returns: boolean
      }
      validate_admin_session: { Args: { token: string }; Returns: string }
      validate_promo_code: {
        Args: {
          p_code: string
          p_customer_email: string
          p_event_id: string
          p_subtotal: number
          p_ticket_count: number
        }
        Returns: {
          discount_amount: number
          error_message: string
          promo_code_id: string
          valid: boolean
        }[]
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
      webauthn_delete_credential: {
        Args: { p_credential_id: string }
        Returns: boolean
      }
      webauthn_get_challenge: {
        Args: { p_challenge_type: string; p_user_id: string }
        Returns: {
          challenge: string
          challenge_type: string
          created_at: string
          expires_at: string
          id: string
          user_id: string
        }[]
      }
      webauthn_get_credential: {
        Args: { p_credential_id: string }
        Returns: {
          credential_backed_up: boolean
          credential_counter: number
          credential_device_type: string
          credential_id: string
          credential_public_key: string
          credential_transports: string[]
          id: string
          user_id: string
        }[]
      }
      webauthn_get_existing_credentials: {
        Args: { p_user_id: string }
        Returns: {
          credential_id: string
        }[]
      }
      webauthn_get_user_credentials: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          credential_device_type: string
          credential_id: string
          credential_name: string
          credential_transports: string[]
          id: string
          last_used: string
        }[]
      }
      webauthn_insert_challenge: {
        Args: {
          p_challenge: string
          p_challenge_type: string
          p_expires_at: string
          p_user_id: string
        }
        Returns: undefined
      }
      webauthn_insert_user_credential: {
        Args: {
          p_credential_backed_up: boolean
          p_credential_counter: number
          p_credential_device_type: string
          p_credential_id: string
          p_credential_name: string
          p_credential_public_key: string
          p_credential_transports: string[]
          p_user_id: string
        }
        Returns: undefined
      }
      webauthn_mark_challenge_used: {
        Args: { p_challenge_id: string }
        Returns: boolean
      }
      webauthn_store_challenge: {
        Args: {
          p_challenge: string
          p_challenge_type: string
          p_expires_at: string
          p_user_id: string
        }
        Returns: string
      }
      webauthn_store_credential: {
        Args: {
          p_credential_backed_up: boolean
          p_credential_counter: number
          p_credential_device_type: string
          p_credential_id: string
          p_credential_name: string
          p_credential_public_key: string
          p_credential_transports: string[]
          p_user_id: string
        }
        Returns: string
      }
      webauthn_update_counter: {
        Args: { p_credential_id: string; p_new_counter: number }
        Returns: boolean
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
        | "manage_crm"
        | "view_crm"
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
        "manage_crm",
        "view_crm",
      ],
      organization_role: ["owner", "admin", "editor", "viewer"],
    },
  },
} as const
