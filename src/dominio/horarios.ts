import type { Negocio, Turno } from './tipos'
import { diaSemana, enHora, horaDe, minutosDe, sumarDias, claveDia } from './tiempo'

export interface Hueco {
  inicio: Date
  profesionalId: string
}

/** Turnos que ocupan lugar en la agenda. */
export const ocupa = (t: Turno) => t.estado !== 'cancelado'

const MIN = 60_000

export function seSolapan(aInicio: number, aMin: number, bInicio: number, bMin: number) {
  return aInicio < bInicio + bMin * MIN && bInicio < aInicio + aMin * MIN
}

export function profesionalesPara(negocio: Negocio, servicioId: string) {
  return negocio.staff.filter((p) => !p.servicios?.length || p.servicios.includes(servicioId))
}

export function estaLibre(turnos: Turno[], profesionalId: string, inicio: number, minutos: number, ignorarId?: string) {
  return !turnos.some(
    (t) => ocupa(t) && t.id !== ignorarId && t.profesionalId === profesionalId && seSolapan(inicio, minutos, Date.parse(t.inicio), t.minutos),
  )
}

interface Consulta {
  negocio: Negocio
  dia: string
  servicioId: string
  /** null = cualquier profesional que haga el servicio. */
  profesionalId: string | null
  turnos: Turno[]
  ahora: Date
  /** No se ofrecen horarios que empiecen antes de ahora + margen. */
  margenMin?: number
}

/** Horarios libres de un día. Con "cualquiera", cada horario se asigna al primer profesional libre. */
export function huecosDelDia({ negocio, dia, servicioId, profesionalId, turnos, ahora, margenMin = 30 }: Consulta): Hueco[] {
  const { horario } = negocio
  if (!horario.dias.includes(diaSemana(enHora(dia, '12:00')))) return []
  const servicio = negocio.servicios.find((s) => s.id === servicioId)
  if (!servicio) return []

  const candidatos = profesionalId
    ? negocio.staff.filter((p) => p.id === profesionalId)
    : profesionalesPara(negocio, servicioId)
  const desde = minutosDe(horario.desde)
  const hasta = minutosDe(horario.hasta)
  const descanso = horario.descanso?.map(minutosDe) as [number, number] | undefined
  const limite = ahora.getTime() + margenMin * MIN

  const huecos: Hueco[] = []
  for (let m = desde; m + servicio.minutos <= hasta; m += horario.intervalo) {
    if (descanso && m < descanso[1] && descanso[0] < m + servicio.minutos) continue
    const inicio = enHora(dia, horaDe(m))
    if (inicio.getTime() < limite) continue
    const libre = candidatos.find((p) => estaLibre(turnos, p.id, inicio.getTime(), servicio.minutos))
    if (libre) huecos.push({ inicio, profesionalId: libre.id })
  }
  return huecos
}

/** Cuántos turnos de ese servicio entran en el día (para la "densidad" de la tira de días). */
export function capacidadDelDia(negocio: Negocio, dia: string, servicioId: string) {
  return huecosDelDia({ negocio, dia, servicioId, profesionalId: null, turnos: [], ahora: new Date(0) }).length
}

/** El próximo horario libre desde ahora, buscando hasta `dias` días hacia adelante. */
export function proximoLibre(consulta: Omit<Consulta, 'dia'>, dias = 14): Hueco | null {
  const hoy = claveDia(consulta.ahora)
  for (let i = 0; i < dias; i++) {
    const h = huecosDelDia({ ...consulta, dia: sumarDias(hoy, i) })[0]
    if (h) return h
  }
  return null
}
