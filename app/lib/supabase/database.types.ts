export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      assignments: {
        Row: {
          id: string
          paragraph_id: string | null
          assignment_index: number
          title: string
          answers_enabled: boolean
          created_at: string
          is_visible: boolean
        }
        Insert: {
          id?: string
          paragraph_id?: string | null
          assignment_index: number
          title: string
          answers_enabled?: boolean
          created_at?: string
          is_visible?: boolean
        }
        Update: {
          id?: string
          paragraph_id?: string | null
          assignment_index?: number
          title?: string
          answers_enabled?: boolean
          created_at?: string
          is_visible?: boolean
        }
      }
      blocks: {
        Row: {
          id: string
          assignment_id: string
          type: string
          position: number
          data: Json
          created_at: string
          material_id: string | null
          chapter_id: string | null
          order_index: number
        }
        Insert: {
          id?: string
          assignment_id: string
          type: string
          position: number
          data: Json
          created_at?: string
          material_id?: string | null
          chapter_id?: string | null
          order_index?: number
        }
        Update: {
          id?: string
          assignment_id?: string
          type?: string
          position?: number
          data?: Json
          created_at?: string
          material_id?: string | null
          chapter_id?: string | null
          order_index?: number
        }
      }
      chapters: {
        Row: {
          id: string
          subject_id: string
          chapter_number: number
          title: string
          ai_summary: string | null
          summary_overridden: boolean
          created_at: string
        }
        Insert: {
          id?: string
          subject_id: string
          chapter_number: number
          title: string
          ai_summary?: string | null
          summary_overridden?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          subject_id?: string
          chapter_number?: number
          title?: string
          ai_summary?: string | null
          summary_overridden?: boolean
          created_at?: string
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
          owner_type?: string | null
          status?: string | null
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
          is_public: boolean
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
          is_public?: boolean
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
          is_public?: boolean
          updated_at?: string
          created_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          content: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          content?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          content?: Json | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          data: Json
          read: boolean
          created_at: string
          expires_at: string | null
          dismissed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          data?: Json
          read?: boolean
          created_at?: string
          expires_at?: string | null
          dismissed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          data?: Json
          read?: boolean
          created_at?: string
          expires_at?: string | null
          dismissed_at?: string | null
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
      personal_tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          due_date: string | null
          completed: boolean
          priority: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          due_date?: string | null
          completed?: boolean
          priority?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          due_date?: string | null
          completed?: boolean
          priority?: string
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          full_name: string | null
          avatar_url: string | null
          email: string | null
          role: string
          theme: string
          language: string
          high_contrast: boolean
          dyslexia_font: boolean
          reduced_motion: boolean
        }
        Insert: {
          id: string
          updated_at?: string | null
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          role?: string
          theme?: string
          language?: string
          high_contrast?: boolean
          dyslexia_font?: boolean
          reduced_motion?: boolean
        }
        Update: {
          id?: string
          updated_at?: string | null
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          role?: string
          theme?: string
          language?: string
          high_contrast?: boolean
          dyslexia_font?: boolean
          reduced_motion?: boolean
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
      rubrics: {
        Row: {
          id: string
          class_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          class_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      rubric_criteria: {
        Row: {
          id: string
          rubric_id: string
          name: string
          description: string | null
          max_score: number
          weight: number
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          rubric_id: string
          name: string
          description?: string | null
          max_score?: number
          weight?: number
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          rubric_id?: string
          name?: string
          description?: string | null
          max_score?: number
          weight?: number
          position?: number
          created_at?: string
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
      student_answers: {
        Row: {
          id: string
          student_id: string
          block_id: string
          answer_data: Json
          is_correct: boolean | null
          score: number | null
          feedback: string | null
          graded_by_ai: boolean
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
          graded_by_ai?: boolean
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
          graded_by_ai?: boolean
          submitted_at?: string
          graded_at?: string | null
        }
      }
      subjects: {
        Row: {
          id: string
          title: string
          class_label: string | null
          cover_type: string
          cover_image_url: string | null
          ai_icon_seed: string | null
          user_id: string | null
          created_at: string
          description: string | null
          class_id: string | null
        }
        Insert: {
          id?: string
          title: string
          class_label?: string | null
          cover_type?: string
          cover_image_url?: string | null
          ai_icon_seed?: string | null
          user_id?: string | null
          created_at?: string
          description?: string | null
          class_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          class_label?: string | null
          cover_type?: string
          cover_image_url?: string | null
          ai_icon_seed?: string | null
          user_id?: string | null
          created_at?: string
          description?: string | null
          class_id?: string | null
        }
      }
      submissions: {
        Row: {
          id: string
          assignment_id: string
          user_id: string
          content: Json | null
          files: Json
          submitted_at: string
          updated_at: string
          status: string
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
          files?: Json
          submitted_at?: string
          updated_at?: string
          status?: string
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
          files?: Json
          submitted_at?: string
          updated_at?: string
          status?: string
          grade?: number | null
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          created_at?: string
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
      has_role: {
        Args: {
          _user_id: string
          _role: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: 'admin' | 'moderator' | 'user' | 'student' | 'teacher' | 'owner'
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
