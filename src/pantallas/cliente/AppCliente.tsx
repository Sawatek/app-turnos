import { AnimatePresence, motion } from 'motion/react'
import { lazy, useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { useAhora, useDemo, useEstadoNegocio } from '@/datos/demo'
import { useEnVivo } from '@/datos/envivo'
import { useSala } from '@/datos/sala'
import { useNegocio } from '@/datos/negocios'
import { PLANTILLA_GRACIAS, diaDeWhatsApp, textoMensaje } from '@/dominio/mensajes'
import type { Aviso, Negocio } from '@/dominio/tipos'
import { useMarcaInstalable } from '@/instalacion/marca'
import { useTemaNegocio } from '@/tema/TemaNegocio'
import { Logo } from '@/ui/Logo'
import { Notificacion } from '@/ui/Notificacion'
import { Cargando, NoEncontrado } from '../NoEncontrado'
import { ContextoCliente, type CtxCliente, type OpcionesReserva } from './contexto'
import { codigoDelAviso, EVENTO_CODIGO, Ingreso } from './Ingreso'
import { Inicio } from './Inicio'
import { AccionAviso, EncabezadoCliente, NavCliente, type Tab } from './Marco'
import { MisTurnos } from './MisTurnos'
import { NoDisponible } from './NoDisponible'
import { Perfil } from './Perfil'
import { Reserva } from './Reserva'

// Negocio real (no demo): app conectada a la base (fase 3).
const ClienteReal = lazy(() => import('../real/cliente/ClienteReal'))

export default function AppCliente() {
  const { slug } = useParams()
  const { negocio: n, meta, cargando } = useNegocio(slug)
  useTemaNegocio(n)
  if (cargando) return <Cargando />
  if (!n) return <NoEncontrado />
  if (!meta.esDemo && meta.estado === 'suspendido') return <NoDisponible n={n} />
  if (!meta.esDemo && meta.id) return <ClienteReal n={n} meta={{ ...meta, id: meta.id }} />
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
  const avisar = useDemo((s) => s.avisar)
  const [tab, setTab] = useState<Tab>('inicio')
  const [reserva, setReserva] = useState<{ abierta: boolean; opciones: OpcionesReserva }>({ abierta: false, opciones: {} })

  // El "motor" de recordatorios corre cada vez que avanza el reloj (real o simulado).
  const minuto = Math.floor(ahora.getTime() / 60_000)
  useEffect(() => procesar(n), [n, procesar, minuto])

  // Notificación visible: el aviso más nuevo sin ver.
  const aviso: Aviso | null = e.avisos.find((a) => !a.visto) ?? null
  const esperaRespuesta = aviso?.tipo === 'r24'
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
      // El recordatorio espera respuesta y el código hay que copiarlo: esos quedan hasta que los cierren.
      autoCerrar={esperaRespuesta || aviso?.tipo === 'codigo' ? undefined : 6500}
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
                // Como en la app real: llega el "¡Gracias!" por WhatsApp, después de que el sello cae sobre el pase.
                const turno = turnoDelAviso
                setTimeout(
                  () =>
                    avisar(n.slug, {
                      tipo: 'confirmacion',
                      canal: 'whatsapp',
                      turnoId: turno.id,
                      texto: textoMensaje(n, PLANTILLA_GRACIAS, turno, e.usuario?.nombre ?? '', ahora, diaDeWhatsApp),
                    }),
                  1500,
                )
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
      {/* Hoja cuadriculada arriba, que se desvanece: el cuaderno del negocio. Decorativa. */}
      <div aria-hidden className="cuadricula pointer-events-none absolute inset-x-0 top-0 -z-10 h-[26rem] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="mx-auto min-h-dvh max-w-lg">
        <EncabezadoCliente n={n} noVistos={noVistos} onAvisos={() => reabrirAviso(n.slug)} />

        <main className="px-5 pt-3 pb-36">
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

        <NavCliente n={n} tab={tab} onTab={ctx.irA} onReservar={() => ctx.abrirReserva()} />

        <Reserva abierta={reserva.abierta} opciones={reserva.opciones} onCerrar={() => setReserva((r) => ({ ...r, abierta: false }))} />
      </div>
    </ContextoCliente>
  )
}
