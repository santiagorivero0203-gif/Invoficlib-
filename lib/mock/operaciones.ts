import type { Database } from '@/types/database.types'

type Nota = Database['public']['Tables']['notas']['Row']
type DetalleNota = Database['public']['Tables']['detalles_nota']['Row']
type Gasto = Database['public']['Tables']['gastos']['Row']

/** Tasa BCV mock para conversión bimoneda en la Fase 2. */
export const TASA_VES_MOCK = 42.5

export interface ProductoVenta {
  id: string
  codigo_sku: string
  nombre: string
  precio_usd: number
  stock: number
}

export interface DetalleNotaMock extends DetalleNota {
  producto_nombre: string
  producto_sku: string
  cantidad_devuelta: number
}

export interface NotaMock extends Nota {
  detalles: DetalleNotaMock[]
}

export const productosVentaMock: ProductoVenta[] = [
  { id: 'p1', codigo_sku: 'INV-ACE-1L', nombre: 'Aceite Premium 1L', precio_usd: 3.5, stock: 142 },
  { id: 'p2', codigo_sku: 'INV-SEM-500', nombre: 'Semillas Bolsa 500g', precio_usd: 2.25, stock: 87 },
  { id: 'p3', codigo_sku: 'INV-HAR-1K', nombre: 'Harina Multiuso 1kg', precio_usd: 1.8, stock: 8 },
  { id: 'p4', codigo_sku: 'INV-MAR-500', nombre: 'Margarina 500g', precio_usd: 2.9, stock: 34 },
  { id: 'p5', codigo_sku: 'INV-MAI-1L', nombre: 'Aceite de Maíz 1L', precio_usd: 3.2, stock: 56 },
  { id: 'p6', codigo_sku: 'INV-MAN-250', nombre: 'Mantequilla Premium 250g', precio_usd: 4.1, stock: 22 },
]

export const notasMock: NotaMock[] = [
  {
    id: 'n1',
    correlativo: '#00446',
    cliente_id: null,
    cliente_nombre: 'Distribuidora El Sol',
    usuario_id: null,
    subtotal_usd: 45.5,
    total_usd: 45.5,
    estado: 'pagada',
    observaciones: null,
    fecha_creacion: '2026-08-13T10:30:00Z',
    fecha_actualizacion: '2026-08-13T10:30:00Z',
    detalles: [
      {
        id: 'd1',
        nota_id: 'n1',
        producto_id: 'p1',
        cantidad: 10,
        precio_unitario_usd: 3.5,
        subtotal_usd: 35,
        fecha_creacion: '2026-08-13T10:30:00Z',
        producto_nombre: 'Aceite Premium 1L',
        producto_sku: 'INV-ACE-1L',
        cantidad_devuelta: 0,
      },
      {
        id: 'd2',
        nota_id: 'n1',
        producto_id: 'p2',
        cantidad: 5,
        precio_unitario_usd: 2.1,
        subtotal_usd: 10.5,
        fecha_creacion: '2026-08-13T10:30:00Z',
        producto_nombre: 'Semillas Bolsa 500g',
        producto_sku: 'INV-SEM-500',
        cantidad_devuelta: 0,
      },
    ],
  },
  {
    id: 'n2',
    correlativo: '#00445',
    cliente_id: null,
    cliente_nombre: 'Cliente General',
    usuario_id: null,
    subtotal_usd: 28.4,
    total_usd: 18.4,
    estado: 'parcial',
    observaciones: 'Devolución parcial aplicada',
    fecha_creacion: '2026-08-12T15:20:00Z',
    fecha_actualizacion: '2026-08-12T16:00:00Z',
    detalles: [
      {
        id: 'd3',
        nota_id: 'n2',
        producto_id: 'p4',
        cantidad: 4,
        precio_unitario_usd: 2.9,
        subtotal_usd: 11.6,
        fecha_creacion: '2026-08-12T15:20:00Z',
        producto_nombre: 'Margarina 500g',
        producto_sku: 'INV-MAR-500',
        cantidad_devuelta: 2,
      },
      {
        id: 'd4',
        nota_id: 'n2',
        producto_id: 'p5',
        cantidad: 6,
        precio_unitario_usd: 2.8,
        subtotal_usd: 16.8,
        fecha_creacion: '2026-08-12T15:20:00Z',
        producto_nombre: 'Aceite de Maíz 1L',
        producto_sku: 'INV-MAI-1L',
        cantidad_devuelta: 0,
      },
    ],
  },
  {
    id: 'n3',
    correlativo: '#00444',
    cliente_id: null,
    cliente_nombre: 'Mini Market Norte',
    usuario_id: null,
    subtotal_usd: 52,
    total_usd: 0,
    estado: 'anulada',
    observaciones: 'Nota anulada por error de emisión',
    fecha_creacion: '2026-08-11T09:00:00Z',
    fecha_actualizacion: '2026-08-11T09:15:00Z',
    detalles: [
      {
        id: 'd5',
        nota_id: 'n3',
        producto_id: 'p6',
        cantidad: 8,
        precio_unitario_usd: 4.1,
        subtotal_usd: 32.8,
        fecha_creacion: '2026-08-11T09:00:00Z',
        producto_nombre: 'Mantequilla Premium 250g',
        producto_sku: 'INV-MAN-250',
        cantidad_devuelta: 8,
      },
      {
        id: 'd6',
        nota_id: 'n3',
        producto_id: 'p3',
        cantidad: 10,
        precio_unitario_usd: 1.92,
        subtotal_usd: 19.2,
        fecha_creacion: '2026-08-11T09:00:00Z',
        producto_nombre: 'Harina Multiuso 1kg',
        producto_sku: 'INV-HAR-1K',
        cantidad_devuelta: 10,
      },
    ],
  },
]

