// Generated from the live Supabase project (sabwtzqzqeynuikqpgui) with the
// Supabase MCP generate_typescript_types tool on 2026-09-15.
// Regenerate after every migration; do not hand-edit.

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
      announcements: {
        Row: {
          active: boolean
          body: string
          created_at: string
          created_by: string | null
          cta_href: string | null
          cta_label: string | null
          id: string
          target_user_id: string | null
          title: string
        }
        Insert: {
          active?: boolean
          body?: string
          created_at?: string
          created_by?: string | null
          cta_href?: string | null
          cta_label?: string | null
          id?: string
          target_user_id?: string | null
          title: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          created_by?: string | null
          cta_href?: string | null
          cta_label?: string | null
          id?: string
          target_user_id?: string | null
          title?: string
        }
        Relationships: []
      }
      band_handouts: {
        Row: {
          actor_uid: string | null
          band_id: string
          created_at: string
          direction: string
          id: number
          note: string | null
          reason: string
          recipient_email: string | null
          recipient_name: string | null
          upline_email: string | null
          upline_user_id: string | null
        }
        Insert: {
          actor_uid?: string | null
          band_id: string
          created_at?: string
          direction?: string
          id?: number
          note?: string | null
          reason: string
          recipient_email?: string | null
          recipient_name?: string | null
          upline_email?: string | null
          upline_user_id?: string | null
        }
        Update: {
          actor_uid?: string | null
          band_id?: string
          created_at?: string
          direction?: string
          id?: number
          note?: string | null
          reason?: string
          recipient_email?: string | null
          recipient_name?: string | null
          upline_email?: string | null
          upline_user_id?: string | null
        }
        Relationships: []
      }
      band_ownership_events: {
        Row: {
          actor_uid: string | null
          band_id: string
          changed_at: string
          id: number
          new_owner_id: string | null
          old_owner_id: string | null
        }
        Insert: {
          actor_uid?: string | null
          band_id: string
          changed_at?: string
          id?: number
          new_owner_id?: string | null
          old_owner_id?: string | null
        }
        Update: {
          actor_uid?: string | null
          band_id?: string
          changed_at?: string
          id?: number
          new_owner_id?: string | null
          old_owner_id?: string | null
        }
        Relationships: []
      }
      band_themes: {
        Row: {
          created_at: string | null
          data: Json
          is_builtin: boolean
          key: string
          label: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json
          is_builtin?: boolean
          key: string
          label: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          is_builtin?: boolean
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      band_transfers: {
        Row: {
          band_id: string | null
          completed_at: string | null
          created_at: string | null
          from_name: string | null
          from_user_id: string | null
          id: string
          note: string | null
          recipient_name: string | null
          status: string | null
        }
        Insert: {
          band_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          from_name?: string | null
          from_user_id?: string | null
          id?: string
          note?: string | null
          recipient_name?: string | null
          status?: string | null
        }
        Update: {
          band_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          from_name?: string | null
          from_user_id?: string | null
          id?: string
          note?: string | null
          recipient_name?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "band_transfers_band_id_fkey"
            columns: ["band_id"]
            isOneToOne: false
            referencedRelation: "bands"
            referencedColumns: ["band_id"]
          },
          {
            foreignKeyName: "band_transfers_band_id_fkey"
            columns: ["band_id"]
            isOneToOne: false
            referencedRelation: "sellable_bands"
            referencedColumns: ["band_id"]
          },
        ]
      }
      bands: {
        Row: {
          band_id: string
          batch: string | null
          color: string | null
          created_at: string | null
          created_date: string | null
          dedication_note: string | null
          dedication_recipient: string | null
          dedication_token: string | null
          dedication_updated_at: string | null
          dedication_viewed: boolean | null
          id: number
          inside_text: string | null
          nfc_url: string | null
          org_id: string | null
          outside_text: string | null
          owner_id: string | null
          size: string | null
          status: string | null
          tap_secret_enc: string | null
          tap_secret_hash: string | null
          theme: string | null
          upline_email: string | null
          upline_user_id: string | null
        }
        Insert: {
          band_id: string
          batch?: string | null
          color?: string | null
          created_at?: string | null
          created_date?: string | null
          dedication_note?: string | null
          dedication_recipient?: string | null
          dedication_token?: string | null
          dedication_updated_at?: string | null
          dedication_viewed?: boolean | null
          id?: number
          inside_text?: string | null
          nfc_url?: string | null
          org_id?: string | null
          outside_text?: string | null
          owner_id?: string | null
          size?: string | null
          status?: string | null
          tap_secret_enc?: string | null
          tap_secret_hash?: string | null
          theme?: string | null
          upline_email?: string | null
          upline_user_id?: string | null
        }
        Update: {
          band_id?: string
          batch?: string | null
          color?: string | null
          created_at?: string | null
          created_date?: string | null
          dedication_note?: string | null
          dedication_recipient?: string | null
          dedication_token?: string | null
          dedication_updated_at?: string | null
          dedication_viewed?: boolean | null
          id?: number
          inside_text?: string | null
          nfc_url?: string | null
          org_id?: string | null
          outside_text?: string | null
          owner_id?: string | null
          size?: string | null
          status?: string | null
          tap_secret_enc?: string | null
          tap_secret_hash?: string | null
          theme?: string | null
          upline_email?: string | null
          upline_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bands_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bands_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bands_upline_user_id_fkey"
            columns: ["upline_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chain_prayers: {
        Row: {
          band_id: string
          id: number
          prayer_text: string
          requester_name: string | null
          requester_user_id: string | null
          sender_city: string | null
          sender_contact: string | null
          sender_contact_type: string | null
          sender_country: string | null
          sent_at: string | null
          targets: Json | null
        }
        Insert: {
          band_id: string
          id?: number
          prayer_text: string
          requester_name?: string | null
          requester_user_id?: string | null
          sender_city?: string | null
          sender_contact?: string | null
          sender_contact_type?: string | null
          sender_country?: string | null
          sent_at?: string | null
          targets?: Json | null
        }
        Update: {
          band_id?: string
          id?: number
          prayer_text?: string
          requester_name?: string | null
          requester_user_id?: string | null
          sender_city?: string | null
          sender_contact?: string | null
          sender_contact_type?: string | null
          sender_country?: string | null
          sent_at?: string | null
          targets?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chain_prayers_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_intercessions: {
        Row: {
          created_at: string | null
          id: string
          request_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          request_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_intercessions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "circle_prayer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_members: {
        Row: {
          circle_id: string
          id: string
          joined_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          circle_id: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          circle_id?: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "prayer_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_prayer_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          request_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          request_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_prayer_replies_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "circle_prayer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_prayer_requests: {
        Row: {
          answered_at: string | null
          circle_id: string
          created_at: string | null
          id: string
          is_answered: boolean | null
          kind: string
          request_text: string
          title: string | null
          user_id: string
        }
        Insert: {
          answered_at?: string | null
          circle_id: string
          created_at?: string | null
          id?: string
          is_answered?: boolean | null
          kind?: string
          request_text: string
          title?: string | null
          user_id: string
        }
        Update: {
          answered_at?: string | null
          circle_id?: string
          created_at?: string | null
          id?: string
          is_answered?: boolean | null
          kind?: string
          request_text?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_prayer_requests_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "prayer_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          admin_notes: string | null
          category: string
          created_at: string | null
          email: string
          faq_candidate: boolean | null
          id: string
          ip_address: unknown
          message: string
          name: string
          recaptcha_score: number | null
          status: string
          subject: string | null
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          admin_notes?: string | null
          category: string
          created_at?: string | null
          email: string
          faq_candidate?: boolean | null
          id?: string
          ip_address?: unknown
          message: string
          name: string
          recaptcha_score?: number | null
          status?: string
          subject?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          admin_notes?: string | null
          category?: string
          created_at?: string | null
          email?: string
          faq_candidate?: boolean | null
          id?: string
          ip_address?: unknown
          message?: string
          name?: string
          recaptcha_score?: number | null
          status?: string
          subject?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          created_at: string
          delta_cents: number
          expires_at: string | null
          id: number
          note: string | null
          order_id: number | null
          parent_id: number | null
          reason: string
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta_cents: number
          expires_at?: string | null
          id?: number
          note?: string | null
          order_id?: number | null
          parent_id?: number | null
          reason: string
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta_cents?: number
          expires_at?: string | null
          id?: number
          note?: string | null
          order_id?: number | null
          parent_id?: number | null
          reason?: string
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "credit_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_entries: {
        Row: {
          answer: string
          category: string | null
          created_at: string | null
          deflection_count: number | null
          id: string
          published: boolean | null
          question: string
          sort_order: number | null
          source_submission_id: string | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string | null
          deflection_count?: number | null
          id?: string
          published?: boolean | null
          question: string
          sort_order?: number | null
          source_submission_id?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string | null
          deflection_count?: number | null
          id?: string
          published?: boolean | null
          question?: string
          sort_order?: number | null
          source_submission_id?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "faq_entries_source_submission_id_fkey"
            columns: ["source_submission_id"]
            isOneToOne: false
            referencedRelation: "contact_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      integrity_alerts: {
        Row: {
          detail: Json
          first_seen: string
          key: string
          kind: string
          last_seen: string
          notified_at: string | null
          resolved_at: string | null
        }
        Insert: {
          detail?: Json
          first_seen?: string
          key: string
          kind: string
          last_seen?: string
          notified_at?: string | null
          resolved_at?: string | null
        }
        Update: {
          detail?: Json
          first_seen?: string
          key?: string
          kind?: string
          last_seen?: string
          notified_at?: string | null
          resolved_at?: string | null
        }
        Relationships: []
      }
      journal_lists: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_lists_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_bands: {
        Row: {
          band_id: string | null
          color: string | null
          created_at: string | null
          custom_message: string | null
          id: number
          order_id: number | null
          status: string | null
          type: string | null
          verse: string | null
        }
        Insert: {
          band_id?: string | null
          color?: string | null
          created_at?: string | null
          custom_message?: string | null
          id?: number
          order_id?: number | null
          status?: string | null
          type?: string | null
          verse?: string | null
        }
        Update: {
          band_id?: string | null
          color?: string | null
          created_at?: string | null
          custom_message?: string | null
          id?: number
          order_id?: number | null
          status?: string | null
          type?: string | null
          verse?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_bands_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_total: number | null
          assigned_band_ids: string[] | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          has_custom_bands: boolean | null
          id: number
          order_metadata: Json | null
          org_id: string | null
          payment_status: string | null
          shipping_address: Json | null
          status: string | null
          stripe_session_id: string | null
          tracking_number: string | null
        }
        Insert: {
          amount_total?: number | null
          assigned_band_ids?: string[] | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          has_custom_bands?: boolean | null
          id?: number
          order_metadata?: Json | null
          org_id?: string | null
          payment_status?: string | null
          shipping_address?: Json | null
          status?: string | null
          stripe_session_id?: string | null
          tracking_number?: string | null
        }
        Update: {
          amount_total?: number | null
          assigned_band_ids?: string[] | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          has_custom_bands?: boolean | null
          id?: number
          order_metadata?: Json | null
          org_id?: string | null
          payment_status?: string | null
          shipping_address?: Json | null
          status?: string | null
          stripe_session_id?: string | null
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_applications: {
        Row: {
          created_at: string
          email: string
          id: string
          location: string | null
          name: string
          note: string | null
          org_id: string | null
          pastor: string
          prefix: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subdomain: string
          website: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          location?: string | null
          name: string
          note?: string | null
          org_id?: string | null
          pastor: string
          prefix: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subdomain: string
          website?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          location?: string | null
          name?: string
          note?: string | null
          org_id?: string | null
          pastor?: string
          prefix?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subdomain?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_applications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          display_name: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          org_id: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id: string
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          admin_id: string | null
          color: string | null
          created_at: string | null
          default_theme: string | null
          id: string
          location: string | null
          logo_url: string | null
          name: string
          plan: string | null
          prefix: string
          subdomain: string
          website: string | null
        }
        Insert: {
          admin_id?: string | null
          color?: string | null
          created_at?: string | null
          default_theme?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name: string
          plan?: string | null
          prefix: string
          subdomain: string
          website?: string | null
        }
        Update: {
          admin_id?: string | null
          color?: string | null
          created_at?: string | null
          default_theme?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name?: string
          plan?: string | null
          prefix?: string
          subdomain?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_group_members: {
        Row: {
          added_at: string
          group_id: string
          member_id: string
        }
        Insert: {
          added_at?: string
          group_id: string
          member_id: string
        }
        Update: {
          added_at?: string
          group_id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "partner_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_group_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_acknowledgments: {
        Row: {
          acknowledged_at: string | null
          acknowledger_email: string | null
          acknowledger_name: string | null
          chain_prayer_id: number | null
          id: number
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledger_email?: string | null
          acknowledger_name?: string | null
          chain_prayer_id?: number | null
          id?: number
        }
        Update: {
          acknowledged_at?: string | null
          acknowledger_email?: string | null
          acknowledger_name?: string | null
          chain_prayer_id?: number | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "prayer_acknowledgments_chain_prayer_id_fkey"
            columns: ["chain_prayer_id"]
            isOneToOne: false
            referencedRelation: "chain_prayers"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_circles: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_closed: boolean | null
          join_code: string
          name: string
          qualifying_band_id: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_closed?: boolean | null
          join_code: string
          name: string
          qualifying_band_id?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_closed?: boolean | null
          join_code?: string
          name?: string
          qualifying_band_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prayer_circles_qualifying_band_id_fkey"
            columns: ["qualifying_band_id"]
            isOneToOne: false
            referencedRelation: "bands"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_email_optouts: {
        Row: {
          created_at: string | null
          email: string
          id: string
          sender_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          sender_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          sender_user_id?: string | null
        }
        Relationships: []
      }
      prayer_encouragements: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          note: string | null
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          note?: string | null
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          note?: string | null
          to_user_id?: string
        }
        Relationships: []
      }
      prayer_intercessions: {
        Row: {
          id: string
          intercessor_id: string
          prayed_at: string | null
          request_id: string
        }
        Insert: {
          id?: string
          intercessor_id: string
          prayed_at?: string | null
          request_id: string
        }
        Update: {
          id?: string
          intercessor_id?: string
          prayed_at?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_intercessions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "prayer_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_intercessions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "prayer_requests_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_mutes: {
        Row: {
          created_at: string
          muted_id: string
          muter_id: string
        }
        Insert: {
          created_at?: string
          muted_id: string
          muter_id: string
        }
        Update: {
          created_at?: string
          muted_id?: string
          muter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_mutes_muted_id_fkey"
            columns: ["muted_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_mutes_muter_id_fkey"
            columns: ["muter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_network_connections: {
        Row: {
          band_id: string | null
          created_at: string | null
          id: string
          recipient_id: string
          requester_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          band_id?: string | null
          created_at?: string | null
          id?: string
          recipient_id: string
          requester_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          band_id?: string | null
          created_at?: string | null
          id?: string
          recipient_id?: string
          requester_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      prayer_network_intercessions: {
        Row: {
          created_at: string | null
          id: string
          request_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          request_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_network_intercessions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "prayer_network_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_network_requests: {
        Row: {
          allow_comments: boolean
          answered_at: string | null
          audience: string
          created_at: string | null
          excluded_user_ids: string[]
          id: string
          is_answered: boolean | null
          list_id: string | null
          public_name: string | null
          request_text: string
          user_id: string
          visibility: string
        }
        Insert: {
          allow_comments?: boolean
          answered_at?: string | null
          audience?: string
          created_at?: string | null
          excluded_user_ids?: string[]
          id?: string
          is_answered?: boolean | null
          list_id?: string | null
          public_name?: string | null
          request_text: string
          user_id: string
          visibility?: string
        }
        Update: {
          allow_comments?: boolean
          answered_at?: string | null
          audience?: string
          created_at?: string | null
          excluded_user_ids?: string[]
          id?: string
          is_answered?: boolean | null
          list_id?: string | null
          public_name?: string | null
          request_text?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_network_requests_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "journal_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_request_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          request_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          request_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_request_comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "prayer_network_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_request_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_requests: {
        Row: {
          answered_at: string | null
          answered_testimony: string | null
          band_id: string | null
          body: string | null
          created_at: string | null
          id: string
          status: string | null
          testimony_public: boolean | null
          title: string
          updated_at: string | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          answered_at?: string | null
          answered_testimony?: string | null
          band_id?: string | null
          body?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          testimony_public?: boolean | null
          title: string
          updated_at?: string | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          answered_at?: string | null
          answered_testimony?: string | null
          band_id?: string | null
          body?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          testimony_public?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prayer_requests_band_id_fkey"
            columns: ["band_id"]
            isOneToOne: false
            referencedRelation: "bands"
            referencedColumns: ["band_id"]
          },
          {
            foreignKeyName: "prayer_requests_band_id_fkey"
            columns: ["band_id"]
            isOneToOne: false
            referencedRelation: "sellable_bands"
            referencedColumns: ["band_id"]
          },
        ]
      }
      product_variants: {
        Row: {
          backorder: boolean
          id: string
          product_id: string
          size: string
          stock: number
        }
        Insert: {
          backorder?: boolean
          id?: string
          product_id: string
          size?: string
          stock?: number
        }
        Update: {
          backorder?: boolean
          id?: string
          product_id?: string
          size?: string
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          bands_per_unit: number
          category: string
          color: string | null
          created_at: string | null
          description: string | null
          discount_tiers: Json
          features: Json | null
          has_sizes: boolean | null
          icon: string | null
          id: string
          image_urls: Json | null
          multi_discount: boolean | null
          name: string
          price_cents: number
          sizes: Json | null
          slug: string
          sort_order: number | null
          tag: string | null
          theme: string | null
        }
        Insert: {
          active?: boolean | null
          bands_per_unit?: number
          category?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          discount_tiers?: Json
          features?: Json | null
          has_sizes?: boolean | null
          icon?: string | null
          id?: string
          image_urls?: Json | null
          multi_discount?: boolean | null
          name: string
          price_cents?: number
          sizes?: Json | null
          slug: string
          sort_order?: number | null
          tag?: string | null
          theme?: string | null
        }
        Update: {
          active?: boolean | null
          bands_per_unit?: number
          category?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          discount_tiers?: Json
          features?: Json | null
          has_sizes?: boolean | null
          icon?: string | null
          id?: string
          image_urls?: Json | null
          multi_discount?: boolean | null
          name?: string
          price_cents?: number
          sizes?: Json | null
          slug?: string
          sort_order?: number | null
          tag?: string | null
          theme?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_font: string | null
          avatar_icon: string | null
          avatar_initials: string | null
          avatar_url: string | null
          connect_code: string
          created_at: string | null
          default_band_id: string | null
          dismissed_notifications: Json | null
          email: string | null
          email_notifications: boolean | null
          full_name: string | null
          id: string
          master_id: string | null
          notifications_last_seen: string | null
          org_id: string | null
          referral_code: string | null
          referral_reward_code: string | null
          team_role: string | null
          upline_band_id: string | null
          upline_user_id: string | null
        }
        Insert: {
          avatar_font?: string | null
          avatar_icon?: string | null
          avatar_initials?: string | null
          avatar_url?: string | null
          connect_code?: string
          created_at?: string | null
          default_band_id?: string | null
          dismissed_notifications?: Json | null
          email?: string | null
          email_notifications?: boolean | null
          full_name?: string | null
          id: string
          master_id?: string | null
          notifications_last_seen?: string | null
          org_id?: string | null
          referral_code?: string | null
          referral_reward_code?: string | null
          team_role?: string | null
          upline_band_id?: string | null
          upline_user_id?: string | null
        }
        Update: {
          avatar_font?: string | null
          avatar_icon?: string | null
          avatar_initials?: string | null
          avatar_url?: string | null
          connect_code?: string
          created_at?: string | null
          default_band_id?: string | null
          dismissed_notifications?: Json | null
          email?: string | null
          email_notifications?: boolean | null
          full_name?: string | null
          id?: string
          master_id?: string | null
          notifications_last_seen?: string | null
          org_id?: string | null
          referral_code?: string | null
          referral_reward_code?: string | null
          team_role?: string | null
          upline_band_id?: string | null
          upline_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_upline_user_id_fkey"
            columns: ["upline_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          failed_at: string | null
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          failed_at?: string | null
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          failed_at?: string | null
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string | null
          credit_cents: number | null
          earned_at: string | null
          id: string
          order_id: number | null
          referee_discount_applied: boolean | null
          referred_user_id: string | null
          referrer_reward_issued: boolean | null
          referrer_stripe_coupon_id: string | null
          referrer_user_id: string
          status: string
          stripe_session_id: string | null
        }
        Insert: {
          converted_at?: string | null
          created_at?: string | null
          credit_cents?: number | null
          earned_at?: string | null
          id?: string
          order_id?: number | null
          referee_discount_applied?: boolean | null
          referred_user_id?: string | null
          referrer_reward_issued?: boolean | null
          referrer_stripe_coupon_id?: string | null
          referrer_user_id: string
          status?: string
          stripe_session_id?: string | null
        }
        Update: {
          converted_at?: string | null
          created_at?: string | null
          credit_cents?: number | null
          earned_at?: string | null
          id?: string
          order_id?: number | null
          referee_discount_applied?: boolean | null
          referred_user_id?: string | null
          referrer_reward_issued?: boolean | null
          referrer_stripe_coupon_id?: string | null
          referrer_user_id?: string
          status?: string
          stripe_session_id?: string | null
        }
        Relationships: []
      }
      registrations: {
        Row: {
          band_id: string
          city: string | null
          country: string | null
          email: string | null
          flagged: boolean | null
          flagged_reason: string | null
          id: number
          ip_address: string | null
          latitude: number | null
          longitude: number | null
          prayer: string | null
          registered_at: string | null
          registered_by: string | null
          source: string
          state: string | null
          user_id: string | null
          user_name: string | null
          verse: string | null
        }
        Insert: {
          band_id: string
          city?: string | null
          country?: string | null
          email?: string | null
          flagged?: boolean | null
          flagged_reason?: string | null
          id?: number
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          prayer?: string | null
          registered_at?: string | null
          registered_by?: string | null
          source?: string
          state?: string | null
          user_id?: string | null
          user_name?: string | null
          verse?: string | null
        }
        Update: {
          band_id?: string
          city?: string | null
          country?: string | null
          email?: string | null
          flagged?: boolean | null
          flagged_reason?: string | null
          id?: number
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          prayer?: string | null
          registered_at?: string | null
          registered_by?: string | null
          source?: string
          state?: string | null
          user_id?: string | null
          user_name?: string | null
          verse?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_registrations_band_id"
            columns: ["band_id"]
            isOneToOne: false
            referencedRelation: "bands"
            referencedColumns: ["band_id"]
          },
          {
            foreignKeyName: "fk_registrations_band_id"
            columns: ["band_id"]
            isOneToOne: false
            referencedRelation: "sellable_bands"
            referencedColumns: ["band_id"]
          },
          {
            foreignKeyName: "registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_config: {
        Row: {
          key: string
          label: string | null
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          label?: string | null
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          label?: string | null
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          band_price: number
          bands_per_cycle: number
          created_at: string | null
          discount_percent: number
          id: string
          interval_months: number
          is_active: boolean
          name: string
          shipping_price: number
          stripe_price_id: string | null
          total_price: number
        }
        Insert: {
          band_price: number
          bands_per_cycle?: number
          created_at?: string | null
          discount_percent?: number
          id: string
          interval_months?: number
          is_active?: boolean
          name: string
          shipping_price?: number
          stripe_price_id?: string | null
          total_price: number
        }
        Update: {
          band_price?: number
          bands_per_cycle?: number
          created_at?: string | null
          discount_percent?: number
          id?: string
          interval_months?: number
          is_active?: boolean
          name?: string
          shipping_price?: number
          stripe_price_id?: string | null
          total_price?: number
        }
        Relationships: []
      }
      subscription_shipments: {
        Row: {
          band_color: string
          band_design: string | null
          band_ids: string[] | null
          bands_quantity: number
          created_at: string | null
          dedication_note: string | null
          dedication_recipient: string | null
          delivered_at: string | null
          id: string
          shipped_at: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_line1: string | null
          shipping_line2: string | null
          shipping_name: string | null
          shipping_state: string | null
          shipping_zip: string | null
          status: string
          stripe_invoice_id: string | null
          subscription_id: string
          tracking_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          band_color: string
          band_design?: string | null
          band_ids?: string[] | null
          bands_quantity?: number
          created_at?: string | null
          dedication_note?: string | null
          dedication_recipient?: string | null
          delivered_at?: string | null
          id?: string
          shipped_at?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_line1?: string | null
          shipping_line2?: string | null
          shipping_name?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id: string
          tracking_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          band_color?: string
          band_design?: string | null
          band_ids?: string[] | null
          bands_quantity?: number
          created_at?: string | null
          dedication_note?: string | null
          dedication_recipient?: string | null
          delivered_at?: string | null
          id?: string
          shipped_at?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_line1?: string | null
          shipping_line2?: string | null
          shipping_name?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id?: string
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_shipments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_shipments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          band_color: string
          band_design: string | null
          band_size: string
          cancel_at_period_end: boolean
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          next_ship_date: string | null
          plan_id: string
          shipping_city: string | null
          shipping_country: string | null
          shipping_line1: string | null
          shipping_line2: string | null
          shipping_name: string | null
          shipping_state: string | null
          shipping_zip: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          band_color?: string
          band_design?: string | null
          band_size?: string
          cancel_at_period_end?: boolean
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          next_ship_date?: string | null
          plan_id: string
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_line1?: string | null
          shipping_line2?: string | null
          shipping_name?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          band_color?: string
          band_design?: string | null
          band_size?: string
          cancel_at_period_end?: boolean
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          next_ship_date?: string | null
          plan_id?: string
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_line1?: string | null
          shipping_line2?: string | null
          shipping_name?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verse_walks: {
        Row: {
          last_seen: string | null
          run: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          last_seen?: string | null
          run?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          last_seen?: string | null
          run?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      prayer_requests_with_counts: {
        Row: {
          answered_at: string | null
          answered_testimony: string | null
          body: string | null
          created_at: string | null
          id: string | null
          intercessions_this_week: number | null
          intercessions_today: number | null
          status: string | null
          title: string | null
          total_intercessions: number | null
          updated_at: string | null
          user_id: string | null
          visibility: string | null
        }
        Relationships: []
      }
      sellable_bands: {
        Row: {
          band_id: string | null
          color: string | null
          org_id: string | null
          owner_id: string | null
          size: string | null
          status: string | null
          theme: string | null
        }
        Insert: {
          band_id?: string | null
          color?: string | null
          org_id?: string | null
          owner_id?: string | null
          size?: string | null
          status?: string | null
          theme?: string | null
        }
        Update: {
          band_id?: string | null
          color?: string | null
          org_id?: string | null
          owner_id?: string | null
          size?: string | null
          status?: string | null
          theme?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bands_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bands_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      downline_of: {
        Args: { max_depth?: number; root: string }
        Returns: {
          depth: number
          user_id: string
        }[]
      }
      expire_credit: { Args: { p_user: string }; Returns: undefined }
      gen_connect_code: { Args: never; Returns: string }
      gen_referral_code: { Args: never; Returns: string }
      get_org_lineage: {
        Args: { org_uuid: string }
        Returns: {
          band_id: string
          countries: number
          first_holder: string
          latest_country: string
          latest_date: string
          prayers: number
          total_holders: number
        }[]
      }
      get_org_stats: { Args: { org_uuid: string }; Returns: Json }
      is_circle_member: { Args: { p_circle: string }; Returns: boolean }
      new_referral_code: { Args: never; Returns: string }
      schema_dump: { Args: never; Returns: string }
      stalled_signups: {
        Args: never
        Returns: {
          age: string
          created_at: string
          email: string
          id: string
        }[]
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
    Enums: {},
  },
} as const
