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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      metas: {
        Row: {
          created_at: string
          id: string
          loja: string
          marca: string
          mes: string
          meta_unidades: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          loja: string
          marca: string
          mes: string
          meta_unidades: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          loja?: string
          marca?: string
          mes?: string
          meta_unidades?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          store: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          store?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          store?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_modules: {
        Row: {
          created_at: string | null
          id: string
          module: Database["public"]["Enums"]["app_module"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          module: Database["public"]["Enums"]["app_module"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          module?: Database["public"]["Enums"]["app_module"]
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_export: boolean | null
          can_view_full_tables: boolean | null
          can_view_seller_details: boolean | null
          can_view_vehicle_details: boolean | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_export?: boolean | null
          can_view_full_tables?: boolean | null
          can_view_seller_details?: boolean | null
          can_view_vehicle_details?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_export?: boolean | null
          can_view_full_tables?: boolean | null
          can_view_seller_details?: boolean | null
          can_view_vehicle_details?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stores: {
        Row: {
          created_at: string | null
          id: string
          store: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          store: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          store?: string
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          chassi_completo: string
          comissao_final_gerente: number | null
          comissao_final_vendedor: number | null
          created_at: string
          custo_total_final: number | null
          data_faturamento: string | null
          data_geracao: string | null
          data_venda: string | null
          empresa_vendedora: string | null
          forplan: number | null
          id: string
          juros: number | null
          marca: string | null
          margem_fi_percent: number | null
          nome_vendedor_completo: string | null
          preco_venda: number | null
          tipo: string | null
          updated_at: string
          valor_venda: number | null
          veiculo: string | null
        }
        Insert: {
          chassi_completo: string
          comissao_final_gerente?: number | null
          comissao_final_vendedor?: number | null
          created_at?: string
          custo_total_final?: number | null
          data_faturamento?: string | null
          data_geracao?: string | null
          data_venda?: string | null
          empresa_vendedora?: string | null
          forplan?: number | null
          id?: string
          juros?: number | null
          marca?: string | null
          margem_fi_percent?: number | null
          nome_vendedor_completo?: string | null
          preco_venda?: number | null
          tipo?: string | null
          updated_at?: string
          valor_venda?: number | null
          veiculo?: string | null
        }
        Update: {
          chassi_completo?: string
          comissao_final_gerente?: number | null
          comissao_final_vendedor?: number | null
          created_at?: string
          custo_total_final?: number | null
          data_faturamento?: string | null
          data_geracao?: string | null
          data_venda?: string | null
          empresa_vendedora?: string | null
          forplan?: number | null
          id?: string
          juros?: number | null
          marca?: string | null
          margem_fi_percent?: number | null
          nome_vendedor_completo?: string | null
          preco_venda?: number | null
          tipo?: string | null
          updated_at?: string
          valor_venda?: number | null
          veiculo?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_name: { Args: { _user_id: string }; Returns: string }
      get_user_permissions: {
        Args: { _user_id: string }
        Returns: {
          can_export: boolean
          can_view_full_tables: boolean
          can_view_seller_details: boolean
          can_view_vehicle_details: boolean
        }[]
      }
      get_user_store: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_module_access: {
        Args: {
          _module: Database["public"]["Enums"]["app_module"]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_store_access: {
        Args: { _store: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_module: "diretoria" | "gerencia" | "pos-venda"
      app_role: "admin" | "manager" | "salesperson"
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
      app_module: ["diretoria", "gerencia", "pos-venda"],
      app_role: ["admin", "manager", "salesperson"],
    },
  },
} as const