export const gastosMock: Gasto[] = [
  {
    id: 'g1',
    nombre: 'Alquiler Local',
    categoria: 'Infraestructura',
    tipo: 'fijo',
    monto_usd: 450,
    estado: 'pagado',
    descripcion: 'Renta mensual del almacén',
    usuario_id: null,
    fecha: '2026-08-01T00:00:00Z',
  },
  {
    id: 'g2',
    nombre: 'Servicio Eléctrico',
    categoria: 'Servicios',
    tipo: 'variable',
    monto_usd: 85.5,
    estado: 'pagado',
    descripcion: 'Factura agosto',
    usuario_id: null,
    fecha: '2026-08-05T00:00:00Z',
  },
  {
    id: 'g3',
    nombre: 'Transporte de Mercancía',
    categoria: 'Logística',
    tipo: 'variable',
    monto_usd: 120,
    estado: 'por_pagar',
    descripcion: 'Flete proveedor aceites',
    usuario_id: null,
    fecha: '2026-08-10T00:00:00Z',
  },
  {
    id: 'g4',
    nombre: 'Internet y Telefonía',
    categoria: 'Servicios',
    tipo: 'fijo',
    monto_usd: 35,
    estado: 'pagado',
    descripcion: null,
    usuario_id: null,
    fecha: '2026-08-03T00:00:00Z',
  },
  {
    id: 'g5',
    nombre: 'Mantenimiento Equipos',
    categoria: 'Operaciones',
    tipo: 'variable',
    monto_usd: 65,
    estado: 'por_pagar',
    descripcion: 'Reparación balanza',
    usuario_id: null,
    fecha: '2026-08-12T00:00:00Z',
  },
]

export const resumenFinancieroMock = {
  ingresosTotales: 12450,
  cogs: 7820,
  utilidadBruta: 4630,
  gastosOperativos: 755.5,
  utilidadNeta: 3874.5,
  margenBruto: 37.2,
  margenNeto: 31.1,
}
