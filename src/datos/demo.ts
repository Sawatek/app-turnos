// Estado de la demo (turnos, sesión del cliente, avisos y reloj simulado).
// Vive en el navegador: cada prospecto juega con su copia sin pisar a nadie.
// Se sincroniza entre pestañas e iframes (el modo escenario usa dos iframes) con el evento `storage`.
import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { estaLibre } from '@/dominio/horarios'
import { generarSemilla } from '@/dominio/semilla'
import { claveDia, diaRelativo, horaCorta } from '@/dominio/tiempo'
import type { Aviso, ClienteResumen, EstadoTurno, Negocio, Turno } from '@/dominio/tipos'

interface Usuario {
  nombre: string
  tel: string
}

export interface EstadoNegocio {
  semillaDia: string
  turnos: Turno[]
  dormidos: ClienteResumen[]
  usuario: Usuario | null
  avisos: Aviso[]
  /** Sellos de fidelidad del usuario de la demo (arranca con algunos para que se vea la tarjeta). */
  sellos: number
  recuperados: string[]
}

interface EstadoDemo {
  /** Desfasaje del reloj simulado respecto del real, en ms ("adelantar el tiempo"). */
  desfase: number
  negocios: Record<string, EstadoNegocio>
  preparar: (n: Negocio) => void
  ingresar: (slug: string, u: Usuario) => void
  salir: (slug: string) => void
  avisar: (slug: string, a: Omit<Aviso, 'id' | 'creado' | 'visto'>) => void
  marcarAvisosVistos: (slug: string) => void
  /** La campanita vuelve a mostrar el último aviso. */
  reabrirUltimoAviso: (slug: string) => void
  reservar: (n: Negocio, datos: Pick<Turno, 'servicioId' | 'profesionalId' | 'inicio' | 'minutos' | 'senaPagada'>, reprogramaId?: string) => Turno
  cambiarEstado: (slug: string, id: string, estado: EstadoTurno) => void
  marcarRecuperado: (slug: string, tel: string) => void
  procesarRecordatorios: (n: Negocio) => void
  adelantar: (ms: number) => void
  volverAlPresente: () => void
  reiniciar: (n: Negocio) => void
}

export const ahoraSimulado = (desfase: number) => new Date(Date.now() + desfase)
const id = () => Math.random().toString(36).slice(2, 10)

const sustituir = (plantilla: string, valores: Record<string, string>) =>
  plantilla.replace(/\{(\w+)\}/g, (_, k: string) => valores[k] ?? `{${k}}`)

export function textoMensaje(n: Negocio, plantilla: string, t: Turno | null, nombre: string, ahora: Date) {
  return sustituir(plantilla, {
    nombre: nombre.split(' ')[0] ?? nombre,
    negocio: n.nombre,
    direccion: n.direccion,
    hora: t ? horaCorta(t.inicio) : '',
    dia: t ? diaRelativo(t.inicio, ahora) : '',
    servicio: t ? (n.servicios.find((s) => s.id === t.servicioId)?.nombre ?? '') : '',
    profesional: t ? (n.staff.find((p) => p.id === t.profesionalId)?.nombre ?? '') : '',
  })
}

