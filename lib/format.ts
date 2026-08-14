/** Formatea montos en USD con dos decimales. */
export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`
}

/** Convierte y formatea montos USD a VES según la tasa del día. */
export function formatVes(amountUsd: number, tasaVes: number): string {
  return `Bs. ${(amountUsd * tasaVes).toFixed(2)}`
}

/** Formatea fecha corta en español. */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
