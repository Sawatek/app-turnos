import { TZDate } from '@date-fns/tz'
import { addDays, differenceInCalendarDays, format } from 'date-fns'
import { es } from 'date-fns/locale'

/** Todos los horarios de la app se piensan en hora argentina, sin importar dónde esté el navegador. */
export const ZONA = 'America/Argentina/Buenos_Aires'

export const enAR = (d: Date | string | number) => new TZDate(new Date(d).getTime(), ZONA)

/** Clave de día en hora argentina: '2026-11-16'. */
export const claveDia = (d: Date | string | number) => format(enAR(d), 'yyyy-MM-dd')

/** Fecha real para un día ('2026-11-16') y una hora ('17:30') argentinas. */
export function enHora(dia: string, hora: string): Date {
  const [y, m, d] = dia.split('-').map(Number) as [number, number, number]
  const [hh, mm] = hora.split(':').map(Number) as [number, number]
  return new Date(new TZDate(y, m - 1, d, hh, mm, ZONA).getTime())
}

export const minutosDe = (hora: string) => {
  const [h, m] = hora.split(':').map(Number) as [number, number]
  return h * 60 + m
}
export const horaDe = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

export const horaCorta = (d: Date | string) => format(enAR(d), 'HH:mm')
export const diaSemana = (d: Date | string) => enAR(d).getDay()

export const sumarDias = (dia: string, n: number) => claveDia(addDays(enHora(dia, '12:00'), n))

/** "hoy", "mañana", "jueves 20". */
export function diaRelativo(d: Date | string, ahora: Date): string {
  const dif = differenceInCalendarDays(enAR(d), enAR(ahora))
  if (dif === 0) return 'hoy'
  if (dif === 1) return 'mañana'
  if (dif === -1) return 'ayer'
  return format(enAR(d), "EEEE d", { locale: es })
}

export const diaLargo = (d: Date | string) => format(enAR(d), "EEEE d 'de' MMMM", { locale: es })
export const diaCorto = (d: Date | string) => format(enAR(d), 'EEE d', { locale: es })
export const nombreDia = (d: Date | string) => format(enAR(d), 'EEE', { locale: es }).replace('.', '')
export const numeroDia = (d: Date | string) => format(enAR(d), 'd')
export const mesCorto = (d: Date | string) => format(enAR(d), 'MMM', { locale: es }).replace('.', '')

const pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
export const precio = (n: number) => pesos.format(n)
export const precioCorto = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1).replace('.', ',')}M` : n >= 10_000 ? `$${Math.round(n / 1000)}k` : precio(n))

export const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
