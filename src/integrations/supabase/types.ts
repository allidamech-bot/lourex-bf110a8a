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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          country: string | null
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          type: string
          updated_at: string
          verification_status: string
          website: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          type?: string
          updated_at?: string
          verification_status?: string
          website?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          type?: string
          updated_at?: string
          verification_status?: string
          website?: string | null
        }
        Relationships: []
      }
      company_profiles: {
        Row: {
          business_type: string
          categories: string[]
          certifications: Json
          cover_url: string
          created_at: string
          description: string
          employee_count: string
          factory_id: string
          id: string
          logo_url: string
          onboarding_completed: boolean
          onboarding_step: number
          updated_at: string
          website: string
          year_established: number | null
        }
        Insert: {
          business_type?: string
          categories?: string[]
          certifications?: Json
          cover_url?: string
          created_at?: string
          description?: string
          employee_count?: string
          factory_id: string
          id?: string
          logo_url?: string
          onboarding_completed?: boolean
          onboarding_step?: number
          updated_at?: string
          website?: string
          year_established?: number | null
        }
        Update: {
          business_type?: string
          categories?: string[]
          certifications?: Json
          cover_url?: string
          created_at?: string
          description?: string
          employee_count?: string
          factory_id?: string
          id?: string
          logo_url?: string
          onboarding_completed?: boolean
          onboarding_step?: number
          updated_at?: string
          website?: string
          year_established?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_profiles_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: true
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_messages: {
        Row: {
          content: string
          created_at: string
          deal_id: string
          id: string
          message_type: string
          offer_amount: number | null
          sender_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          deal_id: string
          id?: string
          message_type?: string
          offer_amount?: number | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deal_id?: string
          id?: string
          message_type?: string
          offer_amount?: number | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_messages_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          broker_id: string | null
          client_id: string
          created_at: string
          currency: string | null
          deal_number: string
          destination_country: string | null
          factory_id: string | null
          id: string
          notes: string | null
          origin_country: string | null
          status: string
          supplier_id: string | null
          total_value: number | null
          updated_at: string
        }
        Insert: {
          broker_id?: string | null
          client_id: string
          created_at?: string
          currency?: string | null
          deal_number: string
          destination_country?: string | null
          factory_id?: string | null
          id?: string
          notes?: string | null
          origin_country?: string | null
          status?: string
          supplier_id?: string | null
          total_value?: number | null
          updated_at?: string
        }
        Update: {
          broker_id?: string | null
          client_id?: string
          created_at?: string
          currency?: string | null
          deal_number?: string
          destination_country?: string | null
          factory_id?: string | null
          id?: string
          notes?: string | null
          origin_country?: string | null
          status?: string
          supplier_id?: string | null
          total_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      factories: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_verified: boolean
          location: string
          logo_url: string | null
          name: string
          owner_user_id: string | null
          reliability_score: number | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_verified?: boolean
          location?: string
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          reliability_score?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_verified?: boolean
          location?: string
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          reliability_score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      factory_applications: {
        Row: {
          company_name: string
          contact_name: string
          cr_number: string
          created_at: string
          email: string
          id: string
          location: string
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tax_id: string
          user_id: string | null
        }
        Insert: {
          company_name: string
          contact_name: string
          cr_number: string
          created_at?: string
          email: string
          id?: string
          location?: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tax_id: string
          user_id?: string | null
        }
        Update: {
          company_name?: string
          contact_name?: string
          cr_number?: string
          created_at?: string
          email?: string
          id?: string
          location?: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tax_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          company: string | null
          created_at: string
          email: string
          factory_name: string | null
          id: string
          inquiry_type: string
          message: string | null
          name: string
          phone: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string
          factory_name?: string | null
          id?: string
          inquiry_type?: string
          message?: string | null
          name?: string
          phone?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          factory_name?: string | null
          id?: string
          inquiry_type?: string
          message?: string | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      inspection_media: {
        Row: {
          caption: string | null
          created_at: string
          file_name: string
          file_url: string
          id: string
          media_type: string
          order_id: string
          uploaded_by: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          media_type?: string
          order_id: string
          uploaded_by: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          media_type?: string
          order_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_media_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_url: string
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          file_url?: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_url?: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_consents: {
        Row: {
          accepted_at: string
          consent_type: string
          device_info: string | null
          id: string
          ip_address: string | null
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          consent_type?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          user_id: string
          version?: string
        }
        Update: {
          accepted_at?: string
          consent_type?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          order_id: string | null
          sender_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          order_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          order_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_name: string
          file_url: string
          id: string
          order_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          doc_type?: string
          file_name?: string
          file_url?: string
          id?: string
          order_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_name?: string
          file_url?: string
          id?: string
          order_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          message: string
          order_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          message?: string
          order_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          message?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          balance_amount: number | null
          balance_paid: boolean | null
          buyer_id: string | null
          created_at: string
          currency: string | null
          deposit_amount: number | null
          deposit_paid: boolean | null
          factory_id: string | null
          id: string
          notes: string | null
          order_number: string
          payment_status: string
          product_id: string | null
          quantity: number
          quote_id: string | null
          rfq_id: string | null
          shipping_tracking_id: string | null
          status: string
          total_amount: number
          total_pallets: number
          updated_at: string
          weight_kg: number
        }
        Insert: {
          balance_amount?: number | null
          balance_paid?: boolean | null
          buyer_id?: string | null
          created_at?: string
          currency?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          factory_id?: string | null
          id?: string
          notes?: string | null
          order_number: string
          payment_status?: string
          product_id?: string | null
          quantity?: number
          quote_id?: string | null
          rfq_id?: string | null
          shipping_tracking_id?: string | null
          status?: string
          total_amount?: number
          total_pallets?: number
          updated_at?: string
          weight_kg?: number
        }
        Update: {
          balance_amount?: number | null
          balance_paid?: boolean | null
          buyer_id?: string | null
          created_at?: string
          currency?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          factory_id?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_status?: string
          product_id?: string | null
          quantity?: number
          quote_id?: string | null
          rfq_id?: string | null
          shipping_tracking_id?: string | null
          status?: string
          total_amount?: number
          total_pallets?: number
          updated_at?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_staff: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          owner_id: string
          permissions: Json
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id?: string
          owner_id: string
          permissions?: Json
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          owner_id?: string
          permissions?: Json
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_prices: {
        Row: {
          created_at: string
          currency: string
          id: string
          price: number
          product_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          price?: number
          product_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          price?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          cert_halal: boolean
          cert_iso: boolean
          cert_saber: boolean
          cert_sfda: boolean
          created_at: string
          currency: string | null
          description: string | null
          dimensions: string | null
          factory_id: string
          id: string
          image_url: string | null
          is_active: boolean
          lead_time: string | null
          moq: string | null
          name: string
          price_per_unit: number | null
          seller_id: string | null
          shipping_origin: string | null
          status: string
          stock_capacity: string | null
          units_per_carton: number | null
          updated_at: string
          weight_per_unit: number | null
        }
        Insert: {
          category?: string
          cert_halal?: boolean
          cert_iso?: boolean
          cert_saber?: boolean
          cert_sfda?: boolean
          created_at?: string
          currency?: string | null
          description?: string | null
          dimensions?: string | null
          factory_id: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          lead_time?: string | null
          moq?: string | null
          name: string
          price_per_unit?: number | null
          seller_id?: string | null
          shipping_origin?: string | null
          status?: string
          stock_capacity?: string | null
          units_per_carton?: number | null
          updated_at?: string
          weight_per_unit?: number | null
        }
        Update: {
          category?: string
          cert_halal?: boolean
          cert_iso?: boolean
          cert_saber?: boolean
          cert_sfda?: boolean
          created_at?: string
          currency?: string | null
          description?: string | null
          dimensions?: string | null
          factory_id?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          lead_time?: string | null
          moq?: string | null
          name?: string
          price_per_unit?: number | null
          seller_id?: string | null
          shipping_origin?: string | null
          status?: string
          stock_capacity?: string | null
          units_per_carton?: number | null
          updated_at?: string
          weight_per_unit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          country: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          created_at: string
          currency: string
          factory_id: string
          id: string
          lead_time: string
          moq: number
          notes: string
          price_per_unit: number
          rfq_id: string
          status: string
          supplier_user_id: string
          total_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          factory_id: string
          id?: string
          lead_time?: string
          moq?: number
          notes?: string
          price_per_unit: number
          rfq_id: string
          status?: string
          supplier_user_id: string
          total_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          factory_id?: string
          id?: string
          lead_time?: string
          moq?: number
          notes?: string
          price_per_unit?: number
          rfq_id?: string
          status?: string
          supplier_user_id?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          deal_id: string | null
          factory_id: string | null
          id: string
          rating: number
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          deal_id?: string | null
          factory_id?: string | null
          id?: string
          rating: number
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          deal_id?: string | null
          factory_id?: string | null
          id?: string
          rating?: number
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_recipients: {
        Row: {
          factory_id: string
          id: string
          invited_at: string
          rfq_id: string
        }
        Insert: {
          factory_id: string
          id?: string
          invited_at?: string
          rfq_id: string
        }
        Update: {
          factory_id?: string
          id?: string
          invited_at?: string
          rfq_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_recipients_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_recipients_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          category: string
          created_at: string
          currency: string
          deal_id: string | null
          factory_id: string | null
          id: string
          message: string | null
          notes: string
          offered_price: number | null
          product_id: string | null
          product_name: string | null
          quantity: number
          requester_id: string
          rfq_number: string
          status: string
          supplier_id: string | null
          target_country: string
          target_price: number | null
          timeline: string
          title: string
          updated_at: string
          valid_until: string | null
          visibility: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          category?: string
          created_at?: string
          currency?: string
          deal_id?: string | null
          factory_id?: string | null
          id?: string
          message?: string | null
          notes?: string
          offered_price?: number | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          requester_id: string
          rfq_number: string
          status?: string
          supplier_id?: string | null
          target_country?: string
          target_price?: number | null
          timeline?: string
          title?: string
          updated_at?: string
          valid_until?: string | null
          visibility?: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          category?: string
          created_at?: string
          currency?: string
          deal_id?: string | null
          factory_id?: string | null
          id?: string
          message?: string | null
          notes?: string
          offered_price?: number | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          requester_id?: string
          rfq_number?: string
          status?: string
          supplier_id?: string | null
          target_country?: string
          target_price?: number | null
          timeline?: string
          title?: string
          updated_at?: string
          valid_until?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          client_name: string
          created_at: string
          destination: string
          id: string
          pallets: number
          status: string
          tracking_id: string
          updated_at: string
          user_id: string | null
          weight: number
        }
        Insert: {
          client_name?: string
          created_at?: string
          destination?: string
          id?: string
          pallets?: number
          status?: string
          tracking_id: string
          updated_at?: string
          user_id?: string | null
          weight?: number
        }
        Update: {
          client_name?: string
          created_at?: string
          destination?: string
          id?: string
          pallets?: number
          status?: string
          tracking_id?: string
          updated_at?: string
          user_id?: string | null
          weight?: number
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          order_id: string | null
          priority: string
          resolution: string | null
          status: string
          subject: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          priority?: string
          resolution?: string | null
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          priority?: string
          resolution?: string | null
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_quote: { Args: { p_quote_id: string }; Returns: string }
      admin_approve_factory_application: {
        Args: { p_application_id: string }
        Returns: undefined
      }
      confirm_delivery: {
        Args: { p_message?: string; p_order_id: string }
        Returns: undefined
      }
      create_rfq: {
        Args: {
          p_budget_max?: number
          p_budget_min?: number
          p_category: string
          p_currency?: string
          p_invited_factory_ids?: string[]
          p_notes?: string
          p_quantity: number
          p_target_country?: string
          p_timeline?: string
          p_title: string
          p_visibility?: string
        }
        Returns: string
      }
      get_staff_owner_id: { Args: never; Returns: string }
      has_org_role: {
        Args: { _owner_id: string; _roles: string[] }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_verified_user: { Args: never; Returns: boolean }
      lookup_shipment_by_tracking: {
        Args: { p_tracking_id: string }
        Returns: {
          destination: string
          pallets: number
          status: string
          tracking_id: string
          updated_at: string
          weight: number
        }[]
      }
      submit_quote: {
        Args: {
          p_currency?: string
          p_factory_id: string
          p_lead_time?: string
          p_moq?: number
          p_notes?: string
          p_price_per_unit: number
          p_rfq_id: string
        }
        Returns: string
      }
      supplier_submit_quote: {
        Args: {
          p_message?: string
          p_offered_price: number
          p_rfq_id: string
          p_valid_until?: string
        }
        Returns: undefined
      }
      update_deal_safe: {
        Args: { _deal_id: string; _notes?: string; _status?: string }
        Returns: undefined
      }
      update_order_status: {
        Args: { p_message?: string; p_order_id: string; p_status: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "buyer"
        | "factory"
        | "broker"
        | "seller"
        | "manufacturer"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "buyer",
        "factory",
        "broker",
        "seller",
        "manufacturer",
      ],
    },
  },
} as const
