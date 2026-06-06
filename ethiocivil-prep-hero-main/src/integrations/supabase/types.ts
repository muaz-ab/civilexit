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
      course_materials: {
        Row: {
          course_id: string
          created_at: string
          extracted_text: string | null
          id: string
          kind: string
          name: string
          page_count: number | null
          storage_path: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          extracted_text?: string | null
          id?: string
          kind: string
          name: string
          page_count?: number | null
          storage_path: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          extracted_text?: string | null
          id?: string
          kind?: string
          name?: string
          page_count?: number | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          short_name: string | null
          slug: string
          sort_order: number
          topics: Json
          weight: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          short_name?: string | null
          slug: string
          sort_order?: number
          topics?: Json
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          short_name?: string | null
          slug?: string
          sort_order?: number
          topics?: Json
          weight?: number
        }
        Relationships: []
      }
      mock_exams: {
        Row: {
          breakdown: Json
          correct_count: number
          duration_seconds: number | null
          id: string
          score: number
          taken_at: string
          total_questions: number
          user_id: string
        }
        Insert: {
          breakdown?: Json
          correct_count: number
          duration_seconds?: number | null
          id?: string
          score: number
          taken_at?: string
          total_questions: number
          user_id: string
        }
        Update: {
          breakdown?: Json
          correct_count?: number
          duration_seconds?: number | null
          id?: string
          score?: number
          taken_at?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          exam_date: string
          id: string
          name: string | null
          university: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          exam_date?: string
          id: string
          name?: string | null
          university?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          exam_date?: string
          id?: string
          name?: string | null
          university?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_answer: string
          course_id: string
          created_at: string
          created_by: string | null
          difficulty: string
          explanation: string | null
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          source: string | null
          topic: string | null
          year: number | null
        }
        Insert: {
          correct_answer: string
          course_id: string
          created_at?: string
          created_by?: string | null
          difficulty?: string
          explanation?: string | null
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          source?: string | null
          topic?: string | null
          year?: number | null
        }
        Update: {
          correct_answer?: string
          course_id?: string
          created_at?: string
          created_by?: string | null
          difficulty?: string
          explanation?: string | null
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question_text?: string
          source?: string | null
          topic?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      study_notes: {
        Row: {
          content: string
          course_id: string
          created_at: string
          id: string
          source_question_ids: Json
          title: string
          topic: string | null
          user_id: string
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string
          id?: string
          source_question_ids?: Json
          title: string
          topic?: string | null
          user_id: string
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          id?: string
          source_question_ids?: Json
          title?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: []
      }
      study_plan_days: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          plan_date: string
          tasks: Json
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          plan_date: string
          tasks?: Json
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          plan_date?: string
          tasks?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_course_progress: {
        Row: {
          course_id: string
          last_practiced: string | null
          mastery: number
          questions_attempted: number
          questions_correct: number
          user_id: string
          weak_topics: Json
        }
        Insert: {
          course_id: string
          last_practiced?: string | null
          mastery?: number
          questions_attempted?: number
          questions_correct?: number
          user_id: string
          weak_topics?: Json
        }
        Update: {
          course_id?: string
          last_practiced?: string | null
          mastery?: number
          questions_attempted?: number
          questions_correct?: number
          user_id?: string
          weak_topics?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_question_attempts: {
        Row: {
          attempted_at: string
          course_id: string
          id: string
          is_correct: boolean
          mark: string | null
          question_id: string
          selected_answer: string | null
          time_seconds: number | null
          user_id: string
        }
        Insert: {
          attempted_at?: string
          course_id: string
          id?: string
          is_correct?: boolean
          mark?: string | null
          question_id: string
          selected_answer?: string | null
          time_seconds?: number | null
          user_id: string
        }
        Update: {
          attempted_at?: string
          course_id?: string
          id?: string
          is_correct?: boolean
          mark?: string | null
          question_id?: string
          selected_answer?: string | null
          time_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_question_attempts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          current_streak: number
          last_study_date: string | null
          longest_streak: number
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_study_date?: string | null
          longest_streak?: number
          user_id: string
        }
        Update: {
          current_streak?: number
          last_study_date?: string | null
          longest_streak?: number
          user_id?: string
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
