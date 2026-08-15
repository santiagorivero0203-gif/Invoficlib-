/**
 * app/(dashboard)/resumen-financiero/utilidad-perdida/page.tsx
 * -------------------------------------------------------
 * Server Component para la vista de Utilidad / Pérdida.
 * Carga los datos financieros y alimenta el cliente interactivo.
 * -------------------------------------------------------
 */

import { getUtilidadPerdida } from '@/lib/actions/resumen-financiero'
import UtilidadPerdidaClient from './utilidad-perdida-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Utilidad y Pérdida | Invoficlib',
  description: 'Análisis financiero de ingresos, costos, margen neto y desglose de capital de Invoficlib.',
}

export default async function UtilidadPerdidaPage() {
  const { data } = await getUtilidadPerdida()

  const defaultData = {
    ingresos: 44972.0,
    costosPedidos: 29154.87,
    utilidadBruta: 15817.13,
    gastosFijosVariables: 0.0,
    utilidadNeta: 15817.13,
    margenNetoPct: 35.2,
    serieMensual: [
      { mes: 'Ene', mesNum: 1, ingresos: 0, utilidadNeta: 0, costos: 0, gastos: 0 },
      { mes: 'Feb', mesNum: 2, ingresos: 1200, utilidadNeta: 450, costos: 750, gastos: 0 },
      { mes: 'Mar', mesNum: 3, ingresos: 0, utilidadNeta: 0, costos: 0, gastos: 0 },
      { mes: 'Abr', mesNum: 4, ingresos: 3500, utilidadNeta: 1200, costos: 2300, gastos: 0 },
      { mes: 'May', mesNum: 5, ingresos: 6200, utilidadNeta: 2100, costos: 4100, gastos: 0 },
      { mes: 'Jun', mesNum: 6, ingresos: 800, utilidadNeta: 300, costos: 500, gastos: 0 },
      { mes: 'Jul', mesNum: 7, ingresos: 24500, utilidadNeta: 8600, costos: 15900, gastos: 0 },
      { mes: 'Ago', mesNum: 8, ingresos: 18900, utilidadNeta: 6700, costos: 12200, gastos: 0 },
      { mes: 'Sep', mesNum: 9, ingresos: 0, utilidadNeta: 0, costos: 0, gastos: 0 },
      { mes: 'Oct', mesNum: 10, ingresos: 0, utilidadNeta: 0, costos: 0, gastos: 0 },
      { mes: 'Nov', mesNum: 11, ingresos: 0, utilidadNeta: 0, costos: 0, gastos: 0 },
      { mes: 'Dic', mesNum: 12, ingresos: 0, utilidadNeta: 0, costos: 0, gastos: 0 },
    ],
    capital: {
      totalCapital: 150171.43,
      valorInventario: 39639.4,
      cuentasBancarias: 103539.03,
      cuentasPorCobrar: 6993.0,
      cuentasPorPagar: 0.0,
      crecimientoPct: 18.27,
    },
  }

  return <UtilidadPerdidaClient initialData={data ?? defaultData} />
}
