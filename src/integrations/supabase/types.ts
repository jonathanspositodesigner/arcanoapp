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
      abandoned_checkouts: {
        Row: {
          abandoned_at: string | null
          amount: number | null
          auto_remarketing_attempts: number | null
          checkout_link: string | null
          checkout_step: number | null
          contacted_at: string | null
          contacted_by: string | null
          cpf: string | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          notes: string | null
          offer_hash: string | null
          offer_name: string | null
          phone: string | null
          platform: string | null
          product_id: number | null
          product_name: string | null
          remarketing_email_sent_at: string | null
          remarketing_status: string | null
          updated_at: string | null
        }
        Insert: {
          abandoned_at?: string | null
          amount?: number | null
          auto_remarketing_attempts?: number | null
          checkout_link?: string | null
          checkout_step?: number | null
          contacted_at?: string | null
          contacted_by?: string | null
          cpf?: string | null
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          notes?: string | null
          offer_hash?: string | null
          offer_name?: string | null
          phone?: string | null
          platform?: string | null
          product_id?: number | null
          product_name?: string | null
          remarketing_email_sent_at?: string | null
          remarketing_status?: string | null
          updated_at?: string | null
        }
        Update: {
          abandoned_at?: string | null
          amount?: number | null
          auto_remarketing_attempts?: number | null
          checkout_link?: string | null
          checkout_step?: number | null
          contacted_at?: string | null
          contacted_by?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          notes?: string | null
          offer_hash?: string | null
          offer_name?: string | null
          phone?: string | null
          platform?: string | null
          product_id?: number | null
          product_name?: string | null
          remarketing_email_sent_at?: string | null
          remarketing_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_arte_collection_items: {
        Row: {
          arte_id: string
          arte_type: string
          collection_id: string
          created_at: string
          id: string
          item_order: number
        }
        Insert: {
          arte_id: string
          arte_type?: string
          collection_id: string
          created_at?: string
          id?: string
          item_order?: number
        }
        Update: {
          arte_id?: string
          arte_type?: string
          collection_id?: string
          created_at?: string
          id?: string
          item_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "admin_arte_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "admin_arte_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_arte_collections: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_artes: {
        Row: {
          ai_prompt: string | null
          ai_reference_image_url: string | null
          bonus_clicks: number
          canva_link: string | null
          category: string
          created_at: string | null
          description: string | null
          download_url: string | null
          drive_link: string | null
          id: string
          image_url: string
          is_ai_generated: boolean | null
          is_premium: boolean
          motion_type: string | null
          pack: string | null
          platform: string | null
          title: string
          tutorial_url: string | null
          updated_at: string | null
        }
        Insert: {
          ai_prompt?: string | null
          ai_reference_image_url?: string | null
          bonus_clicks?: number
          canva_link?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          download_url?: string | null
          drive_link?: string | null
          id?: string
          image_url: string
          is_ai_generated?: boolean | null
          is_premium?: boolean
          motion_type?: string | null
          pack?: string | null
          platform?: string | null
          title: string
          tutorial_url?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_prompt?: string | null
          ai_reference_image_url?: string | null
          bonus_clicks?: number
          canva_link?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          download_url?: string | null
          drive_link?: string | null
          id?: string
          image_url?: string
          is_ai_generated?: boolean | null
          is_premium?: boolean
          motion_type?: string | null
          pack?: string | null
          platform?: string | null
          title?: string
          tutorial_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_collection_items: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          item_order: number
          prompt_id: string
          prompt_type: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          item_order?: number
          prompt_id: string
          prompt_type?: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          item_order?: number
          prompt_id?: string
          prompt_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "admin_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_collections: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_goals: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string
          id: string
          is_completed: boolean
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          is_completed?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          is_completed?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_prompts: {
        Row: {
          bonus_clicks: number
          category: string
          created_at: string | null
          gender: string | null
          id: string
          image_url: string
          is_premium: boolean
          prompt: string
          reference_images: string[] | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          tutorial_url: string | null
          updated_at: string | null
        }
        Insert: {
          bonus_clicks?: number
          category: string
          created_at?: string | null
          gender?: string | null
          id?: string
          image_url: string
          is_premium?: boolean
          prompt: string
          reference_images?: string[] | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          tutorial_url?: string | null
          updated_at?: string | null
        }
        Update: {
          bonus_clicks?: number
          category?: string
          created_at?: string | null
          gender?: string | null
          id?: string
          image_url?: string
          is_premium?: boolean
          prompt?: string
          reference_images?: string[] | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          tutorial_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_trusted_devices: {
        Row: {
          created_at: string | null
          device_fingerprint: string
          device_name: string | null
          id: string
          last_used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_fingerprint: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_verification_codes: {
        Row: {
          code: string
          created_at: string | null
          device_fingerprint: string
          expires_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          device_fingerprint: string
          expires_at: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          device_fingerprint?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      app_installations: {
        Row: {
          device_type: string
          id: string
          installed_at: string
          user_agent: string | null
        }
        Insert: {
          device_type: string
          id?: string
          installed_at?: string
          user_agent?: string | null
        }
        Update: {
          device_type?: string
          id?: string
          installed_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          id: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      arcano_cloner_jobs: {
        Row: {
          api_account: string
          aspect_ratio: string | null
          completed_at: string | null
          created_at: string | null
          credits_charged: boolean | null
          credits_refunded: boolean | null
          current_step: string | null
          error_message: string | null
          failed_at_step: string | null
          id: string
          job_payload: Json | null
          output_url: string | null
          position: number | null
          queue_wait_seconds: number | null
          raw_api_response: Json | null
          raw_webhook_payload: Json | null
          reference_file_name: string | null
          reference_image_url: string | null
          rh_cost: number | null
          session_id: string
          started_at: string | null
          status: string
          step_history: Json | null
          task_id: string | null
          thumbnail_url: string | null
          user_credit_cost: number | null
          user_file_name: string | null
          user_id: string | null
          user_image_url: string | null
          waited_in_queue: boolean | null
        }
        Insert: {
          api_account?: string
          aspect_ratio?: string | null
          completed_at?: string | null
          created_at?: string | null
          credits_charged?: boolean | null
          credits_refunded?: boolean | null
          current_step?: string | null
          error_message?: string | null
          failed_at_step?: string | null
          id?: string
          job_payload?: Json | null
          output_url?: string | null
          position?: number | null
          queue_wait_seconds?: number | null
          raw_api_response?: Json | null
          raw_webhook_payload?: Json | null
          reference_file_name?: string | null
          reference_image_url?: string | null
          rh_cost?: number | null
          session_id: string
          started_at?: string | null
          status?: string
          step_history?: Json | null
          task_id?: string | null
          thumbnail_url?: string | null
          user_credit_cost?: number | null
          user_file_name?: string | null
          user_id?: string | null
          user_image_url?: string | null
          waited_in_queue?: boolean | null
        }
        Update: {
          api_account?: string
          aspect_ratio?: string | null
          completed_at?: string | null
          created_at?: string | null
          credits_charged?: boolean | null
          credits_refunded?: boolean | null
          current_step?: string | null
          error_message?: string | null
          failed_at_step?: string | null
          id?: string
          job_payload?: Json | null
          output_url?: string | null
          position?: number | null
          queue_wait_seconds?: number | null
          raw_api_response?: Json | null
          raw_webhook_payload?: Json | null
          reference_file_name?: string | null
          reference_image_url?: string | null
          rh_cost?: number | null
          session_id?: string
          started_at?: string | null
          status?: string
          step_history?: Json | null
          task_id?: string | null
          thumbnail_url?: string | null
          user_credit_cost?: number | null
          user_file_name?: string | null
          user_id?: string | null
          user_image_url?: string | null
          waited_in_queue?: boolean | null
        }
        Relationships: []
      }
      arte_clicks: {
        Row: {
          arte_id: string
          arte_title: string
          click_type: string
          clicked_at: string
          id: string
          is_admin_arte: boolean
        }
        Insert: {
          arte_id: string
          arte_title: string
          click_type?: string
          clicked_at?: string
          id?: string
          is_admin_arte?: boolean
        }
        Update: {
          arte_id?: string
          arte_title?: string
          click_type?: string
          clicked_at?: string
          id?: string
          is_admin_arte?: boolean
        }
        Relationships: []
      }
      artes_banners: {
        Row: {
          button_link: string
          button_text: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          mobile_image_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          button_link: string
          button_text?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          mobile_image_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          button_link?: string
          button_text?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          mobile_image_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      artes_bonus_content: {
        Row: {
          content_type: string
          content_url: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          content_type?: string
          content_url: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          content_type?: string
          content_url?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      artes_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      artes_categories_musicos: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      artes_packs: {
        Row: {
          checkout_link_1_ano: string | null
          checkout_link_6_meses: string | null
          checkout_link_latam_1_ano: string | null
          checkout_link_latam_6_meses: string | null
          checkout_link_latam_membro_1_ano: string | null
          checkout_link_latam_membro_6_meses: string | null
          checkout_link_latam_membro_vitalicio: string | null
          checkout_link_latam_promo_1_ano: string | null
          checkout_link_latam_promo_6_meses: string | null
          checkout_link_latam_promo_vitalicio: string | null
          checkout_link_latam_renovacao_1_ano: string | null
          checkout_link_latam_renovacao_6_meses: string | null
          checkout_link_latam_renovacao_vitalicio: string | null
          checkout_link_latam_vitalicio: string | null
          checkout_link_membro_1_ano: string | null
          checkout_link_membro_6_meses: string | null
          checkout_link_membro_vitalicio: string | null
          checkout_link_notif_1_ano: string | null
          checkout_link_notif_6_meses: string | null
          checkout_link_notif_vitalicio: string | null
          checkout_link_promo_1_ano: string | null
          checkout_link_promo_6_meses: string | null
          checkout_link_promo_vitalicio: string | null
          checkout_link_renovacao_1_ano: string | null
          checkout_link_renovacao_6_meses: string | null
          checkout_link_renovacao_vitalicio: string | null
          checkout_link_vitalicio: string | null
          cover_url: string | null
          created_at: string
          display_order: number
          download_url: string | null
          enabled_1_ano: boolean | null
          enabled_6_meses: boolean | null
          enabled_vitalicio: boolean | null
          greenn_product_id_1_ano: number | null
          greenn_product_id_6_meses: number | null
          greenn_product_id_order_bump: number | null
          greenn_product_id_vitalicio: number | null
          hotmart_product_id_vitalicio: string | null
          id: string
          is_visible: boolean
          name: string
          notification_discount_enabled: boolean | null
          notification_discount_percent: number | null
          platform: string | null
          price_1_ano: number | null
          price_1_ano_usd: number | null
          price_6_meses: number | null
          price_6_meses_usd: number | null
          price_vitalicio: number | null
          price_vitalicio_usd: number | null
          slug: string
          tool_versions: Json | null
          tutorial_lessons: Json | null
          type: string
          updated_at: string
        }
        Insert: {
          checkout_link_1_ano?: string | null
          checkout_link_6_meses?: string | null
          checkout_link_latam_1_ano?: string | null
          checkout_link_latam_6_meses?: string | null
          checkout_link_latam_membro_1_ano?: string | null
          checkout_link_latam_membro_6_meses?: string | null
          checkout_link_latam_membro_vitalicio?: string | null
          checkout_link_latam_promo_1_ano?: string | null
          checkout_link_latam_promo_6_meses?: string | null
          checkout_link_latam_promo_vitalicio?: string | null
          checkout_link_latam_renovacao_1_ano?: string | null
          checkout_link_latam_renovacao_6_meses?: string | null
          checkout_link_latam_renovacao_vitalicio?: string | null
          checkout_link_latam_vitalicio?: string | null
          checkout_link_membro_1_ano?: string | null
          checkout_link_membro_6_meses?: string | null
          checkout_link_membro_vitalicio?: string | null
          checkout_link_notif_1_ano?: string | null
          checkout_link_notif_6_meses?: string | null
          checkout_link_notif_vitalicio?: string | null
          checkout_link_promo_1_ano?: string | null
          checkout_link_promo_6_meses?: string | null
          checkout_link_promo_vitalicio?: string | null
          checkout_link_renovacao_1_ano?: string | null
          checkout_link_renovacao_6_meses?: string | null
          checkout_link_renovacao_vitalicio?: string | null
          checkout_link_vitalicio?: string | null
          cover_url?: string | null
          created_at?: string
          display_order?: number
          download_url?: string | null
          enabled_1_ano?: boolean | null
          enabled_6_meses?: boolean | null
          enabled_vitalicio?: boolean | null
          greenn_product_id_1_ano?: number | null
          greenn_product_id_6_meses?: number | null
          greenn_product_id_order_bump?: number | null
          greenn_product_id_vitalicio?: number | null
          hotmart_product_id_vitalicio?: string | null
          id?: string
          is_visible?: boolean
          name: string
          notification_discount_enabled?: boolean | null
          notification_discount_percent?: number | null
          platform?: string | null
          price_1_ano?: number | null
          price_1_ano_usd?: number | null
          price_6_meses?: number | null
          price_6_meses_usd?: number | null
          price_vitalicio?: number | null
          price_vitalicio_usd?: number | null
          slug: string
          tool_versions?: Json | null
          tutorial_lessons?: Json | null
          type?: string
          updated_at?: string
        }
        Update: {
          checkout_link_1_ano?: string | null
          checkout_link_6_meses?: string | null
          checkout_link_latam_1_ano?: string | null
          checkout_link_latam_6_meses?: string | null
          checkout_link_latam_membro_1_ano?: string | null
          checkout_link_latam_membro_6_meses?: string | null
          checkout_link_latam_membro_vitalicio?: string | null
          checkout_link_latam_promo_1_ano?: string | null
          checkout_link_latam_promo_6_meses?: string | null
          checkout_link_latam_promo_vitalicio?: string | null
          checkout_link_latam_renovacao_1_ano?: string | null
          checkout_link_latam_renovacao_6_meses?: string | null
          checkout_link_latam_renovacao_vitalicio?: string | null
          checkout_link_latam_vitalicio?: string | null
          checkout_link_membro_1_ano?: string | null
          checkout_link_membro_6_meses?: string | null
          checkout_link_membro_vitalicio?: string | null
          checkout_link_notif_1_ano?: string | null
          checkout_link_notif_6_meses?: string | null
          checkout_link_notif_vitalicio?: string | null
          checkout_link_promo_1_ano?: string | null
          checkout_link_promo_6_meses?: string | null
          checkout_link_promo_vitalicio?: string | null
          checkout_link_renovacao_1_ano?: string | null
          checkout_link_renovacao_6_meses?: string | null
          checkout_link_renovacao_vitalicio?: string | null
          checkout_link_vitalicio?: string | null
          cover_url?: string | null
          created_at?: string
          display_order?: number
          download_url?: string | null
          enabled_1_ano?: boolean | null
          enabled_6_meses?: boolean | null
          enabled_vitalicio?: boolean | null
          greenn_product_id_1_ano?: number | null
          greenn_product_id_6_meses?: number | null
          greenn_product_id_order_bump?: number | null
          greenn_product_id_vitalicio?: number | null
          hotmart_product_id_vitalicio?: string | null
          id?: string
          is_visible?: boolean
          name?: string
          notification_discount_enabled?: boolean | null
          notification_discount_percent?: number | null
          platform?: string | null
          price_1_ano?: number | null
          price_1_ano_usd?: number | null
          price_6_meses?: number | null
          price_6_meses_usd?: number | null
          price_vitalicio?: number | null
          price_vitalicio_usd?: number | null
          slug?: string
          tool_versions?: Json | null
          tutorial_lessons?: Json | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      artes_promotion_items: {
        Row: {
          access_type: Database["public"]["Enums"]["artes_access_type"]
          created_at: string
          id: string
          pack_slug: string
          promotion_id: string
        }
        Insert: {
          access_type: Database["public"]["Enums"]["artes_access_type"]
          created_at?: string
          id?: string
          pack_slug: string
          promotion_id: string
        }
        Update: {
          access_type?: Database["public"]["Enums"]["artes_access_type"]
          created_at?: string
          id?: string
          pack_slug?: string
          promotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artes_promotion_items_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "artes_promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      artes_promotions: {
        Row: {
          created_at: string
          greenn_product_id: number | null
          has_bonus_access: boolean
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          greenn_product_id?: number | null
          has_bonus_access?: boolean
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          greenn_product_id?: number | null
          has_bonus_access?: boolean
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      blacklisted_emails: {
        Row: {
          auto_blocked: boolean | null
          blocked_at: string | null
          email: string
          id: string
          notes: string | null
          reason: string | null
        }
        Insert: {
          auto_blocked?: boolean | null
          blocked_at?: string | null
          email: string
          id?: string
          notes?: string | null
          reason?: string | null
        }
        Update: {
          auto_blocked?: boolean | null
          blocked_at?: string | null
          email?: string
          id?: string
          notes?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      character_generator_jobs: {
        Row: {
          api_account: string
          completed_at: string | null
          created_at: string | null
          credits_charged: boolean | null
          credits_refunded: boolean | null
          current_step: string | null
          error_message: string | null
          failed_at_step: string | null
          front_file_name: string | null
          front_image_url: string | null
          id: string
          job_payload: Json | null
          low_angle_file_name: string | null
          low_angle_image_url: string | null
          output_url: string | null
          position: number | null
          profile_file_name: string | null
          profile_image_url: string | null
          queue_wait_seconds: number | null
          raw_api_response: Json | null
          raw_webhook_payload: Json | null
          rh_cost: number | null
          semi_profile_file_name: string | null
          semi_profile_image_url: string | null
          session_id: string
          started_at: string | null
          status: string
          step_history: Json | null
          task_id: string | null
          thumbnail_url: string | null
          user_credit_cost: number | null
          user_id: string | null
          waited_in_queue: boolean | null
        }
        Insert: {
          api_account?: string
          completed_at?: string | null
          created_at?: string | null
          credits_charged?: boolean | null
          credits_refunded?: boolean | null
          current_step?: string | null
          error_message?: string | null
          failed_at_step?: string | null
          front_file_name?: string | null
          front_image_url?: string | null
          id?: string
          job_payload?: Json | null
          low_angle_file_name?: string | null
          low_angle_image_url?: string | null
          output_url?: string | null
          position?: number | null
          profile_file_name?: string | null
          profile_image_url?: string | null
          queue_wait_seconds?: number | null
          raw_api_response?: Json | null
          raw_webhook_payload?: Json | null
          rh_cost?: number | null
          semi_profile_file_name?: string | null
          semi_profile_image_url?: string | null
          session_id: string
          started_at?: string | null
          status?: string
          step_history?: Json | null
          task_id?: string | null
          thumbnail_url?: string | null
          user_credit_cost?: number | null
          user_id?: string | null
          waited_in_queue?: boolean | null
        }
        Update: {
          api_account?: string
          completed_at?: string | null
          created_at?: string | null
          credits_charged?: boolean | null
          credits_refunded?: boolean | null
          current_step?: string | null
          error_message?: string | null
          failed_at_step?: string | null
          front_file_name?: string | null
          front_image_url?: string | null
          id?: string
          job_payload?: Json | null
          low_angle_file_name?: string | null
          low_angle_image_url?: string | null
          output_url?: string | null
          position?: number | null
          profile_file_name?: string | null
          profile_image_url?: string | null
          queue_wait_seconds?: number | null
          raw_api_response?: Json | null
          raw_webhook_payload?: Json | null
          rh_cost?: number | null
          semi_profile_file_name?: string | null
          semi_profile_image_url?: string | null
          session_id?: string
          started_at?: string | null
          status?: string
          step_history?: Json | null
          task_id?: string | null
          thumbnail_url?: string | null
          user_credit_cost?: number | null
          user_id?: string | null
          waited_in_queue?: boolean | null
        }
        Relationships: []
      }
      collection_views: {
        Row: {
          collection_id: string
          collection_name: string
          collection_slug: string
          device_type: string
          id: string
          user_agent: string | null
          viewed_at: string
        }
        Insert: {
          collection_id: string
          collection_name: string
          collection_slug: string
          device_type?: string
          id?: string
          user_agent?: string | null
          viewed_at?: string
        }
        Update: {
          collection_id?: string
          collection_name?: string
          collection_slug?: string
          device_type?: string
          id?: string
          user_agent?: string | null
          viewed_at?: string
        }
        Relationships: []
      }
      community_artes: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          bonus_clicks: number
          category: string
          contributor_name: string | null
          created_at: string | null
          description: string | null
          download_url: string | null
          id: string
          image_url: string
          title: string
          updated_at: string | null
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          bonus_clicks?: number
          category: string
          contributor_name?: string | null
          created_at?: string | null
          description?: string | null
          download_url?: string | null
          id?: string
          image_url: string
          title: string
          updated_at?: string | null
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          bonus_clicks?: number
          category?: string
          contributor_name?: string | null
          created_at?: string | null
          description?: string | null
          download_url?: string | null
          id?: string
          image_url?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      community_prompts: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          bonus_clicks: number
          category: string
          contributor_name: string | null
          created_at: string | null
          id: string
          image_url: string
          prompt: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          bonus_clicks?: number
          category: string
          contributor_name?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          prompt: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          bonus_clicks?: number
          category?: string
          contributor_name?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          prompt?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_arte_copies: {
        Row: {
          arte_id: string
          copied_at: string
          copy_date: string
          id: string
          user_id: string
        }
        Insert: {
          arte_id: string
          copied_at?: string
          copy_date?: string
          id?: string
          user_id: string
        }
        Update: {
          arte_id?: string
          copied_at?: string
          copy_date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_musicos_downloads: {
        Row: {
          arte_id: string
          download_date: string
          downloaded_at: string
          id: string
          user_id: string
        }
        Insert: {
          arte_id: string
          download_date?: string
          downloaded_at?: string
          id?: string
          user_id: string
        }
        Update: {
          arte_id?: string
          download_date?: string
          downloaded_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_prompt_copies: {
        Row: {
          copied_at: string
          copy_date: string
          id: string
          prompt_id: string
          user_id: string
        }
        Insert: {
          copied_at?: string
          copy_date?: string
          id?: string
          prompt_id: string
          user_id: string
        }
        Update: {
          copied_at?: string
          copy_date?: string
          id?: string
          prompt_id?: string
          user_id?: string
        }
        Relationships: []
      }
      email_campaign_logs: {
        Row: {
          bounced_at: string | null
          campaign_id: string
          click_count: number | null
          clicked_at: string | null
          complained_at: string | null
          created_at: string
          delivered_at: string | null
          email: string
          error_message: string | null
          id: string
          open_count: number | null
          opened_at: string | null
          resend_id: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          bounced_at?: string | null
          campaign_id: string
          click_count?: number | null
          clicked_at?: string | null
          complained_at?: string | null
          created_at?: string
          delivered_at?: string | null
          email: string
          error_message?: string | null
          id?: string
          open_count?: number | null
          opened_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          bounced_at?: string | null
          campaign_id?: string
          click_count?: number | null
          clicked_at?: string | null
          complained_at?: string | null
          created_at?: string
          delivered_at?: string | null
          email?: string
          error_message?: string | null
          id?: string
          open_count?: number | null
          opened_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          bounced_count: number | null
          clicked_count: number | null
          complained_count: number | null
          content: string
          created_at: string
          delivered_count: number | null
          failed_count: number | null
          filter_value: string | null
          id: string
          is_paused: boolean | null
          is_scheduled: boolean | null
          last_scheduled_send_at: string | null
          next_send_at: string | null
          opened_count: number | null
          platform: string | null
          recipient_filter: string
          recipients_count: number | null
          schedule_type: string | null
          scheduled_at: string | null
          scheduled_day_of_month: number | null
          scheduled_day_of_week: number | null
          scheduled_time: string | null
          sender_email: string
          sender_name: string
          sent_at: string | null
          sent_count: number | null
          status: string
          subject: string
          title: string
          updated_at: string
        }
        Insert: {
          bounced_count?: number | null
          clicked_count?: number | null
          complained_count?: number | null
          content: string
          created_at?: string
          delivered_count?: number | null
          failed_count?: number | null
          filter_value?: string | null
          id?: string
          is_paused?: boolean | null
          is_scheduled?: boolean | null
          last_scheduled_send_at?: string | null
          next_send_at?: string | null
          opened_count?: number | null
          platform?: string | null
          recipient_filter?: string
          recipients_count?: number | null
          schedule_type?: string | null
          scheduled_at?: string | null
          scheduled_day_of_month?: number | null
          scheduled_day_of_week?: number | null
          scheduled_time?: string | null
          sender_email: string
          sender_name?: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject: string
          title: string
          updated_at?: string
        }
        Update: {
          bounced_count?: number | null
          clicked_count?: number | null
          complained_count?: number | null
          content?: string
          created_at?: string
          delivered_count?: number | null
          failed_count?: number | null
          filter_value?: string | null
          id?: string
          is_paused?: boolean | null
          is_scheduled?: boolean | null
          last_scheduled_send_at?: string | null
          next_send_at?: string | null
          opened_count?: number | null
          platform?: string | null
          recipient_filter?: string
          recipients_count?: number | null
          schedule_type?: string | null
          scheduled_at?: string | null
          scheduled_day_of_month?: number | null
          scheduled_day_of_week?: number | null
          scheduled_time?: string | null
          sender_email?: string
          sender_name?: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          content: string
          created_at: string | null
          id: string
          name: string
          sender_email: string | null
          sender_name: string | null
          subject: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          name: string
          sender_email?: string | null
          sender_name?: string | null
          subject: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          name?: string
          sender_email?: string | null
          sender_name?: string | null
          subject?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      import_jobs: {
        Row: {
          completed_at: string | null
          created_records: number | null
          csv_data: Json | null
          current_batch: number | null
          error_count: number | null
          id: string
          processed_records: number | null
          skipped_records: number | null
          started_at: string | null
          status: string
          total_records: number
          updated_at: string | null
          updated_records: number | null
        }
        Insert: {
          completed_at?: string | null
          created_records?: number | null
          csv_data?: Json | null
          current_batch?: number | null
          error_count?: number | null
          id?: string
          processed_records?: number | null
          skipped_records?: number | null
          started_at?: string | null
          status?: string
          total_records?: number
          updated_at?: string | null
          updated_records?: number | null
        }
        Update: {
          completed_at?: string | null
          created_records?: number | null
          csv_data?: Json | null
          current_batch?: number | null
          error_count?: number | null
          id?: string
          processed_records?: number | null
          skipped_records?: number | null
          started_at?: string | null
          status?: string
          total_records?: number
          updated_at?: string | null
          updated_records?: number | null
        }
        Relationships: []
      }
      import_log: {
        Row: {
          created_at: string | null
          email: string
          id: string
          import_hash: string
          processed_at: string | null
          product_name: string
          purchase_date: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          import_hash: string
          processed_at?: string | null
          product_name: string
          purchase_date: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          import_hash?: string
          processed_at?: string | null
          product_name?: string
          purchase_date?: string
        }
        Relationships: []
      }
      job_notification_tokens: {
        Row: {
          consumed_at: string | null
          created_at: string | null
          expires_at: string
          id: string
          job_id: string
          table_name: string
          token: string
          user_id: string | null
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          job_id: string
          table_name: string
          token: string
          user_id?: string | null
        }
        Update: {
          consumed_at?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          job_id?: string
          table_name?: string
          token?: string
          user_id?: string | null
        }
        Relationships: []
      }
      page_views: {
        Row: {
          device_type: string
          id: string
          page_path: string
          user_agent: string | null
          viewed_at: string
          visitor_id: string | null
        }
        Insert: {
          device_type?: string
          id?: string
          page_path: string
          user_agent?: string | null
          viewed_at?: string
          visitor_id?: string | null
        }
        Update: {
          device_type?: string
          id?: string
          page_path?: string
          user_agent?: string | null
          viewed_at?: string
          visitor_id?: string | null
        }
        Relationships: []
      }
      partner_artes: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          bonus_clicks: number
          canva_link: string | null
          category: string
          created_at: string | null
          deletion_requested: boolean | null
          deletion_requested_at: string | null
          description: string | null
          download_url: string | null
          drive_link: string | null
          id: string
          image_url: string
          is_premium: boolean | null
          pack: string | null
          partner_id: string
          rejected: boolean | null
          rejected_at: string | null
          rejected_by: string | null
          title: string
          tutorial_url: string | null
          updated_at: string | null
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          bonus_clicks?: number
          canva_link?: string | null
          category: string
          created_at?: string | null
          deletion_requested?: boolean | null
          deletion_requested_at?: string | null
          description?: string | null
          download_url?: string | null
          drive_link?: string | null
          id?: string
          image_url: string
          is_premium?: boolean | null
          pack?: string | null
          partner_id: string
          rejected?: boolean | null
          rejected_at?: string | null
          rejected_by?: string | null
          title: string
          tutorial_url?: string | null
          updated_at?: string | null
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          bonus_clicks?: number
          canva_link?: string | null
          category?: string
          created_at?: string | null
          deletion_requested?: boolean | null
          deletion_requested_at?: string | null
          description?: string | null
          download_url?: string | null
          drive_link?: string | null
          id?: string
          image_url?: string
          is_premium?: boolean | null
          pack?: string | null
          partner_id?: string
          rejected?: boolean | null
          rejected_at?: string | null
          rejected_by?: string | null
          title?: string
          tutorial_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_artes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_artes_musicos: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          bonus_clicks: number | null
          canva_link: string | null
          category: string
          created_at: string | null
          deletion_requested: boolean | null
          deletion_requested_at: string | null
          description: string | null
          download_url: string | null
          drive_link: string | null
          id: string
          image_url: string
          is_premium: boolean | null
          pack: string | null
          partner_id: string
          rejected: boolean | null
          rejected_at: string | null
          rejected_by: string | null
          title: string
          tutorial_url: string | null
          updated_at: string | null
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          bonus_clicks?: number | null
          canva_link?: string | null
          category: string
          created_at?: string | null
          deletion_requested?: boolean | null
          deletion_requested_at?: string | null
          description?: string | null
          download_url?: string | null
          drive_link?: string | null
          id?: string
          image_url: string
          is_premium?: boolean | null
          pack?: string | null
          partner_id: string
          rejected?: boolean | null
          rejected_at?: string | null
          rejected_by?: string | null
          title: string
          tutorial_url?: string | null
          updated_at?: string | null
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          bonus_clicks?: number | null
          canva_link?: string | null
          category?: string
          created_at?: string | null
          deletion_requested?: boolean | null
          deletion_requested_at?: string | null
          description?: string | null
          download_url?: string | null
          drive_link?: string | null
          id?: string
          image_url?: string
          is_premium?: boolean | null
          pack?: string | null
          partner_id?: string
          rejected?: boolean | null
          rejected_at?: string | null
          rejected_by?: string | null
          title?: string
          tutorial_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_artes_musicos_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_platforms: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          partner_id: string
          platform: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          partner_id: string
          platform: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          partner_id?: string
          platform?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_platforms_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_prompts: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          bonus_clicks: number
          category: string
          created_at: string | null
          deletion_requested: boolean | null
          deletion_requested_at: string | null
          id: string
          image_url: string
          is_premium: boolean | null
          partner_id: string
          prompt: string
          reference_images: string[] | null
          rejected: boolean | null
          rejected_at: string | null
          rejected_by: string | null
          thumbnail_url: string | null
          title: string
          tutorial_url: string | null
          updated_at: string | null
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          bonus_clicks?: number
          category: string
          created_at?: string | null
          deletion_requested?: boolean | null
          deletion_requested_at?: string | null
          id?: string
          image_url: string
          is_premium?: boolean | null
          partner_id: string
          prompt: string
          reference_images?: string[] | null
          rejected?: boolean | null
          rejected_at?: string | null
          rejected_by?: string | null
          thumbnail_url?: string | null
          title: string
          tutorial_url?: string | null
          updated_at?: string | null
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          bonus_clicks?: number
          category?: string
          created_at?: string | null
          deletion_requested?: boolean | null
          deletion_requested_at?: string | null
          id?: string
          image_url?: string
          is_premium?: boolean | null
          partner_id?: string
          prompt?: string
          reference_images?: string[] | null
          rejected?: boolean | null
          rejected_at?: string | null
          rejected_by?: string | null
          thumbnail_url?: string | null
          title?: string
          tutorial_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_prompts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          company: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      partners_artes: {
        Row: {
          company: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pose_changer_jobs: {
        Row: {
          api_account: string
          completed_at: string | null
          created_at: string | null
          credits_charged: boolean | null
          credits_refunded: boolean | null
          current_step: string | null
          error_message: string | null
          failed_at_step: string | null
          id: string
          job_payload: Json | null
          output_url: string | null
          person_file_name: string | null
          person_image_url: string | null
          position: number | null
          queue_wait_seconds: number | null
          raw_api_response: Json | null
          raw_webhook_payload: Json | null
          reference_file_name: string | null
          reference_image_url: string | null
          rh_cost: number | null
          session_id: string
          started_at: string | null
          status: string
          step_history: Json | null
          task_id: string | null
          thumbnail_url: string | null
          user_credit_cost: number | null
          user_id: string | null
          waited_in_queue: boolean | null
        }
        Insert: {
          api_account?: string
          completed_at?: string | null
          created_at?: string | null
          credits_charged?: boolean | null
          credits_refunded?: boolean | null
          current_step?: string | null
          error_message?: string | null
          failed_at_step?: string | null
          id?: string
          job_payload?: Json | null
          output_url?: string | null
          person_file_name?: string | null
          person_image_url?: string | null
          position?: number | null
          queue_wait_seconds?: number | null
          raw_api_response?: Json | null
          raw_webhook_payload?: Json | null
          reference_file_name?: string | null
          reference_image_url?: string | null
          rh_cost?: number | null
          session_id: string
          started_at?: string | null
          status?: string
          step_history?: Json | null
          task_id?: string | null
          thumbnail_url?: string | null
          user_credit_cost?: number | null
          user_id?: string | null
          waited_in_queue?: boolean | null
        }
        Update: {
          api_account?: string
          completed_at?: string | null
          created_at?: string | null
          credits_charged?: boolean | null
          credits_refunded?: boolean | null
          current_step?: string | null
          error_message?: string | null
          failed_at_step?: string | null
          id?: string
          job_payload?: Json | null
          output_url?: string | null
          person_file_name?: string | null
          person_image_url?: string | null
          position?: number | null
          queue_wait_seconds?: number | null
          raw_api_response?: Json | null
          raw_webhook_payload?: Json | null
          reference_file_name?: string | null
          reference_image_url?: string | null
          rh_cost?: number | null
          session_id?: string
          started_at?: string | null
          status?: string
          step_history?: Json | null
          task_id?: string | null
          thumbnail_url?: string | null
          user_credit_cost?: number | null
          user_id?: string | null
          waited_in_queue?: boolean | null
        }
        Relationships: []
      }
      premium_artes_users: {
        Row: {
          billing_period: string | null
          created_at: string | null
          expires_at: string | null
          greenn_contract_id: string | null
          greenn_product_id: number | null
          id: string
          is_active: boolean
          plan_type: string | null
          subscribed_at: string | null
          user_id: string
        }
        Insert: {
          billing_period?: string | null
          created_at?: string | null
          expires_at?: string | null
          greenn_contract_id?: string | null
          greenn_product_id?: number | null
          id?: string
          is_active?: boolean
          plan_type?: string | null
          subscribed_at?: string | null
          user_id: string
        }
        Update: {
          billing_period?: string | null
          created_at?: string | null
          expires_at?: string | null
          greenn_contract_id?: string | null
          greenn_product_id?: number | null
          id?: string
          is_active?: boolean
          plan_type?: string | null
          subscribed_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      premium_musicos_users: {
        Row: {
          billing_period: string | null
          created_at: string | null
          expires_at: string | null
          greenn_contract_id: string | null
          greenn_product_id: number | null
          id: string
          is_active: boolean
          plan_type: string | null
          subscribed_at: string | null
          user_id: string
        }
        Insert: {
          billing_period?: string | null
          created_at?: string | null
          expires_at?: string | null
          greenn_contract_id?: string | null
          greenn_product_id?: number | null
          id?: string
          is_active?: boolean
          plan_type?: string | null
          subscribed_at?: string | null
          user_id: string
        }
        Update: {
          billing_period?: string | null
          created_at?: string | null
          expires_at?: string | null
          greenn_contract_id?: string | null
          greenn_product_id?: number | null
          id?: string
          is_active?: boolean
          plan_type?: string | null
          subscribed_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      premium_users: {
        Row: {
          billing_period: string | null
          created_at: string | null
          expires_at: string | null
          greenn_contract_id: string | null
          greenn_product_id: number | null
          id: string
          is_active: boolean
          plan_type: string | null
          subscribed_at: string | null
          user_id: string
        }
        Insert: {
          billing_period?: string | null
          created_at?: string | null
          expires_at?: string | null
          greenn_contract_id?: string | null
          greenn_product_id?: number | null
          id?: string
          is_active?: boolean
          plan_type?: string | null
          subscribed_at?: string | null
          user_id: string
        }
        Update: {
          billing_period?: string | null
          created_at?: string | null
          expires_at?: string | null
          greenn_contract_id?: string | null
          greenn_product_id?: number | null
          id?: string
          is_active?: boolean
          plan_type?: string | null
          subscribed_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          id: string
          locale: string | null
          name: string | null
          password_changed: boolean | null
          phone: string | null
          runninghub_bonus_claimed: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          locale?: string | null
          name?: string | null
          password_changed?: boolean | null
          phone?: string | null
          runninghub_bonus_claimed?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          locale?: string | null
          name?: string | null
          password_changed?: boolean | null
          phone?: string | null
          runninghub_bonus_claimed?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      promo_claims: {
        Row: {
          claimed_at: string
          credit_type: string
          credits_granted: number
          id: string
          ip_address: string | null
          promo_code: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          claimed_at?: string
          credit_type?: string
          credits_granted: number
          id?: string
          ip_address?: string | null
          promo_code: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          claimed_at?: string
          credit_type?: string
          credits_granted?: number
          id?: string
          ip_address?: string | null
          promo_code?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      prompt_clicks: {
        Row: {
          clicked_at: string
          id: string
          is_admin_prompt: boolean
          prompt_id: string
          prompt_title: string
        }
        Insert: {
          clicked_at?: string
          id?: string
          is_admin_prompt?: boolean
          prompt_id: string
          prompt_title: string
        }
        Update: {
          clicked_at?: string
          id?: string
          is_admin_prompt?: boolean
          prompt_id?: string
          prompt_title?: string
        }
        Relationships: []
      }
      prompts_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_admin_only: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_admin_only?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_admin_only?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_notification_analytics: {
        Row: {
          created_at: string
          device_type: string
          event_type: string
          id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string
          event_type: string
          id?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string
          event_type?: string
          id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      push_notification_logs: {
        Row: {
          body: string
          clicked_count: number | null
          failed_count: number | null
          id: string
          sent_at: string
          sent_count: number | null
          title: string
          url: string | null
        }
        Insert: {
          body: string
          clicked_count?: number | null
          failed_count?: number | null
          id?: string
          sent_at?: string
          sent_count?: number | null
          title: string
          url?: string | null
        }
        Update: {
          body?: string
          clicked_count?: number | null
          failed_count?: number | null
          id?: string
          sent_at?: string
          sent_count?: number | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      push_notification_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      push_scheduled_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean
          last_sent_at: string | null
          next_send_at: string
          schedule_type: string
          scheduled_at: string | null
          scheduled_day_of_month: number | null
          scheduled_day_of_week: number | null
          scheduled_time: string | null
          title: string
          url: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          next_send_at: string
          schedule_type?: string
          scheduled_at?: string | null
          scheduled_day_of_month?: number | null
          scheduled_day_of_week?: number | null
          scheduled_time?: string | null
          title: string
          url?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          next_send_at?: string
          schedule_type?: string
          scheduled_at?: string | null
          scheduled_day_of_month?: number | null
          scheduled_day_of_week?: number | null
          scheduled_time?: string | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_type: string
          discount_claimed_at: string | null
          discount_eligible: boolean | null
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          device_type?: string
          discount_claimed_at?: string | null
          discount_eligible?: boolean | null
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          device_type?: string
          discount_claimed_at?: string | null
          discount_eligible?: boolean | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: string
          request_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_address: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      saved_characters: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          job_id: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          job_id?: string | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          job_id?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      tutorial_events: {
        Row: {
          created_at: string
          device_type: string
          event_type: string
          id: string
          session_id: string
          step_id: number | null
        }
        Insert: {
          created_at?: string
          device_type?: string
          event_type: string
          id?: string
          session_id: string
          step_id?: number | null
        }
        Update: {
          created_at?: string
          device_type?: string
          event_type?: string
          id?: string
          session_id?: string
          step_id?: number | null
        }
        Relationships: []
      }
      upscaler_credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          credit_type: string
          description: string | null
          id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          credit_type?: string
          description?: string | null
          id?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          credit_type?: string
          description?: string | null
          id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      upscaler_credits: {
        Row: {
          balance: number
          created_at: string | null
          id: string
          lifetime_balance: number
          monthly_balance: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          id?: string
          lifetime_balance?: number
          monthly_balance?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          id?: string
          lifetime_balance?: number
          monthly_balance?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      upscaler_jobs: {
        Row: {
          api_account: string
          category: string | null
          completed_at: string | null
          created_at: string | null
          credits_charged: boolean | null
          credits_refunded: boolean | null
          current_step: string | null
          detail_denoise: number | null
          error_message: string | null
          failed_at_step: string | null
          fallback_attempted: boolean | null
          framing_mode: string | null
          id: string
          input_file_name: string | null
          input_url: string | null
          job_payload: Json | null
          original_task_id: string | null
          output_url: string | null
          position: number | null
          prompt: string | null
          queue_wait_seconds: number | null
          raw_api_response: Json | null
          raw_webhook_payload: Json | null
          resolution: number | null
          rh_cost: number | null
          session_id: string
          started_at: string | null
          status: string
          step_history: Json | null
          task_id: string | null
          thumbnail_url: string | null
          user_credit_cost: number | null
          user_id: string | null
          version: string | null
          waited_in_queue: boolean | null
        }
        Insert: {
          api_account?: string
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          credits_charged?: boolean | null
          credits_refunded?: boolean | null
          current_step?: string | null
          detail_denoise?: number | null
          error_message?: string | null
          failed_at_step?: string | null
          fallback_attempted?: boolean | null
          framing_mode?: string | null
          id?: string
          input_file_name?: string | null
          input_url?: string | null
          job_payload?: Json | null
          original_task_id?: string | null
          output_url?: string | null
          position?: number | null
          prompt?: string | null
          queue_wait_seconds?: number | null
          raw_api_response?: Json | null
          raw_webhook_payload?: Json | null
          resolution?: number | null
          rh_cost?: number | null
          session_id: string
          started_at?: string | null
          status?: string
          step_history?: Json | null
          task_id?: string | null
          thumbnail_url?: string | null
          user_credit_cost?: number | null
          user_id?: string | null
          version?: string | null
          waited_in_queue?: boolean | null
        }
        Update: {
          api_account?: string
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          credits_charged?: boolean | null
          credits_refunded?: boolean | null
          current_step?: string | null
          detail_denoise?: number | null
          error_message?: string | null
          failed_at_step?: string | null
          fallback_attempted?: boolean | null
          framing_mode?: string | null
          id?: string
          input_file_name?: string | null
          input_url?: string | null
          job_payload?: Json | null
          original_task_id?: string | null
          output_url?: string | null
          position?: number | null
          prompt?: string | null
          queue_wait_seconds?: number | null
          raw_api_response?: Json | null
          raw_webhook_payload?: Json | null
          resolution?: number | null
          rh_cost?: number | null
          session_id?: string
          started_at?: string | null
          status?: string
          step_history?: Json | null
          task_id?: string | null
          thumbnail_url?: string | null
          user_credit_cost?: number | null
          user_id?: string | null
          version?: string | null
          waited_in_queue?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "upscaler_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_pack_purchases: {
        Row: {
          access_type: Database["public"]["Enums"]["artes_access_type"]
          created_at: string
          expires_at: string | null
          greenn_contract_id: string | null
          has_bonus_access: boolean
          hotmart_product_id: number | null
          hotmart_transaction: string | null
          id: string
          import_source: string | null
          is_active: boolean
          pack_slug: string
          platform: string | null
          product_name: string | null
          purchased_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_type: Database["public"]["Enums"]["artes_access_type"]
          created_at?: string
          expires_at?: string | null
          greenn_contract_id?: string | null
          has_bonus_access?: boolean
          hotmart_product_id?: number | null
          hotmart_transaction?: string | null
          id?: string
          import_source?: string | null
          is_active?: boolean
          pack_slug: string
          platform?: string | null
          product_name?: string | null
          purchased_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_type?: Database["public"]["Enums"]["artes_access_type"]
          created_at?: string
          expires_at?: string | null
          greenn_contract_id?: string | null
          has_bonus_access?: boolean
          hotmart_product_id?: number | null
          hotmart_transaction?: string | null
          id?: string
          import_source?: string | null
          is_active?: boolean
          pack_slug?: string
          platform?: string | null
          product_name?: string | null
          purchased_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_sessions: {
        Row: {
          created_at: string
          device_type: string
          duration_seconds: number | null
          entered_at: string
          exited_at: string | null
          id: string
          page_path: string
          session_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string
          duration_seconds?: number | null
          entered_at?: string
          exited_at?: string | null
          id?: string
          page_path: string
          session_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string
          duration_seconds?: number | null
          entered_at?: string
          exited_at?: string | null
          id?: string
          page_path?: string
          session_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      veste_ai_jobs: {
        Row: {
          api_account: string
          clothing_file_name: string | null
          clothing_image_url: string | null
          completed_at: string | null
          created_at: string | null
          credits_charged: boolean | null
          credits_refunded: boolean | null
          current_step: string | null
          error_message: string | null
          failed_at_step: string | null
          id: string
          job_payload: Json | null
          output_url: string | null
          person_file_name: string | null
          person_image_url: string | null
          position: number | null
          queue_wait_seconds: number | null
          raw_api_response: Json | null
          raw_webhook_payload: Json | null
          rh_cost: number | null
          session_id: string
          started_at: string | null
          status: string
          step_history: Json | null
          task_id: string | null
          thumbnail_url: string | null
          user_credit_cost: number | null
          user_id: string | null
          waited_in_queue: boolean | null
        }
        Insert: {
          api_account?: string
          clothing_file_name?: string | null
          clothing_image_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          credits_charged?: boolean | null
          credits_refunded?: boolean | null
          current_step?: string | null
          error_message?: string | null
          failed_at_step?: string | null
          id?: string
          job_payload?: Json | null
          output_url?: string | null
          person_file_name?: string | null
          person_image_url?: string | null
          position?: number | null
          queue_wait_seconds?: number | null
          raw_api_response?: Json | null
          raw_webhook_payload?: Json | null
          rh_cost?: number | null
          session_id: string
          started_at?: string | null
          status?: string
          step_history?: Json | null
          task_id?: string | null
          thumbnail_url?: string | null
          user_credit_cost?: number | null
          user_id?: string | null
          waited_in_queue?: boolean | null
        }
        Update: {
          api_account?: string
          clothing_file_name?: string | null
          clothing_image_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          credits_charged?: boolean | null
          credits_refunded?: boolean | null
          current_step?: string | null
          error_message?: string | null
          failed_at_step?: string | null
          id?: string
          job_payload?: Json | null
          output_url?: string | null
          person_file_name?: string | null
          person_image_url?: string | null
          position?: number | null
          queue_wait_seconds?: number | null
          raw_api_response?: Json | null
          raw_webhook_payload?: Json | null
          rh_cost?: number | null
          session_id?: string
          started_at?: string | null
          status?: string
          step_history?: Json | null
          task_id?: string | null
          thumbnail_url?: string | null
          user_credit_cost?: number | null
          user_id?: string | null
          waited_in_queue?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "veste_ai_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_upscaler_jobs: {
        Row: {
          api_account: string
          completed_at: string | null
          created_at: string | null
          credits_charged: boolean | null
          credits_refunded: boolean | null
          current_step: string | null
          error_message: string | null
          failed_at_step: string | null
          id: string
          input_file_name: string | null
          job_payload: Json | null
          output_url: string | null
          position: number | null
          queue_wait_seconds: number | null
          raw_api_response: Json | null
          raw_webhook_payload: Json | null
          rh_cost: number | null
          session_id: string
          started_at: string | null
          status: string
          step_history: Json | null
          task_id: string | null
          thumbnail_url: string | null
          user_credit_cost: number | null
          user_id: string | null
          video_duration_seconds: number | null
          video_height: number | null
          video_url: string | null
          video_width: number | null
          waited_in_queue: boolean | null
        }
        Insert: {
          api_account?: string
          completed_at?: string | null
          created_at?: string | null
          credits_charged?: boolean | null
          credits_refunded?: boolean | null
          current_step?: string | null
          error_message?: string | null
          failed_at_step?: string | null
          id?: string
          input_file_name?: string | null
          job_payload?: Json | null
          output_url?: string | null
          position?: number | null
          queue_wait_seconds?: number | null
          raw_api_response?: Json | null
          raw_webhook_payload?: Json | null
          rh_cost?: number | null
          session_id: string
          started_at?: string | null
          status?: string
          step_history?: Json | null
          task_id?: string | null
          thumbnail_url?: string | null
          user_credit_cost?: number | null
          user_id?: string | null
          video_duration_seconds?: number | null
          video_height?: number | null
          video_url?: string | null
          video_width?: number | null
          waited_in_queue?: boolean | null
        }
        Update: {
          api_account?: string
          completed_at?: string | null
          created_at?: string | null
          credits_charged?: boolean | null
          credits_refunded?: boolean | null
          current_step?: string | null
          error_message?: string | null
          failed_at_step?: string | null
          id?: string
          input_file_name?: string | null
          job_payload?: Json | null
          output_url?: string | null
          position?: number | null
          queue_wait_seconds?: number | null
          raw_api_response?: Json | null
          raw_webhook_payload?: Json | null
          rh_cost?: number | null
          session_id?: string
          started_at?: string | null
          status?: string
          step_history?: Json | null
          task_id?: string | null
          thumbnail_url?: string | null
          user_credit_cost?: number | null
          user_id?: string | null
          video_duration_seconds?: number | null
          video_height?: number | null
          video_url?: string | null
          video_width?: number | null
          waited_in_queue?: boolean | null
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          email: string | null
          error_message: string | null
          from_app: boolean | null
          id: string
          mapping_type: string | null
          payload: Json
          platform: string | null
          product_id: number | null
          received_at: string | null
          result: string | null
          status: string | null
          utm_source: string | null
        }
        Insert: {
          email?: string | null
          error_message?: string | null
          from_app?: boolean | null
          id?: string
          mapping_type?: string | null
          payload: Json
          platform?: string | null
          product_id?: number | null
          received_at?: string | null
          result?: string | null
          status?: string | null
          utm_source?: string | null
        }
        Update: {
          email?: string | null
          error_message?: string | null
          from_app?: boolean | null
          id?: string
          mapping_type?: string | null
          payload?: Json
          platform?: string | null
          product_id?: number | null
          received_at?: string | null
          result?: string | null
          status?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      welcome_email_logs: {
        Row: {
          click_count: number | null
          clicked_at: string | null
          dedup_key: string | null
          email: string
          email_content: string | null
          error_message: string | null
          id: string
          locale: string | null
          name: string | null
          open_count: number | null
          opened_at: string | null
          platform: string
          product_info: string | null
          sent_at: string
          status: string | null
          template_used: string | null
          tracking_id: string | null
        }
        Insert: {
          click_count?: number | null
          clicked_at?: string | null
          dedup_key?: string | null
          email: string
          email_content?: string | null
          error_message?: string | null
          id?: string
          locale?: string | null
          name?: string | null
          open_count?: number | null
          opened_at?: string | null
          platform: string
          product_info?: string | null
          sent_at?: string
          status?: string | null
          template_used?: string | null
          tracking_id?: string | null
        }
        Update: {
          click_count?: number | null
          clicked_at?: string | null
          dedup_key?: string | null
          email?: string
          email_content?: string | null
          error_message?: string | null
          id?: string
          locale?: string | null
          name?: string | null
          open_count?: number | null
          opened_at?: string | null
          platform?: string
          product_info?: string | null
          sent_at?: string
          status?: string | null
          template_used?: string | null
          tracking_id?: string | null
        }
        Relationships: []
      }
      welcome_email_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          locale: string | null
          platform: string
          sender_email: string
          sender_name: string
          subject: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          locale?: string | null
          platform: string
          sender_email?: string
          sender_name?: string
          subject: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          locale?: string | null
          platform?: string
          sender_email?: string
          sender_name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_lifetime_credits: {
        Args: { _amount: number; _description?: string; _user_id: string }
        Returns: {
          new_balance: number
          success: boolean
        }[]
      }
      add_upscaler_credits: {
        Args: { _amount: number; _description?: string; _user_id: string }
        Returns: {
          new_balance: number
          success: boolean
        }[]
      }
      admin_cancel_job: {
        Args: { p_job_id: string; p_table_name: string }
        Returns: {
          error_message: string
          refunded_amount: number
          success: boolean
        }[]
      }
      check_profile_exists: {
        Args: { check_email: string }
        Returns: {
          exists_in_db: boolean
          password_changed: boolean
        }[]
      }
      check_rate_limit: {
        Args: {
          _endpoint: string
          _ip_address: string
          _max_requests?: number
          _window_seconds?: number
        }
        Returns: {
          allowed: boolean
          current_count: number
          reset_at: string
        }[]
      }
      cleanup_all_stale_ai_jobs: {
        Args: never
        Returns: {
          cancelled_count: number
          refunded_credits: number
          table_name: string
        }[]
      }
      cleanup_expired_ai_jobs: {
        Args: never
        Returns: {
          pose_changer_deleted: number
          upscaler_deleted: number
          veste_ai_deleted: number
          video_upscaler_deleted: number
        }[]
      }
      cleanup_monthly_logs: { Args: never; Returns: undefined }
      cleanup_old_logs: { Args: never; Returns: undefined }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      cleanup_stale_pose_changer_jobs: { Args: never; Returns: undefined }
      cleanup_stale_upscaler_jobs: { Args: never; Returns: undefined }
      cleanup_stale_veste_ai_jobs: { Args: never; Returns: undefined }
      consume_upscaler_credits: {
        Args: { _amount: number; _description?: string; _user_id: string }
        Returns: {
          error_message: string
          new_balance: number
          success: boolean
        }[]
      }
      get_ai_tools_cost_averages: {
        Args: never
        Returns: {
          avg_credit_cost: number
          avg_rh_cost: number
          tool_name: string
          total_credit_cost: number
          total_jobs: number
          total_rh_cost: number
        }[]
      }
      get_ai_tools_usage:
        | {
            Args: {
              p_end_date?: string
              p_page?: number
              p_page_size?: number
              p_start_date?: string
            }
            Returns: {
              completed_at: string
              created_at: string
              error_message: string
              id: string
              processing_seconds: number
              profit: number
              queue_wait_seconds: number
              rh_cost: number
              started_at: string
              status: string
              tool_name: string
              user_credit_cost: number
              user_email: string
              user_id: string
              user_name: string
              waited_in_queue: boolean
            }[]
          }
        | {
            Args: {
              p_end_date?: string
              p_start_date?: string
              p_status_filter?: string
              p_tool_filter?: string
              p_user_email?: string
            }
            Returns: {
              completed_at: string
              created_at: string
              error_message: string
              id: string
              processing_seconds: number
              profit: number
              queue_wait_seconds: number
              rh_cost: number
              started_at: string
              status: string
              tool_name: string
              user_credit_cost: number
              user_email: string
              user_id: string
              waited_in_queue: boolean
            }[]
          }
      get_ai_tools_usage_count: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: number
      }
      get_ai_tools_usage_summary: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          avg_processing_seconds: number
          avg_queue_wait_seconds: number
          completed_jobs: number
          failed_jobs: number
          jobs_with_queue: number
          total_jobs: number
          total_profit: number
          total_rh_cost: number
          total_user_credits: number
        }[]
      }
      get_all_credit_users: {
        Args: never
        Returns: {
          email: string
          lifetime_balance: number
          monthly_balance: number
          name: string
          total_balance: number
          updated_at: string
          user_id: string
        }[]
      }
      get_daily_arte_copy_count: { Args: { _user_id: string }; Returns: number }
      get_daily_copy_count: { Args: { _user_id: string }; Returns: number }
      get_daily_musicos_download_count: {
        Args: { _user_id: string }
        Returns: number
      }
      get_prompt_click_counts: {
        Args: never
        Returns: {
          click_count: number
          prompt_id: string
        }[]
      }
      get_upscaler_credits: { Args: { _user_id: string }; Returns: number }
      get_upscaler_credits_breakdown: {
        Args: { _user_id: string }
        Returns: {
          lifetime: number
          monthly: number
          total: number
        }[]
      }
      get_user_ai_creations: {
        Args: { p_limit?: number; p_media_type?: string; p_offset?: number }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          media_type: string
          output_url: string
          thumbnail_url: string
          tool_name: string
        }[]
      }
      get_user_expired_packs: {
        Args: { _user_id: string }
        Returns: {
          access_type: Database["public"]["Enums"]["artes_access_type"]
          expires_at: string
          has_bonus: boolean
          pack_slug: string
        }[]
      }
      get_user_packs: {
        Args: { _user_id: string }
        Returns: {
          access_type: Database["public"]["Enums"]["artes_access_type"]
          expires_at: string
          has_bonus: boolean
          pack_slug: string
        }[]
      }
      has_bonus_access: { Args: { _user_id: string }; Returns: boolean }
      has_pack_access: {
        Args: { _pack_slug: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_premium: { Args: never; Returns: boolean }
      is_premium_artes: { Args: never; Returns: boolean }
      is_premium_musicos: { Args: never; Returns: boolean }
      mark_pending_job_as_failed: {
        Args: {
          p_error_message?: string
          p_job_id: string
          p_table_name: string
        }
        Returns: boolean
      }
      refund_upscaler_credits: {
        Args: { _amount: number; _description?: string; _user_id: string }
        Returns: {
          error_message: string
          new_balance: number
          success: boolean
        }[]
      }
      remove_lifetime_credits: {
        Args: { _amount: number; _description?: string; _user_id: string }
        Returns: {
          error_message: string
          new_balance: number
          success: boolean
        }[]
      }
      remove_monthly_credits: {
        Args: { _amount: number; _description?: string; _user_id: string }
        Returns: {
          error_message: string
          new_balance: number
          success: boolean
        }[]
      }
      reset_upscaler_credits: {
        Args: { _amount: number; _description?: string; _user_id: string }
        Returns: {
          new_balance: number
          success: boolean
        }[]
      }
      update_pose_changer_queue_positions: { Args: never; Returns: undefined }
      update_queue_positions: { Args: never; Returns: undefined }
      update_veste_ai_queue_positions: { Args: never; Returns: undefined }
      user_cancel_ai_job: {
        Args: { p_job_id: string; p_table_name: string }
        Returns: {
          error_message: string
          refunded_amount: number
          success: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "partner"
      artes_access_type: "6_meses" | "1_ano" | "vitalicio" | "3_meses"
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
      app_role: ["admin", "moderator", "user", "partner"],
      artes_access_type: ["6_meses", "1_ano", "vitalicio", "3_meses"],
    },
  },
} as const
