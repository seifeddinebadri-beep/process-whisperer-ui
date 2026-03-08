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
      agent_logs: {
        Row: {
          action: string
          agent_name: string
          created_at: string
          id: string
          message: string | null
          metadata: Json | null
          process_id: string | null
          status: string
        }
        Insert: {
          action: string
          agent_name: string
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          process_id?: string | null
          status?: string
        }
        Update: {
          action?: string
          agent_name?: string
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          process_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_logs_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "uploaded_processes"
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
      automation_variants: {
        Row: {
          approach_description: string | null
          complexity: string | null
          cons: string[] | null
          created_at: string
          estimated_cost: string | null
          estimated_timeline: string | null
          id: string
          impact: string | null
          pros: string[] | null
          recommended: boolean
          roi_estimate: string | null
          tools_suggested: string[] | null
          use_case_id: string
          variant_name: string
          variant_number: number
        }
        Insert: {
          approach_description?: string | null
          complexity?: string | null
          cons?: string[] | null
          created_at?: string
          estimated_cost?: string | null
          estimated_timeline?: string | null
          id?: string
          impact?: string | null
          pros?: string[] | null
          recommended?: boolean
          roi_estimate?: string | null
          tools_suggested?: string[] | null
          use_case_id: string
          variant_name: string
          variant_number?: number
        }
        Update: {
          approach_description?: string | null
          complexity?: string | null
          cons?: string[] | null
          created_at?: string
          estimated_cost?: string | null
          estimated_timeline?: string | null
          id?: string
          impact?: string | null
          pros?: string[] | null
          recommended?: boolean
          roi_estimate?: string | null
          tools_suggested?: string[] | null
          use_case_id?: string
          variant_name?: string
          variant_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "automation_variants_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "automation_use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      ba_conversations: {
        Row: {
          created_at: string
          id: string
          process_id: string | null
          status: string
          updated_at: string
          use_case_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          process_id?: string | null
          status?: string
          updated_at?: string
          use_case_id: string
        }
        Update: {
          created_at?: string
          id?: string
          process_id?: string | null
          status?: string
          updated_at?: string
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ba_conversations_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "uploaded_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ba_conversations_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "automation_use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      ba_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ba_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ba_conversations"
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
      kb_documents: {
        Row: {
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          id: string
          uploaded_at: string
        }
        Insert: {
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          id?: string
          uploaded_at?: string
        }
        Update: {
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          id?: string
          uploaded_at?: string
        }
        Relationships: []
      }
      pdd_documents: {
        Row: {
          content: Json
          conversation_id: string
          created_at: string
          html_content: string | null
          id: string
          status: string
          title: string
          use_case_id: string
        }
        Insert: {
          content?: Json
          conversation_id: string
          created_at?: string
          html_content?: string | null
          id?: string
          status?: string
          title: string
          use_case_id: string
        }
        Update: {
          content?: Json
          conversation_id?: string
          created_at?: string
          html_content?: string | null
          id?: string
          status?: string
          title?: string
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdd_documents_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ba_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdd_documents_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "automation_use_cases"
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
      process_screenshots: {
        Row: {
          caption: string | null
          created_at: string
          file_path: string
          id: string
          page_number: number | null
          process_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_path: string
          id?: string
          page_number?: number | null
          process_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_path?: string
          id?: string
          page_number?: number | null
          process_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_screenshots_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
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
          screenshot_url: string | null
          source: string
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
          screenshot_url?: string | null
          source?: string
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
          screenshot_url?: string | null
          source?: string
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
      services: {
        Row: {
          activity_id: string
          business_objective: string | null
          description: string | null
          documentation: string[] | null
          id: string
          name: string
        }
        Insert: {
          activity_id: string
          business_objective?: string | null
          description?: string | null
          documentation?: string[] | null
          id?: string
          name: string
        }
        Update: {
          activity_id?: string
          business_objective?: string | null
          description?: string | null
          documentation?: string[] | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      step_actions: {
        Row: {
          action_order: number
          created_at: string
          description: string
          id: string
          screenshot_page: number | null
          screenshot_url: string | null
          step_id: string
          system_used: string | null
        }
        Insert: {
          action_order?: number
          created_at?: string
          description: string
          id?: string
          screenshot_page?: number | null
          screenshot_url?: string | null
          step_id: string
          system_used?: string | null
        }
        Update: {
          action_order?: number
          created_at?: string
          description?: string
          id?: string
          screenshot_page?: number | null
          screenshot_url?: string | null
          step_id?: string
          system_used?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "step_actions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "process_steps"
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
          service_id: string | null
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
          service_id?: string | null
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
          service_id?: string | null
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
          {
            foreignKeyName: "uploaded_processes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      use_case_details: {
        Row: {
          created_at: string
          detail_content: Json
          id: string
          use_case_id: string
        }
        Insert: {
          created_at?: string
          detail_content?: Json
          id?: string
          use_case_id: string
        }
        Update: {
          created_at?: string
          detail_content?: Json
          id?: string
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "use_case_details_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: true
            referencedRelation: "automation_use_cases"
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
