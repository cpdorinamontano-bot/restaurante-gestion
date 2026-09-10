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
      activos_fijos: {
        Row: {
          costo: number
          created_at: string
          created_by: string | null
          estatus: Database["public"]["Enums"]["estatus_registro"]
          fecha_inicio: string
          id: string
          nombre: string
          notas: string | null
          sucursal_id: string
          tipo: string
          updated_at: string
          updated_by: string | null
          valor_residual: number
          vida_util_meses: number
        }
        Insert: {
          costo: number
          created_at?: string
          created_by?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          fecha_inicio: string
          id?: string
          nombre: string
          notas?: string | null
          sucursal_id: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          valor_residual?: number
          vida_util_meses: number
        }
        Update: {
          costo?: number
          created_at?: string
          created_by?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          fecha_inicio?: string
          id?: string
          nombre?: string
          notas?: string | null
          sucursal_id?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          valor_residual?: number
          vida_util_meses?: number
        }
        Relationships: [
          {
            foreignKeyName: "activos_fijos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activos_fijos_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activos_fijos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas: {
        Row: {
          atendida_en: string | null
          atendida_por: string | null
          created_at: string
          entidad_id: string | null
          entidad_tabla: string | null
          estatus: string
          id: string
          mensaje: string
          severidad: string
          sucursal_id: string | null
          tipo: string
        }
        Insert: {
          atendida_en?: string | null
          atendida_por?: string | null
          created_at?: string
          entidad_id?: string | null
          entidad_tabla?: string | null
          estatus?: string
          id?: string
          mensaje: string
          severidad?: string
          sucursal_id?: string | null
          tipo: string
        }
        Update: {
          atendida_en?: string | null
          atendida_por?: string | null
          created_at?: string
          entidad_id?: string | null
          entidad_tabla?: string | null
          estatus?: string
          id?: string
          mensaje?: string
          severidad?: string
          sucursal_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_atendida_por_fkey"
            columns: ["atendida_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          created_at: string
          created_by: string | null
          estatus: Database["public"]["Enums"]["estatus_registro"]
          id: string
          nombre: string
          notas: string | null
          origen: string
          sucursal_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre: string
          notas?: string | null
          origen?: string
          sucursal_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre?: string
          notas?: string | null
          origen?: string
          sucursal_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "areas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      bitacora_auditoria: {
        Row: {
          accion: string
          created_at: string
          id: string
          motivo: string | null
          registro_id: string | null
          tabla: string
          usuario_id: string | null
          valor_anterior: Json | null
          valor_nuevo: Json | null
        }
        Insert: {
          accion: string
          created_at?: string
          id?: string
          motivo?: string | null
          registro_id?: string | null
          tabla: string
          usuario_id?: string | null
          valor_anterior?: Json | null
          valor_nuevo?: Json | null
        }
        Update: {
          accion?: string
          created_at?: string
          id?: string
          motivo?: string | null
          registro_id?: string | null
          tabla?: string
          usuario_id?: string | null
          valor_anterior?: Json | null
          valor_nuevo?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "bitacora_auditoria_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cajas: {
        Row: {
          created_at: string
          estatus: Database["public"]["Enums"]["estatus_registro"]
          id: string
          nombre: string
          sucursal_id: string
        }
        Insert: {
          created_at?: string
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre: string
          sucursal_id: string
        }
        Update: {
          created_at?: string
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre?: string
          sucursal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cajas_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      cancelaciones: {
        Row: {
          autorizado_por: string | null
          created_at: string
          id: string
          importe: number
          motivo: string
          notas: string | null
          usuario_id: string | null
          venta_id: string
        }
        Insert: {
          autorizado_por?: string | null
          created_at?: string
          id?: string
          importe: number
          motivo: string
          notas?: string | null
          usuario_id?: string | null
          venta_id: string
        }
        Update: {
          autorizado_por?: string | null
          created_at?: string
          id?: string
          importe?: number
          motivo?: string
          notas?: string | null
          usuario_id?: string | null
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancelaciones_autorizado_por_fkey"
            columns: ["autorizado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancelaciones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancelaciones_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "v_ventas_conciliacion"
            referencedColumns: ["venta_id"]
          },
          {
            foreignKeyName: "cancelaciones_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_gastos: {
        Row: {
          created_at: string
          es_socios: boolean
          estatus: Database["public"]["Enums"]["estatus_registro"]
          id: string
          nombre: string
          tipo: string
        }
        Insert: {
          created_at?: string
          es_socios?: boolean
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre: string
          tipo: string
        }
        Update: {
          created_at?: string
          es_socios?: boolean
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre?: string
          tipo?: string
        }
        Relationships: []
      }
      categorias_productos: {
        Row: {
          created_at: string
          estatus: Database["public"]["Enums"]["estatus_registro"]
          id: string
          nombre: string
          tipo: string
        }
        Insert: {
          created_at?: string
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre: string
          tipo: string
        }
        Update: {
          created_at?: string
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre?: string
          tipo?: string
        }
        Relationships: []
      }
      centros_costo: {
        Row: {
          codigo: string
          created_at: string
          created_by: string | null
          estatus: Database["public"]["Enums"]["estatus_registro"]
          id: string
          nombre: string
          notas: string | null
          origen: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          codigo: string
          created_at?: string
          created_by?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre: string
          notas?: string | null
          origen?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string
          created_by?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre?: string
          notas?: string | null
          origen?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "centros_costo_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centros_costo_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cierres_caja: {
        Row: {
          caja_id: string
          created_at: string
          created_by: string | null
          diferencia: number | null
          entradas_total: number
          estatus: Database["public"]["Enums"]["estatus_registro"]
          fecha: string
          id: string
          notas: string | null
          origen: string
          saldo_fisico: number | null
          saldo_inicial: number
          saldo_teorico: number | null
          salidas_total: number
          turno: string | null
          updated_at: string
          updated_by: string | null
          usuario_id: string | null
        }
        Insert: {
          caja_id: string
          created_at?: string
          created_by?: string | null
          diferencia?: number | null
          entradas_total?: number
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          fecha?: string
          id?: string
          notas?: string | null
          origen?: string
          saldo_fisico?: number | null
          saldo_inicial?: number
          saldo_teorico?: number | null
          salidas_total?: number
          turno?: string | null
          updated_at?: string
          updated_by?: string | null
          usuario_id?: string | null
        }
        Update: {
          caja_id?: string
          created_at?: string
          created_by?: string | null
          diferencia?: number | null
          entradas_total?: number
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          fecha?: string
          id?: string
          notas?: string | null
          origen?: string
          saldo_fisico?: number | null
          saldo_inicial?: number
          saldo_teorico?: number | null
          salidas_total?: number
          turno?: string | null
          updated_at?: string
          updated_by?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cierres_caja_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cierres_caja_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cierres_caja_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cierres_caja_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cierres_diarios: {
        Row: {
          checklist: Json
          created_at: string
          created_by: string | null
          estatus: string
          fecha: string
          id: string
          notas: string | null
          sucursal_id: string
          updated_at: string
          updated_by: string | null
          validado_en: string | null
          validado_por: string | null
        }
        Insert: {
          checklist?: Json
          created_at?: string
          created_by?: string | null
          estatus?: string
          fecha: string
          id?: string
          notas?: string | null
          sucursal_id: string
          updated_at?: string
          updated_by?: string | null
          validado_en?: string | null
          validado_por?: string | null
        }
        Update: {
          checklist?: Json
          created_at?: string
          created_by?: string | null
          estatus?: string
          fecha?: string
          id?: string
          notas?: string | null
          sucursal_id?: string
          updated_at?: string
          updated_by?: string | null
          validado_en?: string | null
          validado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cierres_diarios_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cierres_diarios_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cierres_diarios_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cierres_diarios_validado_por_fkey"
            columns: ["validado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cierres_mensuales: {
        Row: {
          cerrado_en: string | null
          cerrado_por: string | null
          checklist: Json
          created_at: string
          created_by: string | null
          estatus: string
          id: string
          motivo_cambio: string | null
          notas: string | null
          periodo: string
          sucursal_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cerrado_en?: string | null
          cerrado_por?: string | null
          checklist?: Json
          created_at?: string
          created_by?: string | null
          estatus?: string
          id?: string
          motivo_cambio?: string | null
          notas?: string | null
          periodo: string
          sucursal_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cerrado_en?: string | null
          cerrado_por?: string | null
          checklist?: Json
          created_at?: string
          created_by?: string | null
          estatus?: string
          id?: string
          motivo_cambio?: string | null
          notas?: string | null
          periodo?: string
          sucursal_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cierres_mensuales_cerrado_por_fkey"
            columns: ["cerrado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cierres_mensuales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cierres_mensuales_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cierres_mensuales_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cierres_mensuales_historial: {
        Row: {
          accion: string
          cierre_mensual_id: string
          estatus_anterior: string | null
          estatus_nuevo: string
          fecha: string
          id: string
          motivo: string | null
          usuario_id: string | null
        }
        Insert: {
          accion: string
          cierre_mensual_id: string
          estatus_anterior?: string | null
          estatus_nuevo: string
          fecha?: string
          id?: string
          motivo?: string | null
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          cierre_mensual_id?: string
          estatus_anterior?: string | null
          estatus_nuevo?: string
          fecha?: string
          id?: string
          motivo?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cierres_mensuales_historial_cierre_mensual_id_fkey"
            columns: ["cierre_mensual_id"]
            isOneToOne: false
            referencedRelation: "cierres_mensuales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cierres_mensuales_historial_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          contacto: string | null
          created_at: string
          created_by: string | null
          email: string | null
          estatus: Database["public"]["Enums"]["estatus_registro"]
          id: string
          nombre: string
          notas: string | null
          origen: string
          rfc: string | null
          telefono: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contacto?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre: string
          notas?: string | null
          origen?: string
          rfc?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contacto?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre?: string
          notas?: string | null
          origen?: string
          rfc?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      compras: {
        Row: {
          categoria_id: string | null
          centro_costo_id: string | null
          created_at: string
          created_by: string | null
          documento_id: string | null
          estatus: Database["public"]["Enums"]["estatus_registro"]
          estatus_pago: string
          factura_uuid: string | null
          fecha: string
          fecha_vencimiento: string | null
          folio: string | null
          forma_pago_id: string | null
          id: string
          impuestos: number
          notas: string | null
          origen: string
          proveedor_id: string
          subtotal: number
          sucursal_id: string | null
          total: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          categoria_id?: string | null
          centro_costo_id?: string | null
          created_at?: string
          created_by?: string | null
          documento_id?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          estatus_pago?: string
          factura_uuid?: string | null
          fecha: string
          fecha_vencimiento?: string | null
          folio?: string | null
          forma_pago_id?: string | null
          id?: string
          impuestos?: number
          notas?: string | null
          origen?: string
          proveedor_id: string
          subtotal?: number
          sucursal_id?: string | null
          total?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          categoria_id?: string | null
          centro_costo_id?: string | null
          created_at?: string
          created_by?: string | null
          documento_id?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          estatus_pago?: string
          factura_uuid?: string | null
          fecha?: string
          fecha_vencimiento?: string | null
          folio?: string | null
          forma_pago_id?: string | null
          id?: string
          impuestos?: number
          notas?: string | null
          origen?: string
          proveedor_id?: string
          subtotal?: number
          sucursal_id?: string | null
          total?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_centro_costo_id_fkey"
            columns: ["centro_costo_id"]
            isOneToOne: false
            referencedRelation: "centros_costo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_forma_pago_id_fkey"
            columns: ["forma_pago_id"]
            isOneToOne: false
            referencedRelation: "formas_pago"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_compras_documento"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_detalle: {
        Row: {
          cantidad: number
          compra_id: string
          costo_unitario: number
          created_at: string
          created_by: string | null
          id: string
          producto_id: string
          subtotal: number | null
          unidad_id: string | null
        }
        Insert: {
          cantidad: number
          compra_id: string
          costo_unitario: number
          created_at?: string
          created_by?: string | null
          id?: string
          producto_id: string
          subtotal?: number | null
          unidad_id?: string | null
        }
        Update: {
          cantidad?: number
          compra_id?: string
          costo_unitario?: number
          created_at?: string
          created_by?: string | null
          id?: string
          producto_id?: string
          subtotal?: number | null
          unidad_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_detalle_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_detalle_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_detalle_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_detalle_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["id"]
          },
        ]
      }
      conciliaciones_bancarias: {
        Row: {
          created_at: string
          cuenta_id: string
          documento_id: string | null
          estatus: Database["public"]["Enums"]["estatus_registro"]
          id: string
          notas: string | null
          periodo: string
          saldo_estado_cuenta: number
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          cuenta_id: string
          documento_id?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          notas?: string | null
          periodo: string
          saldo_estado_cuenta: number
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          cuenta_id?: string
          documento_id?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          notas?: string | null
          periodo?: string
          saldo_estado_cuenta?: number
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conciliaciones_bancarias_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conciliaciones_bancarias_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conciliaciones_bancarias_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_sistema: {
        Row: {
          clave: string
          descripcion: string | null
          id: string
          updated_at: string
          updated_by: string | null
          valor: Json
        }
        Insert: {
          clave: string
          descripcion?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
          valor: Json
        }
        Update: {
          clave?: string
          descripcion?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
          valor?: Json
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_sistema_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      conteos_detalle: {
        Row: {
          cantidad_fisica: number
          cantidad_teorica: number
          conteo_id: string
          costo_unitario: number
          created_at: string
          diferencia: number | null
          id: string
          producto_id: string
          valor_diferencia: number | null
        }
        Insert: {
          cantidad_fisica: number
          cantidad_teorica?: number
          conteo_id: string
          costo_unitario?: number
          created_at?: string
          diferencia?: number | null
          id?: string
          producto_id: string
          valor_diferencia?: number | null
        }
        Update: {
          cantidad_fisica?: number
          cantidad_teorica?: number
          conteo_id?: string
          costo_unitario?: number
          created_at?: string
          diferencia?: number | null
          id?: string
          producto_id?: string
          valor_diferencia?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conteos_detalle_conteo_id_fkey"
            columns: ["conteo_id"]
            isOneToOne: false
            referencedRelation: "conteos_inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conteos_detalle_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      conteos_inventario: {
        Row: {
          cerrado_en: string | null
          created_at: string
          estatus: string
          fecha: string
          id: string
          notas: string | null
          sucursal_id: string
          usuario_id: string | null
        }
        Insert: {
          cerrado_en?: string | null
          created_at?: string
          estatus?: string
          fecha?: string
          id?: string
          notas?: string | null
          sucursal_id: string
          usuario_id?: string | null
        }
        Update: {
          cerrado_en?: string | null
          created_at?: string
          estatus?: string
          fecha?: string
          id?: string
          notas?: string | null
          sucursal_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conteos_inventario_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conteos_inventario_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cortesias: {
        Row: {
          autorizado_por: string | null
          cantidad: number
          costo_estimado: number
          created_at: string
          id: string
          motivo: string
          notas: string | null
          producto_id: string | null
          usuario_id: string | null
          venta_id: string
        }
        Insert: {
          autorizado_por?: string | null
          cantidad?: number
          costo_estimado?: number
          created_at?: string
          id?: string
          motivo: string
          notas?: string | null
          producto_id?: string | null
          usuario_id?: string | null
          venta_id: string
        }
        Update: {
          autorizado_por?: string | null
          cantidad?: number
          costo_estimado?: number
          created_at?: string
          id?: string
          motivo?: string
          notas?: string | null
          producto_id?: string | null
          usuario_id?: string | null
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cortesias_autorizado_por_fkey"
            columns: ["autorizado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cortesias_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cortesias_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cortesias_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "v_ventas_conciliacion"
            referencedColumns: ["venta_id"]
          },
          {
            foreignKeyName: "cortesias_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      cuentas_bancarias: {
        Row: {
          alias: string | null
          banco: string
          created_at: string
          created_by: string | null
          estatus: Database["public"]["Enums"]["estatus_registro"]
          id: string
          moneda: string
          notas: string | null
          numero_cuenta: string
          saldo_actual: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          alias?: string | null
          banco: string
          created_at?: string
          created_by?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          moneda?: string
          notas?: string | null
          numero_cuenta: string
          saldo_actual?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          alias?: string | null
          banco?: string
          created_at?: string
          created_by?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          moneda?: string
          notas?: string | null
          numero_cuenta?: string
          saldo_actual?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_bancarias_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_bancarias_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cuentas_por_pagar: {
        Row: {
          created_at: string
          created_by: string | null
          documento_referencia: string | null
          estatus: Database["public"]["Enums"]["estatus_registro"]
          fecha_emision: string
          fecha_vencimiento: string
          id: string
          importe_original: number
          notas: string | null
          origen: string
          origen_id: string
          origen_tabla: string
          proveedor_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          documento_referencia?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          fecha_emision: string
          fecha_vencimiento: string
          id?: string
          importe_original: number
          notas?: string | null
          origen?: string
          origen_id: string
          origen_tabla: string
          proveedor_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          documento_referencia?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          fecha_emision?: string
          fecha_vencimiento?: string
          id?: string
          importe_original?: number
          notas?: string | null
          origen?: string
          origen_id?: string
          origen_tabla?: string
          proveedor_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_por_pagar_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_por_pagar_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_por_pagar_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      descuentos: {
        Row: {
          autorizado_por: string | null
          created_at: string
          id: string
          importe: number
          motivo: string
          notas: string | null
          usuario_id: string | null
          venta_id: string
        }
        Insert: {
          autorizado_por?: string | null
          created_at?: string
          id?: string
          importe: number
          motivo: string
          notas?: string | null
          usuario_id?: string | null
          venta_id: string
        }
        Update: {
          autorizado_por?: string | null
          created_at?: string
          id?: string
          importe?: number
          motivo?: string
          notas?: string | null
          usuario_id?: string | null
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "descuentos_autorizado_por_fkey"
            columns: ["autorizado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "descuentos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "descuentos_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "v_ventas_conciliacion"
            referencedColumns: ["venta_id"]
          },
          {
            foreignKeyName: "descuentos_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      devoluciones: {
        Row: {
          autorizado_por: string | null
          cantidad: number
          created_at: string
          id: string
          importe: number
          motivo: string
          notas: string | null
          producto_id: string | null
          usuario_id: string | null
          venta_id: string
        }
        Insert: {
          autorizado_por?: string | null
          cantidad?: number
          created_at?: string
          id?: string
          importe: number
          motivo: string
          notas?: string | null
          producto_id?: string | null
          usuario_id?: string | null
          venta_id: string
        }
        Update: {
          autorizado_por?: string | null
          cantidad?: number
          created_at?: string
          id?: string
          importe?: number
          motivo?: string
          notas?: string | null
          producto_id?: string | null
          usuario_id?: string | null
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devoluciones_autorizado_por_fkey"
            columns: ["autorizado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devoluciones_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devoluciones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devoluciones_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "v_ventas_conciliacion"
            referencedColumns: ["venta_id"]
          },
          {
            foreignKeyName: "devoluciones_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          created_at: string
          estatus: Database["public"]["Enums"]["estatus_registro"]
          id: string
          nombre_archivo: string | null
          notas: string | null
          registro_relacionado_id: string | null
          storage_path: string
          subido_por: string | null
          tabla_relacionada: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre_archivo?: string | null
          notas?: string | null
          registro_relacionado_id?: string | null
          storage_path: string
          subido_por?: string | null
          tabla_relacionada?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre_archivo?: string | null
          notas?: string | null
          registro_relacionado_id?: string | null
          storage_path?: string
          subido_por?: string | null
          tabla_relacionada?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_subido_por_fkey"
            columns: ["subido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      empleados: {
        Row: {
          area_id: string | null
          created_at: string
          created_by: string | null
          estatus: Database["public"]["Enums"]["estatus_registro"]
          fecha_ingreso: string | null
          id: string
          nombre: string
          notas: string | null
          origen: string
          puesto: string | null
          sucursal_id: string | null
          sueldo_base: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          created_by?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          fecha_ingreso?: string | null
          id?: string
          nombre: string
          notas?: string | null
          origen?: string
          puesto?: string | null
          sucursal_id?: string | null
          sueldo_base?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area_id?: string | null
          created_at?: string
          created_by?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          fecha_ingreso?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          origen?: string
          puesto?: string | null
          sucursal_id?: string | null
          sueldo_base?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empleados_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      formas_pago: {
        Row: {
          created_at: string
          estatus: Database["public"]["Enums"]["estatus_registro"]
          id: string
          nombre: string
          tipo: string
        }
        Insert: {
          created_at?: string
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre: string
          tipo: string
        }
        Update: {
          created_at?: string
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre?: string
          tipo?: string
        }
        Relationships: []
      }
      gastos: {
        Row: {
          categoria_gasto_id: string
          centro_costo_id: string | null
          concepto: string
          created_at: string
          created_by: string | null
          documento_id: string | null
          estatus: Database["public"]["Enums"]["estatus_registro"]
          estatus_pago: string
          fecha: string
          fecha_vencimiento: string | null
          forma_pago_id: string | null
          id: string
          impuestos: number
          notas: string | null
          observacion: string | null
          origen: string
          proveedor_id: string | null
          subtotal: number
          sucursal_id: string | null
          total: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          categoria_gasto_id: string
          centro_costo_id?: string | null
          concepto: string
          created_at?: string
          created_by?: string | null
          documento_id?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          estatus_pago?: string
          fecha: string
          fecha_vencimiento?: string | null
          forma_pago_id?: string | null
          id?: string
          impuestos?: number
          notas?: string | null
          observacion?: string | null
          origen?: string
          proveedor_id?: string | null
          subtotal?: number
          sucursal_id?: string | null
          total?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          categoria_gasto_id?: string
          centro_costo_id?: string | null
          concepto?: string
          created_at?: string
          created_by?: string | null
          documento_id?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          estatus_pago?: string
          fecha?: string
          fecha_vencimiento?: string | null
          forma_pago_id?: string | null
          id?: string
          impuestos?: number
          notas?: string | null
          observacion?: string | null
          origen?: string
          proveedor_id?: string | null
          subtotal?: number
          sucursal_id?: string | null
          total?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_gastos_documento"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_categoria_gasto_id_fkey"
            columns: ["categoria_gasto_id"]
            isOneToOne: false
            referencedRelation: "categorias_gastos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_centro_costo_id_fkey"
            columns: ["centro_costo_id"]
            isOneToOne: false
            referencedRelation: "centros_costo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_forma_pago_id_fkey"
            columns: ["forma_pago_id"]
            isOneToOne: false
            referencedRelation: "formas_pago"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      impuestos_periodo: {
        Row: {
          created_at: string
          created_by: string | null
          estatus: Database["public"]["Enums"]["estatus_registro"]
          fecha_pago: string | null
          id: string
          importe_causado: number
          importe_pagado: number
          notas: string | null
          periodo: string
          sucursal_id: string
          tipo_impuesto: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          fecha_pago?: string | null
          id?: string
          importe_causado?: number
          importe_pagado?: number
          notas?: string | null
          periodo: string
          sucursal_id: string
          tipo_impuesto: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          fecha_pago?: string | null
          id?: string
          importe_causado?: number
          importe_pagado?: number
          notas?: string | null
          periodo?: string
          sucursal_id?: string
          tipo_impuesto?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impuestos_periodo_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impuestos_periodo_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impuestos_periodo_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      inventarios: {
        Row: {
          cantidad_actual: number
          costo_promedio_actual: number
          id: string
          producto_id: string
          sucursal_id: string
          unidad_id: string | null
          updated_at: string
        }
        Insert: {
          cantidad_actual?: number
          costo_promedio_actual?: number
          id?: string
          producto_id: string
          sucursal_id: string
          unidad_id?: string | null
          updated_at?: string
        }
        Update: {
          cantidad_actual?: number
          costo_promedio_actual?: number
          id?: string
          producto_id?: string
          sucursal_id?: string
          unidad_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventarios_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventarios_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventarios_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["id"]
          },
        ]
      }
      inventarios_mensuales: {
        Row: {
          created_at: string
          created_by: string | null
          estatus: Database["public"]["Enums"]["estatus_registro"]
          id: string
          inventario_final: number
          inventario_inicial: number
          notas: string | null
          periodo: string
          sucursal_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          inventario_final?: number
          inventario_inicial?: number
          notas?: string | null
          periodo: string
          sucursal_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          inventario_final?: number
          inventario_inicial?: number
          notas?: string | null
          periodo?: string
          sucursal_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventarios_mensuales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventarios_mensuales_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventarios_mensuales_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      kpis: {
        Row: {
          created_at: string
          id: string
          meta: number | null
          nombre_kpi: string
          periodo: string
          sucursal_id: string
          tipo_periodo: string
          valor: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          meta?: number | null
          nombre_kpi: string
          periodo: string
          sucursal_id: string
          tipo_periodo: string
          valor?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          meta?: number | null
          nombre_kpi?: string
          periodo?: string
          sucursal_id?: string
          tipo_periodo?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpis_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      mermas: {
        Row: {
          autorizado_por: string | null
          cantidad: number
          costo_total: number | null
          costo_unitario: number | null
          created_at: string
          created_by: string | null
          estatus: Database["public"]["Enums"]["estatus_registro"]
          evidencia_documento_id: string | null
          fecha: string
          id: string
          motivo: string
          notas: string | null
          origen: string
          producto_id: string
          responsable_id: string | null
          sucursal_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          autorizado_por?: string | null
          cantidad: number
          costo_total?: number | null
          costo_unitario?: number | null
          created_at?: string
          created_by?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          evidencia_documento_id?: string | null
          fecha?: string
          id?: string
          motivo: string
          notas?: string | null
          origen?: string
          producto_id: string
          responsable_id?: string | null
          sucursal_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          autorizado_por?: string | null
          cantidad?: number
          costo_total?: number | null
          costo_unitario?: number | null
          created_at?: string
          created_by?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          evidencia_documento_id?: string | null
          fecha?: string
          id?: string
          motivo?: string
          notas?: string | null
          origen?: string
          producto_id?: string
          responsable_id?: string | null
          sucursal_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_mermas_documento"
            columns: ["evidencia_documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mermas_autorizado_por_fkey"
            columns: ["autorizado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mermas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mermas_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mermas_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mermas_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mermas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_bancarios: {
        Row: {
          abono: number
          beneficiario: string | null
          cargo: number
          concepto: string | null
          conciliado: boolean
          created_at: string
          cuenta_id: string
          documento_id: string | null
          fecha: string
          id: string
          notas: string | null
          proveedor_id: string | null
          referencia: string | null
          referencia_conciliacion_id: string | null
          referencia_conciliacion_tabla: string | null
          tipo_movimiento: string | null
          usuario_id: string | null
        }
        Insert: {
          abono?: number
          beneficiario?: string | null
          cargo?: number
          concepto?: string | null
          conciliado?: boolean
          created_at?: string
          cuenta_id: string
          documento_id?: string | null
          fecha: string
          id?: string
          notas?: string | null
          proveedor_id?: string | null
          referencia?: string | null
          referencia_conciliacion_id?: string | null
          referencia_conciliacion_tabla?: string | null
          tipo_movimiento?: string | null
          usuario_id?: string | null
        }
        Update: {
          abono?: number
          beneficiario?: string | null
          cargo?: number
          concepto?: string | null
          conciliado?: boolean
          created_at?: string
          cuenta_id?: string
          documento_id?: string | null
          fecha?: string
          id?: string
          notas?: string | null
          proveedor_id?: string | null
          referencia?: string | null
          referencia_conciliacion_id?: string | null
          referencia_conciliacion_tabla?: string | null
          tipo_movimiento?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_mov_banc_documento"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_bancarios_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_bancarios_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_bancarios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_caja: {
        Row: {
          caja_id: string
          created_at: string
          fecha: string
          id: string
          importe: number
          notas: string | null
          referencia_id: string | null
          referencia_tabla: string | null
          tipo_movimiento: string
          turno: string | null
          usuario_id: string | null
        }
        Insert: {
          caja_id: string
          created_at?: string
          fecha?: string
          id?: string
          importe: number
          notas?: string | null
          referencia_id?: string | null
          referencia_tabla?: string | null
          tipo_movimiento: string
          turno?: string | null
          usuario_id?: string | null
        }
        Update: {
          caja_id?: string
          created_at?: string
          fecha?: string
          id?: string
          importe?: number
          notas?: string | null
          referencia_id?: string | null
          referencia_tabla?: string | null
          tipo_movimiento?: string
          turno?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_caja_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_caja_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_inventario: {
        Row: {
          cantidad: number
          costo_total: number | null
          costo_unitario: number | null
          created_at: string
          documento_id: string | null
          fecha: string
          id: string
          motivo: string | null
          notas: string | null
          producto_id: string
          referencia_id: string | null
          referencia_tabla: string | null
          sucursal_id: string
          tipo_movimiento: string
          usuario_id: string | null
        }
        Insert: {
          cantidad: number
          costo_total?: number | null
          costo_unitario?: number | null
          created_at?: string
          documento_id?: string | null
          fecha?: string
          id?: string
          motivo?: string | null
          notas?: string | null
          producto_id: string
          referencia_id?: string | null
          referencia_tabla?: string | null
          sucursal_id: string
          tipo_movimiento: string
          usuario_id?: string | null
        }
        Update: {
          cantidad?: number
          costo_total?: number | null
          costo_unitario?: number | null
          created_at?: string
          documento_id?: string | null
          fecha?: string
          id?: string
          motivo?: string | null
          notas?: string | null
          producto_id?: string
          referencia_id?: string | null
          referencia_tabla?: string | null
          sucursal_id?: string
          tipo_movimiento?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_mov_inv_documento"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      nomina_detalle: {
        Row: {
          bonos: number
          cargas_patronales: number
          costo_total: number | null
          created_at: string
          created_by: string | null
          empleado_id: string
          horas_extras: number
          id: string
          notas: string | null
          otros_costos: number
          periodo_id: string
          prestaciones: number
          sueldo: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bonos?: number
          cargas_patronales?: number
          costo_total?: number | null
          created_at?: string
          created_by?: string | null
          empleado_id: string
          horas_extras?: number
          id?: string
          notas?: string | null
          otros_costos?: number
          periodo_id: string
          prestaciones?: number
          sueldo?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bonos?: number
          cargas_patronales?: number
          costo_total?: number | null
          created_at?: string
          created_by?: string | null
          empleado_id?: string
          horas_extras?: number
          id?: string
          notas?: string | null
          otros_costos?: number
          periodo_id?: string
          prestaciones?: number
          sueldo?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nomina_detalle_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nomina_detalle_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nomina_detalle_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos_nomina"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nomina_detalle_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      obligaciones: {
        Row: {
          concepto: string
          created_at: string
          created_by: string | null
          documento_id: string | null
          estatus: Database["public"]["Enums"]["estatus_registro"]
          estatus_pago: string
          fecha_vencimiento: string
          id: string
          importe: number
          notas: string | null
          origen: string
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          concepto: string
          created_at?: string
          created_by?: string | null
          documento_id?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          estatus_pago?: string
          fecha_vencimiento: string
          id?: string
          importe: number
          notas?: string | null
          origen?: string
          tipo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          concepto?: string
          created_at?: string
          created_by?: string | null
          documento_id?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          estatus_pago?: string
          fecha_vencimiento?: string
          id?: string
          importe?: number
          notas?: string | null
          origen?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_obligaciones_documento"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligaciones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligaciones_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_proveedores: {
        Row: {
          created_at: string
          cuenta_por_pagar_id: string
          documento_id: string | null
          fecha: string
          forma_pago_id: string | null
          id: string
          importe: number
          notas: string | null
          referencia: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          cuenta_por_pagar_id: string
          documento_id?: string | null
          fecha: string
          forma_pago_id?: string | null
          id?: string
          importe: number
          notas?: string | null
          referencia?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          cuenta_por_pagar_id?: string
          documento_id?: string | null
          fecha?: string
          forma_pago_id?: string | null
          id?: string
          importe?: number
          notas?: string | null
          referencia?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pagos_prov_documento"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_proveedores_cuenta_por_pagar_id_fkey"
            columns: ["cuenta_por_pagar_id"]
            isOneToOne: false
            referencedRelation: "cuentas_por_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_proveedores_cuenta_por_pagar_id_fkey"
            columns: ["cuenta_por_pagar_id"]
            isOneToOne: false
            referencedRelation: "v_cxp_antiguedad"
            referencedColumns: ["cuenta_por_pagar_id"]
          },
          {
            foreignKeyName: "pagos_proveedores_cuenta_por_pagar_id_fkey"
            columns: ["cuenta_por_pagar_id"]
            isOneToOne: false
            referencedRelation: "v_cxp_saldos"
            referencedColumns: ["cuenta_por_pagar_id"]
          },
          {
            foreignKeyName: "pagos_proveedores_forma_pago_id_fkey"
            columns: ["forma_pago_id"]
            isOneToOne: false
            referencedRelation: "formas_pago"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_proveedores_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      periodos_nomina: {
        Row: {
          created_at: string
          created_by: string | null
          estatus: string
          fecha_fin: string
          fecha_inicio: string
          id: string
          notas: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estatus?: string
          fecha_fin: string
          fecha_inicio: string
          id?: string
          notas?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estatus?: string
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          notas?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "periodos_nomina_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuestos: {
        Row: {
          categoria: string
          created_at: string
          created_by: string | null
          id: string
          notas: string | null
          periodo: string
          sucursal_id: string
          valor_objetivo: number
        }
        Insert: {
          categoria: string
          created_at?: string
          created_by?: string | null
          id?: string
          notas?: string | null
          periodo: string
          sucursal_id: string
          valor_objetivo: number
        }
        Update: {
          categoria?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notas?: string | null
          periodo?: string
          sucursal_id?: string
          valor_objetivo?: number
        }
        Relationships: [
          {
            foreignKeyName: "presupuestos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuestos_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          categoria_id: string | null
          costo_promedio: number
          created_at: string
          created_by: string | null
          estatus: Database["public"]["Enums"]["estatus_registro"]
          id: string
          nombre: string
          notas: string | null
          origen: string
          precio_venta: number | null
          tipo: string
          unidad_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          categoria_id?: string | null
          costo_promedio?: number
          created_at?: string
          created_by?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre: string
          notas?: string | null
          origen?: string
          precio_venta?: number | null
          tipo?: string
          unidad_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          categoria_id?: string | null
          costo_promedio?: number
          created_at?: string
          created_by?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre?: string
          notas?: string | null
          origen?: string
          precio_venta?: number | null
          tipo?: string
          unidad_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores: {
        Row: {
          contacto: string | null
          created_at: string
          created_by: string | null
          dias_credito: number
          email: string | null
          estatus: Database["public"]["Enums"]["estatus_registro"]
          id: string
          nombre: string
          notas: string | null
          origen: string
          rfc: string | null
          telefono: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contacto?: string | null
          created_at?: string
          created_by?: string | null
          dias_credito?: number
          email?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre: string
          notas?: string | null
          origen?: string
          rfc?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contacto?: string | null
          created_at?: string
          created_by?: string | null
          dias_credito?: number
          email?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre?: string
          notas?: string | null
          origen?: string
          rfc?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proveedores_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedores_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      receta_detalle: {
        Row: {
          cantidad: number
          created_at: string
          created_by: string | null
          factor_conversion: number
          id: string
          producto_id: string
          receta_id: string
          unidad_id: string | null
        }
        Insert: {
          cantidad: number
          created_at?: string
          created_by?: string | null
          factor_conversion?: number
          id?: string
          producto_id: string
          receta_id: string
          unidad_id?: string | null
        }
        Update: {
          cantidad?: number
          created_at?: string
          created_by?: string | null
          factor_conversion?: number
          id?: string
          producto_id?: string
          receta_id?: string
          unidad_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receta_detalle_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receta_detalle_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receta_detalle_receta_id_fkey"
            columns: ["receta_id"]
            isOneToOne: false
            referencedRelation: "recetas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receta_detalle_receta_id_fkey"
            columns: ["receta_id"]
            isOneToOne: false
            referencedRelation: "v_recetas_costo"
            referencedColumns: ["receta_id"]
          },
          {
            foreignKeyName: "receta_detalle_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["id"]
          },
        ]
      }
      recetas: {
        Row: {
          created_at: string
          created_by: string | null
          estatus: Database["public"]["Enums"]["estatus_registro"]
          id: string
          merma_estandar_pct: number
          notas: string | null
          origen: string
          precio_venta: number | null
          producto_terminado_id: string
          rendimiento: number
          updated_at: string
          updated_by: string | null
          vigente_desde: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          merma_estandar_pct?: number
          notas?: string | null
          origen?: string
          precio_venta?: number | null
          producto_terminado_id: string
          rendimiento?: number
          updated_at?: string
          updated_by?: string | null
          vigente_desde?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          merma_estandar_pct?: number
          notas?: string | null
          origen?: string
          precio_venta?: number | null
          producto_terminado_id?: string
          rendimiento?: number
          updated_at?: string
          updated_by?: string | null
          vigente_desde?: string
        }
        Relationships: [
          {
            foreignKeyName: "recetas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recetas_producto_terminado_id_fkey"
            columns: ["producto_terminado_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recetas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      recetas_costo_historico: {
        Row: {
          calculado_en: string
          calculado_por: string | null
          costo_total: number
          id: string
          margen: number | null
          margen_pct: number | null
          periodo: string
          receta_id: string
        }
        Insert: {
          calculado_en?: string
          calculado_por?: string | null
          costo_total: number
          id?: string
          margen?: number | null
          margen_pct?: number | null
          periodo: string
          receta_id: string
        }
        Update: {
          calculado_en?: string
          calculado_por?: string | null
          costo_total?: number
          id?: string
          margen?: number | null
          margen_pct?: number | null
          periodo?: string
          receta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recetas_costo_historico_calculado_por_fkey"
            columns: ["calculado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recetas_costo_historico_receta_id_fkey"
            columns: ["receta_id"]
            isOneToOne: false
            referencedRelation: "recetas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recetas_costo_historico_receta_id_fkey"
            columns: ["receta_id"]
            isOneToOne: false
            referencedRelation: "v_recetas_costo"
            referencedColumns: ["receta_id"]
          },
        ]
      }
      roles: {
        Row: {
          codigo: Database["public"]["Enums"]["rol_codigo"]
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
        }
        Insert: {
          codigo: Database["public"]["Enums"]["rol_codigo"]
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
        }
        Update: {
          codigo?: Database["public"]["Enums"]["rol_codigo"]
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      sucursales: {
        Row: {
          created_at: string
          created_by: string | null
          direccion: string | null
          estatus: Database["public"]["Enums"]["estatus_registro"]
          id: string
          nombre: string
          notas: string | null
          origen: string
          rfc: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre: string
          notas?: string | null
          origen?: string
          rfc?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre?: string
          notas?: string | null
          origen?: string
          rfc?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sucursales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sucursales_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades_medida: {
        Row: {
          abreviatura: string
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          abreviatura: string
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          abreviatura?: string
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          created_at: string
          email: string
          estatus: Database["public"]["Enums"]["estatus_registro"]
          id: string
          nombre: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id: string
          nombre: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          id?: string
          nombre?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      usuarios_roles: {
        Row: {
          created_at: string
          id: string
          rol_id: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rol_id: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rol_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_roles_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_roles_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ventas: {
        Row: {
          cancelaciones_total: number
          cortesias_total: number
          created_at: string
          created_by: string | null
          descuentos_total: number
          devoluciones_total: number
          documento_id: string | null
          estatus: Database["public"]["Enums"]["estatus_registro"]
          estatus_conciliacion: string
          fecha: string
          folio_pos: string | null
          id: string
          impuestos: number
          notas: string | null
          observaciones: string | null
          origen: string
          sucursal_id: string
          turno: string | null
          updated_at: string
          updated_by: string | null
          venta_bruta: number
          venta_neta: number | null
        }
        Insert: {
          cancelaciones_total?: number
          cortesias_total?: number
          created_at?: string
          created_by?: string | null
          descuentos_total?: number
          devoluciones_total?: number
          documento_id?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          estatus_conciliacion?: string
          fecha: string
          folio_pos?: string | null
          id?: string
          impuestos?: number
          notas?: string | null
          observaciones?: string | null
          origen?: string
          sucursal_id: string
          turno?: string | null
          updated_at?: string
          updated_by?: string | null
          venta_bruta?: number
          venta_neta?: number | null
        }
        Update: {
          cancelaciones_total?: number
          cortesias_total?: number
          created_at?: string
          created_by?: string | null
          descuentos_total?: number
          devoluciones_total?: number
          documento_id?: string | null
          estatus?: Database["public"]["Enums"]["estatus_registro"]
          estatus_conciliacion?: string
          fecha?: string
          folio_pos?: string | null
          id?: string
          impuestos?: number
          notas?: string | null
          observaciones?: string | null
          origen?: string
          sucursal_id?: string
          turno?: string | null
          updated_at?: string
          updated_by?: string | null
          venta_bruta?: number
          venta_neta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ventas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ventas_detalle: {
        Row: {
          cantidad: number
          created_at: string
          created_by: string | null
          id: string
          importe: number | null
          precio_unitario: number
          producto_id: string | null
          venta_id: string
        }
        Insert: {
          cantidad: number
          created_at?: string
          created_by?: string | null
          id?: string
          importe?: number | null
          precio_unitario: number
          producto_id?: string | null
          venta_id: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          created_by?: string | null
          id?: string
          importe?: number | null
          precio_unitario?: number
          producto_id?: string | null
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ventas_detalle_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_detalle_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_detalle_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "v_ventas_conciliacion"
            referencedColumns: ["venta_id"]
          },
          {
            foreignKeyName: "ventas_detalle_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      ventas_formas_pago: {
        Row: {
          created_at: string
          created_by: string | null
          forma_pago_id: string
          id: string
          importe: number
          venta_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          forma_pago_id: string
          id?: string
          importe: number
          venta_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          forma_pago_id?: string
          id?: string
          importe?: number
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ventas_formas_pago_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_formas_pago_forma_pago_id_fkey"
            columns: ["forma_pago_id"]
            isOneToOne: false
            referencedRelation: "formas_pago"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_formas_pago_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "v_ventas_conciliacion"
            referencedColumns: ["venta_id"]
          },
          {
            foreignKeyName: "ventas_formas_pago_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_conciliaciones_bancarias: {
        Row: {
          alias: string | null
          banco: string | null
          created_at: string | null
          cuenta_id: string | null
          diferencia: number | null
          documento_id: string | null
          documento_nombre: string | null
          documento_storage_path: string | null
          id: string | null
          notas: string | null
          periodo: string | null
          saldo_calculado: number | null
          saldo_estado_cuenta: number | null
          usuario_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conciliaciones_bancarias_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conciliaciones_bancarias_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conciliaciones_bancarias_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      v_cxp_antiguedad: {
        Row: {
          cuenta_por_pagar_id: string | null
          dias_vencidos: number | null
          documento_referencia: string | null
          estatus_cxp: string | null
          fecha_emision: string | null
          fecha_vencimiento: string | null
          importe_original: number | null
          origen_id: string | null
          origen_tabla: string | null
          proveedor_id: string | null
          proveedor_nombre: string | null
          rango_antiguedad: string | null
          saldo: number | null
          total_pagado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_por_pagar_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      v_cxp_saldos: {
        Row: {
          cuenta_por_pagar_id: string | null
          dias_vencidos: number | null
          documento_referencia: string | null
          estatus_cxp: string | null
          fecha_emision: string | null
          fecha_vencimiento: string | null
          importe_original: number | null
          origen_id: string | null
          origen_tabla: string | null
          proveedor_id: string | null
          proveedor_nombre: string | null
          saldo: number | null
          total_pagado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_por_pagar_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      v_mermas_resumen: {
        Row: {
          costo_merma: number | null
          periodo: string | null
          sucursal_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mermas_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      v_recetas_costo: {
        Row: {
          costo_total: number | null
          margen: number | null
          margen_pct: number | null
          merma_estandar_pct: number | null
          precio_venta: number | null
          producto_nombre: string | null
          producto_terminado_id: string | null
          receta_id: string | null
          rendimiento: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recetas_producto_terminado_id_fkey"
            columns: ["producto_terminado_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ventas_conciliacion: {
        Row: {
          diferencia: number | null
          estatus_calculado: string | null
          fecha: string | null
          origen: string | null
          sucursal_id: string | null
          total_formas_pago: number | null
          venta_id: string | null
          venta_neta: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ventas_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      fn_costo_receta: { Args: { p_receta_id: string }; Returns: number }
      fn_es_finanzas: { Args: never; Returns: boolean }
      fn_es_operativo: { Args: never; Returns: boolean }
      fn_es_usuario_sistema: { Args: never; Returns: boolean }
      fn_food_cost_real: {
        Args: { p_periodo: string; p_sucursal_id: string }
        Returns: {
          compras_netas: number
          costo_real_ventas: number
          food_cost_real_pct: number
          inventario_final: number
          inventario_inicial: number
          ventas_netas: number
        }[]
      }
      fn_food_cost_teorico: {
        Args: { p_periodo: string; p_sucursal_id: string }
        Returns: {
          costo_teorico: number
          food_cost_teorico_pct: number
          ventas_netas: number
        }[]
      }
      fn_generar_alertas_periodo: {
        Args: { p_periodo: string; p_sucursal_id: string }
        Returns: number
      }
      fn_inventario_valor_a_fecha: {
        Args: { p_fecha: string; p_sucursal_id: string }
        Returns: number
      }
      fn_labor_cost: {
        Args: { p_periodo: string; p_sucursal_id: string }
        Returns: {
          costo_laboral: number
          labor_cost_pct: number
          ventas_netas: number
        }[]
      }
      fn_roles_actuales: {
        Args: never
        Returns: Database["public"]["Enums"]["rol_codigo"][]
      }
      fn_saldo_bancario_a_fecha: {
        Args: { p_cuenta_id: string; p_fecha: string }
        Returns: number
      }
      fn_snapshot_costo_recetas: {
        Args: { p_periodo: string }
        Returns: number
      }
      fn_snapshot_kpis_mensual: {
        Args: { p_periodo: string; p_sucursal_id: string }
        Returns: undefined
      }
      fn_tiene_rol: {
        Args: { p_rol: Database["public"]["Enums"]["rol_codigo"] }
        Returns: boolean
      }
    }
    Enums: {
      estatus_registro: "activo" | "baja"
      rol_codigo: "admin_pao" | "direccion" | "finanzas" | "admin_sistema"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      estatus_registro: ["activo", "baja"],
      rol_codigo: ["admin_pao", "direccion", "finanzas", "admin_sistema"],
    },
  },
} as const
