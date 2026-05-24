// Auto-generated Supabase types placeholder
// This file provides type definitions for the Supabase database schema.
// Regenerate with: npx supabase gen types typescript --project-id <your-project-id>

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          full_name: string | null
          avatar_url: string | null
          role: string | null
          email: string | null
          theme: string | null
          language: string | null
          high_contrast: boolean | null
          dyslexia_font: boolean | null
          reduced_motion: boolean | null
        }
        Insert: {
          id: string
          updated_at?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: string | null
          email?: string | null
          theme?: string | null
          language?: string | null
          high_contrast?: boolean | null
          dyslexia_font?: boolean | null
          reduced_motion?: boolean | null
        }
        Update: {
          id?: string
          updated_at?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: string | null
          email?: string | null
          theme?: string | null
          language?: string | null
          high_contrast?: boolean | null
          dyslexia_font?: boolean | null
          reduced_motion?: boolean | null
        }
      }
      classes: {
        Row: {
          id: string
          created_at: string
          name: string
          description: string | null
          owner_id: string | null
          user_id: string | null
          guest_id: string | null
          join_code: string | null
          teacher_join_code: string | null
          owner_type: string | null
          status: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          description?: string | null
          owner_id?: string | null
          user_id?: string | null
          guest_id?: string | null
          join_code?: string | null
          teacher_join_code?: string | null
          owner_type?: string | null
          status?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          description?: string | null
          owner_id?: string | null
          user_id?: string | null
          guest_id?: string | null
          join_code?: string | null
          teacher_join_code?: string | null
          owner_type?: string | null
          status?: string | null
        }
      }
      class_members: {
        Row: {
          class_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          class_id: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          class_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
      }
      class_subjects: {
        Row: {
          class_id: string
          subject_id: string
          created_at: string
        }
        Insert: {
          class_id: string
          subject_id: string
          created_at?: string
        }
        Update: {
          class_id?: string
          subject_id?: string
          created_at?: string
        }
      }
      subjects: {
        Row: {
          id: string
          class_id: string | null
          title: string
          class_label: string | null
          cover_type: string | null
          cover_image_url: string | null
          ai_icon_seed: string | null
          user_id: string | null
          description: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          class_id?: string | null
          title: string
          class_label?: string | null
          cover_type?: string | null
          cover_image_url?: string | null
          ai_icon_seed?: string | null
          user_id?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          class_id?: string | null
          title?: string
          class_label?: string | null
          cover_type?: string | null
          cover_image_url?: string | null
          ai_icon_seed?: string | null
          user_id?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      chapters: {
        Row: {
          id: string
          subject_id: string
          chapter_number: number
          title: string
          ai_summary: string | null
          summary_overridden: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          subject_id: string
          chapter_number: number
          title: string
          ai_summary?: string | null
          summary_overridden?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          subject_id?: string
          chapter_number?: number
          title?: string
          ai_summary?: string | null
          summary_overridden?: boolean | null
          created_at?: string
        }
      }
      paragraphs: {
        Row: {
          id: string
          chapter_id: string
          paragraph_number: number
          title: string
          created_at: string
        }
        Insert: {
          id?: string
          chapter_id: string
          paragraph_number: number
          title: string
          created_at?: string
        }
        Update: {
          id?: string
          chapter_id?: string
          paragraph_number?: number
          title?: string
          created_at?: string
        }
      }
      assignments: {
        Row: {
          id: string
          class_id: string
          paragraph_id: string | null
          assignment_index: number
          title: string
          content: Json | null
          due_date: string | null
          answers_enabled: boolean | null
          owner_type: string | null
          guest_id: string | null
          user_id: string | null
          is_visible: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          class_id: string
          paragraph_id?: string | null
          assignment_index?: number
          title: string
          content?: Json | null
          due_date?: string | null
          answers_enabled?: boolean | null
          owner_type?: string | null
          guest_id?: string | null
          user_id?: string | null
          is_visible?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          paragraph_id?: string | null
          assignment_index?: number
          title?: string
          content?: Json | null
          due_date?: string | null
          answers_enabled?: boolean | null
          owner_type?: string | null
          guest_id?: string | null
          user_id?: string | null
          is_visible?: boolean | null
          created_at?: string
        }
      }
      blocks: {
        Row: {
          id: string
          assignment_id: string | null
          material_id: string | null
          chapter_id: string | null
          type: string
          position: number
          data: Json
          order_index: number | null
          created_at: string
        }
        Insert: {
          id?: string
          assignment_id?: string | null
          material_id?: string | null
          chapter_id?: string | null
          type: string
          position: number
          data: Json
          order_index?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          assignment_id?: string | null
          material_id?: string | null
          chapter_id?: string | null
          type?: string
          position?: number
          data?: Json
          order_index?: number | null
          created_at?: string
        }
      }
      student_answers: {
        Row: {
          id: string
          student_id: string
          block_id: string
          answer_data: Json
          is_correct: boolean | null
          score: number | null
          feedback: string | null
          graded_by_ai: boolean | null
          submitted_at: string
          graded_at: string | null
        }
        Insert: {
          id?: string
          student_id: string
          block_id: string
          answer_data: Json
          is_correct?: boolean | null
          score?: number | null
          feedback?: string | null
          graded_by_ai?: boolean | null
          submitted_at?: string
          graded_at?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          block_id?: string
          answer_data?: Json
          is_correct?: boolean | null
          score?: number | null
          feedback?: string | null
          graded_by_ai?: boolean | null
          submitted_at?: string
          graded_at?: string | null
        }
      }
      submissions: {
        Row: {
          id: string
          assignment_id: string
          user_id: string
          content: Json | null
          files: Json | null
          submitted_at: string
          updated_at: string
          status: string | null
          grade: number | null
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
        }
        Insert: {
          id?: string
          assignment_id: string
          user_id: string
          content?: Json | null
          files?: Json | null
          submitted_at?: string
          updated_at?: string
          status?: string | null
          grade?: number | null
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
        }
        Update: {
          id?: string
          assignment_id?: string
          user_id?: string
          content?: Json | null
          files?: Json | null
          submitted_at?: string
          updated_at?: string
          status?: string | null
          grade?: number | null
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
        }
      }
      materials: {
        Row: {
          id: string
          user_id: string | null
          class_id: string | null
          type: string
          title: string
          description: string | null
          content: Json | null
          content_id: string | null
          source_text: string | null
          metadata: Json | null
          tags: string[] | null
          is_public: boolean | null
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          class_id?: string | null
          type: string
          title: string
          description?: string | null
          content?: Json | null
          content_id?: string | null
          source_text?: string | null
          metadata?: Json | null
          tags?: string[] | null
          is_public?: boolean | null
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          class_id?: string | null
          type?: string
          title?: string
          description?: string | null
          content?: Json | null
          content_id?: string | null
          source_text?: string | null
          metadata?: Json | null
          tags?: string[] | null
          is_public?: boolean | null
          updated_at?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string | null
          data: Json | null
          read: boolean
          read_at: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message?: string | null
          data?: Json | null
          read?: boolean
          read_at?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string | null
          data?: Json | null
          read?: boolean
          read_at?: string | null
          expires_at?: string | null
          created_at?: string
        }
      }
      personal_tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          due_date: string | null
          completed: boolean | null
          priority: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          due_date?: string | null
          completed?: boolean | null
          priority?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          due_date?: string | null
          completed?: boolean | null
          priority?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      rubrics: {
        Row: {
          id: string
          class_id: string
          name: string
          description: string | null
          total_points: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          class_id: string
          name: string
          description?: string | null
          total_points?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          name?: string
          description?: string | null
          total_points?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      progress_snapshots: {
        Row: {
          student_id: string
          paragraph_id: string
          completion_percent: number
          updated_at: string
        }
        Insert: {
          student_id: string
          paragraph_id: string
          completion_percent: number
          updated_at?: string
        }
        Update: {
          student_id?: string
          paragraph_id?: string
          completion_percent?: number
          updated_at?: string
        }
      }
      session_logs: {
        Row: {
          id: string
          student_id: string
          paragraph_id: string
          started_at: string
          finished_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          paragraph_id: string
          started_at: string
          finished_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          paragraph_id?: string
          started_at?: string
          finished_at?: string | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          class_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          changes: Json | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          class_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          changes?: Json | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          class_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          changes?: Json | null
          metadata?: Json | null
          created_at?: string
        }
      }
      announcements: {
        Row: {
          id: string
          class_id: string
          title: string
          content: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          class_id: string
          title: string
          content?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          class_id?: string
          title?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          preference_key: string
          preference_value: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          preference_key: string
          preference_value?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          preference_key?: string
          preference_value?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_join_code: {
        Args: Record<string, never>
        Returns: string
      }
      generate_teacher_join_code: {
        Args: Record<string, never>
        Returns: string
      }
      has_role: {
        Args: {
          _user_id: string
          _role: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: 'admin' | 'moderator' | 'student' | 'teacher' | 'user'
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