export const useDemo = create<EstadoDemo>()(
  persist(
    (set, get) => {
      const actualizar = (slug: string, fn: (e: EstadoNegocio) => Partial<EstadoNegocio>) =>
        set((s) => {
          const e = s.negocios[slug]
          return e ? { negocios: { ...s.negocios, [slug]: { ...e, ...fn(e) } } } : s
        })

      return {
        desfase: 0,
        negocios: {},

        preparar: (n) => {
          const ahora = ahoraSimulado(get().desfase)
          const actual = get().negocios[n.slug]
          if (actual && actual.semillaDia === claveDia(ahora)) return
          // Semilla nueva cada día (o la primera vez); los turnos propios del usuario se conservan.
          const semilla = generarSemilla(n, ahora)
          const propios = actual?.turnos.filter((t) => t.propio) ?? []
          const turnos = [...semilla.turnos.filter((t) => propios.every((p) => estaLibre([p], t.profesionalId, Date.parse(t.inicio), t.minutos))), ...propios]
          set((s) => ({
            negocios: {
              ...s.negocios,
              [n.slug]: {
                semillaDia: semilla.dia,
                turnos,
                dormidos: semilla.dormidos,
                usuario: actual?.usuario ?? null,
                avisos: actual?.avisos ?? [],
                sellos: actual?.sellos ?? Math.max(1, n.fidelidad.meta - 2),
                recuperados: actual?.recuperados ?? [],
              },
            },
          }))
        },

        ingresar: (slug, usuario) => actualizar(slug, () => ({ usuario })),
        salir: (slug) => actualizar(slug, (e) => ({ usuario: null, avisos: [], turnos: e.turnos.filter((t) => !t.propio) })),

        avisar: (slug, a) =>
          actualizar(slug, (e) => ({
            avisos: [{ ...a, id: id(), creado: ahoraSimulado(get().desfase).toISOString(), visto: false }, ...e.avisos].slice(0, 40),
          })),
        marcarAvisosVistos: (slug) => actualizar(slug, (e) => ({ avisos: e.avisos.map((a) => ({ ...a, visto: true })) })),
        reabrirUltimoAviso: (slug) => actualizar(slug, (e) => ({ avisos: e.avisos.map((a, i) => (i === 0 ? { ...a, visto: false } : a)) })),

        reservar: (n, datos, reprogramaId) => {
          const e = get().negocios[n.slug]
          if (!e?.usuario) throw new Error('Tenés que ingresar primero')
          // La "base de datos" de la demo también valida: nunca dos turnos en el mismo horario.
          if (!estaLibre(e.turnos, datos.profesionalId, Date.parse(datos.inicio), datos.minutos, reprogramaId)) {
            throw new Error('Ese horario se acaba de ocupar. Elegí otro.')
          }
          const turno: Turno = {
            ...datos,
            id: id(),
            clienteNombre: e.usuario.nombre,
            clienteTel: e.usuario.tel,
            // Queda reservado; la asistencia se confirma con el recordatorio del día anterior.
            estado: 'pendiente',
            propio: true,
            recordatorios: {},
            creado: ahoraSimulado(get().desfase).toISOString(),
          }
          actualizar(n.slug, (x) => ({
            turnos: [...x.turnos.map((t) => (t.id === reprogramaId ? { ...t, estado: 'cancelado' as const } : t)), turno],
          }))
          return turno
        },

        cambiarEstado: (slug, tid, estado) =>
          actualizar(slug, (e) => ({
            turnos: e.turnos.map((t) => (t.id === tid ? { ...t, estado } : t)),
            sellos: estado === 'asistio' && e.turnos.find((t) => t.id === tid)?.propio ? e.sellos + 1 : e.sellos,
          })),

        marcarRecuperado: (slug, tel) => actualizar(slug, (e) => ({ recuperados: [...e.recuperados, tel] })),

        procesarRecordatorios: (n) => {
          const e = get().negocios[n.slug]
          if (!e?.usuario) return
          const ahora = ahoraSimulado(get().desfase)
          const t0 = ahora.getTime()
          const HORA = 3_600_000
          const nuevos: Omit<Aviso, 'id' | 'creado' | 'visto'>[] = []
          const turnos = e.turnos.map((t) => {
            if (!t.propio || (t.estado !== 'pendiente' && t.estado !== 'confirmado')) return t
            const inicio = Date.parse(t.inicio)
            if (t0 >= inicio) return t
            // Solo se manda si pasó un rato desde la reserva (en la demo: "adelantar el tiempo").
            const reservadoHaceRato = t0 - Date.parse(t.creado) > 5 * 60_000
            const rec = { ...t.recordatorios }
            if (!rec.r24 && reservadoHaceRato && t0 >= inicio - 24 * HORA && t0 < inicio - 2 * HORA) {
              rec.r24 = ahora.toISOString()
              nuevos.push({ tipo: 'r24', canal: 'whatsapp', turnoId: t.id, texto: textoMensaje(n, n.mensajes.recordatorio24, t, e.usuario!.nombre, ahora) })
            }
            if (!rec.r2 && reservadoHaceRato && t0 >= inicio - 2 * HORA) {
              rec.r2 = ahora.toISOString()
              nuevos.push({ tipo: 'r2', canal: 'push', turnoId: t.id, texto: textoMensaje(n, n.mensajes.recordatorio2, t, e.usuario!.nombre, ahora) })
            }
            return rec.r24 === t.recordatorios.r24 && rec.r2 === t.recordatorios.r2 ? t : { ...t, recordatorios: rec }
          })
          if (!nuevos.length) return
          const creado = ahora.toISOString()
          actualizar(n.slug, (x) => ({
            turnos,
            avisos: [...nuevos.map((a) => ({ ...a, id: id(), creado, visto: false })).toReversed(), ...x.avisos].slice(0, 40),
          }))
        },

        adelantar: (ms) => set((s) => ({ desfase: s.desfase + ms })),
        volverAlPresente: () => set({ desfase: 0 }),

        reiniciar: (n) => {
          set((s) => {
            const { [n.slug]: _, ...resto } = s.negocios
            return { negocios: resto, desfase: 0 }
          })
          get().preparar(n)
        },
      }
    },
    { name: 'sawatek-demo-v1', version: 1 },
  ),
)

// Sincronización entre pestañas / iframes del modo escenario.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (ev) => {
    if (ev.key === 'sawatek-demo-v1') void useDemo.persist.rehydrate()
  })
}

/** Reloj simulado que avanza solo (cada 15 s) y salta cuando se "adelanta el tiempo". */
export function useAhora() {
  const desfase = useDemo((s) => s.desfase)
  const [, setTic] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTic((x) => x + 1), 15_000)
    return () => clearInterval(t)
  }, [])
  return ahoraSimulado(desfase)
}

const VACIO: EstadoNegocio = { semillaDia: '', turnos: [], dormidos: [], usuario: null, avisos: [], sellos: 0, recuperados: [] }

/** Estado de un negocio, preparando la semilla si hace falta. */
export function useEstadoNegocio(n: Negocio | undefined): EstadoNegocio {
  const estado = useDemo((s) => (n ? s.negocios[n.slug] : undefined))
  const preparar = useDemo((s) => s.preparar)
  const ahora = useAhora()
  const dia = claveDia(ahora)
  useEffect(() => {
    if (n) preparar(n)
  }, [n, preparar, dia])
  return estado ?? VACIO
}
