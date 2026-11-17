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
                },"invitaciones": {
                  Row: {
                    "aceptada": string | null,"creado": string,"creado_por": string | null,"email": string,"id": string,"negocio_id": string,"nombre": string | null,"profesional_id": string | null,"rol": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aceptada"?: string | null,"creado"?: string,"creado_por"?: string | null,"email": string,"id"?: string,"negocio_id": string,"nombre"?: string | null,"profesional_id"?: string | null,"rol": string
                  }
                  Update: {
                    "aceptada"?: string | null,"creado"?: string,"creado_por"?: string | null,"email"?: string,"id"?: string,"negocio_id"?: string,"nombre"?: string | null,"profesional_id"?: string | null,"rol"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invitaciones_negocio_id_fkey"
      columns: ["negocio_id"]
isOneToOne: false
      referencedRelation: "negocios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invitaciones_negocio_id_profesional_id_fkey"
      columns: ["negocio_id","profesional_id"]
isOneToOne: false
      referencedRelation: "profesionales"
      referencedColumns: ["negocio_id","id"]
    }
                  ]
                },"lista_espera": {
                  Row: {
                    "avisado": string | null,"cliente_id": string,"creado": string,"dia": string,"id": string,"negocio_id": string,"profesional_id": string | null,"servicio_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avisado"?: string | null,"cliente_id": string,"creado"?: string,"dia": string,"id"?: string,"negocio_id": string,"profesional_id"?: string | null,"servicio_id": string
                  }
                  Update: {
                    "avisado"?: string | null,"cliente_id"?: string,"creado"?: string,"dia"?: string,"id"?: string,"negocio_id"?: string,"profesional_id"?: string | null,"servicio_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lista_espera_negocio_id_cliente_id_fkey"
      columns: ["negocio_id","cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["negocio_id","id"]
    },{
      foreignKeyName: "lista_espera_negocio_id_fkey"
      columns: ["negocio_id"]
isOneToOne: false
      referencedRelation: "negocios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lista_espera_negocio_id_profesional_id_fkey"
      columns: ["negocio_id","profesional_id"]
isOneToOne: false
      referencedRelation: "profesionales"
      referencedColumns: ["negocio_id","id"]
    },{
      foreignKeyName: "lista_espera_negocio_id_servicio_id_fkey"
      columns: ["negocio_id","servicio_id"]
isOneToOne: false
      referencedRelation: "servicios"
      referencedColumns: ["negocio_id","id"]
    }
                  ]
                },"mensajes": {
                  Row: {
                    "canal": string,"cliente_id": string | null,"contenido": NonNullable<Json>,"creado": string,"destino": string,"entregado": string | null,"enviado": string | null,"error": string | null,"estado": string,"id": string,"intentos": number,"leido": string | null,"negocio_id": string | null,"programado": string,"proveedor_id": string | null,"tipo": string,"tomado": string | null,"turno_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "canal"?: string,"cliente_id"?: string | null,"contenido"?: NonNullable<Json>,"creado"?: string,"destino": string,"entregado"?: string | null,"enviado"?: string | null,"error"?: string | null,"estado"?: string,"id"?: string,"intentos"?: number,"leido"?: string | null,"negocio_id"?: string | null,"programado"?: string,"proveedor_id"?: string | null,"tipo": string,"tomado"?: string | null,"turno_id"?: string | null
                  }
                  Update: {
                    "canal"?: string,"cliente_id"?: string | null,"contenido"?: NonNullable<Json>,"creado"?: string,"destino"?: string,"entregado"?: string | null,"enviado"?: string | null,"error"?: string | null,"estado"?: string,"id"?: string,"intentos"?: number,"leido"?: string | null,"negocio_id"?: string | null,"programado"?: string,"proveedor_id"?: string | null,"tipo"?: string,"tomado"?: string | null,"turno_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "mensajes_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mensajes_negocio_id_fkey"
      columns: ["negocio_id"]
isOneToOne: false
      referencedRelation: "negocios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mensajes_turno_id_fkey"
      columns: ["turno_id"]
isOneToOne: false
      referencedRelation: "turnos"
      referencedColumns: ["id"]
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
                    "actualizado": string,"anticipacion_min": number,"cancelacion_horas": number,"config": NonNullable<Json>,"creado": string,"creado_por": string | null,"es_demo": boolean,"estado": string,"id": string,"intervalo_min": number,"plan": string | null,"slug": string,"zona_horaria": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado"?: string,"anticipacion_min"?: number,"cancelacion_horas"?: number,"config": NonNullable<Json>,"creado"?: string,"creado_por"?: string | null,"es_demo"?: boolean,"estado"?: string,"id"?: string,"intervalo_min"?: number,"plan"?: string | null,"slug": string,"zona_horaria"?: string
                  }
                  Update: {
                    "actualizado"?: string,"anticipacion_min"?: number,"cancelacion_horas"?: number,"config"?: NonNullable<Json>,"creado"?: string,"creado_por"?: string | null,"es_demo"?: boolean,"estado"?: string,"id"?: string,"intervalo_min"?: number,"plan"?: string | null,"slug"?: string,"zona_horaria"?: string
                  }
                  Relationships: [
                    
                  ]
                },"negocios_internos": {
                  Row: {
                    "actualizado": string,"actualizado_por": string | null,"negocio_id": string,"notas_internas": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado"?: string,"actualizado_por"?: string | null,"negocio_id": string,"notas_internas"?: string
                  }
                  Update: {
                    "actualizado"?: string,"actualizado_por"?: string | null,"negocio_id"?: string,"notas_internas"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "negocios_internos_negocio_id_fkey"
      columns: ["negocio_id"]
isOneToOne: true
      referencedRelation: "negocios"
      referencedColumns: ["id"]
    }
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
                },"push_suscripciones": {
                  Row: {
                    "actualizado": string,"auth": string,"creado": string,"endpoint": string,"id": string,"negocio_id": string,"p256dh": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado"?: string,"auth": string,"creado"?: string,"endpoint": string,"id"?: string,"negocio_id": string,"p256dh": string,"user_id"?: string
                  }
                  Update: {
                    "actualizado"?: string,"auth"?: string,"creado"?: string,"endpoint"?: string,"id"?: string,"negocio_id"?: string,"p256dh"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_suscripciones_negocio_id_fkey"
      columns: ["negocio_id"]
isOneToOne: false
      referencedRelation: "negocios"
      referencedColumns: ["id"]
    }
                  ]
                },"resenas": {
                  Row: {
                    "cliente_id": string,"comentario": string | null,"creado": string,"id": string,"negocio_id": string,"puntaje": number,"turno_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cliente_id": string,"comentario"?: string | null,"creado"?: string,"id"?: string,"negocio_id": string,"puntaje": number,"turno_id": string
                  }
                  Update: {
                    "cliente_id"?: string,"comentario"?: string | null,"creado"?: string,"id"?: string,"negocio_id"?: string,"puntaje"?: number,"turno_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "resenas_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resenas_negocio_id_fkey"
      columns: ["negocio_id"]
isOneToOne: false
      referencedRelation: "negocios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resenas_turno_id_fkey"
      columns: ["turno_id"]
isOneToOne: true
      referencedRelation: "turnos"
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
            "aceptar_invitaciones":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"admin_actualizar_negocio":
{ Args: { "p_cambios": Json,"p_negocio": string }; Returns: undefined
                           },
"admin_cuentas":
{ Args: Record<PropertyKey, never>; Returns: {
              "confirmada": boolean,"creado": string,"email": string,"es_superadmin": boolean,"negocios": Json,"nombre": string,"ultimo_ingreso": string,"user_id": string
            }[]
                           },
"admin_mensajes":
{ Args: { "p_antes"?: string,"p_estado"?: string,"p_limite"?: number,"p_negocio"?: string,"p_tipo"?: string }; Returns: {
              "canal": string,"creado": string,"destino": string,"enviado": string,"error": string,"estado": string,"id": string,"intentos": number,"negocio": string,"negocio_id": string,"programado": string,"texto": string,"tipo": string
            }[]
                           },
"admin_negocio":
{ Args: { "p_negocio": string }; Returns: Json
                           },
"admin_negocios":
{ Args: Record<PropertyKey, never>; Returns: {
              "actualizado": string,"clientes": number,"color": string,"creado": string,"duenos": Json,"equipo": number,"estado": string,"id": string,"invitaciones_pendientes": number,"nombre": string,"plan": string,"slug": string,"turnos_mes": number
            }[]
                           },
"admin_resumen":
{ Args: { "p_mes"?: string }; Returns: Json
                           },
"admin_sumar_miembro":
{ Args: { "p_negocio": string,"p_profesional"?: string,"p_rol": string,"p_user": string }; Returns: undefined
                           },
"anotarme_lista_espera":
{ Args: { "p_dia": string,"p_negocio": string,"p_nombre"?: string,"p_profesional"?: string,"p_servicio": string }; Returns: string
                           },
"calificacion_negocio":
{ Args: { "p_negocio": string }; Returns: {
              "cantidad": number,"promedio": number
            }[]
                           },
"cancelar_turno":
{ Args: { "p_turno": string }; Returns: undefined
                           },
"confirmar_por_whatsapp":
{ Args: { "p_telefono": string,"p_turno": string }; Returns: string
                           },
"confirmar_turno":
{ Args: { "p_turno": string }; Returns: undefined
                           },
"contenido_turno":
{ Args: { "p_tipo": string,"p_turno": string }; Returns: Json
                           },
"crear_negocio_real":
{ Args: { "p_config": Json,"p_email_dueno": string,"p_nombre_dueno"?: string,"p_slug": string }; Returns: string
                           },
"datos_turno":
{ Args: { "p_turno": string }; Returns: Json
                           },
"disparar_envio_mensajes":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"disponibilidad_dias":
{ Args: { "p_desde"?: string,"p_dias"?: number,"p_negocio": string,"p_profesional"?: string,"p_servicio": string }; Returns: {
              "capacidad": number,"dia": string,"libres": number
            }[]
                           },
"encolar_aviso":
{ Args: { "p_motivo": string,"p_plantilla": string,"p_telefono": string,"p_turno": string }; Returns: undefined
                           },
"encolar_mensaje_turno":
{ Args: { "p_programado"?: string,"p_tipo": string,"p_turno": string }; Returns: undefined
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
"estado_mensaje":
{ Args: { "p_entregado": string,"p_estado": string,"p_leido": string }; Returns: string
                           },
"guardar_push":
{ Args: { "p_auth": string,"p_endpoint": string,"p_negocio": string,"p_p256dh": string }; Returns: string
                           },
"hook_enviar_codigo":
{ Args: { "event": Json }; Returns: Json
                           },
"horarios_libres":
{ Args: { "p_dia": string,"p_negocio": string,"p_profesional"?: string,"p_servicio": string }; Returns: {
              "inicio": string,"profesional_id": string
            }[]
                           },
"mi_profesional":
{ Args: { "p_negocio": string }; Returns: string
                           },
"mi_resumen":
{ Args: { "p_negocio": string }; Returns: {
              "activos": number,"cancelacion_horas": number,"cliente_id": string,"nombre": string,"sellos": number,"telefono": string
            }[]
                           },
"mis_negocios":
{ Args: Record<PropertyKey, never>; Returns: {
              "es_demo": boolean,"estado": string,"id": string,"nombre": string,"rol": string,"slug": string
            }[]
                           },
"mis_turnos_global":
{ Args: Record<PropertyKey, never>; Returns: {
              "cancelacion_horas": number,"estado": string,"fin": string,"id": string,"inicio": string,"negocio": string,"negocio_id": string,"profesional": string,"puntaje": number,"servicio": string,"slug": string
            }[]
                           },
"nombre_de_usuario":
{ Args: { "p_user": string }; Returns: string
                           },
"normalizar_telefono":
{ Args: { "p": string }; Returns: string
                           },
"panel_atiendo_yo":
{ Args: { "p_negocio": string,"p_profesional"?: string }; Returns: string
                           },
"panel_guardar_horarios":
{ Args: { "p_franjas": Json,"p_profesional": string }; Returns: undefined
                           },
"panel_guardar_servicios_profesional":
{ Args: { "p_profesional": string,"p_servicios": (string)[] }; Returns: undefined
                           },
"panel_miembros":
{ Args: { "p_negocio": string }; Returns: {
              "creado": string,"email": string,"nombre": string,"profesional": string,"profesional_id": string,"rol": string,"user_id": string
            }[]
                           },
"panel_para_recuperar":
{ Args: { "p_dias"?: number,"p_negocio": string }; Returns: {
              "cliente_id": string,"con_celular": boolean,"nombre": string,"recuperar_enviado": string,"recuperar_estado": string,"telefono": string,"ultima_visita": string,"ultimo_servicio": string,"visitas": number
            }[]
                           },
"panel_quitar_miembro":
{ Args: { "p_negocio": string,"p_user": string }; Returns: undefined
                           },
"panel_recuperar_cliente":
{ Args: { "p_cliente": string }; Returns: string
                           },
"panel_reporte":
{ Args: { "p_desde": string,"p_hasta": string,"p_negocio": string,"p_profesional"?: string }; Returns: Json
                           },
"panel_resumen":
{ Args: { "p_dia": string,"p_negocio": string,"p_profesional"?: string }; Returns: {
              "confirmados": number,"facturacion": number,"faltas_mes": number,"turnos_dia": number
            }[]
                           },
"pedir_cambio_por_whatsapp":
{ Args: { "p_telefono": string,"p_turno": string }; Returns: string
                           },
"programar_push_turno":
{ Args: { "p_turno": string }; Returns: undefined
                           },
"programar_recordatorios":
{ Args: { "p_turno": string }; Returns: undefined
                           },
"puede_calificar":
{ Args: { "p_cliente": string,"p_negocio": string,"p_turno": string }; Returns: boolean
                           },
"registrar_envio":
{ Args: { "p_error"?: string,"p_id": string,"p_proveedor_id"?: string,"p_resultado": string }; Returns: undefined
                           },
"reservar_turno":
{ Args: { "p_inicio": string,"p_negocio": string,"p_nombre"?: string,"p_profesional"?: string,"p_servicio": string,"p_telefono"?: string }; Returns: string
                           },
"rol_en":
{ Args: { "p_negocio": string }; Returns: string
                           },
"sustituir_plantilla":
{ Args: { "p_datos": Json,"p_plantilla": string }; Returns: string
                           },
"telefono_cliente":
{ Args: { "p_cliente": string }; Returns: string
                           },
"telefono_es_del_turno":
{ Args: { "p_telefono": string,"p_turno": string }; Returns: boolean
                           },
"tomar_mensajes":
{ Args: { "p_limite"?: number,"p_negocio"?: string }; Returns: {
              "canal": string,
"cliente_id": string | null,
"contenido": NonNullable<Json>,
"creado": string,
"destino": string,
"entregado": string | null,
"enviado": string | null,
"error": string | null,
"estado": string,
"id": string,
"intentos": number,
"leido": string | null,
"negocio_id": string | null,
"programado": string,
"proveedor_id": string | null,
"tipo": string,
"tomado": string | null,
"turno_id": string | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "mensajes"
        isOneToOne: false
        isSetofReturn: true
      } }
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
