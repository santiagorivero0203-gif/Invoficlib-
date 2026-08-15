/**
 * types/database.types.ts
 * -------------------------------------------------------
 * Tipos TypeScript generados manualmente a partir del
 * esquema de Supabase. Fase 3: incluye tipo_salida,
 * estado_flotante, tipo_cliente y nota_id en movimientos.
 * -------------------------------------------------------
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/** Enum: tipo de salida de una nota */
export type TipoSalida = 'venta' | 'promocion' | 'consignacion'

/** Enum: estado flotante de una nota (promoción/consignación) */
export type EstadoFlotante = 'abierta' | 'cerrada'

/** Enum: tipo de cliente */
export type TipoCliente = 'colegio' | 'vendedor' | 'general'

/** Enum: rol de usuario */
export type UserRole = 'admin' | 'secretaria'

export interface Database {
  public: {
    Views: Record<string, never>
    Functions: {
      obtener_resumen_financiero: {
        Args: Record<string, never>
        Returns: {
          ingresos_usd: number
          cogs_usd: number
          utilidad_bruta_usd: number
          gastos_op_usd: number
          utilidad_neta_usd: number
          margen_neto_pct: number
        }[]
      }
      liquidar_promocion: {
        Args: { p_nota_id: string }
        Returns: Json
      }
      procesar_corte_consignacion: {
        Args: { p_nota_id: string; p_items: Json }
        Returns: Json
      }
    }
    Tables: {
      perfiles: {
        Row: {
          id: string
          rol: UserRole
          nombre_completo: string
          fecha_creacion: string
        }
        Insert: {
          id: string
          rol?: UserRole
          nombre_completo: string
          fecha_creacion?: string
        }
        Update: {
          id?: string
          rol?: UserRole
          nombre_completo?: string
          fecha_creacion?: string
        }
        Relationships: []
      }
      tasas_cambio: {
        Row: {
          id: number
          tasa: number
          moneda: string
          fecha_creacion: string
        }
        Insert: {
          id?: number
          tasa: number
          moneda?: string
          fecha_creacion?: string
        }
        Update: {
          id?: number
          tasa?: number
          moneda?: string
          fecha_creacion?: string
        }
        Relationships: []
      }
      productos: {
        Row: {
          id: string
          codigo_sku: string
          nombre: string
          descripcion: string | null
          precio_usd: number
          imagen_url: string | null
          stock_minimo: number
          estado: boolean
          fecha_creacion: string
        }
        Insert: {
          id?: string
          codigo_sku: string
          nombre: string
          descripcion?: string | null
          precio_usd: number
          imagen_url?: string | null
          stock_minimo?: number
          estado?: boolean
          fecha_creacion?: string
        }
        Update: {
          id?: string
          codigo_sku?: string
          nombre?: string
          descripcion?: string | null
          precio_usd?: number
          imagen_url?: string | null
          stock_minimo?: number
          estado?: boolean
          fecha_creacion?: string
        }
        Relationships: []
      }
      movimientos_inventario: {
        Row: {
          id: string
          producto_id: string
          tipo: 'entrada' | 'salida'
          cantidad: number
          usuario_id: string | null
          motivo: string | null
          nota_id: string | null
          fecha_creacion: string
        }
        Insert: {
          id?: string
          producto_id: string
          tipo: 'entrada' | 'salida'
          cantidad: number
          usuario_id?: string | null
          motivo?: string | null
          nota_id?: string | null
          fecha_creacion?: string
        }
        Update: {
          id?: string
          producto_id?: string
          tipo?: 'entrada' | 'salida'
          cantidad?: number
          usuario_id?: string | null
          motivo?: string | null
          nota_id?: string | null
          fecha_creacion?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_inventario_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "notas"
            referencedColumns: ["id"]
          }
        ]
      }
      clientes: {
        Row: {
          id: string
          nombre: string
          telefono: string | null
          tipo: TipoCliente
          contacto: string | null
          fecha_creacion: string
        }
        Insert: {
          id?: string
          nombre: string
          telefono?: string | null
          tipo?: TipoCliente
          contacto?: string | null
          fecha_creacion?: string
        }
        Update: {
          id?: string
          nombre?: string
          telefono?: string | null
          tipo?: TipoCliente
          contacto?: string | null
          fecha_creacion?: string
        }
        Relationships: []
      }
      notas: {
        Row: {
          id: string
          correlativo: string
          cliente_id: string | null
          cliente_nombre: string
          usuario_id: string | null
          subtotal_usd: number
          total_usd: number
          estado: 'pagada' | 'parcial' | 'anulada'
          tipo_salida: TipoSalida
          estado_flotante: EstadoFlotante
          observaciones: string | null
          fecha_creacion: string
          fecha_actualizacion: string
        }
        Insert: {
          id?: string
          correlativo?: string
          cliente_id?: string | null
          cliente_nombre?: string
          usuario_id?: string | null
          subtotal_usd?: number
          total_usd?: number
          estado?: 'pagada' | 'parcial' | 'anulada'
          tipo_salida?: TipoSalida
          estado_flotante?: EstadoFlotante
          observaciones?: string | null
          fecha_creacion?: string
          fecha_actualizacion?: string
        }
        Update: {
          id?: string
          correlativo?: string
          cliente_id?: string | null
          cliente_nombre?: string
          usuario_id?: string | null
          subtotal_usd?: number
          total_usd?: number
          estado?: 'pagada' | 'parcial' | 'anulada'
          tipo_salida?: TipoSalida
          estado_flotante?: EstadoFlotante
          observaciones?: string | null
          fecha_creacion?: string
          fecha_actualizacion?: string
        }
        Relationships: []
      }
      detalles_nota: {
        Row: {
          id: string
          nota_id: string
          producto_id: string
          cantidad: number
          precio_unitario_usd: number
          subtotal_usd: number
          fecha_creacion: string
        }
        Insert: {
          id?: string
          nota_id: string
          producto_id: string
          cantidad: number
          precio_unitario_usd: number
          subtotal_usd: number
          fecha_creacion?: string
        }
        Update: {
          id?: string
          nota_id?: string
          producto_id?: string
          cantidad?: number
          precio_unitario_usd?: number
          subtotal_usd?: number
          fecha_creacion?: string
        }
        Relationships: [
          {
            foreignKeyName: "detalles_nota_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "notas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalles_nota_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          }
        ]
      }
      devoluciones: {
        Row: {
          id: string
          nota_id: string
          producto_id: string
          detalle_nota_id: string | null
          cantidad_devuelta: number
          monto_descontado: number
          motivo: string | null
          usuario_id: string | null
          fecha: string
        }
        Insert: {
          id?: string
          nota_id: string
          producto_id: string
          detalle_nota_id?: string | null
          cantidad_devuelta: number
          monto_descontado: number
          motivo?: string | null
          usuario_id?: string | null
          fecha?: string
        }
        Update: {
          id?: string
          nota_id?: string
          producto_id?: string
          detalle_nota_id?: string | null
          cantidad_devuelta?: number
          monto_descontado?: number
          motivo?: string | null
          usuario_id?: string | null
          fecha?: string
        }
        Relationships: [
          {
            foreignKeyName: "devoluciones_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "notas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devoluciones_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          }
        ]
      }
      gastos: {
        Row: {
          id: string
          nombre: string
          categoria: string
          tipo: 'fijo' | 'variable'
          monto_usd: number
          estado: 'pagado' | 'por_pagar'
          descripcion: string | null
          usuario_id: string | null
          fecha: string
        }
        Insert: {
          id?: string
          nombre: string
          categoria?: string
          tipo?: 'fijo' | 'variable'
          monto_usd: number
          estado?: 'pagado' | 'por_pagar'
          descripcion?: string | null
          usuario_id?: string | null
          fecha?: string
        }
        Update: {
          id?: string
          nombre?: string
          categoria?: string
          tipo?: 'fijo' | 'variable'
          monto_usd?: number
          estado?: 'pagado' | 'por_pagar'
          descripcion?: string | null
          usuario_id?: string | null
          fecha?: string
        }
        Relationships: []
      }
    }
  }
}
