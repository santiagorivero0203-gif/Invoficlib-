export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Views: Record<string, never>
    Functions: Record<string, never>
    Tables: {
      perfiles: {
        Row: {
          id: string
          rol: 'admin' | 'secretaria'
          nombre_completo: string
          fecha_creacion: string
        }
        Insert: {
          id: string
          rol?: 'admin' | 'secretaria'
          nombre_completo: string
          fecha_creacion?: string
        }
        Update: {
          id?: string
          rol?: 'admin' | 'secretaria'
          nombre_completo?: string
          fecha_creacion?: string
        }
        Relationships: []
      }
      tasas_cambio: {
        Row: {
          id: number
          tasa_ves: number
          fecha_creacion: string
        }
        Insert: {
          id?: number
          tasa_ves: number
          fecha_creacion?: string
        }
        Update: {
          id?: number
          tasa_ves?: number
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
          usuario_id: string
          motivo: string | null
          fecha_creacion: string
        }
        Insert: {
          id?: string
          producto_id: string
          tipo: 'entrada' | 'salida'
          cantidad: number
          usuario_id: string
          motivo?: string | null
          fecha_creacion?: string
        }
        Update: {
          id?: string
          producto_id?: string
          tipo?: 'entrada' | 'salida'
          cantidad?: number
          usuario_id?: string
          motivo?: string | null
          fecha_creacion?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          id: string
          nombre: string
          telefono: string | null
          documento_id: string | null
          direccion: string | null
          fecha_creacion: string
        }
        Insert: {
          id?: string
          nombre: string
          telefono?: string | null
          documento_id?: string | null
          direccion?: string | null
          fecha_creacion?: string
        }
        Update: {
          id?: string
          nombre?: string
          telefono?: string | null
          documento_id?: string | null
          direccion?: string | null
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
        Relationships: []
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
        Relationships: []
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
