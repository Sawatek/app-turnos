// Fase 3: app del cliente para un negocio REAL (conectada a la base).
// Misma experiencia que la demo, pero con ingreso por celular, horarios reales y turnos de verdad.
import type { Session } from '@supabase/supabase-js'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { CalendarDays, House, Plus, RefreshCw, UserRound } from 'lucide-react'
import { useRef, useState } from 'react'
import { salirCliente, useCatalogo, useMisTurnos, useResumen, useTurnosEnVivo } from '@/datos/real/cliente'
import { telefonoLegible } from '@/datos/real/cliente-telefono'
import { useSesion } from '@/datos/sesion'
import { diaRelativo, horaCorta } from '@/dominio/tiempo'
import type { Aviso, Negocio } from '@/dominio/tipos'
import { useMarcaInstalable } from '@/instalacion/marca'
import { Boton } from '@/ui/Boton'
import { Logo } from '@/ui/Logo'
import { Notificacion } from '@/ui/Notificacion'
import { cn } from '@/ui/cn'
import { Cargando } from '../../NoEncontrado'
import type { PropsNegocioReal } from '../tipos'
import { ContextoReal, useAhora, type CtxReal, type OpcionesReserva, type Tab } from './contexto'
import { Ingreso } from './Ingreso'
import { Inicio } from './Inicio'
import { MisTurnos } from './MisTurnos'
import { Perfil } from './Perfil'
import { Reserva } from './Reserva'

export default function ClienteReal({ n, meta }: PropsNegocioReal) {
  useMarcaInstalable(n)
  const sesion = useSesion()
  return (
    // Respeta "reducir movimiento" del sistema en todas las animaciones.
    <MotionConfig reducedMotion="user">
      {sesion === undefined ? (
        <Cargando />
      ) : !sesion ? (
        <Ingreso n={n} />
      ) : (
        <App key={sesion.user.id} n={n} negocioId={meta.id} tomaTurnos={meta.estado === 'activo'} sesion={sesion} />
      )}
    </MotionConfig>
  )
}

