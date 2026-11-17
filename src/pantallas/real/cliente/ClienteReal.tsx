// Fase 3: app del cliente para un negocio REAL (conectada a la base).
// Misma experiencia que la demo, pero con ingreso por celular, horarios reales y turnos de verdad.
// Sin sesión se puede mirar todo y armar la reserva: el celular y el código se piden recién al confirmar.
import type { Session } from '@supabase/supabase-js'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, House, Plus, RefreshCw, Share2, UserRound } from 'lucide-react'
import { useRef, useState } from 'react'
import { RESUMEN_INVITADO, salirCliente, useCatalogo, useMisTurnos, useResumen, useTurnosEnVivo } from '@/datos/real/cliente'
import { telefonoLegible } from '@/datos/real/cliente-telefono'
import { nombreDeUsuario, useSesion } from '@/datos/sesion'
import { diaRelativo, horaCorta } from '@/dominio/tiempo'
import type { Aviso, Negocio } from '@/dominio/tipos'
import { useMarcaInstalable } from '@/instalacion/marca'
import { Boton } from '@/ui/Boton'
import { Logo } from '@/ui/Logo'
import { Notificacion } from '@/ui/Notificacion'
import { cn } from '@/ui/cn'
import { Cargando } from '../../NoEncontrado'
import type { PropsNegocioReal } from '../tipos'
import { compartirLink, ContextoReal, useAhora, type CtxReal, type OpcionesReserva, type Tab } from './contexto'
import { Inicio } from './Inicio'
import { MisTurnos } from './MisTurnos'
import { Perfil } from './Perfil'
import { Reserva } from './Reserva'

export default function ClienteReal({ n, meta }: PropsNegocioReal) {
  useMarcaInstalable(n)
  const sesion = useSesion()
  return (
    // Sin key por usuario: al entrar desde la hoja de reserva no se pierde lo que eligió.
    sesion === undefined ? <Cargando /> : <App n={n} negocioId={meta.id} tomaTurnos={meta.estado === 'activo'} sesion={sesion} />
  )
}

function App({ n, negocioId, tomaTurnos, sesion }: { n: Negocio; negocioId: string; tomaTurnos: boolean; sesion: Session | null }) {
  const uid = sesion?.user.id ?? null
  const catalogo = useCatalogo(negocioId)
  const resumen = useResumen(negocioId, uid)
  const turnos = useMisTurnos(negocioId, uid)
  const ahora = useAhora()
  const [tab, setTab] = useState<Tab>('inicio')
  const [reserva, setReserva] = useState<{ abierta: boolean; opciones: OpcionesReserva }>({ abierta: false, opciones: {} })
  const [aviso, setAviso] = useState<Aviso | null>(null)
  // Turnos que acaba de tocar el cliente: el aviso en vivo no le repite lo que ya sabe.
  const propios = useRef(new Set<string>())

  const avisar = (texto: string) => {
    setAviso({ id: crypto.randomUUID(), tipo: 'sistema', canal: 'push', texto, creado: new Date().toISOString(), visto: false })
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

  const errorCuenta = !!uid && (resumen.isError || turnos.isError)
  if (catalogo.isError || errorCuenta) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <Logo negocio={n} className="size-16 text-2xl" />
        <h1 className="mt-2 text-2xl">{errorCuenta ? 'No pudimos cargar tus turnos' : `No pudimos abrir ${n.nombre}`}</h1>
        <p className="text-suave">Revisá tu conexión y probá de nuevo.</p>
        <Boton
          className="mt-2"
          onClick={() => {
            void catalogo.refetch()
            if (uid) {
              void resumen.refetch()
              void turnos.refetch()
            }
          }}
        >
          <RefreshCw className="size-4" aria-hidden />
          Reintentar
        </Boton>
        {errorCuenta && (
          <Boton variante="fantasma" onClick={() => void salirCliente()}>
            Salir y volver a entrar
          </Boton>
        )}
      </main>
    )
  }
  // Solo se espera el catálogo: la ficha y los turnos cargan después, sin desarmar la pantalla
  // (así, si entra desde la hoja de reserva, sigue donde estaba).
  if (!catalogo.data) return <Cargando />

  const usuario = sesion?.user
  const ctx: CtxReal = {
    n,
    negocioId,
    tomaTurnos,
    uid,
    cargandoCuenta: !!uid && (!resumen.data || !turnos.data),
    nombreCuenta: nombreDeUsuario(usuario),
    telefono: telefonoLegible(usuario?.phone) || usuario?.email || '',
    telefonoE164: usuario?.phone ? `+${usuario.phone.replace(/^\+/, '')}` : null,
    catalogo: catalogo.data,
    resumen: (uid && resumen.data) || RESUMEN_INVITADO,
    turnos: (uid && turnos.data) || [],
    ahora,
    abrirReserva: (opciones = {}) => setReserva({ abierta: true, opciones }),
    irA: (t) => {
      setTab(t)
      window.scrollTo({ top: 0 })
    },
    avisar,
    marcarPropio: (id) => void propios.current.add(id),
    compartir: () => {
      void compartirLink({
        titulo: n.nombre,
        texto: `Sacá turno en ${n.nombre}`,
        url: `${location.origin}/${n.slug}`,
      }).then((r) => {
        if (r === 'copiado') avisar('Copiamos el link. Pegalo donde quieras compartirlo.')
        else if (r === 'error') avisar(`No pudimos copiar el link. Es ${location.host}/${n.slug}`)
      })
    },
  }

  return (
    <ContextoReal value={ctx}>
      <Notificacion
        aviso={aviso}
        remitente={n.nombre}
        logo={<Logo negocio={n} className="size-10 rounded-chico text-sm" />}
        onCerrar={() => setAviso(null)}
        autoCerrar={6000}
      />
      <div className="mx-auto min-h-dvh max-w-lg">
        <header className="sticky top-0 z-30 flex items-center gap-3 bg-fondo/85 px-5 pt-segura pb-3 backdrop-blur-lg">
          <Logo negocio={n} className="size-10 rounded-chico text-sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold leading-tight">{n.nombre}</p>
            {n.bajada && <p className="truncate text-xs text-suave">{n.bajada}</p>}
          </div>
          <button
            type="button"
            onClick={ctx.compartir}
            aria-label={`Compartir ${n.nombre}`}
            className="grid size-11 shrink-0 place-items-center rounded-full text-suave transition-colors hover:bg-superficie-2 hover:text-texto"
          >
            <Share2 className="size-5" aria-hidden />
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
