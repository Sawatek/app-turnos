// Datos de ejemplo generados RELATIVOS A HOY: la agenda siempre se ve viva, se abra cuando se abra la demo.
// Son deterministas (misma fecha + mismo negocio = mismos datos) para que la demo sea repetible.
import { profesionalesPara } from './horarios'
import { claveDia, diaSemana, enHora, horaDe, minutosDe, sumarDias } from './tiempo'
import type { ClienteResumen, EstadoTurno, Negocio, Turno } from './tipos'

const NOMBRES = [
  'Lucas P.', 'Ramiro G.', 'Joaquín S.', 'Matías R.', 'Franco D.', 'Ezequiel M.', 'Tomás V.', 'Santiago L.', 'Facundo A.',
  'Bruno C.', 'Martina F.', 'Sofía R.', 'Valentina G.', 'Camila N.', 'Julieta B.', 'Agustina M.', 'Lucía T.', 'Paula V.',
  'Marta L.', 'Hernán T.', 'Pedro F.', 'Carla N.', 'Gonzalo E.', 'Nahuel O.', 'Micaela S.', 'Florencia D.', 'Ignacio K.',
  'Rocío P.', 'Diego H.', 'Belén A.',
]

function generador(semilla: string) {
  let h = 2166136261
  for (const c of semilla) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const telDe = (i: number) => `11 ${String(4000 + ((i * 7919) % 5999)).padStart(4, '0')}-${String(1000 + ((i * 104729) % 8999)).padStart(4, '0')}`

export interface Semilla {
  dia: string
  turnos: Turno[]
  dormidos: ClienteResumen[]
}

export function generarSemilla(negocio: Negocio, ahora: Date, diasAtras = 30, diasAdelante = 10): Semilla {
  const hoy = claveDia(ahora)
  const turnos: Turno[] = []
  const { horario } = negocio
  const desde = minutosDe(horario.desde)
  const hasta = minutosDe(horario.hasta)
  const descanso = horario.descanso?.map(minutosDe)

  for (let d = -diasAtras; d <= diasAdelante; d++) {
    const dia = sumarDias(hoy, d)
    if (!horario.dias.includes(diaSemana(enHora(dia, '12:00')))) continue
    const azar = generador(`${negocio.slug}:${dia}`)
    // Más lleno hoy y mañana, más vacío hacia adelante: así siempre hay lugar para reservar en la demo.
    const ocupacion = d < 0 ? 0.62 : d === 0 ? 0.6 : d <= 2 ? 0.5 : 0.32

    for (const prof of negocio.staff) {
      let m = desde
      while (m < hasta) {
        const opciones = negocio.servicios.filter((s) => profesionalesPara(negocio, s.id).some((p) => p.id === prof.id))
        const serv = opciones[Math.floor(azar() * opciones.length)]
        if (!serv) break
        const fin = m + serv.minutos
        const chocaDescanso = descanso && m < descanso[1]! && descanso[0]! < fin
        if (fin > hasta || chocaDescanso || azar() > ocupacion) {
          m += horario.intervalo * (azar() < 0.5 ? 2 : 3)
          continue
        }
        const inicio = enHora(dia, horaDe(m))
        const pasado = inicio.getTime() + serv.minutos * 60_000 < ahora.getTime()
        const r = azar()
        let estado: EstadoTurno
        if (pasado) estado = r < 0.09 ? 'falto' : r < 0.13 ? 'cancelado' : 'asistio'
        else if (d === 0) estado = r < 0.75 ? 'confirmado' : 'pendiente'
        else if (d === 1) estado = r < 0.55 ? 'confirmado' : 'pendiente'
        else estado = r < 0.3 ? 'confirmado' : 'pendiente'
        const iNombre = Math.floor(azar() * NOMBRES.length)
        turnos.push({
          id: `s-${dia}-${prof.id}-${m}`,
          clienteNombre: NOMBRES[iNombre]!,
          clienteTel: telDe(iNombre),
          servicioId: serv.id,
          profesionalId: prof.id,
          inicio: inicio.toISOString(),
          minutos: serv.minutos,
          estado,
          senaPagada: negocio.sena && azar() < 0.4 ? negocio.sena : 0,
          propio: false,
          recordatorios: {},
          creado: new Date(inicio.getTime() - (2 + Math.floor(azar() * 6)) * 86_400_000).toISOString(),
        })
        m = fin + (azar() < 0.3 ? horario.intervalo : 0)
      }
    }
  }

  // Clientes que hace rato que no vienen: para mostrar "recuperar clientes".
  const azar = generador(`${negocio.slug}:dormidos`)
  const dormidos: ClienteResumen[] = Array.from({ length: 7 }, (_, i) => {
    const idx = (i * 7 + 3) % NOMBRES.length
    const dias = negocio.recuperarDias + 3 + Math.floor(azar() * 40)
    const serv = negocio.servicios[Math.floor(azar() * negocio.servicios.length)]!
    return {
      nombre: NOMBRES[idx]!,
      tel: telDe(idx),
      ultimaVisita: new Date(ahora.getTime() - dias * 86_400_000).toISOString(),
      visitas: 2 + Math.floor(azar() * 14),
      servicioHabitual: serv.nombre,
    }
  }).toSorted((a, b) => b.visitas - a.visitas)

  return { dia: hoy, turnos, dormidos }
}
