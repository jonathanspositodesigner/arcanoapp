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
          flyer_subcategory: string | null
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
          flyer_subcategory?: string | null
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
          flyer_subcategory?: string | null
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
      admin_login_attempts: {
        Row: {
          attempted_at: string
          device_fingerprint: string | null
          email: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string
          device_fingerprint?: string | null
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string
          device_fingerprint?: string | null
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
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
          ip_address: string | null
          used_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          device_fingerprint: string
          expires_at: string
          id?: string
          ip_address?: string | null
          used_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          device_fingerprint?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          used_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_engine_costs: {
        Row: {
          api_cost: number
          cobrar_3x: number
          created_at: string
          creditos_3x: number
          creditos_cobrir: number
          custo_rh: number
          custo_total: number
          id: string
          modo: string
          nome: string
          receita_por_credito: number
          rh_coins: number
          tempo_segundos: number
          updated_at: string
        }
        Insert: {
          api_cost?: number
          cobrar_3x?: number
          created_at?: string
          creditos_3x?: number
          creditos_cobrir?: number
          custo_rh?: number
          custo_total?: number
          id?: string
          modo?: string
          nome: string
          receita_por_credito?: number
          rh_coins?: number
          tempo_segundos?: number
          updated_at?: string
        }
        Update: {
          api_cost?: number
          cobrar_3x?: number
          created_at?: string
          creditos_3x?: number
          creditos_cobrir?: number
          custo_rh?: number
          custo_total?: number
          id?: string
          modo?: string
          nome?: string
          receita_por_credito?: number
          rh_coins?: number
          tempo_segundos?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_tool_library_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          slug: string
          thumbnail_url: string | null
          tool_slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          slug: string
          thumbnail_url?: string | null
          tool_slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          slug?: string
          thumbnail_url?: string | null
          tool_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_tool_library_items: {
        Row: {
          category_id: string | null
          created_at: string
          display_order: number
          id: string
          is_visible: boolean
          source_id: string
          source_table: string
          tool_slug: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          source_id: string
          source_table: string
          tool_slug: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          source_id?: string
          source_table?: string
          tool_slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tool_library_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ai_tool_library_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tool_registry: {
        Row: {
          badge_color: string | null
          cost_column: string | null
          created_at: string
          credit_column: string | null
          display_name: string | null
          display_order: number | null
          enabled: boolean
          engine_filter_column: string | null
          engine_filter_value: string | null
          expiry_hours: number
          has_failed_at_step: boolean | null
          has_queue_tracking: boolean | null
          has_started_at: boolean | null
          id: string
          input_image_column: string | null
          is_video_tool: boolean | null
          media_type: string
          output_column: string | null
          storage_folder: string | null
          table_name: string
          tool_name: string
        }
        Insert: {
          badge_color?: string | null
          cost_column?: string | null
          created_at?: string
          credit_column?: string | null
          display_name?: string | null
          display_order?: number | null
          enabled?: boolean
          engine_filter_column?: string | null
          engine_filter_value?: string | null
          expiry_hours?: number
          has_failed_at_step?: boolean | null
          has_queue_tracking?: boolean | null
          has_started_at?: boolean | null
          id?: string
          input_image_column?: string | null
          is_video_tool?: boolean | null
          media_type?: string
          output_column?: string | null
          storage_folder?: string | null
          table_name: string
          tool_name: string
        }
        Update: {
          badge_color?: string | null
          cost_column?: string | null
          created_at?: string
          credit_column?: string | null
          display_name?: string | null
          display_order?: number | null
          enabled?: boolean
          engine_filter_column?: string | null
          engine_filter_value?: string | null
          expiry_hours?: number
          has_failed_at_step?: boolean | null
          has_queue_tracking?: boolean | null
          has_started_at?: boolean | null
          id?: string
          input_image_column?: string | null
          is_video_tool?: boolean | null
          media_type?: string
          output_column?: string | null
          storage_folder?: string | null
          table_name?: string
          tool_name?: string
        }
        Relationships: []
      }
      ai_tool_settings: {
        Row: {
          api_cost: number
          credit_cost: number
          has_api_cost: boolean
          id: string
          tool_name: string
          updated_at: string
        }
        Insert: {
          api_cost?: number
          credit_cost?: number
          has_api_cost?: boolean
          id?: string
          tool_name: string
          updated_at?: string
        }
        Update: {
          api_cost?: number
          credit_cost?: number
          has_api_cost?: boolean
          id?: string
          tool_name?: string
          updated_at?: string
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
      arcano_cloner_free_trials: {
        Row: {
          created_at: string
          credits_granted: number
          email: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_granted?: number
          email: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_granted?: number
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      arcano_cloner_jobs: {
        Row: {
          api_account: string
          aspect_ratio: string | null
          completed_at: string | null
          created_at: string | null
          creativity: number
          credits_charged: boolean | null
          credits_refunded: boolean | null
          current_step: string | null
          custom_prompt: string | null
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
          creativity?: number
          credits_charged?: boolean | null
          credits_refunded?: boolean | null
          current_step?: string | null
          custom_prompt?: string | null
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
          creativity?: number
          credits_charged?: boolean | null
          credits_refunded?: boolean | null
          current_step?: string | null
          custom_prompt?: string | null
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
      asaas_orders: {
        Row: {
          amount: number
          antifraud_retry_done: boolean | null
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          checkout_request_id: string | null
          created_at: string | null
          gateway_error_code: string | null
          gateway_error_message: string | null
          id: string
          last_attempt_at: string | null
          meta_fbc: string | null
          meta_fbp: string | null
          meta_user_agent: string | null
          net_amount: number | null
          pagarme_subscription_id: string | null
          paid_at: string | null
          payment_method: string | null
          product_id: string | null
          status: string
          updated_at: string | null
          user_address_city: string | null
          user_address_country: string | null
          user_address_line: string | null
          user_address_state: string | null
          user_address_zip: string | null
          user_cpf: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
          user_phone: string | null
          utm_data: Json | null
          whatsapp_welcome_sent: boolean
          whatsapp_welcome_sent_at: string | null
        }
        Insert: {
          amount: number
          antifraud_retry_done?: boolean | null
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          checkout_request_id?: string | null
          created_at?: string | null
          gateway_error_code?: string | null
          gateway_error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          meta_fbc?: string | null
          meta_fbp?: string | null
          meta_user_agent?: string | null
          net_amount?: number | null
          pagarme_subscription_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          product_id?: string | null
          status?: string
          updated_at?: string | null
          user_address_city?: string | null
          user_address_country?: string | null
          user_address_line?: string | null
          user_address_state?: string | null
          user_address_zip?: string | null
          user_cpf?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
          utm_data?: Json | null
          whatsapp_welcome_sent?: boolean
          whatsapp_welcome_sent_at?: string | null
        }
        Update: {
          amount?: number
          antifraud_retry_done?: boolean | null
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          checkout_request_id?: string | null
          created_at?: string | null
          gateway_error_code?: string | null
          gateway_error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          meta_fbc?: string | null
          meta_fbp?: string | null
          meta_user_agent?: string | null
          net_amount?: number | null
          pagarme_subscription_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          product_id?: string | null
          status?: string
          updated_at?: string | null
          user_address_city?: string | null
          user_address_country?: string | null
          user_address_line?: string | null
          user_address_state?: string | null
          user_address_zip?: string | null
          user_cpf?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
          utm_data?: Json | null
          whatsapp_welcome_sent?: boolean
          whatsapp_welcome_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asaas_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mp_products"
            referencedColumns: ["id"]
          },
        ]
      }
      bg_remover_jobs: {
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
          input_url: string | null
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
          input_url?: string | null
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
          input_url?: string | null
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
          waited_in_queue?: boolean | null
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
          user_id: string
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
          user_id: string
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
          user_id?: string
          waited_in_queue?: boolean | null
        }
        Relationships: []
      }
      cinema_characters: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cinema_projects: {
        Row: {
          active_scene_index: number
          cover_url: string | null
          created_at: string
          id: string
          name: string
          scenes: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          active_scene_index?: number
          cover_url?: string | null
          created_at?: string
          id?: string
          name: string
          scenes?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          active_scene_index?: number
          cover_url?: string | null
          created_at?: string
          id?: string
          name?: string
          scenes?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cinema_saved_configs: {
        Row: {
          created_at: string
          id: string
          mode: string
          name: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode: string
          name: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          name?: string
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cinema_scenarios: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string
          user_id?: string
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
      daily_premium_unlocks: {
        Row: {
          id: string
          prompt_id: string
          unlock_date: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          prompt_id: string
          unlock_date?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          prompt_id?: string
          unlock_date?: string
          unlocked_at?: string
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
      device_signups: {
        Row: {
          created_at: string
          device_fingerprint: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          id?: string
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
      email_confirmation_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          redirect_path: string | null
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          redirect_path?: string | null
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          redirect_path?: string | null
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_confirmation_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      exchange_rates: {
        Row: {
          currency: string
          rate_to_brl: number
          updated_at: string
        }
        Insert: {
          currency: string
          rate_to_brl: number
          updated_at?: string
        }
        Update: {
          currency?: string
          rate_to_brl?: number
          updated_at?: string
        }
        Relationships: []
      }
      flyer_maker_jobs: {
        Row: {
          address: string | null
          api_account: string
          artist_count: number | null
          artist_names: string | null
          artist_photo_file_names: Json | null
          artist_photo_urls: Json | null
          completed_at: string | null
          created_at: string | null
          creativity: number | null
          credits_charged: boolean | null
          credits_refunded: boolean | null
          current_step: string | null
          date_time_location: string | null
          error_message: string | null
          failed_at_step: string | null
          footer_promo: string | null
          id: string
          image_size: string | null
          job_payload: Json | null
          logo_file_name: string | null
          logo_url: string | null
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
          title: string | null
          updated_at: string | null
          user_credit_cost: number | null
          user_id: string | null
          waited_in_queue: boolean | null
        }
        Insert: {
          address?: string | null
          api_account?: string
          artist_count?: number | null
          artist_names?: string | null
          artist_photo_file_names?: Json | null
          artist_photo_urls?: Json | null
          completed_at?: string | null
          created_at?: string | null
          creativity?: number | null
          credits_charged?: boolean | null
          credits_refunded?: boolean | null
          current_step?: string | null
          date_time_location?: string | null
          error_message?: string | null
          failed_at_step?: string | null
          footer_promo?: string | null
          id?: string
          image_size?: string | null
          job_payload?: Json | null
          logo_file_name?: string | null
          logo_url?: string | null
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
          title?: string | null
          updated_at?: string | null
          user_credit_cost?: number | null
          user_id?: string | null
          waited_in_queue?: boolean | null
        }
        Update: {
          address?: string | null
          api_account?: string
          artist_count?: number | null
          artist_names?: string | null
          artist_photo_file_names?: Json | null
          artist_photo_urls?: Json | null
          completed_at?: string | null
          created_at?: string | null
          creativity?: number | null
          credits_charged?: boolean | null
          credits_refunded?: boolean | null
          current_step?: string | null
          date_time_location?: string | null
          error_message?: string | null
          failed_at_step?: string | null
          footer_promo?: string | null
          id?: string
          image_size?: string | null
          job_payload?: Json | null
          logo_file_name?: string | null
          logo_url?: string | null
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
          title?: string | null
          updated_at?: string | null
          user_credit_cost?: number | null
          user_id?: string | null
          waited_in_queue?: boolean | null
        }
        Relationships: []
      }
      flyer_maker_test_credits: {
        Row: {
          balance: number
          created_at: string
          granted_amount: number
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          granted_amount?: number
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          granted_amount?: number
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_api_config: {
        Row: {
          id: string
          key_changed_at: string
          total_budget: number
          updated_at: string
        }
        Insert: {
          id?: string
          key_changed_at?: string
          total_budget?: number
          updated_at?: string
        }
        Update: {
          id?: string
          key_changed_at?: string
          total_budget?: number
          updated_at?: string
        }
        Relationships: []
      }
      gpt_image_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          credits_charged: number | null
          error_message: string | null
          id: string
          input_image_urls: string[] | null
          output_url: string | null
          prompt: string
          size: string | null
          status: string | null
          task_id: string | null
          thumbnail_url: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          credits_charged?: number | null
          error_message?: string | null
          id?: string
          input_image_urls?: string[] | null
          output_url?: string | null
          prompt: string
          size?: string | null
          status?: string | null
          task_id?: string | null
          thumbnail_url?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          credits_charged?: number | null
          error_message?: string | null
          id?: string
          input_image_urls?: string[] | null
          output_url?: string | null
          prompt?: string
          size?: string | null
          status?: string | null
          task_id?: string | null
          thumbnail_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      image_generator_jobs: {
        Row: {
          api_account: string | null
          aspect_ratio: string
          completed_at: string | null
          created_at: string
          credits_charged: boolean | null
          credits_refunded: boolean | null
          current_step: string | null
          engine: string | null
          error_message: string | null
          failed_at_step: string | null
          id: string
          input_urls: Json | null
          job_payload: Json | null
          model: string
          output_url: string | null
          position: number | null
          prompt: string
          queue_wait_seconds: number | null
          raw_api_response: Json | null
          raw_webhook_payload: Json | null
          reference_images: Json | null
          rh_cost: number | null
          runninghub_task_id: string | null
          session_id: string | null
          started_at: string | null
          status: string
          step_history: Json | null
          task_id: string | null
          thumbnail_url: string | null
          user_credit_cost: number | null
          user_id: string
          waited_in_queue: boolean | null
        }
        Insert: {
          api_account?: string | null
          aspect_ratio?: string
          completed_at?: string | null
          created_at?: string
          credits_charged?: boolean | null
          credits_refunded?: boolean | null
          current_step?: string | null
          engine?: string | null
          error_message?: string | null
          failed_at_step?: string | null
          id?: string
          input_urls?: Json | null
          job_payload?: Json | null
          model?: string
          output_url?: string | null
          position?: number | null
          prompt: string
          queue_wait_seconds?: number | null
          raw_api_response?: Json | null
          raw_webhook_payload?: Json | null
          reference_images?: Json | null
          rh_cost?: number | null
          runninghub_task_id?: string | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          step_history?: Json | null
          task_id?: string | null
          thumbnail_url?: string | null
          user_credit_cost?: number | null
          user_id: string
          waited_in_queue?: boolean | null
        }
        Update: {
          api_account?: string | null
          aspect_ratio?: string
          completed_at?: string | null
          created_at?: string
          credits_charged?: boolean | null
          credits_refunded?: boolean | null
          current_step?: string | null
          engine?: string | null
          error_message?: string | null
          failed_at_step?: string | null
          id?: string
          input_urls?: Json | null
          job_payload?: Json | null
          model?: string
          output_url?: string | null
          position?: number | null
          prompt?: string
          queue_wait_seconds?: number | null
          raw_api_response?: Json | null
          raw_webhook_payload?: Json | null
          reference_images?: Json | null
          rh_cost?: number | null
          runninghub_task_id?: string | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          step_history?: Json | null
          task_id?: string | null
          thumbnail_url?: string | null
          user_credit_cost?: number | null
          user_id?: string
          waited_in_queue?: boolean | null
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
      landing_cloner_trials: {
        Row: {
          confirmed_at: string | null
          created_at: string
          credits_expire_at: string | null
          credits_granted: number
          email: string
          id: string
          name: string
          token: string
          token_expires_at: string
          user_id: string | null
          whatsapp: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          credits_expire_at?: string | null
          credits_granted?: number
          email: string
          id?: string
          name: string
          token?: string
          token_expires_at?: string
          user_id?: string | null
          whatsapp: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          credits_expire_at?: string | null
          credits_granted?: number
          email?: string
          id?: string
          name?: string
          token?: string
          token_expires_at?: string
          user_id?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      landing_page_trials: {
        Row: {
          code: string
          code_verified: boolean
          created_at: string
          email: string
          expires_at: string
          id: string
          name: string
          tool_name: string
          uses_remaining: number
          uses_total: number
          verified_at: string | null
        }
        Insert: {
          code: string
          code_verified?: boolean
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          name: string
          tool_name?: string
          uses_remaining?: number
          uses_total?: number
          verified_at?: string | null
        }
        Update: {
          code?: string
          code_verified?: boolean
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          name?: string
          tool_name?: string
          uses_remaining?: number
          uses_total?: number
          verified_at?: string | null
        }
        Relationships: []
      }
      meta_ad_insights: {
        Row: {
          account_id: string
          ad_id: string
          ad_name: string
          ad_status: string | null
          adset_id: string
          campaign_id: string
          clicks: number | null
          cpc: number | null
          cpm: number | null
          created_at: string | null
          date: string
          id: string
          impressions: number | null
          initiated_checkouts: number | null
          landing_page_views: number | null
          meta_purchase_value: number
          meta_purchases: number
          spend: number | null
        }
        Insert: {
          account_id: string
          ad_id: string
          ad_name: string
          ad_status?: string | null
          adset_id: string
          campaign_id: string
          clicks?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          date: string
          id?: string
          impressions?: number | null
          initiated_checkouts?: number | null
          landing_page_views?: number | null
          meta_purchase_value?: number
          meta_purchases?: number
          spend?: number | null
        }
        Update: {
          account_id?: string
          ad_id?: string
          ad_name?: string
          ad_status?: string | null
          adset_id?: string
          campaign_id?: string
          clicks?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          date?: string
          id?: string
          impressions?: number | null
          initiated_checkouts?: number | null
          landing_page_views?: number | null
          meta_purchase_value?: number
          meta_purchases?: number
          spend?: number | null
        }
        Relationships: []
      }
      meta_ad_spend: {
        Row: {
          account_id: string
          clicks: number | null
          cpc: number | null
          cpm: number | null
          created_at: string | null
          date: string
          id: string
          impressions: number | null
          initiated_checkouts: number | null
          landing_page_views: number | null
          spend: number
        }
        Insert: {
          account_id: string
          clicks?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          date: string
          id?: string
          impressions?: number | null
          initiated_checkouts?: number | null
          landing_page_views?: number | null
          spend?: number
        }
        Update: {
          account_id?: string
          clicks?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          date?: string
          id?: string
          impressions?: number | null
          initiated_checkouts?: number | null
          landing_page_views?: number | null
          spend?: number
        }
        Relationships: []
      }
      meta_adset_insights: {
        Row: {
          account_id: string
          adset_id: string
          adset_name: string
          adset_status: string | null
          campaign_id: string
          campaign_name: string
          clicks: number | null
          cpc: number | null
          cpm: number | null
          created_at: string | null
          daily_budget: number | null
          date: string
          id: string
          impressions: number | null
          initiated_checkouts: number | null
          landing_page_views: number | null
          meta_purchase_value: number
          meta_purchases: number
          spend: number | null
        }
        Insert: {
          account_id: string
          adset_id: string
          adset_name: string
          adset_status?: string | null
          campaign_id: string
          campaign_name: string
          clicks?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          daily_budget?: number | null
          date: string
          id?: string
          impressions?: number | null
          initiated_checkouts?: number | null
          landing_page_views?: number | null
          meta_purchase_value?: number
          meta_purchases?: number
          spend?: number | null
        }
        Update: {
          account_id?: string
          adset_id?: string
          adset_name?: string
          adset_status?: string | null
          campaign_id?: string
          campaign_name?: string
          clicks?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          daily_budget?: number | null
          date?: string
          id?: string
          impressions?: number | null
          initiated_checkouts?: number | null
          landing_page_views?: number | null
          meta_purchase_value?: number
          meta_purchases?: number
          spend?: number | null
        }
        Relationships: []
      }
      meta_campaign_insights: {
        Row: {
          account_id: string
          campaign_id: string
          campaign_name: string
          campaign_status: string | null
          clicks: number | null
          cpc: number | null
          cpm: number | null
          created_at: string | null
          daily_budget: number | null
          date: string
          id: string
          impressions: number | null
          initiated_checkouts: number | null
          landing_page_views: number | null
          meta_purchase_value: number
          meta_purchases: number
          spend: number | null
        }
        Insert: {
          account_id: string
          campaign_id: string
          campaign_name: string
          campaign_status?: string | null
          clicks?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          daily_budget?: number | null
          date: string
          id?: string
          impressions?: number | null
          initiated_checkouts?: number | null
          landing_page_views?: number | null
          meta_purchase_value?: number
          meta_purchases?: number
          spend?: number | null
        }
        Update: {
          account_id?: string
          campaign_id?: string
          campaign_name?: string
          campaign_status?: string | null
          clicks?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          daily_budget?: number | null
          date?: string
          id?: string
          impressions?: number | null
          initiated_checkouts?: number | null
          landing_page_views?: number | null
          meta_purchase_value?: number
          meta_purchases?: number
          spend?: number | null
        }
        Relationships: []
      }
      meta_capi_logs: {
        Row: {
          client_ip_address: string | null
          client_user_agent: string | null
          created_at: string | null
          currency: string | null
          email: string | null
          event_id: string | null
          event_name: string
          event_source_url: string | null
          fbc: string | null
          fbp: string | null
          id: string
          meta_response_body: string | null
          meta_response_status: number | null
          success: boolean | null
          utm_data: Json | null
          value: number | null
        }
        Insert: {
          client_ip_address?: string | null
          client_user_agent?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          event_id?: string | null
          event_name: string
          event_source_url?: string | null
          fbc?: string | null
          fbp?: string | null
          id?: string
          meta_response_body?: string | null
          meta_response_status?: number | null
          success?: boolean | null
          utm_data?: Json | null
          value?: number | null
        }
        Update: {
          client_ip_address?: string | null
          client_user_agent?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          event_id?: string | null
          event_name?: string
          event_source_url?: string | null
          fbc?: string | null
          fbp?: string | null
          id?: string
          meta_response_body?: string | null
          meta_response_status?: number | null
          success?: boolean | null
          utm_data?: Json | null
          value?: number | null
        }
        Relationships: []
      }
      movieled_maker_jobs: {
        Row: {
          api_account: string
          completed_at: string | null
          created_at: string | null
          credits_charged: boolean | null
          credits_refunded: boolean | null
          current_step: string | null
          engine: string
          error_message: string | null
          failed_at_step: string | null
          id: string
          input_file_name: string | null
          input_image_url: string | null
          input_text: string | null
          job_payload: Json | null
          output_url: string | null
          position: number | null
          queue_wait_seconds: number | null
          raw_api_response: Json | null
          raw_webhook_payload: Json | null
          reference_prompt_id: string | null
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
          engine?: string
          error_message?: string | null
          failed_at_step?: string | null
          id?: string
          input_file_name?: string | null
          input_image_url?: string | null
          input_text?: string | null
          job_payload?: Json | null
          output_url?: string | null
          position?: number | null
          queue_wait_seconds?: number | null
          raw_api_response?: Json | null
          raw_webhook_payload?: Json | null
          reference_prompt_id?: string | null
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
          engine?: string
          error_message?: string | null
          failed_at_step?: string | null
          id?: string
          input_file_name?: string | null
          input_image_url?: string | null
          input_text?: string | null
          job_payload?: Json | null
          output_url?: string | null
          position?: number | null
          queue_wait_seconds?: number | null
          raw_api_response?: Json | null
          raw_webhook_payload?: Json | null
          reference_prompt_id?: string | null
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
      mp_orders: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          meta_fbc: string | null
          meta_fbp: string | null
          meta_user_agent: string | null
          mp_payment_id: string | null
          net_amount: number | null
          paid_at: string | null
          payment_method: string | null
          preference_id: string | null
          product_id: string | null
          status: string
          updated_at: string | null
          user_email: string
          user_id: string | null
          user_name: string | null
          utm_data: Json | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          meta_fbc?: string | null
          meta_fbp?: string | null
          meta_user_agent?: string | null
          mp_payment_id?: string | null
          net_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          preference_id?: string | null
          product_id?: string | null
          status?: string
          updated_at?: string | null
          user_email: string
          user_id?: string | null
          user_name?: string | null
          utm_data?: Json | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          meta_fbc?: string | null
          meta_fbp?: string | null
          meta_user_agent?: string | null
          mp_payment_id?: string | null
          net_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          preference_id?: string | null
          product_id?: string | null
          status?: string
          updated_at?: string | null
          user_email?: string
          user_id?: string | null
          user_name?: string | null
          utm_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mp_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mp_products"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_products: {
        Row: {
          access_type: string | null
          billing_period: string | null
          created_at: string | null
          credits_amount: number | null
          id: string
          is_active: boolean | null
          pack_slug: string | null
          plan_slug: string | null
          price: number
          slug: string
          title: string
          type: string
        }
        Insert: {
          access_type?: string | null
          billing_period?: string | null
          created_at?: string | null
          credits_amount?: number | null
          id?: string
          is_active?: boolean | null
          pack_slug?: string | null
          plan_slug?: string | null
          price: number
          slug: string
          title: string
          type?: string
        }
        Update: {
          access_type?: string | null
          billing_period?: string | null
          created_at?: string | null
          credits_amount?: number | null
          id?: string
          is_active?: boolean | null
          pack_slug?: string | null
          plan_slug?: string | null
          price?: number
          slug?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      pagarme_saved_cards: {
        Row: {
          card_brand: string
          card_last_four: string
          created_at: string
          id: string
          is_active: boolean
          pagarme_card_id: string
          pagarme_customer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_brand?: string
          card_last_four: string
          created_at?: string
          id?: string
          is_active?: boolean
          pagarme_card_id: string
          pagarme_customer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_brand?: string
          card_last_four?: string
          created_at?: string
          id?: string
          is_active?: boolean
          pagarme_card_id?: string
          pagarme_customer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagarme_saved_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          flyer_subcategory: string | null
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
          flyer_subcategory?: string | null
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
          flyer_subcategory?: string | null
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
            referencedRelation: "partner_public_profiles"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "partner_public_profiles"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "partner_public_profiles"
            referencedColumns: ["id"]
          },
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
          gender: string | null
          id: string
          image_url: string
          is_premium: boolean | null
          partner_id: string
          prompt: string
          reference_images: string[] | null
          rejected: boolean | null
          rejected_at: string | null
          rejected_by: string | null
          tags: string[] | null
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
          gender?: string | null
          id?: string
          image_url: string
          is_premium?: boolean | null
          partner_id: string
          prompt: string
          reference_images?: string[] | null
          rejected?: boolean | null
          rejected_at?: string | null
          rejected_by?: string | null
          tags?: string[] | null
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
          gender?: string | null
          id?: string
          image_url?: string
          is_premium?: boolean | null
          partner_id?: string
          prompt?: string
          reference_images?: string[] | null
          rejected?: boolean | null
          rejected_at?: string | null
          rejected_by?: string | null
          tags?: string[] | null
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
            referencedRelation: "partner_public_profiles"
            referencedColumns: ["id"]
          },
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
          avatar_url: string | null
          company: string | null
          created_at: string | null
          email: string
          id: string
          instagram: string | null
          is_active: boolean | null
          name: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          id?: string
          instagram?: string | null
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
      planos2_subscriptions: {
        Row: {
          cost_multiplier: number | null
          created_at: string
          credits_per_month: number
          daily_prompt_limit: number | null
          expires_at: string | null
          gpt_image_free_until: string | null
          greenn_contract_id: string | null
          greenn_product_id: number | null
          has_image_generation: boolean
          has_video_generation: boolean
          id: string
          is_active: boolean
          last_credit_reset_at: string | null
          nano_banana_reset_at: string
          nano_banana_usage_count: number
          pagarme_subscription_id: string | null
          plan_slug: string
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
          veo3_trial_started_at: string | null
        }
        Insert: {
          cost_multiplier?: number | null
          created_at?: string
          credits_per_month?: number
          daily_prompt_limit?: number | null
          expires_at?: string | null
          gpt_image_free_until?: string | null
          greenn_contract_id?: string | null
          greenn_product_id?: number | null
          has_image_generation?: boolean
          has_video_generation?: boolean
          id?: string
          is_active?: boolean
          last_credit_reset_at?: string | null
          nano_banana_reset_at?: string
          nano_banana_usage_count?: number
          pagarme_subscription_id?: string | null
          plan_slug?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
          veo3_trial_started_at?: string | null
        }
        Update: {
          cost_multiplier?: number | null
          created_at?: string
          credits_per_month?: number
          daily_prompt_limit?: number | null
          expires_at?: string | null
          gpt_image_free_until?: string | null
          greenn_contract_id?: string | null
          greenn_product_id?: number | null
          has_image_generation?: boolean
          has_video_generation?: boolean
          id?: string
          is_active?: boolean
          last_credit_reset_at?: string | null
          nano_banana_reset_at?: string
          nano_banana_usage_count?: number
          pagarme_subscription_id?: string | null
          plan_slug?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
          veo3_trial_started_at?: string | null
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
          address_city: string | null
          address_country: string | null
          address_line: string | null
          address_state: string | null
          address_zip: string | null
          avatar_url: string | null
          bio: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          email_verified: boolean
          id: string
          locale: string | null
          name: string | null
          password_changed: boolean | null
          phone: string | null
          recovery_email: string | null
          runninghub_bonus_claimed: boolean | null
          updated_at: string | null
          warranty_waivers: Json
        }
        Insert: {
          address_city?: string | null
          address_country?: string | null
          address_line?: string | null
          address_state?: string | null
          address_zip?: string | null
          avatar_url?: string | null
          bio?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          email_verified?: boolean
          id: string
          locale?: string | null
          name?: string | null
          password_changed?: boolean | null
          phone?: string | null
          recovery_email?: string | null
          runninghub_bonus_claimed?: boolean | null
          updated_at?: string | null
          warranty_waivers?: Json
        }
        Update: {
          address_city?: string | null
          address_country?: string | null
          address_line?: string | null
          address_state?: string | null
          address_zip?: string | null
          avatar_url?: string | null
          bio?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          email_verified?: boolean
          id?: string
          locale?: string | null
          name?: string | null
          password_changed?: boolean | null
          phone?: string | null
          recovery_email?: string | null
          runninghub_bonus_claimed?: boolean | null
          updated_at?: string | null
          warranty_waivers?: Json
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
      prompt_likes: {
        Row: {
          created_at: string
          id: string
          prompt_id: string
          prompt_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt_id: string
          prompt_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt_id?: string
          prompt_type?: string
          user_id?: string
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
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          credits_given_referred: number
          credits_given_referrer: number
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          credits_given_referred?: number
          credits_given_referrer?: number
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          credits_given_referred?: number
          credits_given_referrer?: number
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_email_templates: {
        Row: {
          body_html: string
          day_offset: number
          id: number
          preheader: string
          subject: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body_html: string
          day_offset: number
          id?: number
          preheader?: string
          subject: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body_html?: string
          day_offset?: number
          id?: number
          preheader?: string
          subject?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      saved_characters: {
        Row: {
          created_at: string | null
          gender: string | null
          id: string
          image_url: string
          job_id: string | null
          name: string
          reference_image_url: string | null
          thumbnail_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          gender?: string | null
          id?: string
          image_url: string
          job_id?: string | null
          name: string
          reference_image_url?: string | null
          thumbnail_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          gender?: string | null
          id?: string
          image_url?: string
          job_id?: string | null
          name?: string
          reference_image_url?: string | null
          thumbnail_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      seedance_jobs: {
        Row: {
          aspect_ratio: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string | null
          credits_charged: number | null
          duration: number | null
          error_message: string | null
          generate_audio: boolean | null
          id: string
          input_audio_urls: string[] | null
          input_image_urls: string[] | null
          input_video_urls: string[] | null
          model: string
          output_url: string | null
          prompt: string
          quality: string | null
          status: string | null
          task_id: string | null
          thumbnail_url: string | null
          user_id: string
        }
        Insert: {
          aspect_ratio?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          credits_charged?: number | null
          duration?: number | null
          error_message?: string | null
          generate_audio?: boolean | null
          id?: string
          input_audio_urls?: string[] | null
          input_image_urls?: string[] | null
          input_video_urls?: string[] | null
          model: string
          output_url?: string | null
          prompt: string
          quality?: string | null
          status?: string | null
          task_id?: string | null
          thumbnail_url?: string | null
          user_id: string
        }
        Update: {
          aspect_ratio?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          credits_charged?: number | null
          duration?: number | null
          error_message?: string | null
          generate_audio?: boolean | null
          id?: string
          input_audio_urls?: string[] | null
          input_image_urls?: string[] | null
          input_video_urls?: string[] | null
          model?: string
          output_url?: string | null
          prompt?: string
          quality?: string | null
          status?: string | null
          task_id?: string | null
          thumbnail_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      solicitacoes_colaboradores: {
        Row: {
          aceite_termo: boolean
          created_at: string
          email: string
          id: string
          instagram: string
          nome: string
          portfolio: string
          senha: string | null
          status: string
          whatsapp: string
        }
        Insert: {
          aceite_termo?: boolean
          created_at?: string
          email: string
          id?: string
          instagram: string
          nome: string
          portfolio: string
          senha?: string | null
          status?: string
          whatsapp: string
        }
        Update: {
          aceite_termo?: boolean
          created_at?: string
          email?: string
          id?: string
          instagram?: string
          nome?: string
          portfolio?: string
          senha?: string | null
          status?: string
          whatsapp?: string
        }
        Relationships: []
      }
      stripe_orders: {
        Row: {
          amount: number
          amount_usd: number | null
          created_at: string | null
          currency: string
          id: string
          meta_fbc: string | null
          meta_fbp: string | null
          meta_user_agent: string | null
          net_amount: number | null
          paid_at: string | null
          payment_method: string | null
          product_id: string | null
          product_slug: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
          utm_data: Json | null
        }
        Insert: {
          amount: number
          amount_usd?: number | null
          created_at?: string | null
          currency?: string
          id?: string
          meta_fbc?: string | null
          meta_fbp?: string | null
          meta_user_agent?: string | null
          net_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          product_id?: string | null
          product_slug?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          utm_data?: Json | null
        }
        Update: {
          amount?: number
          amount_usd?: number | null
          created_at?: string | null
          currency?: string
          id?: string
          meta_fbc?: string | null
          meta_fbp?: string | null
          meta_user_agent?: string | null
          net_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          product_id?: string | null
          product_slug?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          utm_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mp_products"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_billing_reminders: {
        Row: {
          checkout_url: string | null
          created_at: string
          day_offset: number
          due_date: string
          email_sent_to: string
          id: string
          plan_slug: string
          sent_at: string
          stopped_reason: string | null
          subscription_id: string
          user_id: string
        }
        Insert: {
          checkout_url?: string | null
          created_at?: string
          day_offset: number
          due_date: string
          email_sent_to: string
          id?: string
          plan_slug: string
          sent_at?: string
          stopped_reason?: string | null
          subscription_id: string
          user_id: string
        }
        Update: {
          checkout_url?: string | null
          created_at?: string
          day_offset?: number
          due_date?: string
          email_sent_to?: string
          id?: string
          plan_slug?: string
          sent_at?: string
          stopped_reason?: string | null
          subscription_id?: string
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
          landing_trial_expires_at: string | null
          lifetime_balance: number
          monthly_balance: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          id?: string
          landing_trial_expires_at?: string | null
          lifetime_balance?: number
          monthly_balance?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          id?: string
          landing_trial_expires_at?: string | null
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
      user_google_api_keys: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          total_credits: number | null
          updated_at: string | null
          used_credits: number | null
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string | null
          id?: string
          total_credits?: number | null
          updated_at?: string | null
          used_credits?: number | null
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          total_credits?: number | null
          updated_at?: string | null
          used_credits?: number | null
          user_id?: string
        }
        Relationships: []
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
      video_generation_queue: {
        Row: {
          aspect_ratio: string
          context: string | null
          created_at: string
          duration: number
          error_message: string | null
          id: string
          operation_name: string | null
          processing_started_at: string | null
          prompt: string
          provider: string
          quality: string
          raw_input_text: string | null
          reference_image_url: string | null
          retry_count: number | null
          rh_generated_prompt: string | null
          rh_image_url: string | null
          status: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          aspect_ratio?: string
          context?: string | null
          created_at?: string
          duration?: number
          error_message?: string | null
          id?: string
          operation_name?: string | null
          processing_started_at?: string | null
          prompt: string
          provider?: string
          quality?: string
          raw_input_text?: string | null
          reference_image_url?: string | null
          retry_count?: number | null
          rh_generated_prompt?: string | null
          rh_image_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          aspect_ratio?: string
          context?: string | null
          created_at?: string
          duration?: number
          error_message?: string | null
          id?: string
          operation_name?: string | null
          processing_started_at?: string | null
          prompt?: string
          provider?: string
          quality?: string
          raw_input_text?: string | null
          reference_image_url?: string | null
          retry_count?: number | null
          rh_generated_prompt?: string | null
          rh_image_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      video_generator_jobs: {
        Row: {
          api_account: string
          aspect_ratio: string
          completed_at: string | null
          created_at: string
          credits_charged: boolean | null
          credits_refunded: boolean | null
          current_step: string | null
          duration_seconds: number
          end_frame_url: string | null
          error_message: string | null
          failed_at_step: string | null
          id: string
          job_payload: Json | null
          model: string
          operation_name: string | null
          output_url: string | null
          position: number | null
          prompt: string
          queue_wait_seconds: number | null
          raw_api_response: Json | null
          raw_webhook_payload: Json | null
          rh_cost: number | null
          session_id: string | null
          start_frame_url: string | null
          started_at: string | null
          status: string
          step_history: Json | null
          task_id: string | null
          thumbnail_url: string | null
          user_credit_cost: number | null
          user_id: string
          waited_in_queue: boolean | null
        }
        Insert: {
          api_account?: string
          aspect_ratio?: string
          completed_at?: string | null
          created_at?: string
          credits_charged?: boolean | null
          credits_refunded?: boolean | null
          current_step?: string | null
          duration_seconds?: number
          end_frame_url?: string | null
          error_message?: string | null
          failed_at_step?: string | null
          id?: string
          job_payload?: Json | null
          model?: string
          operation_name?: string | null
          output_url?: string | null
          position?: number | null
          prompt: string
          queue_wait_seconds?: number | null
          raw_api_response?: Json | null
          raw_webhook_payload?: Json | null
          rh_cost?: number | null
          session_id?: string | null
          start_frame_url?: string | null
          started_at?: string | null
          status?: string
          step_history?: Json | null
          task_id?: string | null
          thumbnail_url?: string | null
          user_credit_cost?: number | null
          user_id: string
          waited_in_queue?: boolean | null
        }
        Update: {
          api_account?: string
          aspect_ratio?: string
          completed_at?: string | null
          created_at?: string
          credits_charged?: boolean | null
          credits_refunded?: boolean | null
          current_step?: string | null
          duration_seconds?: number
          end_frame_url?: string | null
          error_message?: string | null
          failed_at_step?: string | null
          id?: string
          job_payload?: Json | null
          model?: string
          operation_name?: string | null
          output_url?: string | null
          position?: number | null
          prompt?: string
          queue_wait_seconds?: number | null
          raw_api_response?: Json | null
          raw_webhook_payload?: Json | null
          rh_cost?: number | null
          session_id?: string | null
          start_frame_url?: string | null
          started_at?: string | null
          status?: string
          step_history?: Json | null
          task_id?: string | null
          thumbnail_url?: string | null
          user_credit_cost?: number | null
          user_id?: string
          waited_in_queue?: boolean | null
        }
        Relationships: []
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
          amount: number | null
          amount_brl: number | null
          currency: string | null
          email: string | null
          error_message: string | null
          event_type: string | null
          from_app: boolean | null
          greenn_contract_id: string | null
          id: string
          mapping_type: string | null
          net_amount: number | null
          payload: Json
          payment_method: string | null
          platform: string | null
          product_id: number | null
          product_name: string | null
          received_at: string | null
          result: string | null
          status: string | null
          transaction_id: string | null
          utm_data: Json | null
          utm_source: string | null
        }
        Insert: {
          amount?: number | null
          amount_brl?: number | null
          currency?: string | null
          email?: string | null
          error_message?: string | null
          event_type?: string | null
          from_app?: boolean | null
          greenn_contract_id?: string | null
          id?: string
          mapping_type?: string | null
          net_amount?: number | null
          payload: Json
          payment_method?: string | null
          platform?: string | null
          product_id?: number | null
          product_name?: string | null
          received_at?: string | null
          result?: string | null
          status?: string | null
          transaction_id?: string | null
          utm_data?: Json | null
          utm_source?: string | null
        }
        Update: {
          amount?: number | null
          amount_brl?: number | null
          currency?: string | null
          email?: string | null
          error_message?: string | null
          event_type?: string | null
          from_app?: boolean | null
          greenn_contract_id?: string | null
          id?: string
          mapping_type?: string | null
          net_amount?: number | null
          payload?: Json
          payment_method?: string | null
          platform?: string | null
          product_id?: number | null
          product_name?: string | null
          received_at?: string | null
          result?: string | null
          status?: string | null
          transaction_id?: string | null
          utm_data?: Json | null
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
      partner_public_profiles: {
        Row: {
          avatar_url: string | null
          id: string | null
          instagram: string | null
          name: string | null
        }
        Insert: {
          avatar_url?: string | null
          id?: string | null
          instagram?: string | null
          name?: string | null
        }
        Update: {
          avatar_url?: string | null
          id?: string | null
          instagram?: string | null
          name?: string | null
        }
        Relationships: []
      }
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
      admin_search_pack_clients: {
        Args: {
          p_pack_filter?: string
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_sort_direction?: string
          p_sort_field?: string
          p_status_filter?: string
        }
        Returns: Json
      }
      check_collaborator_email: { Args: { p_email: string }; Returns: Json }
      check_device_signup_limit: {
        Args: { p_fingerprint: string }
        Returns: boolean
      }
      check_landing_trial_status: {
        Args: { _user_id: string }
        Returns: {
          credits_expired: boolean
          is_landing_trial: boolean
        }[]
      }
      check_nano_banana_limit: { Args: { _user_id: string }; Returns: Json }
      check_profile_exists: {
        Args: { check_email: string }
        Returns: {
          created_at: string
          exists_in_auth: boolean
          exists_in_db: boolean
          has_logged_in: boolean
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
      check_veo3_unlimited_trial: { Args: { _user_id: string }; Returns: Json }
      claim_arcano_free_trial_atomic: {
        Args: { p_email: string; p_user_id: string }
        Returns: {
          already_claimed: boolean
          credits_granted: number
        }[]
      }
      cleanup_all_stale_ai_jobs: {
        Args: never
        Returns: {
          arcano_cancelled: number
          arcano_refunded: number
          bgremover_cancelled: number
          bgremover_refunded: number
          chargen_cancelled: number
          chargen_refunded: number
          flyer_cancelled: number
          flyer_refunded: number
          imggen_cancelled: number
          imggen_refunded: number
          movieled_cancelled: number
          movieled_refunded: number
          pose_cancelled: number
          pose_refunded: number
          upscaler_cancelled: number
          upscaler_refunded: number
          veste_cancelled: number
          veste_refunded: number
          video_cancelled: number
          video_refunded: number
          videogen_cancelled: number
          videogen_refunded: number
        }[]
      }
      cleanup_expired_ai_jobs: { Args: never; Returns: Json }
      cleanup_monthly_logs: { Args: never; Returns: undefined }
      cleanup_old_logs: { Args: never; Returns: undefined }
      cleanup_orphaned_checkout_orders: { Args: never; Returns: number }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      cleanup_stale_pose_changer_jobs: { Args: never; Returns: undefined }
      cleanup_stale_upscaler_jobs: { Args: never; Returns: undefined }
      cleanup_stale_veste_ai_jobs: { Args: never; Returns: undefined }
      consume_credits_for_job: {
        Args: {
          _amount: number
          _description: string
          _job_id: string
          _job_table: string
          _user_id: string
        }
        Returns: {
          already_charged: boolean
          error_message: string
          remaining_balance: number
          success: boolean
        }[]
      }
      consume_flyer_test_credits: {
        Args: { _amount: number; _user_id: string }
        Returns: {
          remaining: number
          test_used: number
        }[]
      }
      consume_upscaler_credits: {
        Args: { _amount: number; _description?: string; _user_id: string }
        Returns: {
          error_message: string
          remaining_balance: number
          success: boolean
        }[]
      }
      consume_upscaler_credits_forced: {
        Args: { _amount: number; _description?: string; _user_id: string }
        Returns: {
          error_message: string
          new_balance: number
          success: boolean
        }[]
      }
      convert_to_brl: {
        Args: { _amount: number; _currency: string }
        Returns: number
      }
      deactivate_expired_subscriptions: { Args: never; Returns: Json }
      delete_user_ai_creation: {
        Args: { p_creation_id: string }
        Returns: boolean
      }
      expire_landing_trial_credits: {
        Args: { _user_id: string }
        Returns: {
          new_balance: number
          was_expired: boolean
        }[]
      }
      expire_legacy_premium_users: {
        Args: never
        Returns: {
          users_expired: number
        }[]
      }
      expire_planos2_subscriptions: {
        Args: never
        Returns: {
          users_expired: number
        }[]
      }
      get_ai_tools_completed_by_tool: {
        Args: {
          p_end_date?: string
          p_search_term?: string
          p_start_date?: string
          p_status_filter?: string
          p_tool_filter?: string
        }
        Returns: {
          completed_count: number
          tool_name: string
        }[]
      }
      get_ai_tools_cost_averages: {
        Args: never
        Returns: {
          avg_rh_cost: number
          avg_user_credits: number
          tool_name: string
          total_completed: number
          total_rh_cost: number
          total_user_credits: number
        }[]
      }
      get_ai_tools_usage:
        | {
            Args: {
              p_end_date?: string
              p_page?: number
              p_page_size?: number
              p_start_date?: string
              p_tool_filter?: string
            }
            Returns: {
              completed_at: string
              created_at: string
              error_message: string
              failed_at_step: string
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
              failed_at_step: string
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
        Args: {
          p_end_date?: string
          p_start_date?: string
          p_tool_filter?: string
        }
        Returns: number
      }
      get_ai_tools_usage_count_v2: {
        Args: {
          p_end_date?: string
          p_search_term?: string
          p_start_date?: string
          p_status_filter?: string
          p_tool_filter?: string
        }
        Returns: number
      }
      get_ai_tools_usage_summary: {
        Args: {
          p_end_date?: string
          p_start_date?: string
          p_tool_filter?: string
        }
        Returns: {
          avg_processing_seconds: number
          avg_queue_wait: number
          completed_jobs: number
          failed_jobs: number
          queued_jobs: number
          total_credits: number
          total_jobs: number
          total_profit: number
          total_rh_cost: number
        }[]
      }
      get_ai_tools_usage_summary_v2: {
        Args: {
          p_end_date?: string
          p_search_term?: string
          p_start_date?: string
          p_status_filter?: string
          p_tool_filter?: string
        }
        Returns: {
          avg_processing_seconds: number
          avg_queue_wait: number
          completed_jobs: number
          failed_jobs: number
          queued_jobs: number
          total_credits: number
          total_jobs: number
          total_profit: number
          total_rh_cost: number
        }[]
      }
      get_ai_tools_usage_v2: {
        Args: {
          p_end_date?: string
          p_page?: number
          p_page_size?: number
          p_search_term?: string
          p_start_date?: string
          p_status_filter?: string
          p_tool_filter?: string
        }
        Returns: {
          completed_at: string
          created_at: string
          error_message: string
          failed_at_step: string
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
      get_arte_click_counts: {
        Args: never
        Returns: {
          arte_id: string
          click_count: number
        }[]
      }
      get_daily_arte_copy_count: { Args: { _user_id: string }; Returns: number }
      get_daily_copy_count: { Args: { _user_id: string }; Returns: number }
      get_daily_musicos_download_count: {
        Args: { _user_id: string }
        Returns: number
      }
      get_daily_premium_unlock_count: {
        Args: { _user_id: string }
        Returns: number
      }
      get_flyer_test_credits: { Args: { _user_id: string }; Returns: number }
      get_mp_dashboard_orders: {
        Args: { _end: string; _start: string }
        Returns: {
          amount: number
          created_at: string
          id: string
          net_amount: number
          paid_at: string
          payment_method: string
          product_id: string
          product_title: string
          status: string
          user_email: string
          utm_data: Json
        }[]
      }
      get_or_create_referral_code: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_platform_stats: { Args: never; Returns: Json }
      get_prompt_click_counts: {
        Args: never
        Returns: {
          click_count: number
          prompt_id: string
        }[]
      }
      get_prompt_like_counts: {
        Args: never
        Returns: {
          like_count: number
          prompt_id: string
        }[]
      }
      get_receita_por_credito: { Args: never; Returns: Json }
      get_unified_dashboard_orders: {
        Args: { _end: string; _start: string }
        Returns: {
          amount: number
          created_at: string
          id: string
          net_amount: number
          paid_at: string
          payment_method: string
          product_id: string
          product_title: string
          source_platform: string
          status: string
          user_email: string
          user_name: string
          utm_data: Json
          whatsapp_welcome_sent: boolean
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
      get_user_unlocked_prompts_today: {
        Args: { _user_id: string }
        Returns: {
          prompt_id: string
        }[]
      }
      get_warranty_waiver_emails: {
        Args: never
        Returns: {
          email: string
          last_waived_at: string
          waivers: Json
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
      increment_nano_banana_usage: {
        Args: { _user_id: string }
        Returns: undefined
      }
      is_premium: { Args: never; Returns: boolean }
      is_premium_artes: { Args: never; Returns: boolean }
      is_premium_musicos: { Args: never; Returns: boolean }
      is_unlimited_subscriber: { Args: { _user_id: string }; Returns: boolean }
      mark_pending_job_as_failed: {
        Args: {
          p_error_message?: string
          p_job_id: string
          p_table_name: string
        }
        Returns: boolean
      }
      process_referral: {
        Args: { p_referral_code: string; p_referred_user_id: string }
        Returns: {
          error_message: string
          success: boolean
        }[]
      }
      recalculate_webhook_amounts_brl: {
        Args: never
        Returns: {
          updated_count: number
        }[]
      }
      reconcile_stuck_gemini_video_jobs: { Args: never; Returns: undefined }
      record_warranty_waiver: {
        Args: { _tool_slug: string; _version_slug?: string }
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
      register_device_signup: {
        Args: { p_fingerprint: string; p_user_id: string }
        Returns: undefined
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
      reset_individual_monthly_credits: {
        Args: never
        Returns: {
          users_reset: number
        }[]
      }
      reset_planos2_monthly_credits: {
        Args: never
        Returns: {
          users_reset: number
        }[]
      }
      reset_upscaler_credits: {
        Args: { _amount: number; _description?: string; _user_id: string }
        Returns: {
          new_balance: number
          success: boolean
        }[]
      }
      revoke_credits_on_refund: {
        Args: { _amount: number; _description?: string; _user_id: string }
        Returns: {
          amount_revoked: number
          new_balance: number
          success: boolean
        }[]
      }
      revoke_lifetime_credits_on_refund: {
        Args: { _amount: number; _description?: string; _user_id: string }
        Returns: {
          amount_revoked: number
          error_message: string
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
