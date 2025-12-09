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
      billing_customers: {
        Row: {
          billing_email: string
          billing_interval_days: number
          billing_status: string
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
          id: string
          last_event_date: string | null
          last_name: string | null
          last_order_date: string | null
          lifetime_value: number | null
          notes: string | null
          organization_id: string
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
          id?: string
          last_event_date?: string | null
          last_name?: string | null
          last_order_date?: string | null
          lifetime_value?: number | null
          notes?: string | null
          organization_id: string
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
          id?: string
          last_event_date?: string | null
          last_name?: string | null
          last_order_date?: string | null
          lifetime_value?: number | null
          notes?: string | null
          organization_id?: string
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
      events: {
        Row: {
          capacity: number
          created_at: string
          description: string | null
          donation_description: string | null
          donation_suggested_amounts: string[] | null
          donations_enabled: boolean | null
          email_customization: Json | null
          event_date: string
          event_end_date: string | null
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
          donation_description?: string | null
          donation_suggested_amounts?: string[] | null
          donations_enabled?: boolean | null
          email_customization?: Json | null
          event_date: string
          event_end_date?: string | null
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
          donation_description?: string | null
          donation_suggested_amounts?: string[] | null
          donations_enabled?: boolean | null
          email_customization?: Json | null
          event_date?: string
          event_end_date?: string | null
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
          event_id: string
          group_id: string
          id: string
          invoice_number: string | null
          notes: string | null
          paid_date: string | null
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
          event_id: string
          group_id: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          paid_date?: string | null
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
          event_id?: string
          group_id?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          paid_date?: string | null
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
          booking_fee: number | null
          booking_fee_amount: number | null
          booking_fee_enabled: boolean | null
          card_brand: string | null
          card_last_four: string | null
          created_at: string
          custom_answers: Json | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
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
          subtotal_amount: number | null
          total_amount: number
          updated_at: string
          windcave_session_id: string | null
        }
        Insert: {
          booking_fee?: number | null
          booking_fee_amount?: number | null
          booking_fee_enabled?: boolean | null
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string
          custom_answers?: Json | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
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
          subtotal_amount?: number | null
          total_amount: number
          updated_at?: string
          windcave_session_id?: string | null
        }
        Update: {
          booking_fee?: number | null
          booking_fee_amount?: number | null
          booking_fee_enabled?: boolean | null
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string
          custom_answers?: Json | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
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
          subtotal_amount?: number | null
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
            foreignKeyName: "orders_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
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
          crm_enabled: boolean | null
          currency: string | null
          custom_css: string | null
          email: string
          group_auto_invoice_frequency: string | null
          group_auto_invoice_last_run: string | null
          groups_enabled: boolean | null
          id: string
          logo_url: string | null
          name: string
          payment_provider: string | null
          phone: string | null
          postal_code: string | null
          stripe_access_token: string | null
          stripe_account_id: string | null
          stripe_booking_fee_enabled: boolean | null
          stripe_refresh_token: string | null
          stripe_scope: string | null
          stripe_terminal_location_id: string | null
          system_type: string | null
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
          crm_enabled?: boolean | null
          currency?: string | null
          custom_css?: string | null
          email: string
          group_auto_invoice_frequency?: string | null
          group_auto_invoice_last_run?: string | null
          groups_enabled?: boolean | null
          id?: string
          logo_url?: string | null
          name: string
          payment_provider?: string | null
          phone?: string | null
          postal_code?: string | null
          stripe_access_token?: string | null
          stripe_account_id?: string | null
          stripe_booking_fee_enabled?: boolean | null
          stripe_refresh_token?: string | null
          stripe_scope?: string | null
          stripe_terminal_location_id?: string | null
          system_type?: string | null
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
          crm_enabled?: boolean | null
          currency?: string | null
          custom_css?: string | null
          email?: string
          group_auto_invoice_frequency?: string | null
          group_auto_invoice_last_run?: string | null
          groups_enabled?: boolean | null
          id?: string
          logo_url?: string | null
          name?: string
          payment_provider?: string | null
          phone?: string | null
          postal_code?: string | null
          stripe_access_token?: string | null
          stripe_account_id?: string | null
          stripe_booking_fee_enabled?: boolean | null
          stripe_refresh_token?: string | null
          stripe_scope?: string | null
          stripe_terminal_location_id?: string | null
          system_type?: string | null
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
            foreignKeyName: "promo_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      calculate_group_discount: {
        Args: { p_event_id: string; p_subtotal: number; p_ticket_count: number }
        Returns: number
      }
      calculate_platform_fee:
        | { Args: never; Returns: number }
        | { Args: { transaction_amount: number }; Returns: number }
        | { Args: { order_id: number }; Returns: number }
      can_access_guest_data: { Args: { p_event_id: string }; Returns: boolean }
      cancel_reservation: { Args: { p_session_id: string }; Returns: boolean }
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
        SetofOptions: {
          from: "*"
          to: "tickets"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_ticket_code: { Args: never; Returns: string }
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
      user_can_manage_crm: {
        Args: { org_id: string; user_id_param: string }
        Returns: boolean
      }
      user_has_crm_access: {
        Args: { org_id: string; user_id_param: string }
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
          credential_name: string
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
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          format: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          format?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_level: { Args: { name: string }; Returns: number }
      get_prefix: { Args: { name: string }; Returns: string }
      get_prefixes: { Args: { name: string }; Returns: string[] }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      lock_top_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS"
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
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS"],
    },
  },
} as const
