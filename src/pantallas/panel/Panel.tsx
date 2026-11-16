import { AnimatePresence, motion } from 'motion/react'
import { BellRing, Check, CheckCheck, ExternalLink, MessageCircle, Smartphone, Sparkles, UserX, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useAhora, useDemo, useEstadoNegocio, textoMensaje, type EstadoNegocio } from '@/datos/demo'
import { useNegocio } from '@/datos/negocios'
import { capitalizar, claveDia, diaLargo, diaRelativo, horaCorta, nombreDia, numeroDia, precio, precioCorto, sumarDias } from '@/dominio/tiempo'
import type { Negocio, Turno } from '@/dominio/tipos'
import { useTemaNegocio } from '@/tema/TemaNegocio'
import { Boton } from '@/ui/Boton'
import { Hoja } from '@/ui/Hoja'
import { InsigniaEstado } from '@/ui/Insignia'
import { Logo, iniciales } from '@/ui/Logo'
import { cn } from '@/ui/cn'
import { NoEncontrado } from '../NoEncontrado'
import { Calculadora } from './Calculadora'

export default function Panel() {
  const { slug } = useParams()
  const n = useNegocio(slug)
  useTemaNegocio(n, n ? `${n.nombre} · Panel` : undefined)
  if (!n) return <NoEncontrado />
  return <PanelNegocio key={n.slug} n={n} />
}

const ocupa = (t: Turno) => t.estado !== 'cancelado'

function PanelNegocio({ n }: { n: Negocio }) {
  const e = useEstadoNegocio(n)
  const ahora = useAhora()
  const [params] = useSearchParams()
  const embebido = params.has('embebido')
  const hoy = claveDia(ahora)
  const [dia, setDia] = useState(hoy)
  const [filtro, setFiltro] = useState<string | null>(null)
  const nuevo = useTurnoNuevo(e)

  const delDia = e.turnos
    .filter((t) => claveDia(t.inicio) === dia && (filtro === null || t.profesionalId === filtro))
    .toSorted((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))
  const activos = delDia.filter(ocupa)
  const confirmados = activos.filter((t) => t.estado === 'confirmado' || t.estado === 'asistio').length
  const senas = activos.reduce((s, t) => s + t.senaPagada, 0)
  const facturacion = activos.reduce((s, t) => s + (n.servicios.find((x) => x.id === t.servicioId)?.precio ?? 0), 0)

  return (
    <div className={cn('mx-auto min-h-dvh max-w-6xl px-4 pb-16 sm:px-6', embebido ? 'pt-4' : 'pt-segura')}>
      <header className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-3">
          <Logo negocio={n} className="size-11 text-sm" />
          <div>
            <h1 className="text-xl leading-tight">{n.nombre}</h1>
            <p className="text-sm text-suave">Panel del dueño · {capitalizar(diaLargo(ahora))}</p>
          </div>
        </div>
        {!embebido && (
          <Link to={`/${n.slug}`} className="inline-flex h-10 items-center gap-2 rounded-medio bg-superficie px-3.5 text-sm font-semibold ring-1 ring-linea">
            <Smartphone className="size-4" aria-hidden />
            Ver como {n.textos.cliente}
          </Link>
        )}
      </header>

      <div aria-live="polite">
      <AnimatePresence>
        {nuevo && (
          <motion.div
            key={nuevo.id}
            initial={{ y: -16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0 }}
            className="mb-4 flex items-center gap-3 rounded-grande bg-acento p-4 text-sobre-acento sombra-flotante"
          >
            <Sparkles className="size-6 shrink-0" aria-hidden />
            <p className="text-[15px]">
              <b>Nuevo turno desde la app:</b> {nuevo.clienteNombre} · {capitalizar(diaRelativo(nuevo.inicio, ahora))} {horaCorta(nuevo.inicio)} ·{' '}
              {n.servicios.find((s) => s.id === nuevo.servicioId)?.nombre}
              {nuevo.senaPagada ? ` · seña ${precio(nuevo.senaPagada)} cobrada` : ''}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* KPIs del día */}
          <section aria-label="Resumen del día" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi titulo={dia === hoy ? 'Turnos hoy' : 'Turnos'} valor={String(activos.length)} />
            <Kpi titulo="Confirmados" valor={`${confirmados}/${activos.length}`} barra={activos.length ? confirmados / activos.length : 0} />
            <Kpi titulo="Señas cobradas" valor={precioCorto(senas)} />
            <Kpi titulo="Facturación estimada" valor={precioCorto(facturacion)} />
          </section>

          {/* Selector de día */}
          <nav aria-label="Elegir día" className="sin-barra -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i - 1)).map((d) => {
              const f = `${d}T12:00:00-03:00`
              const activo = d === dia
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setDia(d)}
                  className={cn(
                    'flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-medio text-sm font-bold transition-colors',
                    activo ? 'bg-acento text-sobre-acento' : 'bg-superficie ring-1 ring-linea',
                  )}
                >
                  <span className="text-[11px] uppercase opacity-80">{d === hoy ? 'Hoy' : nombreDia(f)}</span>
                  <span className="num text-lg">{numeroDia(f)}</span>
                </button>
              )
            })}
          </nav>

          {/* Filtro por profesional */}
          <div className="flex flex-wrap gap-2" aria-label="Filtrar por profesional">
            {[{ id: null, nombre: 'Todos' }, ...n.staff].map((p) => (
              <button
                key={p.id ?? 'todos'}
                type="button"
                aria-pressed={filtro === p.id}
                onClick={() => setFiltro(p.id)}
                className={cn(
                  'h-10 rounded-full px-4 text-sm font-semibold transition-colors',
                  filtro === p.id ? 'bg-texto text-fondo' : 'bg-superficie text-suave ring-1 ring-linea',
                )}
              >
                {p.nombre}
              </button>
            ))}
          </div>

          <Agenda n={n} turnos={delDia} ahora={ahora} resaltado={nuevo?.id} />
        </div>

        <aside className="flex flex-col gap-4">
          <Recuperar n={n} e={e} ahora={ahora} />
          <Calculadora n={n} />
        </aside>
      </div>
    </div>
  )
}

