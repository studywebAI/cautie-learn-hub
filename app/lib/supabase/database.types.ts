// Auto-generated Supabase types placeholder
// This file provides minimal type definitions used across the codebase

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
          role: string | null
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          role?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          role?: string | null
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string | null
        }
      }
      classes: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          user_id: string | null
          guest_id: string | null
          owner_type: string | null
          join_code: string | null
          status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
          user_id?: string | null
          guest_id?: string | null
          owner_type?: string | null
          join_code?: string | null
          status?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          status?: string | null
        }
      }
      subjects: {
        Row: {
          id: string
          title: string
          description: string | null
          user_id: string
          cover_type: string | null
          cover_image_url: string | null
          cover_icons: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          user_id: string
          cover_type?: string | null
          cover_image_url?: string | null
          cover_icons?: Json | null
          created_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          cover_type?: string | null
          cover_image_url?: string | null
          cover_icons?: Json | null
        }
      }
      chapters: {
        Row: {
          id: string
          title: string
          chapter_number: number
          description: string | null
          subject_id: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          chapter_number?: number
          description?: string | null
          subject_id: string
          created_at?: string
        }
        Update: {
          title?: string
          chapter_number?: number
          description?: string | null
        }
      }
      paragraphs: {
        Row: {
          id: string
          title: string
          paragraph_number: number
          chapter_id: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          paragraph_number?: number
          chapter_id: string
          created_at?: string
        }
        Update: {
          title?: string
          paragraph_number?: number
        }
      }
      assignments: {
        Row: {
          id: string
          title: string
          paragraph_id: string | null
          assignment_index: string | null
          answers_enabled: boolean | null
          is_visible: boolean
          is_locked: boolean
          answer_mode: string
          ai_grading_enabled: boolean
          class_id: string | null
          chapter_id: string | null
          due_date: string | null
          material_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          paragraph_id?: string | null
          assignment_index?: string | null
          answers_enabled?: boolean | null
          is_visible?: boolean
          is_locked?: boolean
          answer_mode?: string
          ai_grading_enabled?: boolean
          class_id?: string | null
          chapter_id?: string | null
          due_date?: string | null
          material_id?: string | null
          created_at?: string
        }
        Update: {
          title?: string
          paragraph_id?: string | null
          assignment_index?: string | null
          answers_enabled?: boolean | null
          is_visible?: boolean
          is_locked?: boolean
          answer_mode?: string
          ai_grading_enabled?: boolean
          due_date?: string | null
        }
      }
      class_members: {
        Row: {
          id: string
          class_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          class_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          class_id?: string
          user_id?: string
        }
      }
      class_subjects: {
        Row: {
          id: string
          class_id: string
          subject_id: string
          created_at: string
        }
        Insert: {
          id?: string
          class_id: string
          subject_id: string
          created_at?: string
        }
        Update: {
          class_id?: string
          subject_id?: string
        }
      }
      personal_tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          user_id: string
          status: string | null
          priority: string | null
          due_date: string | null
          completed_at: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          user_id: string
          status?: string | null
          priority?: string | null
          due_date?: string | null
          created_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          status?: string | null
          priority?: string | null
          due_date?: string | null
          completed_at?: string | null
          updated_at?: string | null
        }
      }
      materials: {
        Row: {
          id: string
          title: string | null
          type: string
          content: Json | null
          user_id: string
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          title?: string | null
          type: string
          content?: Json | null
          user_id: string
          updated_at?: string
          created_at?: string
        }
        Update: {
          title?: string | null
          type?: string
          content?: Json | null
          updated_at?: string
        }
      }
      session_logs: {
        Row: {
          id: string
          user_id: string
          subject_id: string | null
          chapter_id: string | null
          paragraph_id: string | null
          started_at: string
          ended_at: string | null
          duration_seconds: number | null
        }
        Insert: {
          id?: string
          user_id: string
          subject_id?: string | null
          chapter_id?: string | null
          paragraph_id?: string | null
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number | null
        }
        Update: {
          ended_at?: string | null
          duration_seconds?: number | null
        }
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string
          activity_type: string
          subject_id: string | null
          chapter_id: string | null
          paragraph_id: string | null
          material_id: string | null
          score: number | null
          total_items: number | null
          correct_items: number | null
          duration_seconds: number | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity_type: string
          subject_id?: string | null
          chapter_id?: string | null
          paragraph_id?: string | null
          material_id?: string | null
          score?: number | null
          total_items?: number | null
          correct_items?: number | null
          duration_seconds?: number | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          score?: number | null
          total_items?: number | null
          correct_items?: number | null
          duration_seconds?: number | null
          metadata?: Json | null
        }
      }
      [key: string]: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
    }
    Views: {
      [key: string]: {
        Row: Record<string, any>
      }
    }
    Functions: {
      [key: string]: {
        Args: Record<string, any>
        Returns: any
      }
    }
    Enums: {
      [key: string]: string
    }
  }
}

// Helper type to extract Row type from a table
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
