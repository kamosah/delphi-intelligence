export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5';
  };
  public: {
    Tables: {
      alembic_version: {
        Row: {
          version_num: string;
        };
        Insert: {
          version_num: string;
        };
        Update: {
          version_num?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          content: string | null;
          created_at: string | null;
          doc_metadata: Json | null;
          extracted_text: string | null;
          file_path: string;
          file_type: string;
          id: string;
          name: string;
          processed_at: string | null;
          processing_error: string | null;
          size_bytes: number;
          space_id: string | null;
          status: string;
          updated_at: string | null;
          uploaded_by: string;
        };
        Insert: {
          content?: string | null;
          created_at?: string | null;
          doc_metadata?: Json | null;
          extracted_text?: string | null;
          file_path?: string;
          file_type?: string;
          id?: string;
          name?: string;
          processed_at?: string | null;
          processing_error?: string | null;
          size_bytes?: number;
          space_id?: string | null;
          status?: string;
          updated_at?: string | null;
          uploaded_by: string;
        };
        Update: {
          content?: string | null;
          created_at?: string | null;
          doc_metadata?: Json | null;
          extracted_text?: string | null;
          file_path?: string;
          file_type?: string;
          id?: string;
          name?: string;
          processed_at?: string | null;
          processing_error?: string | null;
          size_bytes?: number;
          space_id?: string | null;
          status?: string;
          updated_at?: string | null;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_space_id_fkey';
            columns: ['space_id'];
            isOneToOne: false;
            referencedRelation: 'spaces';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          message_role: Database['public']['Enums']['message_role'];
          metadata: Json;
          thread_id: string;
          updated_at: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          message_role: Database['public']['Enums']['message_role'];
          metadata?: Json;
          thread_id: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          message_role?: Database['public']['Enums']['message_role'];
          metadata?: Json;
          thread_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'threads';
            referencedColumns: ['id'];
          },
        ];
      };
      organization_members: {
        Row: {
          created_at: string;
          id: string;
          is_default: boolean;
          last_active_at: string | null;
          organization_id: string;
          organization_role: Database['public']['Enums']['organization_role'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_default?: boolean;
          last_active_at?: string | null;
          organization_id: string;
          organization_role?: Database['public']['Enums']['organization_role'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_default?: boolean;
          last_active_at?: string | null;
          organization_id?: string;
          organization_role?: Database['public']['Enums']['organization_role'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organization_members_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          owner_id: string | null;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          owner_id?: string | null;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          owner_id?: string | null;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organizations_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      space_members: {
        Row: {
          created_at: string;
          id: string;
          member_role: Database['public']['Enums']['member_role'] | null;
          space_id: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          member_role?: Database['public']['Enums']['member_role'] | null;
          space_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          member_role?: Database['public']['Enums']['member_role'] | null;
          space_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'space_members_space_id_fkey';
            columns: ['space_id'];
            isOneToOne: false;
            referencedRelation: 'spaces';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'space_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      spaces: {
        Row: {
          created_at: string | null;
          description: string | null;
          icon_color: string | null;
          id: string;
          is_public: boolean | null;
          max_members: number | null;
          name: string;
          organization_id: string;
          owner_id: string | null;
          slug: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          icon_color?: string | null;
          id?: string;
          is_public?: boolean | null;
          max_members?: number | null;
          name: string;
          organization_id: string;
          owner_id?: string | null;
          slug: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          icon_color?: string | null;
          id?: string;
          is_public?: boolean | null;
          max_members?: number | null;
          name?: string;
          organization_id?: string;
          owner_id?: string | null;
          slug?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_spaces_organization_id';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'spaces_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      thread_documents: {
        Row: {
          created_at: string;
          document_id: string | null;
          id: string;
          relevance_score: number | null;
          thread_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          document_id?: string | null;
          id?: string;
          relevance_score?: number | null;
          thread_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          document_id?: string | null;
          id?: string;
          relevance_score?: number | null;
          thread_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'query_documents_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'thread_documents_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'threads';
            referencedColumns: ['id'];
          },
        ];
      };
      threads: {
        Row: {
          agent_steps: Json | null;
          completed_at: string | null;
          confidence_score: number | null;
          context: string | null;
          cost_usd: number | null;
          created_at: string | null;
          created_by: string | null;
          error_message: string | null;
          id: string;
          is_starred: boolean;
          model_used: string | null;
          organization_id: string;
          processing_time_ms: number | null;
          query_text: string;
          result: string | null;
          sources: Json | null;
          space_id: string | null;
          status: Database['public']['Enums']['thread_status'] | null;
          title: string | null;
          tokens_used: number | null;
          updated_at: string | null;
        };
        Insert: {
          agent_steps?: Json | null;
          completed_at?: string | null;
          confidence_score?: number | null;
          context?: string | null;
          cost_usd?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          error_message?: string | null;
          id?: string;
          is_starred?: boolean;
          model_used?: string | null;
          organization_id: string;
          processing_time_ms?: number | null;
          query_text: string;
          result?: string | null;
          sources?: Json | null;
          space_id?: string | null;
          status?: Database['public']['Enums']['thread_status'] | null;
          title?: string | null;
          tokens_used?: number | null;
          updated_at?: string | null;
        };
        Update: {
          agent_steps?: Json | null;
          completed_at?: string | null;
          confidence_score?: number | null;
          context?: string | null;
          cost_usd?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          error_message?: string | null;
          id?: string;
          is_starred?: boolean;
          model_used?: string | null;
          organization_id?: string;
          processing_time_ms?: number | null;
          query_text?: string;
          result?: string | null;
          sources?: Json | null;
          space_id?: string | null;
          status?: Database['public']['Enums']['thread_status'] | null;
          title?: string | null;
          tokens_used?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_threads_organization_id';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'queries_space_id_fkey';
            columns: ['space_id'];
            isOneToOne: false;
            referencedRelation: 'spaces';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'queries_user_id_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      user_preferences: {
        Row: {
          browser_notifications_enabled: boolean | null;
          created_at: string | null;
          custom_settings: Json | null;
          email_notifications: boolean;
          id: number;
          language: string | null;
          notifications_enabled: boolean | null;
          theme: string | null;
          timezone: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          browser_notifications_enabled?: boolean | null;
          created_at?: string | null;
          custom_settings?: Json | null;
          email_notifications?: boolean;
          id?: number;
          language?: string | null;
          notifications_enabled?: boolean | null;
          theme?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          browser_notifications_enabled?: boolean | null;
          created_at?: string | null;
          custom_settings?: Json | null;
          email_notifications?: boolean;
          id?: number;
          language?: string | null;
          notifications_enabled?: boolean | null;
          theme?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          auth_user_id: string | null;
          avatar_url: string | null;
          bio: string | null;
          created_at: string | null;
          email: string;
          full_name: string | null;
          id: string;
          is_active: boolean | null;
          last_login_at: string | null;
          role: Database['public']['Enums']['user_role'] | null;
          updated_at: string | null;
        };
        Insert: {
          auth_user_id?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string | null;
          email: string;
          full_name?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_login_at?: string | null;
          role?: Database['public']['Enums']['user_role'] | null;
          updated_at?: string | null;
        };
        Update: {
          auth_user_id?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string | null;
          email?: string;
          full_name?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_login_at?: string | null;
          role?: Database['public']['Enums']['user_role'] | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_space_admin: { Args: { space_id: string }; Returns: boolean };
      is_space_member: { Args: { space_id: string }; Returns: boolean };
    };
    Enums: {
      document_status: 'uploaded' | 'processing' | 'processed' | 'failed';
      member_role: 'owner' | 'editor' | 'viewer';
      message_role: 'user' | 'assistant' | 'system';
      organization_role: 'owner' | 'admin' | 'member' | 'viewer';
      thread_status: 'pending' | 'processing' | 'completed' | 'failed';
      user_role: 'admin' | 'member' | 'viewer';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      document_status: ['uploaded', 'processing', 'processed', 'failed'],
      member_role: ['owner', 'editor', 'viewer'],
      message_role: ['user', 'assistant', 'system'],
      organization_role: ['owner', 'admin', 'member', 'viewer'],
      thread_status: ['pending', 'processing', 'completed', 'failed'],
      user_role: ['admin', 'member', 'viewer'],
    },
  },
} as const;
