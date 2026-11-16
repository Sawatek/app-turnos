// Generado con: pnpm db:tipos (no editar a mano).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "bloqueos": {
                  Row: {
                    "id": string,"motivo": string | null,"negocio_id": string,"profesional_id": string | null,"rango": unknown
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"motivo"?: string | null,"negocio_id": string,"profesional_id"?: string | null,"rango": unknown
                  }
                  Update: {
                    "id"?: string,"motivo"?: string | null,"negocio_id"?: string,"profesional_id"?: string | null,"rango"?: unknown
                  }
                  Relationships: [
                    {
      foreignKeyName: "bloqueos_negocio_id_fkey"
      columns: ["negocio_id"]
isOneToOne: false
      referencedRelation: "negocios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bloqueos_negocio_id_profesional_id_fkey"
      columns: ["negocio_id","profesional_id"]
isOneToOne: false
      referencedRelation: "profesionales"
      referencedColumns: ["negocio_id","id"]
    }
                  ]
                },"clientes": {
                  Row: {
                    "creado": string,"id": string,"negocio_id": string,"nombre": string,"telefono": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "creado"?: string,"id"?: string,"negocio_id": string,"nombre": string,"telefono"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "creado"?: string,"id"?: string,"negocio_id"?: string,"nombre"?: string,"telefono"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "clientes_negocio_id_fkey"
      columns: ["negocio_id"]
isOneToOne: false
      referencedRelation: "negocios"
      referencedColumns: ["id"]
    }
                  ]
                },"horarios": {
                  Row: {
                    "desde": string,"dia": number,"hasta": string,"id": string,"negocio_id": string,"profesional_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "desde": string,"dia": number,"hasta": string,"id"?: string,"negocio_id": string,"profesional_id": string
                  }
                  Update: {
                    "desde"?: string,"dia"?: number,"hasta"?: string,"id"?: string,"negocio_id"?: string,"profesional_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "horarios_negocio_id_profesional_id_fkey"
      columns: ["negocio_id","profesional_id"]
isOneToOne: false
      referencedRelation: "profesionales"
      referencedColumns: ["negocio_id","id"]
    }
                  ]
                },"miembros": {
                  Row: {
                    "creado": string,"negocio_id": string,"rol": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "creado"?: string,"negocio_id": string,"rol": string,"user_id": string
                  }
                  Update: {
                    "creado"?: string,"negocio_id"?: string,"rol"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "miembros_negocio_id_fkey"
      columns: ["negocio_id"]
isOneToOne: false
      referencedRelation: "negocios"
      referencedColumns: ["id"]
    }
                  ]
                },"negocios": {
                  Row: {
                    "actualizado": string,"anticipacion_min": number,"cancelacion_horas": number,"config": NonNullable<Json>,"creado": string,"creado_por": string | null,"es_demo": boolean,"estado": string,"id": string,"intervalo_min": number,"slug": string,"zona_horaria": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado"?: string,"anticipacion_min"?: number,"cancelacion_horas"?: number,"config": NonNullable<Json>,"creado"?: string,"creado_por"?: string | null,"es_demo"?: boolean,"estado"?: string,"id"?: string,"intervalo_min"?: number,"slug": string,"zona_horaria"?: string
                  }
                  Update: {
                    "actualizado"?: string,"anticipacion_min"?: number,"cancelacion_horas"?: number,"config"?: NonNullable<Json>,"creado"?: string,"creado_por"?: string | null,"es_demo"?: boolean,"estado"?: string,"id"?: string,"intervalo_min"?: number,"slug"?: string,"zona_horaria"?: string
                  }
                  Relationships: [
                    
                  ]
                },"notas_clientes": {
                  Row: {
                    "actualizado": string,"cliente_id": string,"negocio_id": string,"texto": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado"?: string,"cliente_id": string,"negocio_id": string,"texto": string
                  }
                  Update: {
                    "actualizado"?: string,"cliente_id"?: string,"negocio_id"?: string,"texto"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notas_clientes_negocio_id_cliente_id_fkey"
      columns: ["negocio_id","cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["negocio_id","id"]
    }
                  ]
                },"profesional_servicios": {
                  Row: {
                    "negocio_id": string,"profesional_id": string,"servicio_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "negocio_id": string,"profesional_id": string,"servicio_id": string
                  }
                  Update: {
                    "negocio_id"?: string,"profesional_id"?: string,"servicio_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profesional_servicios_negocio_id_profesional_id_fkey"
      columns: ["negocio_id","profesional_id"]
isOneToOne: false
      referencedRelation: "profesionales"
      referencedColumns: ["negocio_id","id"]
    },{
      foreignKeyName: "profesional_servicios_negocio_id_servicio_id_fkey"
      columns: ["negocio_id","servicio_id"]
isOneToOne: false
      referencedRelation: "servicios"
      referencedColumns: ["negocio_id","id"]
    }
                  ]
                },"profesionales": {
                  Row: {
                    "activo": boolean,"id": string,"negocio_id": string,"nombre": string,"orden": number,"rol": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"id"?: string,"negocio_id": string,"nombre": string,"orden"?: number,"rol"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "activo"?: boolean,"id"?: string,"negocio_id"?: string,"nombre"?: string,"orden"?: number,"rol"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profesionales_negocio_id_fkey"
      columns: ["negocio_id"]
isOneToOne: false
      referencedRelation: "negocios"
      referencedColumns: ["id"]
    }
                  ]
                },"servicios": {
                  Row: {
                    "activo": boolean,"detalle": string | null,"etiqueta": string | null,"id": string,"minutos": number,"negocio_id": string,"nombre": string,"orden": number,"precio": number
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"detalle"?: string | null,"etiqueta"?: string | null,"id"?: string,"minutos": number,"negocio_id": string,"nombre": string,"orden"?: number,"precio"?: number
                  }
                  Update: {
                    "activo"?: boolean,"detalle"?: string | null,"etiqueta"?: string | null,"id"?: string,"minutos"?: number,"negocio_id"?: string,"nombre"?: string,"orden"?: number,"precio"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "servicios_negocio_id_fkey"
      columns: ["negocio_id"]
isOneToOne: false
      referencedRelation: "negocios"
      referencedColumns: ["id"]
    }
                  ]
                },"superadmins": {
                  Row: {
                    "email": string
                  }
                  ComputedFields: never
                  Insert: {
                    "email": string
                  }
                  Update: {
                    "email"?: string
                  }
                  Relationships: [
                    
                  ]
                },"turnos": {
                  Row: {
                    "actualizado": string,"cliente_id": string,"creado": string,"creado_por": string | null,"estado": string,"fin": string,"id": string,"inicio": string,"negocio_id": string,"notas": string | null,"origen": string,"profesional_id": string,"sena": number,"servicio_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado"?: string,"cliente_id": string,"creado"?: string,"creado_por"?: string | null,"estado"?: string,"fin": string,"id"?: string,"inicio": string,"negocio_id": string,"notas"?: string | null,"origen"?: string,"profesional_id": string,"sena"?: number,"servicio_id": string
                  }
                  Update: {
                    "actualizado"?: string,"cliente_id"?: string,"creado"?: string,"creado_por"?: string | null,"estado"?: string,"fin"?: string,"id"?: string,"inicio"?: string,"negocio_id"?: string,"notas"?: string | null,"origen"?: string,"profesional_id"?: string,"sena"?: number,"servicio_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "turnos_negocio_id_cliente_id_fkey"
      columns: ["negocio_id","cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["negocio_id","id"]
    },{
      foreignKeyName: "turnos_negocio_id_fkey"
      columns: ["negocio_id"]
isOneToOne: false
      referencedRelation: "negocios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "turnos_negocio_id_profesional_id_fkey"
      columns: ["negocio_id","profesional_id"]
isOneToOne: false
      referencedRelation: "profesionales"
      referencedColumns: ["negocio_id","id"]
    },{
      foreignKeyName: "turnos_negocio_id_servicio_id_fkey"
      columns: ["negocio_id","servicio_id"]
isOneToOne: false
      referencedRelation: "servicios"
      referencedColumns: ["negocio_id","id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "cancelar_turno":
{ Args: { "p_turno": string }; Returns: undefined
                           },
"confirmar_turno":
{ Args: { "p_turno": string }; Returns: undefined
                           },
"es_dueno":
{ Args: { "p_negocio": string }; Returns: boolean
                           },
"es_mi_cliente":
{ Args: { "p_cliente": string }; Returns: boolean
                           },
"es_staff":
{ Args: { "p_negocio": string }; Returns: boolean
                           },
"es_superadmin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"es_usuario_app":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"horarios_libres":
{ Args: { "p_dia": string,"p_negocio": string,"p_profesional"?: string,"p_servicio": string }; Returns: {
              "inicio": string,"profesional_id": string
            }[]
                           },
"mi_profesional":
{ Args: { "p_negocio": string }; Returns: string
                           },
"reservar_turno":
{ Args: { "p_inicio": string,"p_negocio": string,"p_nombre"?: string,"p_profesional"?: string,"p_servicio": string,"p_telefono"?: string }; Returns: string
                           },
"rol_en":
{ Args: { "p_negocio": string }; Returns: string
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
