// Fachada para mostrar la app del cliente fuera de las demos (la vitrina de la landing).
// La landing importa solo esto: si cambia cómo se arma por dentro la app del cliente (Inicio, Marco, contexto),
// se ajusta acá y la landing no se entera. Los datos son de ejemplo: no toca el estado guardado de las demos.
import { useEffect, useMemo, useRef } from 'react'
import type { EstadoNegocio } from '@/datos/demo'
import { ocupa, seSolapan } from '@/dominio/horarios'
import { generarSemilla } from '@/dominio/semilla'
import { claveDia, enHora, sumarDias } from '@/dominio/tiempo'
import type { Negocio, Turno } from '@/dominio/tipos'
import { ContextoCliente, type CtxCliente } from './contexto'
import { Inicio } from './Inicio'
import { EncabezadoCliente, NavCliente } from './Marco'

export { AccionAviso } from './Marco'

/** La clienta y la hora del turno de ejemplo. */
export const CLIENTA_MUESTRA = 'Martina Fernández'
export const HORA_MUESTRA = '10:30'

const nada = () => {}

export interface EjemploVitrina {
  e: EstadoNegocio
  /** El turno de la clienta de ejemplo, para mañana. */
  turno: Turno
}

/** Estado de ejemplo de un negocio: su agenda generada para hoy + el turno de la clienta para mañana. */
export function armarEjemploVitrina(n: Negocio, ahora: Date): EjemploVitrina {
  const semilla = generarSemilla(n, ahora)
  const servicio = n.servicios.find((s) => s.etiqueta) ?? n.servicios[0]!
  const prof = n.staff[0]!
  const inicio = enHora(sumarDias(claveDia(ahora), 1), HORA_MUESTRA)
  const turno: Turno = {
    id: 'vitrina',
    clienteNombre: CLIENTA_MUESTRA,
    clienteTel: '',
    servicioId: servicio.id,
    profesionalId: prof.id,
    inicio: inicio.toISOString(),
    minutos: servicio.minutos,
    estado: 'pendiente',
    senaPagada: 0,
    propio: true,
    recordatorios: {},
    creado: new Date(ahora.getTime() - 3 * 86_400_000).toISOString(),
  }
  // Se saca de la agenda de ejemplo lo que se pisaría con el turno de la clienta.
  const turnos = semilla.turnos.filter(
    (t) => !(t.profesionalId === prof.id && ocupa(t) && seSolapan(Date.parse(t.inicio), t.minutos, inicio.getTime(), turno.minutos)),
  )
  const e: EstadoNegocio = {
    semillaDia: semilla.dia,
    turnos: [...turnos, turno],
    dormidos: [],
    usuario: { nombre: CLIENTA_MUESTRA, tel: '' },
    avisos: [],
    sellos: Math.max(1, n.fidelidad.meta - 2),
    recuperados: [],
  }
  return { e, turno }
}

interface Props {
  n: Negocio
  ejemplo: EjemploVitrina
  ahora: Date
  /** El turno de ejemplo ya está confirmado. */
  confirmado: boolean
  /** Avisos sin ver en la campanita. */
  noVistos: number
  /** Baja hasta la tarjeta de sellos y los servicios (si no, queda arriba). */
  bajar: boolean
  /** Sin animaciones: el scroll salta en vez de deslizarse. */
  quieto: boolean
  /** Lo que va encima de la app (por ejemplo, una notificación). */
  children?: React.ReactNode
}

/** La pantalla de inicio de la app del cliente con datos de ejemplo, sin acciones (todo es decorativo). */
export function VistaDeMuestra({ n, ejemplo, ahora, confirmado, noVistos, bajar, quieto, children }: Props) {
  const e = useMemo<EstadoNegocio>(
    () => ({ ...ejemplo.e, turnos: ejemplo.e.turnos.map((t) => (t.id === ejemplo.turno.id && confirmado ? { ...t, estado: 'confirmado' } : t)) }),
    [ejemplo, confirmado],
  )
  const ctx: CtxCliente = { n, e, ahora, abrirReserva: nada, irA: nada }

  const scroll = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scroll.current?.scrollTo({ top: bajar ? 330 : 0, behavior: quieto ? 'auto' : 'smooth' })
  }, [bajar, quieto])

  return (
    <ContextoCliente value={ctx}>
      <div ref={scroll} className="sin-barra absolute inset-0 overflow-hidden">
        <EncabezadoCliente n={n} noVistos={noVistos} onAvisos={nada} />
        {/* div y no main: esto se dibuja adentro de la landing, que ya tiene su main */}
        <div className="px-5 pt-2 pb-32">
          <Inicio />
        </div>
      </div>
      <NavCliente n={n} tab="inicio" onTab={nada} onReservar={nada} />
      {children}
    </ContextoCliente>
  )
}
