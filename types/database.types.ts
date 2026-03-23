/** Supabase-generated-style shapes (server uses real DB; this is for typing only). */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          icon_url: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          icon_url?: string | null
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          icon_url?: string | null
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: 'read' | 'write' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role: 'read' | 'write' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: 'read' | 'write' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      version_views: {
        Row: {
          id: string
          project_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      requirements: {
        Row: {
          id: string
          version_view_id: string
          requirement_number: number
          title: string
          description: string | null
          assignee_id: string | null
          priority: number
          type: 'Bug' | 'Feature' | 'Improvement' | 'Documentation' | 'Security' | 'Discussion'
          status: 'pending' | 'in_progress' | 'completed' | 'rejected'
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          version_view_id: string
          requirement_number?: number
          title: string
          description?: string | null
          assignee_id?: string | null
          priority?: number
          type: 'Bug' | 'Feature' | 'Improvement' | 'Documentation' | 'Security' | 'Discussion'
          status?: 'pending' | 'in_progress' | 'completed' | 'rejected'
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          version_view_id?: string
          requirement_number?: number
          title?: string
          description?: string | null
          assignee_id?: string | null
          priority?: number
          type?: 'Bug' | 'Feature' | 'Improvement' | 'Documentation' | 'Security' | 'Discussion'
          status?: 'pending' | 'in_progress' | 'completed' | 'rejected'
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      cli_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          name: string
          last_used_at: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          name: string
          last_used_at?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          name?: string
          last_used_at?: string | null
          expires_at?: string | null
          created_at?: string
        }
      }
    }
  }
}