function Kpi({ titulo, valor, barra }: { titulo: string; valor: string; barra?: number }) {
  return (
    <div className="rounded-grande bg-superficie p-4 ring-1 ring-linea">
      <p className="text-xs font-semibold text-suave">{titulo}</p>
      <p className="titulo num mt-1 text-2xl">{valor}</p>
      {barra !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-superficie-2" aria-hidden>
          <motion.div className="h-full rounded-full bg-exito" initial={{ width: 0 }} animate={{ width: `${Math.round(barra * 100)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
        </div>
      )}
    </div>
  )
}

/** Detecta turnos nuevos sacados desde la app (en otra pestaña o en el celular del modo escenario). */
function useTurnoNuevo(e: EstadoNegocio) {
  const conocidos = useRef<Set<string> | null>(null)
  const [nuevo, setNuevo] = useState<Turno | null>(null)
  useEffect(() => {
    const ids = new Set(e.turnos.map((t) => t.id))
    if (conocidos.current && e.turnos.length) {
      const reciente = e.turnos.find((t) => t.propio && !conocidos.current!.has(t.id))
      if (reciente) {
        setNuevo(reciente)
        const t = setTimeout(() => setNuevo(null), 9000)
        conocidos.current = ids
        return () => clearTimeout(t)
      }
    }
    if (e.turnos.length) conocidos.current = ids
  }, [e.turnos])
  return nuevo
}

function Agenda({ n, turnos, ahora, resaltado }: { n: Negocio; turnos: Turno[]; ahora: Date; resaltado?: string }) {
  const cambiarEstado = useDemo((s) => s.cambiarEstado)
  const [recordado, setRecordado] = useState<string[]>([])

  if (!turnos.length) {
    return <p className="rounded-grande bg-superficie p-8 text-center text-suave ring-1 ring-linea">No hay turnos este día.</p>
  }

  const t0 = ahora.getTime()
  const indiceAhora = turnos.findIndex((t) => Date.parse(t.inicio) > t0)

  return (
    <section aria-label="Agenda" className="overflow-hidden rounded-grande bg-superficie ring-1 ring-linea">
      <ol className="divide-y divide-linea">
        {turnos.map((t, i) => {
          const inicio = Date.parse(t.inicio)
          const fin = inicio + t.minutos * 60_000
          const enCurso = inicio <= t0 && t0 < fin && t.estado !== 'cancelado'
          const pasado = fin <= t0
          const recordatorio = t.estado !== 'cancelado' && !pasado && (t0 >= inicio - 24 * 3_600_000 || recordado.includes(t.id))
          const serv = n.servicios.find((s) => s.id === t.servicioId)
          const prof = n.staff.find((p) => p.id === t.profesionalId)
          return (
            <motion.li
              key={t.id}
              layout
              initial={t.id === resaltado ? { backgroundColor: 'var(--t-acento-suave)' } : false}
              animate={{ backgroundColor: 'rgba(0,0,0,0)' }}
              transition={{ duration: 3 }}
              className={cn('relative flex items-center gap-3 px-4 py-3', t.estado === 'cancelado' && 'opacity-55')}
            >
              {i === indiceAhora && (
                <div className="absolute inset-x-0 -top-px flex items-center" aria-label={`Ahora, ${horaCorta(ahora)}`}>
                  <span className="size-2.5 -translate-x-1 rounded-full bg-peligro" />
                  <span className="h-0.5 flex-1 bg-peligro" />
                </div>
              )}
              <div className="w-14 shrink-0">
                <p className={cn('num font-bold', enCurso && 'text-acento-texto')}>{horaCorta(t.inicio)}</p>
                <p className="text-xs text-suave">{t.minutos} min</p>
              </div>
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-superficie-2 text-xs font-bold" aria-hidden>
                {iniciales(t.clienteNombre)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 font-semibold">
                  <span className={cn(t.estado === 'cancelado' && 'line-through')}>{t.clienteNombre}</span>
                  {t.propio && <span className="rounded-full bg-acento px-2 py-0.5 text-[10px] font-extrabold uppercase text-sobre-acento">App</span>}
                </p>
                <p className="truncate text-sm text-suave">
                  {serv?.nombre} · {prof?.nombre}
                  {t.senaPagada > 0 && ` · seña ${precio(t.senaPagada)}`}
                </p>
                {recordatorio && t.estado === 'pendiente' && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-suave">
                    <BellRing className="size-3" aria-hidden />
                    Recordatorio enviado · esperando respuesta
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {(enCurso || (pasado && (t.estado === 'pendiente' || t.estado === 'confirmado'))) ? (
                  <>
                    <button type="button" onClick={() => cambiarEstado(n.slug, t.id, 'asistio')} className="grid size-10 place-items-center rounded-full bg-exito/15 text-exito" aria-label={`${t.clienteNombre} vino`}>
                      <Check className="size-5" aria-hidden />
                    </button>
                    <button type="button" onClick={() => cambiarEstado(n.slug, t.id, 'falto')} className="grid size-10 place-items-center rounded-full bg-peligro/12 text-peligro" aria-label={`${t.clienteNombre} no vino`}>
                      <UserX className="size-5" aria-hidden />
                    </button>
                  </>
                ) : !pasado && t.estado === 'pendiente' && !recordatorio ? (
                  <button
                    type="button"
                    onClick={() => setRecordado((r) => [...r, t.id])}
                    className="inline-flex h-9 items-center gap-1 rounded-full bg-wa/15 px-3 text-xs font-bold text-exito"
                  >
                    <MessageCircle className="size-3.5" aria-hidden />
                    Recordar
                  </button>
                ) : (
                  <InsigniaEstado estado={t.estado} />
                )}
              </div>
            </motion.li>
          )
        })}
      </ol>
    </section>
  )
}

function Recuperar({ n, e, ahora }: { n: Negocio; e: EstadoNegocio; ahora: Date }) {
  const marcar = useDemo((s) => s.marcarRecuperado)
  const [abierto, setAbierto] = useState<EstadoNegocio['dormidos'][number]>()
  const pendientes = e.dormidos.filter((c) => !e.recuperados.includes(c.tel))

  return (
    <section aria-labelledby="t-rec" className="rounded-grande bg-superficie p-4 ring-1 ring-linea">
      <h2 id="t-rec" className="titulo text-base">
        {capitalizar(n.textos.clientes)} para recuperar
      </h2>
      <p className="text-sm text-suave">No vienen hace más de {n.recuperarDias} días. Un mensaje y vuelven.</p>
      <ul className="mt-3 flex flex-col gap-1">
        <AnimatePresence initial={false}>
          {pendientes.slice(0, 5).map((c) => {
            const dias = Math.round((ahora.getTime() - Date.parse(c.ultimaVisita)) / 86_400_000)
            return (
              <motion.li key={c.tel} layout exit={{ opacity: 0, x: 40 }} className="flex items-center gap-3 rounded-medio py-2">
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-superficie-2 text-xs font-bold" aria-hidden>
                  {iniciales(c.nombre)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.nombre}</p>
                  <p className="truncate text-xs text-suave">
                    Hace {dias} días · {c.visitas} visitas · {c.servicioHabitual}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAbierto(c)}
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-wa/15 text-exito"
                  aria-label={`Escribirle a ${c.nombre}`}
                >
                  <MessageCircle className="size-5" aria-hidden />
                </button>
              </motion.li>
            )
          })}
        </AnimatePresence>
        {pendientes.length === 0 && <li className="py-3 text-sm font-semibold text-exito">¡Les escribiste a todos!</li>}
      </ul>

      <Hoja abierta={!!abierto} onCerrar={() => setAbierto(undefined)} titulo={`Mensaje a ${abierto?.nombre ?? ''}`} descripcion="Así le llega por WhatsApp">
        {abierto && (
          <div className="flex flex-col gap-4 pb-2">
            <div className="rounded-grande bg-[#efeae2] p-4">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3.5 py-2.5 text-[15px] text-[#111b21] shadow-sm">
                {textoMensaje(n, n.mensajes.recuperar, null, abierto.nombre, ahora)}
                <span className="mt-1 flex items-center justify-end gap-1 text-[11px] text-black/45">
                  {horaCorta(ahora)}
                  <CheckCheck className="size-3.5 text-[#53bdeb]" aria-label="Leído" />
                </span>
              </div>
            </div>
            <Boton
              variante="wa"
              tamano="grande"
              onClick={() => {
                marcar(n.slug, abierto.tel)
                setAbierto(undefined)
              }}
            >
              <MessageCircle className="size-5" aria-hidden />
              Enviar por WhatsApp
            </Boton>
            <Boton variante="secundario" onClick={() => setAbierto(undefined)}>
              <X className="size-4" aria-hidden />
              Ahora no
            </Boton>
            <p className="flex items-center justify-center gap-1 text-center text-xs text-suave">
              <ExternalLink className="size-3" aria-hidden />
              En la versión real sale automático desde el WhatsApp del negocio.
            </p>
          </div>
        )}
      </Hoja>
    </section>
  )
}
