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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      collections: {
        Row: {
          collection_number: number | null
          created_at: string
          description: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          name: string
          published_at: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          collection_number?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          name: string
          published_at?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          collection_number?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          name?: string
          published_at?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      item_ai_suggestions: {
        Row: {
          accepted_description: boolean | null
          accepted_name: boolean | null
          created_at: string
          id: string
          item_id: string
          photo_id: string
          suggested_description: string | null
          suggested_name: string | null
          suggested_size: string | null
        }
        Insert: {
          accepted_description?: boolean | null
          accepted_name?: boolean | null
          created_at?: string
          id?: string
          item_id: string
          photo_id: string
          suggested_description?: string | null
          suggested_name?: string | null
          suggested_size?: string | null
        }
        Update: {
          accepted_description?: boolean | null
          accepted_name?: boolean | null
          created_at?: string
          id?: string
          item_id?: string
          photo_id?: string
          suggested_description?: string | null
          suggested_name?: string | null
          suggested_size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_ai_suggestions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_ai_suggestions_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "item_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      item_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          item_id: string
          user_id: string
          vendor_reaction: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          item_id: string
          user_id: string
          vendor_reaction?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          item_id?: string
          user_id?: string
          vendor_reaction?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_comments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_photos: {
        Row: {
          ai_analyzed: boolean
          created_at: string
          id: string
          is_primary: boolean
          item_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          ai_analyzed?: boolean
          created_at?: string
          id?: string
          is_primary?: boolean
          item_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          ai_analyzed?: boolean
          created_at?: string
          id?: string
          is_primary?: boolean
          item_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_photos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_saves: {
        Row: {
          id: string
          item_id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          saved_at?: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_saves_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_views: {
        Row: {
          id: string
          item_id: string
          session_id: string | null
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          item_id: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_views_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_visibility_settings: {
        Row: {
          id: string
          item_id: string
          show_description: boolean
          show_name: boolean
          show_price: boolean
          show_quantity: boolean
          show_size: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          item_id: string
          show_description?: boolean
          show_name?: boolean
          show_price?: boolean
          show_quantity?: boolean
          show_size?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          show_description?: boolean
          show_name?: boolean
          show_price?: boolean
          show_quantity?: boolean
          show_size?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_visibility_settings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          archived_at: string | null
          collection_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string
          name: string | null
          price: number | null
          quantity_available: number
          size: string | null
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          archived_at?: string | null
          collection_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          name?: string | null
          price?: number | null
          quantity_available?: number
          size?: string | null
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          archived_at?: string | null
          collection_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          name?: string | null
          price?: number | null
          quantity_available?: number
          size?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