function App({ n, negocioId, tomaTurnos, sesion }: { n: Negocio; negocioId: string; tomaTurnos: boolean; sesion: Session }) {
  const uid = sesion.user.id
  const catalogo = useCatalogo(negocioId)
  const resumen = useResumen(negocioId, uid)
  const turnos = useMisTurnos(negocioId, uid)
  const ahora = useAhora()
  const [tab, setTab] = useState<Tab>('inicio')
  const [reserva, setReserva] = useState<{ abierta: boolean; opciones: OpcionesReserva }>({ abierta: false, opciones: {} })
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Turnos que acaba de tocar el cliente: el aviso en vivo no le repite lo que ya sabe.
  const propios = useRef(new Set<string>())

  const avisar = (texto: string) => {
    clearTimeout(temporizador.current)
    setAviso({ id: crypto.randomUUID(), tipo: 'sistema', canal: 'push', texto, creado: new Date().toISOString(), visto: false })
    temporizador.current = setTimeout(() => setAviso(null), 6000)
  }

  // En vivo: si el negocio (o el botón "Confirmo" del WhatsApp) cambia un turno propio, se ve al instante.
  useTurnosEnVivo(negocioId, resumen.data?.clienteId ?? null, (nuevo) => {
    if (!nuevo || propios.current.has(nuevo.id)) return
    const antes = turnos.data?.find((t) => t.id === nuevo.id)
    if (!antes || antes.estado === nuevo.estado) return
    const cuando = `${diaRelativo(antes.inicio, ahora)} a las ${horaCorta(antes.inicio)}`
    if (nuevo.estado === 'confirmado') avisar(`Tu turno de ${cuando} quedó confirmado.`)
    else if (nuevo.estado === 'cancelado') avisar(`Se canceló tu turno de ${cuando}. Si no fuiste vos, escribinos.`)
  })

  if (catalogo.isError || resumen.isError || turnos.isError) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <Logo negocio={n} className="size-16 text-2xl" />
        <h1 className="mt-2 text-2xl">No pudimos cargar tus turnos</h1>
        <p className="text-suave">Revisá tu conexión y probá de nuevo.</p>
        <Boton
          className="mt-2"
          onClick={() => {
            void catalogo.refetch()
            void resumen.refetch()
            void turnos.refetch()
          }}
        >
          <RefreshCw className="size-4" aria-hidden />
          Reintentar
        </Boton>
        <Boton variante="fantasma" onClick={() => void salirCliente()}>
          Salir y volver a entrar
        </Boton>
      </main>
    )
  }
  if (!catalogo.data || !resumen.data || !turnos.data) return <Cargando />

  const ctx: CtxReal = {
    n,
    negocioId,
    tomaTurnos,
    uid,
    telefono: telefonoLegible(sesion.user.phone) || sesion.user.email || '',
    telefonoE164: sesion.user.phone ? `+${sesion.user.phone.replace(/^\+/, '')}` : null,
    catalogo: catalogo.data,
    resumen: resumen.data,
    turnos: turnos.data,
    ahora,
    abrirReserva: (opciones = {}) => setReserva({ abierta: true, opciones }),
    irA: (t) => {
      setTab(t)
      window.scrollTo({ top: 0 })
    },
    avisar,
    marcarPropio: (id) => void propios.current.add(id),
  }

  return (
    <ContextoReal value={ctx}>
      <Notificacion
        aviso={aviso}
        remitente={n.nombre}
        logo={<Logo negocio={n} className="size-10 rounded-chico text-sm" />}
        onCerrar={() => setAviso(null)}
      />
      <div className="mx-auto min-h-dvh max-w-lg">
        <header className="sticky top-0 z-30 flex items-center gap-3 bg-fondo/85 px-5 pt-segura pb-3 backdrop-blur-lg">
          <Logo negocio={n} className="size-10 rounded-chico text-sm" />
          <div className="min-w-0">
            <p className="truncate font-bold leading-tight">{n.nombre}</p>
            {n.bajada && <p className="truncate text-xs text-suave">{n.bajada}</p>}
          </div>
        </header>

        <main className="px-5 pt-2 pb-32">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.2, 0, 0, 1] } }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
            >
              {tab === 'inicio' && <Inicio />}
              {tab === 'turnos' && <MisTurnos />}
              {tab === 'perfil' && <Perfil />}
            </motion.div>
          </AnimatePresence>
        </main>

        <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg px-4 pb-segura">
          <div className="flex items-center gap-1 rounded-[26px] bg-superficie/90 p-1.5 sombra-flotante ring-1 ring-linea backdrop-blur-xl">
            {(
              [
                { id: 'inicio', texto: 'Inicio', Icono: House },
                { id: 'turnos', texto: 'Mis turnos', Icono: CalendarDays },
                { id: 'perfil', texto: 'Perfil', Icono: UserRound },
              ] as const
            ).map(({ id, texto, Icono }) => (
              <button
                key={id}
                type="button"
                aria-current={tab === id ? 'page' : undefined}
                onClick={() => ctx.irA(id)}
                className={cn(
                  'relative flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] text-[11px] font-bold transition-colors',
                  tab === id ? 'text-texto' : 'text-suave',
                )}
              >
                {tab === id && <motion.span layoutId="tab-activa-real" className="absolute inset-0 rounded-[20px] bg-superficie-2" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                <Icono className="relative size-5" aria-hidden />
                <span className="relative">{texto}</span>
              </button>
            ))}
            {tomaTurnos && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => ctx.abrirReserva()}
                className="flex h-14 items-center gap-1.5 rounded-[20px] bg-acento px-4 font-bold text-sobre-acento"
              >
                <Plus className="size-5" strokeWidth={2.75} aria-hidden />
                {n.textos?.reservar || 'Reservar'}
              </motion.button>
            )}
          </div>
        </nav>

        <Reserva abierta={reserva.abierta} opciones={reserva.opciones} onCerrar={() => setReserva((r) => ({ ...r, abierta: false }))} />
      </div>
    </ContextoReal>
  )
}
