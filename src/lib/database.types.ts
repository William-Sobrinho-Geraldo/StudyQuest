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
      profiles: {
        Row: {
          avatar_id: string | null
          created_at: string
          current_streak: number
          current_xp: number
          daily_goal_minutes: number
          display_name: string | null
          equipped_title: string | null
          gold: number
          id: string
          last_chest_claim: string
          last_streak_date: string | null
          level: number
          player_tag: string | null
          unlocked_titles: string[]
        }
        Insert: {
          avatar_id?: string | null
          created_at?: string
          current_streak?: number
          current_xp?: number
          daily_goal_minutes?: number
          display_name?: string | null
          equipped_title?: string | null
          gold?: number
          id: string
          last_chest_claim?: string
          last_streak_date?: string | null
          level?: number
          player_tag?: string | null
          unlocked_titles?: string[]
        }
        Update: {
          avatar_id?: string | null
          created_at?: string
          current_streak?: number
          current_xp?: number
          daily_goal_minutes?: number
          display_name?: string | null
          equipped_title?: string | null
          gold?: number
          id?: string
          last_chest_claim?: string
          last_streak_date?: string | null
          level?: number
          player_tag?: string | null
          unlocked_titles?: string[]
        }
        Relationships: []
      }
      friendships: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_id?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          created_at: string
          enhancement_level: number
          equipped: boolean
          id: string
          item_category: string
          item_level: number
          name: string | null
          quantity: number
          rarity: string
          stats: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          enhancement_level?: number
          equipped?: boolean
          id?: string
          item_category: string
          item_level?: number
          name?: string | null
          quantity?: number
          rarity: string
          stats?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          enhancement_level?: number
          equipped?: boolean
          id?: string
          item_category?: string
          item_level?: number
          name?: string | null
          quantity?: number
          rarity?: string
          stats?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      rotating_shop: {
        Row: {
          created_at: string
          next_refresh_at: string
          refreshes_today: number
          slot_1_attack: number | null
          slot_1_bought: boolean
          slot_1_category: string | null
          slot_1_defense: number | null
          slot_1_hp: number | null
          slot_1_level: number | null
          slot_1_name: string | null
          slot_1_price: number | null
          slot_1_rarity: string | null
          slot_2_attack: number | null
          slot_2_bought: boolean
          slot_2_category: string | null
          slot_2_defense: number | null
          slot_2_hp: number | null
          slot_2_level: number | null
          slot_2_name: string | null
          slot_2_price: number | null
          slot_2_rarity: string | null
          slot_3_attack: number | null
          slot_3_bought: boolean
          slot_3_category: string | null
          slot_3_defense: number | null
          slot_3_hp: number | null
          slot_3_level: number | null
          slot_3_name: string | null
          slot_3_price: number | null
          slot_3_rarity: string | null
          slot_4_attack: number | null
          slot_4_bought: boolean
          slot_4_category: string | null
          slot_4_defense: number | null
          slot_4_hp: number | null
          slot_4_level: number | null
          slot_4_name: string | null
          slot_4_price: number | null
          slot_4_rarity: string | null
          slot_5_attack: number | null
          slot_5_bought: boolean
          slot_5_category: string | null
          slot_5_defense: number | null
          slot_5_hp: number | null
          slot_5_level: number | null
          slot_5_name: string | null
          slot_5_price: number | null
          slot_5_rarity: string | null
          slot_6_attack: number | null
          slot_6_bought: boolean
          slot_6_category: string | null
          slot_6_defense: number | null
          slot_6_hp: number | null
          slot_6_level: number | null
          slot_6_name: string | null
          slot_6_price: number | null
          slot_6_rarity: string
          user_id: string
        }
        Insert: {
          created_at?: string
          next_refresh_at?: string
          refreshes_today?: number
          slot_1_attack?: number | null
          slot_1_bought?: boolean
          slot_1_category?: string | null
          slot_1_defense?: number | null
          slot_1_hp?: number | null
          slot_1_level?: number | null
          slot_1_name?: string | null
          slot_1_price?: number | null
          slot_1_rarity?: string | null
          slot_2_attack?: number | null
          slot_2_bought?: boolean
          slot_2_category?: string | null
          slot_2_defense?: number | null
          slot_2_hp?: number | null
          slot_2_level?: number | null
          slot_2_name?: string | null
          slot_2_price?: number | null
          slot_2_rarity?: string | null
          slot_3_attack?: number | null
          slot_3_bought?: boolean
          slot_3_category?: string | null
          slot_3_defense?: number | null
          slot_3_hp?: number | null
          slot_3_level?: number | null
          slot_3_name?: string | null
          slot_3_price?: number | null
          slot_3_rarity?: string | null
          slot_4_attack?: number | null
          slot_4_bought?: boolean
          slot_4_category?: string | null
          slot_4_defense?: number | null
          slot_4_hp?: number | null
          slot_4_level?: number | null
          slot_4_name?: string | null
          slot_4_price?: number | null
          slot_4_rarity?: string | null
          slot_5_attack?: number | null
          slot_5_bought?: boolean
          slot_5_category?: string | null
          slot_5_defense?: number | null
          slot_5_hp?: number | null
          slot_5_level?: number | null
          slot_5_name?: string | null
          slot_5_price?: number | null
          slot_5_rarity?: string | null
          slot_6_attack?: number | null
          slot_6_bought?: boolean
          slot_6_category?: string | null
          slot_6_defense?: number | null
          slot_6_hp?: number | null
          slot_6_level?: number | null
          slot_6_name?: string | null
          slot_6_price?: number | null
          slot_6_rarity?: string
          user_id: string
        }
        Update: {
          created_at?: string
          next_refresh_at?: string
          refreshes_today?: number
          slot_1_attack?: number | null
          slot_1_bought?: boolean
          slot_1_category?: string | null
          slot_1_defense?: number | null
          slot_1_hp?: number | null
          slot_1_level?: number | null
          slot_1_name?: string | null
          slot_1_price?: number | null
          slot_1_rarity?: string | null
          slot_2_attack?: number | null
          slot_2_bought?: boolean
          slot_2_category?: string | null
          slot_2_defense?: number | null
          slot_2_hp?: number | null
          slot_2_level?: number | null
          slot_2_name?: string | null
          slot_2_price?: number | null
          slot_2_rarity?: string | null
          slot_3_attack?: number | null
          slot_3_bought?: boolean
          slot_3_category?: string | null
          slot_3_defense?: number | null
          slot_3_hp?: number | null
          slot_3_level?: number | null
          slot_3_name?: string | null
          slot_3_price?: number | null
          slot_3_rarity?: string | null
          slot_4_attack?: number | null
          slot_4_bought?: boolean
          slot_4_category?: string | null
          slot_4_defense?: number | null
          slot_4_hp?: number | null
          slot_4_level?: number | null
          slot_4_name?: string | null
          slot_4_price?: number | null
          slot_4_rarity?: string | null
          slot_5_attack?: number | null
          slot_5_bought?: boolean
          slot_5_category?: string | null
          slot_5_defense?: number | null
          slot_5_hp?: number | null
          slot_5_level?: number | null
          slot_5_name?: string | null
          slot_5_price?: number | null
          slot_5_rarity?: string | null
          slot_6_attack?: number | null
          slot_6_bought?: boolean
          slot_6_category?: string | null
          slot_6_defense?: number | null
          slot_6_hp?: number | null
          slot_6_level?: number | null
          slot_6_name?: string | null
          slot_6_price?: number | null
          slot_6_rarity?: string
          user_id?: string
        }
        Relationships: []
      }
      quest_claims: {
        Row: {
          claimed_at: string
          quest_id: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          quest_id: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          quest_id?: string
          user_id?: string
        }
        Relationships: []
      }
      quests: {
        Row: {
          category: string
          description: string
          enabled: boolean
          id: string
          metric: string
          period: string
          reward_gold: number
          reward_xp: number
          target: number
          title: string
          trail: string | null
        }
        Insert: {
          category: string
          description: string
          enabled?: boolean
          id: string
          metric: string
          period: string
          reward_gold?: number
          reward_xp?: number
          target: number
          title: string
          trail?: string | null
        }
        Update: {
          category?: string
          description?: string
          enabled?: boolean
          id?: string
          metric?: string
          period?: string
          reward_gold?: number
          reward_xp?: number
          target?: number
          title?: string
          trail?: string | null
        }
        Relationships: []
      }
      rewards_log: {
        Row: {
          created_at: string
          gold: number
          id: number
          source: string
          source_id: string | null
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          gold?: number
          id?: number
          source: string
          source_id?: string | null
          user_id: string
          xp?: number
        }
        Update: {
          created_at?: string
          gold?: number
          id?: number
          source?: string
          source_id?: string | null
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          completed_at: string
          duration_minutes: number
          gold: number
          id: string
          started_at: string
          user_id: string
          xp: number
        }
        Insert: {
          completed_at?: string
          duration_minutes: number
          gold: number
          id?: string
          started_at?: string
          user_id: string
          xp: number
        }
        Update: {
          completed_at?: string
          duration_minutes?: number
          gold?: number
          id?: string
          started_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      sprint_participants: {
        Row: {
          id: string
          joined_at: string
          sprint_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          sprint_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          sprint_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_participants_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      sprints: {
        Row: {
          created_by: string
          duration_type: string
          end_date: string
          id: string
          max_participants: number
          name: string
          start_date: string
          status: string
        }
        Insert: {
          created_by: string
          duration_type: string
          end_date: string
          id?: string
          max_participants?: number
          name: string
          start_date: string
          status?: string
        }
        Update: {
          created_by?: string
          duration_type?: string
          end_date?: string
          id?: string
          max_participants?: number
          name?: string
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprints_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_xp: {
        Args: { p_gold: number; p_xp: number }
        Returns: {
          avatar_id: string | null
          created_at: string
          current_streak: number
          current_xp: number
          daily_goal_minutes: number
          display_name: string | null
          equipped_title: string | null
          gold: number
          id: string
          last_chest_claim: string
          last_streak_date: string | null
          level: number
          unlocked_titles: string[]
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_quest: {
        Args: { p_quest_id: string }
        Returns: {
          avatar_id: string | null
          created_at: string
          current_streak: number
          current_xp: number
          daily_goal_minutes: number
          display_name: string | null
          equipped_title: string | null
          gold: number
          id: string
          last_chest_claim: string
          last_streak_date: string | null
          level: number
          unlocked_titles: string[]
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_chest_reward: {
        Args: Record<string, never>
        Returns: {
          avatar_id: string | null
          created_at: string
          current_streak: number
          current_xp: number
          daily_goal_minutes: number
          display_name: string | null
          equipped_title: string | null
          gold: number
          id: string
          last_chest_claim: string
          last_streak_date: string | null
          level: number
          unlocked_titles: string[]
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      quest_progress: {
        Args: Record<string, never>
        Returns: {
          category: string
          claimed: boolean
          completed: boolean
          current_value: number
          description: string
          enabled: boolean
          id: string
          metric: string
          period: string
          reward_chest_tier: string | null
          reward_gold: number
          reward_xp: number
          target: number
          title: string
          trail: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "quest_progress"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      open_inventory_chest: {
        Args: { p_inventory_id: string; p_character_level?: number | null }
        Returns: {
          created_at: string
          enhancement_level: number
          equipped: boolean
          id: string
          item_category: string
          item_level: number
          name: string | null
          quantity: number
          rarity: string
          stats: Json | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "inventory"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      refine_item: {
        Args: {
          p_inventory_id: string
          p_success: boolean
          p_enhancement_level: number
        }
        Returns: {
          created_at: string
          enhancement_level: number
          equipped: boolean
          id: string
          item_category: string
          item_level: number
          name: string | null
          quantity: number
          rarity: string
          stats: Json | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "inventory"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      refresh_streak: {
        Args: Record<string, never>
        Returns: number
      }
      study_history: {
        Args: { p_anchor?: string | null; p_period: string }
        Returns: {
          bucket_date: string
          hour: number
          minutes: number
          sessions: number
        }[]
        SetofOptions: {
          from: "*"
          to: "study_history"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      study_sessions_in_range: {
        Args: { p_anchor?: string | null; p_period: string }
        Returns: {
          duration_minutes: number
          gold: number
          id: string
          started_at: string
          xp: number
        }[]
        SetofOptions: {
          from: "*"
          to: "study_sessions_in_range"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      refresh_shop: {
        Args: { p_player_level: number }
        Returns: {
          slot: number
          rarity: string
          item_category: string
          item_level: number
          name: string
          attack: number
          defense: number
          hp: number
          price: number
          bought: boolean
          next_refresh_at: string
          refreshes_today: number
        }[]
        SetofOptions: {
          from: "*"
          to: "refresh_shop"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      buy_shop_item: {
        Args: { p_slot_number: number }
        Returns: {
          shop_slot: number
          shop_bought: boolean
          inventory_id: string
          inventory_name: string
          inventory_item_category: string
          inventory_rarity: string
          inventory_item_level: number
          profile_gold: number
        }[]
        SetofOptions: {
          from: "*"
          to: "buy_shop_item"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      today_study_minutes: {
        Args: Record<string, never>
        Returns: number
      }
      send_invite_by_tag: {
        Args: { p_target_tag: string }
        Returns: Json
      }
      accept_link_invite: {
        Args: { p_sender_tag: string; p_receiver_id: string }
        Returns: Json
      }
      accept_invite: {
        Args: { p_friendship_id: string }
        Returns: Json
      }
      reject_invite: {
        Args: { p_friendship_id: string }
        Returns: Json
      }
      remove_friend: {
        Args: { p_friendship_id: string }
        Returns: Json
      }
      get_friends: {
        Args: Record<string, never>
        Returns: {
          friendship_id: string
          peer_id: string
          peer_tag: string | null
          peer_level: number
          peer_xp: number
          created_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "get_friends"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_global_ranking: {
        Args: { p_period: string; p_limit?: number }
        Returns: {
          minutes: number
          player_tag: string | null
          pos: number
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "get_global_ranking"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_global_rank: {
        Args: { p_period: string }
        Returns: {
          minutes: number
          pos: number
        }[]
        SetofOptions: {
          from: "*"
          to: "get_my_global_rank"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_pending_invites: {
        Args: Record<string, never>
        Returns: {
          friendship_id: string
          sender_id: string
          sender_tag: string | null
          sender_level: number
          sender_xp: number
          created_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "get_pending_invites"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_sprint_rankings: {
        Args: { p_sprint_id: string }
        Returns: {
          minutes: number
          participant_id: string
          player_tag: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "get_sprint_rankings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      count_pending_invites: {
        Args: Record<string, never>
        Returns: number
      }
      create_sprint: {
        Args: { p_duration_type: string; p_name: string }
        Returns: {
          created_by: string
          duration_type: string
          end_date: string
          id: string
          max_participants: number
          name: string
          start_date: string
          status: string
        }
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