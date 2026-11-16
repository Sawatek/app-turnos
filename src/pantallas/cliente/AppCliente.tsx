import { AnimatePresence, motion } from 'motion/react'
import { Bell, CalendarDays, House, Plus, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { useAhora, useDemo, useEstadoNegocio } from '@/datos/demo'
import { useEnVivo } from '@/datos/envivo'
import { useSala } from '@/datos/sala'
import { useNegocio } from '@/datos/negocios'
import type { Aviso, Negocio } from '@/dominio/tipos'
import { useMarcaInstalable } from '@/instalacion/marca'
import { useTemaNegocio } from '@/tema/TemaNegocio'
import { Logo } from '@/ui/Logo'
import { Notificacion } from '@/ui/Notificacion'
import { cn } from '@/ui/cn'
import { Cargando, NoEncontrado } from '../NoEncontrado'
import { ContextoCliente, type CtxCliente, type OpcionesReserva } from './contexto'
import { codigoDelAviso, EVENTO_CODIGO, Ingreso } from './Ingreso'
import { Inicio } from './Inicio'
import { MisTurnos } from './MisTurnos'
import { Perfil } from './Perfil'
import { Reserva } from './Reserva'

type Tab = 'inicio' | 'turnos' | 'perfil'

export default function AppCliente() {
  const { slug } = useParams()
  const { negocio: n, cargando } = useNegocio(slug)
  useTemaNegocio(n)
  if (cargando) return <Cargando />
  if (!n) return <NoEncontrado />
  return <App key={n.slug} n={n} />
}

function App({ n }: { n: Negocio }) {
  const e = useEstadoNegocio(n)
  useMarcaInstalable(n)
  useEnVivo(n, useSala(n.slug))
  const ahora = useAhora()
  const procesar = useDemo((s) => s.procesarRecordatorios)
  const marcarVistos = useDemo((s) => s.marcarAvisosVistos)
  const cambiarEstado = useDemo((s) => s.cambiarEstado)
  const reabrirAviso = useDemo((s) => s.reabrirUltimoAviso)
  const [tab, setTab] = useState<Tab>('inicio')
  const [reserva, setReserva] = useState<{ abierta: boolean; opciones: OpcionesReserva }>({ abierta: false, opciones: {} })

  // El "motor" de recordatorios corre cada vez que avanza el reloj (real o simulado).
  const minuto = Math.floor(ahora.getTime() / 60_000)
  useEffect(() => procesar(n), [n, procesar, minuto])

  // Notificación visible: el aviso más nuevo sin ver.
  const aviso: Aviso | null = e.avisos.find((a) => !a.visto) ?? null
  const esperaRespuesta = aviso?.tipo === 'r24'
  useEffect(() => {
    if (!aviso || esperaRespuesta || aviso.tipo === 'codigo') return
    const t = setTimeout(() => marcarVistos(n.slug), 6500)
    return () => clearTimeout(t)
  }, [aviso, esperaRespuesta, marcarVistos, n.slug])

  const cerrarAviso = () => marcarVistos(n.slug)
  const turnoDelAviso = aviso?.turnoId ? e.turnos.find((t) => t.id === aviso.turnoId) : undefined

  const ctx: CtxCliente = {
    n,
    e,
    ahora,
    abrirReserva: (opciones = {}) => setReserva({ abierta: true, opciones }),
    irA: (t) => {
      setTab(t)
      window.scrollTo({ top: 0 })
    },
  }

  const notificacion = (
    <Notificacion
      aviso={aviso}
      remitente={n.nombre}
      logo={<Logo negocio={n} className="size-10 rounded-chico text-sm" />}
      onCerrar={cerrarAviso}
      acciones={
        aviso?.tipo === 'codigo' ? (
          <AccionAviso
            onClick={() => {
              window.dispatchEvent(new CustomEvent(EVENTO_CODIGO, { detail: codigoDelAviso(aviso.texto) }))
              cerrarAviso()
            }}
          >
            Completar código
          </AccionAviso>
        ) : esperaRespuesta && turnoDelAviso ? (
          <>
            <AccionAviso
              onClick={() => {
                cambiarEstado(n.slug, turnoDelAviso.id, 'confirmado')
                cerrarAviso()
              }}
            >
              Confirmo
            </AccionAviso>
            <AccionAviso
              secundaria
              onClick={() => {
                cerrarAviso()
                ctx.abrirReserva({ reprograma: turnoDelAviso })
              }}
            >
              Cambiar horario
            </AccionAviso>
          </>
        ) : undefined
      }
    />
  )

  if (!e.usuario) {
    return (
      <>
        {notificacion}
        <Ingreso n={n} />
      </>
    )
  }

  const noVistos = e.avisos.filter((a) => !a.visto).length

  return (
    <ContextoCliente value={ctx}>
      {notificacion}
      <div className="mx-auto min-h-dvh max-w-lg">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-fondo/85 px-5 pt-segura pb-3 backdrop-blur-lg">
          <div className="flex min-w-0 items-center gap-3">
            <Logo negocio={n} className="size-10 rounded-chico text-sm" />
            <div className="min-w-0">
              <p className="truncate font-bold leading-tight">{n.nombre}</p>
              <p className="truncate text-xs text-suave">{n.bajada}</p>
            </div>
          </div>
          <button
            type="button"
            className="relative grid size-11 place-items-center rounded-full bg-superficie ring-1 ring-linea"
            aria-label={noVistos ? `Avisos, ${noVistos} sin ver` : 'Avisos'}
            onClick={() => reabrirAviso(n.slug)}
          >
            <Bell className="size-5" aria-hidden />
            {noVistos > 0 && <span className="absolute top-2 right-2 size-2.5 rounded-full bg-peligro ring-2 ring-superficie" aria-hidden />}
          </button>
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
                {tab === id && <motion.span layoutId="tab-activa" className="absolute inset-0 rounded-[20px] bg-superficie-2" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                <Icono className="relative size-5" aria-hidden />
                <span className="relative">{texto}</span>
              </button>
            ))}
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => ctx.abrirReserva()}
              className="flex h-14 items-center gap-1.5 rounded-[20px] bg-acento px-4 font-bold text-sobre-acento"
            >
              <Plus className="size-5" strokeWidth={2.75} aria-hidden />
              {n.textos.reservar}
            </motion.button>
          </div>
        </nav>

        <Reserva abierta={reserva.abierta} opciones={reserva.opciones} onCerrar={() => setReserva((r) => ({ ...r, abierta: false }))} />
      </div>
    </ContextoCliente>
  )
}

function AccionAviso({ children, onClick, secundaria }: { children: React.ReactNode; onClick: () => void; secundaria?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-10 flex-1 rounded-xl px-3 text-sm font-bold transition-transform active:scale-[0.97]',
        secundaria ? 'bg-black/8 text-current' : 'bg-wa text-[#062b14]',
      )}
    >
      {children}
    </button>
  )
}
