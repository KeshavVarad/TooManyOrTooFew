export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          created_at: string | null
          id: string
          is_featured: boolean | null
          question_id: string | null
          response_id: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_featured?: boolean | null
          question_id?: string | null
          response_id?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          is_featured?: boolean | null
          question_id?: string | null
          response_id?: string | null
          value?: Json
        }
        Relationships: []
      }
      questions: {
        Row: {
          created_at: string | null
          id: string
          options: Json | null
          order_index: number
          required: boolean | null
          text: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          options?: Json | null
          order_index?: number
          required?: boolean | null
          text: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          options?: Json | null
          order_index?: number
          required?: boolean | null
          text?: string
          type?: string
        }
        Relationships: []
      }
      responses: {
        Row: {
          id: string
          session_id: string | null
          submitted_at: string | null
        }
        Insert: {
          id?: string
          session_id?: string | null
          submitted_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string | null
          submitted_at?: string | null
        }
        Relationships: []
      }
      submissions: {
        Row: {
          user_id: string
          submitted_at: string | null
        }
        Insert: {
          user_id: string
          submitted_at?: string | null
        }
        Update: {
          user_id?: string
          submitted_at?: string | null
        }
        Relationships: []
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
