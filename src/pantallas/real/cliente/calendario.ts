// "Agregar al calendario": el turno como evento (.ics), con alarma 2 horas antes. Lo abre la app de calendario del celular.

export interface EventoTurno {
  id: string
  inicio: string
  fin: string
  /** Ej.: "Corte en Barbería Tulio". */
  titulo: string
  lugar?: string
  /** Nombre del archivo, sin extensión. */
  archivo: string
}

const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
/** En .ics las comas, puntos y coma y barras van escapadas. */
const esc = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')

export function textoIcs(e: EventoTurno, ahora = new Date()) {
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SawaTek//Turnos//ES', 'BEGIN:VEVENT',
    `UID:${e.id}@sawatek`, `DTSTAMP:${f(ahora)}`, `DTSTART:${f(new Date(e.inicio))}`, `DTEND:${f(new Date(e.fin))}`,
    `SUMMARY:${esc(e.titulo)}`, ...(e.lugar ? [`LOCATION:${esc(e.lugar)}`] : []),
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.titulo)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
}

export function agregarAlCalendario(e: EventoTurno) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([textoIcs(e)], { type: 'text/calendar' }))
  a.download = `${e.archivo}.ics`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
