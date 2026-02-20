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
      activities: {
        Row: {
          business_objective: string | null
          description: string | null
          documentation: string[] | null
          entity_id: string
          id: string
          name: string
        }
        Insert: {
          business_objective?: string | null
          description?: string | null
          documentation?: string[] | null
          entity_id: string
          id?: string
          name: string
        }
        Update: {
          business_objective?: string | null
          description?: string | null
          documentation?: string[] | null
          entity_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_tools: {
        Row: {
          activity_id: string
          tool_id: string
        }
        Insert: {
          activity_id: string
          tool_id: string
        }
        Update: {
          activity_id?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_tools_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_tools_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_use_cases: {
        Row: {
          complexity: string | null
          created_at: string
          description: string | null
          id: string
          impact: string | null
          process_id: string
          roi_estimate: string | null
          title: string
          tools_suggested: string[] | null
        }
        Insert: {
          complexity?: string | null
          created_at?: string
          description?: string | null
          id?: string
          impact?: string | null
          process_id: string
          roi_estimate?: string | null
          title: string
          tools_suggested?: string[] | null
        }
        Update: {
          complexity?: string | null
          created_at?: string
          description?: string | null
          id?: string
          impact?: string | null
          process_id?: string
          roi_estimate?: string | null
          title?: string
          tools_suggested?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_use_cases_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "uploaded_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          name: string
          size: string | null
          strategy_notes: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          size?: string | null
          strategy_notes?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          size?: string | null
          strategy_notes?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          company_id: string
          id: string
          name: string
        }
        Insert: {
          company_id: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json | null
          process_id: string
        }
        Insert: {
          chunk_index?: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          process_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          process_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "uploaded_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          department_id: string
          id: string
          name: string
        }
        Insert: {
          department_id: string
          id?: string
          name: string
        }
        Update: {
          department_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "entities_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      process_context: {
        Row: {
          assumptions: string | null
          id: string
          known_constraints: string | null
          pain_points_summary: string | null
          process_id: string
          process_objective: string | null
          stakeholder_notes: string | null
          volume_and_frequency: string | null
        }
        Insert: {
          assumptions?: string | null
          id?: string
          known_constraints?: string | null
          pain_points_summary?: string | null
          process_id: string
          process_objective?: string | null
          stakeholder_notes?: string | null
          volume_and_frequency?: string | null
        }
        Update: {
          assumptions?: string | null
          id?: string
          known_constraints?: string | null
          pain_points_summary?: string | null
          process_id?: string
          process_objective?: string | null
          stakeholder_notes?: string | null
          volume_and_frequency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_context_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: true
            referencedRelation: "uploaded_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      process_steps: {
        Row: {
          business_rules: string | null
          data_inputs: string[] | null
          data_outputs: string[] | null
          decision_type: string | null
          description: string | null
          frequency: string | null
          id: string
          name: string
          pain_points: string | null
          process_id: string
          role: string | null
          step_order: number
          tool_used: string | null
          volume_estimate: string | null
        }
        Insert: {
          business_rules?: string | null
          data_inputs?: string[] | null
          data_outputs?: string[] | null
          decision_type?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          name: string
          pain_points?: string | null
          process_id: string
          role?: string | null
          step_order?: number
          tool_used?: string | null
          volume_estimate?: string | null
        }
        Update: {
          business_rules?: string | null
          data_inputs?: string[] | null
          data_outputs?: string[] | null
          decision_type?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          name?: string
          pain_points?: string | null
          process_id?: string
          role?: string | null
          step_order?: number
          tool_used?: string | null
          volume_estimate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_steps_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "uploaded_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          company_id: string
          documentation: string | null
          id: string
          name: string
          purpose: string | null
          type: string | null
        }
        Insert: {
          company_id: string
          documentation?: string | null
          id?: string
          name: string
          purpose?: string | null
          type?: string | null
        }
        Update: {
          company_id?: string
          documentation?: string | null
          id?: string
          name?: string
          purpose?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_processes: {
        Row: {
          activity_id: string | null
          company_id: string | null
          department_id: string | null
          entity_id: string | null
          file_name: string
          file_path: string | null
          id: string
          notes: string | null
          status: string
          upload_date: string
        }
        Insert: {
          activity_id?: string | null
          company_id?: string | null
          department_id?: string | null
          entity_id?: string | null
          file_name: string
          file_path?: string | null
          id?: string
          notes?: string | null
          status?: string
          upload_date?: string
        }
        Update: {
          activity_id?: string | null
          company_id?: string | null
          department_id?: string | null
          entity_id?: string | null
          file_name?: string
          file_path?: string | null
          id?: string
          notes?: string | null
          status?: string
          upload_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_processes_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uploaded_processes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uploaded_processes_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uploaded_processes_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_documents: {
        Args: {
          filter_process_id?: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          chunk_index: number
          content: string
          id: string
          metadata: Json
          process_id: string
          similarity: number
        }[]
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
