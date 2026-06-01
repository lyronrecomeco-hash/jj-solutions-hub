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
      clients: {
        Row: {
          address: string | null
          city: string | null
          company: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          address_complement: string | null
          address_number: string | null
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          cep: string | null
          city: string | null
          company: string | null
          cpf: string | null
          created_at: string
          email: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          full_name: string
          id: string
          job_title: string | null
          last_seen_at: string | null
          neighborhood: string | null
          phone: string | null
          photo_url: string | null
          registration_code: string | null
          rg: string | null
          specialty: string | null
          state: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          company?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          full_name?: string
          id: string
          job_title?: string | null
          last_seen_at?: string | null
          neighborhood?: string | null
          phone?: string | null
          photo_url?: string | null
          registration_code?: string | null
          rg?: string | null
          specialty?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          company?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          full_name?: string
          id?: string
          job_title?: string | null
          last_seen_at?: string | null
          neighborhood?: string | null
          phone?: string | null
          photo_url?: string | null
          registration_code?: string | null
          rg?: string | null
          specialty?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: []
      }
      technician_equipment: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          serial_number: string | null
          technician_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          serial_number?: string | null
          technician_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          serial_number?: string | null
          technician_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_equipment_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_signups: {
        Row: {
          address: string | null
          address_complement: string | null
          address_number: string | null
          birth_date: string | null
          cep: string | null
          city: string | null
          cpf: string | null
          created_at: string
          desired_employment_type: Database["public"]["Enums"]["employment_type"]
          email: string
          full_name: string
          id: string
          neighborhood: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rg: string | null
          specialty: string | null
          state: string | null
          status: Database["public"]["Enums"]["signup_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          desired_employment_type?: Database["public"]["Enums"]["employment_type"]
          email: string
          full_name: string
          id?: string
          neighborhood?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rg?: string | null
          specialty?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["signup_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          desired_employment_type?: Database["public"]["Enums"]["employment_type"]
          email?: string
          full_name?: string
          id?: string
          neighborhood?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rg?: string | null
          specialty?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["signup_status"]
          updated_at?: string
        }
        Relationships: []
      }
      ticket_attachments: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_url: string
          id: string
          mime_type: string | null
          ticket_id: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          mime_type?: string | null
          ticket_id: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          mime_type?: string | null
          ticket_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_history: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_reports: {
        Row: {
          created_at: string
          created_by: string | null
          diagnosis: string | null
          id: string
          internal_notes: string | null
          needs_return: boolean | null
          procedures: string | null
          recommendations: string | null
          result: string | null
          root_cause: string | null
          solution: string | null
          ticket_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          id?: string
          internal_notes?: string | null
          needs_return?: boolean | null
          procedures?: string | null
          recommendations?: string | null
          result?: string | null
          root_cause?: string | null
          solution?: string | null
          ticket_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          id?: string
          internal_notes?: string | null
          needs_return?: boolean | null
          procedures?: string | null
          recommendations?: string | null
          result?: string | null
          root_cause?: string | null
          solution?: string | null
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_reports_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          address: string | null
          assigned_to: string | null
          client_id: string | null
          closed_at: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          equipment: string | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          serial_number: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_number: string
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          client_id?: string | null
          closed_at?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          equipment?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          serial_number?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number?: string
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          client_id?: string | null
          closed_at?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          equipment?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          serial_number?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "supervisor" | "senior_tech" | "tech"
      employment_type: "field" | "clt" | "pj" | "internal"
      signup_status: "pending" | "approved" | "rejected"
      ticket_priority: "low" | "medium" | "high" | "critical"
      ticket_status:
        | "open"
        | "in_progress"
        | "waiting_part"
        | "waiting_client"
        | "resolved"
        | "partially_resolved"
        | "not_resolved"
        | "cancelled"
      user_status: "online" | "offline" | "busy" | "away"
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
    Enums: {
      app_role: ["admin", "supervisor", "senior_tech", "tech"],
      employment_type: ["field", "clt", "pj", "internal"],
      signup_status: ["pending", "approved", "rejected"],
      ticket_priority: ["low", "medium", "high", "critical"],
      ticket_status: [
        "open",
        "in_progress",
        "waiting_part",
        "waiting_client",
        "resolved",
        "partially_resolved",
        "not_resolved",
        "cancelled",
      ],
      user_status: ["online", "offline", "busy", "away"],
    },
  },
} as const
