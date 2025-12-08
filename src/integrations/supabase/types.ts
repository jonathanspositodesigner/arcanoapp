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
          bonus_clicks: number
          category: string
          created_at: string | null
          description: string | null
          download_url: string | null
          id: string
          image_url: string
          is_premium: boolean
          title: string
          tutorial_url: string | null
          updated_at: string | null
        }
        Insert: {
          bonus_clicks?: number
          category: string
          created_at?: string | null
          description?: string | null
          download_url?: string | null
          id?: string
          image_url: string
          is_premium?: boolean
          title: string
          tutorial_url?: string | null
          updated_at?: string | null
        }
        Update: {
          bonus_clicks?: number
          category?: string
          created_at?: string | null
          description?: string | null
          download_url?: string | null
          id?: string
          image_url?: string
          is_premium?: boolean
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
      admin_prompts: {
        Row: {
          bonus_clicks: number
          category: string
          created_at: string | null
          id: string
          image_url: string
          is_premium: boolean
          prompt: string
          reference_images: string[] | null
          title: string
          tutorial_url: string | null
          updated_at: string | null
        }
        Insert: {
          bonus_clicks?: number
          category: string
          created_at?: string | null
          id?: string
          image_url: string
          is_premium?: boolean
          prompt: string
          reference_images?: string[] | null
          title: string
          tutorial_url?: string | null
          updated_at?: string | null
        }
        Update: {
          bonus_clicks?: number
          category?: string
          created_at?: string | null
          id?: string
          image_url?: string
          is_premium?: boolean
          prompt?: string
          reference_images?: string[] | null
          title?: string
          tutorial_url?: string | null
          updated_at?: string | null
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
      arte_clicks: {
        Row: {
          arte_id: string
          arte_title: string
          clicked_at: string
          id: string
          is_admin_arte: boolean
        }
        Insert: {
          arte_id: string
          arte_title: string
          clicked_at?: string
          id?: string
          is_admin_arte?: boolean
        }
        Update: {
          arte_id?: string
          arte_title?: string
          clicked_at?: string
          id?: string
          is_admin_arte?: boolean
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
          title?: string
          updated_at?: string | null
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
      page_views: {
        Row: {
          device_type: string
          id: string
          page_path: string
          user_agent: string | null
          viewed_at: string
        }
        Insert: {
          device_type?: string
          id?: string
          page_path: string
          user_agent?: string | null
          viewed_at?: string
        }
        Update: {
          device_type?: string
          id?: string
          page_path?: string
          user_agent?: string | null
          viewed_at?: string
        }
        Relationships: []
      }
      partner_artes: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          bonus_clicks: number
          category: string
          created_at: string | null
          deletion_requested: boolean | null
          deletion_requested_at: string | null
          description: string | null
          download_url: string | null
          id: string
          image_url: string
          is_premium: boolean | null
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
          category: string
          created_at?: string | null
          deletion_requested?: boolean | null
          deletion_requested_at?: string | null
          description?: string | null
          download_url?: string | null
          id?: string
          image_url: string
          is_premium?: boolean | null
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
          category?: string
          created_at?: string | null
          deletion_requested?: boolean | null
          deletion_requested_at?: string | null
          description?: string | null
          download_url?: string | null
          id?: string
          image_url?: string
          is_premium?: boolean | null
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
          name: string | null
          password_changed: boolean | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          password_changed?: boolean | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          password_changed?: boolean | null
          phone?: string | null
          updated_at?: string | null
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_daily_copy_count: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_premium: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "partner"
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
    },
  },
} as const
