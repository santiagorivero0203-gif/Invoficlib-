/**
 * app/(dashboard)/resumen-financiero/reportes/page.tsx
 * -------------------------------------------------------
 * Server Component para la vista de Reportes Financieros.
 * -------------------------------------------------------
 */

import { getReporteFinanciero } from '@/lib/actions/resumen-financiero'
import ReportesClient from './reportes-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Reportes Financieros | Invoficlib',
  description: 'Reportes diarios de pedidos, cuentas, facturación y métodos de pago de Invoficlib.',
}

export default async function ReportesPage() {
  const { data } = await getReporteFinanciero()

  const defaultData = {
    kpis: {
      totalOrdenes: 75,
      ingresos: 44972.0,
      costosPedidos: 29154.87,
      gastosFijosVariables: 0.0,
      utilidadBruta: 15817.13,
      utilidadNeta: 15817.13,
    },
    pedidos: [
      {
        id: '1',
        correlativo: '#00105',
        cliente: 'Tu Librito',
        canal: 'Principal',
        fecha: '2026-08-15T15:15:00Z',
        creadoPor: 'Santiago Rivero',
        metodoPago: 'Dólares',
        costoPedido: 110.28,
        facturacion: 170.0,
        totalCobrado: 170.0,
      },
      {
        id: '2',
        correlativo: '#00104',
        cliente: 'Dvan Suministros Ca',
        canal: 'Principal',
        fecha: '2026-08-14T09:22:00Z',
        creadoPor: 'Santiago Rivero',
        metodoPago: 'Dólares',
        costoPedido: 145.44,
        facturacion: 224.0,
        totalCobrado: 224.0,
      },
      {
        id: '3',
        correlativo: '#00103',
        cliente: 'Junior',
        canal: 'Principal',
        fecha: '2026-08-14T17:05:00Z',
        creadoPor: 'Santiago Rivero',
        metodoPago: 'Dólares',
        costoPedido: 968.0,
        facturacion: 1496.0,
        totalCobrado: 1496.0,
      },
      {
        id: '4',
        correlativo: '#00102',
        cliente: 'Yelitza',
        canal: 'Principal',
        fecha: '2026-08-14T10:18:00Z',
        creadoPor: 'Santiago Rivero',
        metodoPago: 'Dólares',
        costoPedido: 351.48,
        facturacion: 543.0,
        totalCobrado: 543.0,
      },
      {
        id: '5',
        correlativo: '#00101',
        cliente: 'San Francisco de Asís',
        canal: 'Principal',
        fecha: '2026-08-14T09:46:00Z',
        creadoPor: 'Santiago Rivero',
        metodoPago: 'Dólares',
        costoPedido: 262.2,
        facturacion: 405.0,
        totalCobrado: 405.0,
      },
      {
        id: '6',
        correlativo: '#00100',
        cliente: 'Librería Artisco',
        canal: 'Principal',
        fecha: '2026-08-14T09:12:00Z',
        creadoPor: 'Santiago Rivero',
        metodoPago: 'Dólares',
        costoPedido: 531.72,
        facturacion: 822.0,
        totalCobrado: 822.0,
      },
      {
        id: '7',
        correlativo: '#00099',
        cliente: 'Mar Jesús',
        canal: 'Principal',
        fecha: '2026-08-13T17:37:00Z',
        creadoPor: 'Santiago Rivero',
        metodoPago: 'Dólares',
        costoPedido: 825.0,
        facturacion: 1276.0,
        totalCobrado: 1276.0,
      },
      {
        id: '8',
        correlativo: '#00098',
        cliente: 'Cacique Arumaipana',
        canal: 'Principal',
        fecha: '2026-08-13T15:12:00Z',
        creadoPor: 'Santiago Rivero',
        metodoPago: 'Dólares',
        costoPedido: 272.16,
        facturacion: 420.0,
        totalCobrado: 420.0,
      },
      {
        id: '9',
        correlativo: '#00097',
        cliente: 'Uep San Antonio',
        canal: 'Principal',
        fecha: '2026-08-13T14:48:00Z',
        creadoPor: 'Santiago Rivero',
        metodoPago: 'Dólares',
        costoPedido: 0.0,
        facturacion: 0.0,
        totalCobrado: 0.0,
      },
      {
        id: '10',
        correlativo: '#00096',
        cliente: 'Maykol Hernandez',
        canal: 'Principal',
        fecha: '2026-08-13T11:14:00Z',
        creadoPor: 'Adriana Peña',
        metodoPago: 'Dólares',
        costoPedido: 11.0,
        facturacion: 17.0,
        totalCobrado: 17.0,
      },
    ],
  }

  return <ReportesClient initialData={data ?? defaultData} />
}
