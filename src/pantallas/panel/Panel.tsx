import { AnimatePresence, motion } from 'motion/react'
import { BellRing, Check, CheckCheck, CircleDashed, ExternalLink, MessageCircle, Smartphone, Sparkles, UserX, X } from 'lucide-react'
import { lazy, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useAhora, useDemo, useEstadoNegocio, textoMensaje, type EstadoNegocio } from '@/datos/demo'
import { useEnVivo } from '@/datos/envivo'
import { useSala } from '@/datos/sala'
import { useNegocio } from '@/datos/negocios'
import { capitalizar, claveDia, diaLargo, diaRelativo, horaCorta, nombreDia, numeroDia, precio, precioCorto, sumarDias } from '@/dominio/tiempo'
import type { EstadoTurno, Negocio, Turno } from '@/dominio/tipos'
import { useTemaNegocio } from '@/tema/TemaNegocio'
import { Boton } from '@/ui/Boton'
import { Hoja } from '@/ui/Hoja'
import { Etiqueta, InsigniaEstado } from '@/ui/Insignia'
import { Logo, iniciales } from '@/ui/Logo'
import { Pastillas } from '@/ui/Pastillas'
import { Talon } from '@/ui/Talon'
import { Tarjeta } from '@/ui/Tarjeta'
import { cn } from '@/ui/cn'
import { Cargando, NoEncontrado } from '../NoEncontrado'
import { Calculadora } from './Calculadora'

// Negocio real (no demo): panel conectado a la base, con login (fase 2).
const PanelReal = lazy(() => import('../real/panel/PanelReal'))

export default function Panel() {
  const { slug } = useParams()
  const { negocio: n, meta, cargando } = useNegocio(slug)
  useTemaNegocio(n, n ? `${n.nombre} · Panel` : undefined)
  if (cargando) return <Cargando />
  if (!n) return <NoEncontrado />
  if (!meta.esDemo && meta.id) return <PanelReal n={n} meta={{ ...meta, id: meta.id }} />
  return <PanelNegocio key={n.slug} n={n} />
}

const ocupa = (t: Turno) => t.estado !== 'cancelado'

function PanelNegocio({ n }: { n: Negocio }) {
  const e = useEstadoNegocio(n)
  useEnVivo(n, useSala(n.slug))
  const ahora = useAhora()
  const [params] = useSearchParams()
  const embebido = params.has('embebido')
  const hoy = claveDia(ahora)
  const [dia, setDia] = useState(hoy)
  const [filtro, setFiltro] = useState<string>('todos')
  const nuevo = useTurnoNuevo(e)

  const delDia = e.turnos
    .filter((t) => claveDia(t.inicio) === dia && (filtro === 'todos' || t.profesionalId === filtro))
    .toSorted((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))
  const activos = delDia.filter(ocupa)
  const confirmados = activos.filter((t) => t.estado === 'confirmado' || t.estado === 'asistio').length
  const senas = activos.reduce((s, t) => s + t.senaPagada, 0)
  const facturacion = activos.reduce((s, t) => s + (n.servicios.find((x) => x.id === t.servicioId)?.precio ?? 0), 0)

  return (
    <div className={cn('relative mx-auto min-h-dvh max-w-6xl px-4 pb-16 sm:px-6', embebido ? 'pt-2' : 'pt-segura')}>
      {/* Cuaderno: cuadrícula arriba que se desvanece. Decorativa. */}
      <div aria-hidden className="cuadricula pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <header className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-texto py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Logo negocio={n} className="size-11 shrink-0 rounded-chico text-sm" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl leading-tight sm:text-3xl">{n.nombre}</h1>
            <p className="rotulo mt-0.5 text-suave">Panel del dueño · {diaLargo(ahora)}</p>
          </div>
        </div>
        {!embebido && (
          <Link
            to={`/${n.slug}`}
            className="inline-flex h-11 items-center gap-2 rounded-medio px-3.5 text-sm font-semibold ring-1 ring-inset ring-linea transition-colors hover:bg-superficie"
          >
            <Smartphone className="size-4" aria-hidden />
            Ver como {n.textos.cliente}
          </Link>
        )}
      </header>

      <div aria-live="polite">
        <AnimatePresence>
          {nuevo && (
            // Lo que llega desde la app sale como un ticket de la impresora del mostrador.
            <motion.div key={nuevo.id} exit={{ opacity: 0, y: -8 }} className="imprimir mt-4">
              <Talon
                as="div"
                papel="acento"
                cuerpo={
                  <div className="flex items-start gap-3 px-4 py-3.5">
                    <Sparkles className="mt-0.5 size-5 shrink-0" aria-hidden />
                    <p className="text-[15px]">
                      <b>Nuevo turno desde la app:</b> {nuevo.clienteNombre} · {capitalizar(diaRelativo(nuevo.inicio, ahora))}{' '}
                      <span className="mono font-bold">{horaCorta(nuevo.inicio)}</span> · {n.servicios.find((s) => s.id === nuevo.servicioId)?.nombre}
                      {nuevo.senaPagada ? ` · seña ${precio(nuevo.senaPagada)} cobrada` : ''}
                    </p>
                  </div>
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* Almanaque de la semana: cada día una hoja; la elegida, entintada. */}
          <nav aria-label="Elegir día" className="sin-barra -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i - 1)).map((d) => {
              const f = `${d}T12:00:00-03:00`
              const activo = d === dia
              const cuantos = e.turnos.filter((t) => claveDia(t.inicio) === d && ocupa(t)).length
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={activo}
                  aria-label={`${capitalizar(diaRelativo(f, ahora))}, ${cuantos} turnos`}
                  onClick={() => setDia(d)}
                  className={cn(
                    'flex h-20 min-w-20 flex-1 shrink-0 flex-col items-center overflow-hidden rounded-medio ring-inset transition-colors',
                    activo ? 'bg-acento text-sobre-acento' : 'bg-superficie ring-1 ring-linea hover:ring-acento-borde',
                  )}
                >
                  <span className={cn('rotulo w-full py-1 text-center', activo ? 'bg-sobre-acento/15' : 'border-b border-linea text-suave')}>
                    {d === hoy ? 'Hoy' : nombreDia(f)}
                  </span>
                  <span className="cifra grid flex-1 place-items-center text-3xl">{numeroDia(f)}</span>
                  <span aria-hidden className={cn('mono mb-1.5 text-xs', activo ? 'opacity-80' : 'text-suave')}>{cuantos} turnos</span>
                </button>
              )
            })}
          </nav>

          {/* Números del día como una planilla: celdas separadas por líneas finas. */}
          <section aria-label="Resumen del día" className="grid grid-cols-2 gap-px overflow-hidden rounded-grande bg-linea ring-1 ring-linea sm:grid-cols-4">
            <Kpi titulo={dia === hoy ? 'Turnos hoy' : 'Turnos'} valor={String(activos.length)} />
            <Kpi titulo="Confirmados" valor={`${confirmados}/${activos.length}`} barra={activos.length ? confirmados / activos.length : 0} />
            <Kpi titulo="Señas cobradas" valor={precioCorto(senas)} />
            <Kpi titulo="Facturación estimada" valor={precioCorto(facturacion)} />
          </section>

          <section aria-labelledby="t-agenda" className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 border-b-2 border-texto pb-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
              <h2 id="t-agenda" className="titulo text-xl">
                Agenda · {capitalizar(diaRelativo(`${dia}T12:00:00-03:00`, ahora))}
              </h2>
              <Pastillas
                etiqueta="Filtrar por profesional"
                ocultarEtiqueta
                valor={filtro}
                opciones={[{ id: 'todos', texto: 'Todos' }, ...n.staff.map((p) => ({ id: p.id, texto: p.nombre }))]}
                onCambiar={setFiltro}
                className="sm:pb-0.5"
              />
            </div>
            <Agenda n={n} turnos={delDia} ahora={ahora} resaltado={nuevo?.id} />
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <Recuperar n={n} e={e} ahora={ahora} />
          <Calculadora n={n} />
        </aside>
      </div>
    </div>
  )
}

function Kpi({ titulo, valor, barra }: { titulo: string; valor: string; barra?: number }) {
  return (
    <div className="relative flex flex-col justify-between bg-fondo p-4">
      <p className="rotulo text-suave">{titulo}</p>
      <p className="cifra mt-3 text-[2.5rem]">{valor}</p>
      {barra !== undefined && (
        <div className="absolute inset-x-4 bottom-2.5 h-[3px] bg-linea" aria-hidden>
          <motion.div className="h-full bg-exito" initial={{ width: 0 }} animate={{ width: `${Math.round(barra * 100)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
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
      const reciente = e.turnos.find((t) => (t.propio || t.deLaApp) && !conocidos.current!.has(t.id))
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

/** Estado del turno dicho en voz baja (letra de ticket), para la lista: los sellos quedan para lo que cambia. */
const ESTADO_QUIETO: Record<EstadoTurno, { texto: string; clase: string; Icono: typeof Check }> = {
  confirmado: { texto: 'Confirmado', clase: 'text-exito', Icono: Check },
  pendiente: { texto: 'Sin confirmar', clase: 'text-aviso', Icono: CircleDashed },
  cancelado: { texto: 'Cancelado', clase: 'text-peligro', Icono: X },
  asistio: { texto: 'Vino', clase: 'text-suave', Icono: CheckCheck },
  falto: { texto: 'No vino', clase: 'text-peligro', Icono: UserX },
}

function EstadoQuieto({ estado }: { estado: EstadoTurno }) {
  const { texto, clase, Icono } = ESTADO_QUIETO[estado]
  return (
    <span className={cn('rotulo inline-flex items-center gap-1.5', clase)}>
      <Icono className="size-3.5" aria-hidden />
      {texto}
    </span>
  )
}

function Agenda({ n, turnos, ahora, resaltado }: { n: Negocio; turnos: Turno[]; ahora: Date; resaltado?: string }) {
  const cambiarEstado = useDemo((s) => s.cambiarEstado)
  const [recordado, setRecordado] = useState<string[]>([])

  if (!turnos.length) {
    return <p className="cuadricula rounded-grande border border-dashed border-linea p-8 text-center text-suave">No hay turnos este día.</p>
  }

  const t0 = ahora.getTime()
  const indiceAhora = turnos.findIndex((t) => Date.parse(t.inicio) > t0)

  return (
    <ol aria-label="Agenda" className="divide-y divide-linea border-b border-linea">
      {turnos.map((t, i) => (
        <FilaAgenda
          key={t.id}
          n={n}
          t={t}
          ahora={ahora}
          resaltado={t.id === resaltado}
          lineaAhora={i === indiceAhora}
          recordado={recordado.includes(t.id)}
          onRecordar={() => setRecordado((r) => [...r, t.id])}
          onEstado={(estado) => cambiarEstado(n.slug, t.id, estado)}
        />
      ))}
    </ol>
  )
}

/**
 * Un renglón de la agenda de papel: la hora grande en el margen, el cliente y lo que se hace.
 * Si el estado cambia mientras se mira (el cliente tocó "Confirmo" en su WhatsApp), cae el sello con el golpe.
 */
function FilaAgenda({
  n,
  t,
  ahora,
  resaltado,
  lineaAhora,
  recordado,
  onRecordar,
  onEstado,
}: {
  n: Negocio
  t: Turno
  ahora: Date
  resaltado: boolean
  lineaAhora: boolean
  recordado: boolean
  onRecordar: () => void
  onEstado: (e: EstadoTurno) => void
}) {
  const [estadoInicial] = useState(t.estado)
  const cambio = t.estado !== estadoInicial
  const t0 = ahora.getTime()
  const inicio = Date.parse(t.inicio)
  const fin = inicio + t.minutos * 60_000
  const enCurso = inicio <= t0 && t0 < fin && t.estado !== 'cancelado'
  const pasado = fin <= t0
  const recordatorio = t.estado !== 'cancelado' && !pasado && (t0 >= inicio - 24 * 3_600_000 || recordado)
  const serv = n.servicios.find((s) => s.id === t.servicioId)
  const prof = n.staff.find((p) => p.id === t.profesionalId)
  const marcar = enCurso || (pasado && (t.estado === 'pendiente' || t.estado === 'confirmado'))

  return (
    <motion.li
      layout
      initial={resaltado ? { backgroundColor: 'var(--t-acento-suave)' } : false}
      animate={{ backgroundColor: 'rgba(0,0,0,0)' }}
      transition={{ duration: 3 }}
      className={cn('relative grid grid-cols-[4.75rem_minmax(0,1fr)_auto] items-center gap-x-3 py-3 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:gap-x-4', t.estado === 'cancelado' && 'opacity-55')}
    >
      {lineaAhora && (
        // La línea de "ahora", como una raya de birome roja sobre la agenda.
        <div className="absolute inset-x-0 -top-px flex items-center" aria-label={`Ahora, ${horaCorta(ahora)}`}>
          <span className="h-0.5 flex-1 bg-peligro" />
          <span className="rotulo rounded-chico bg-peligro px-1.5 text-fondo">{horaCorta(ahora)}</span>
        </div>
      )}
      <div className={cn('border-r border-linea pr-3', enCurso && 'border-acento')}>
        <p className={cn('cifra text-[1.5rem] sm:text-[2.125rem]', enCurso && 'text-acento-texto')}>{horaCorta(t.inicio)}</p>
        <p className="mono mt-1 text-xs whitespace-nowrap text-suave">{t.minutos} min</p>
      </div>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
          <span className={cn('truncate', t.estado === 'cancelado' && 'line-through')}>{t.clienteNombre}</span>
          {(t.propio || t.deLaApp) && <Etiqueta>App</Etiqueta>}
        </p>
        <p className="truncate text-sm text-suave">
          {serv?.nombre} · {prof?.nombre}
          {t.senaPagada > 0 && (
            <>
              {' · seña '}
              <span className="mono text-[0.8125rem]">{precio(t.senaPagada)}</span>
            </>
          )}
        </p>
        {recordatorio && t.estado === 'pendiente' && (
          <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-suave">
            <BellRing className="size-3" aria-hidden />
            Recordatorio enviado · esperando respuesta
          </p>
        )}
        {/* En el celular, el estado va abajo del nombre (a la derecha quedan los botones). */}
        {marcar && <p className="mt-1 sm:hidden"><EstadoQuieto estado={t.estado} /></p>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {marcar ? (
          <>
            <span className="hidden sm:inline-flex"><EstadoQuieto estado={t.estado} /></span>
            <button type="button" onClick={() => onEstado('asistio')} className="grid size-11 place-items-center rounded-full text-exito ring-1 ring-inset ring-exito/40 transition-colors hover:bg-exito/10" aria-label={`${t.clienteNombre} vino`}>
              <Check className="size-5" aria-hidden />
            </button>
            <button type="button" onClick={() => onEstado('falto')} className="grid size-11 place-items-center rounded-full text-peligro ring-1 ring-inset ring-peligro/40 transition-colors hover:bg-peligro/10" aria-label={`${t.clienteNombre} no vino`}>
              <UserX className="size-5" aria-hidden />
            </button>
          </>
        ) : cambio ? (
          <InsigniaEstado key={t.estado} estado={t.estado} animar />
        ) : !pasado && t.estado === 'pendiente' && !recordatorio ? (
          <button
            type="button"
            onClick={onRecordar}
            className="inline-flex h-11 items-center gap-1.5 rounded-medio px-3 text-sm font-bold text-exito ring-1 ring-inset ring-exito/40 transition-colors hover:bg-exito/10"
          >
            <MessageCircle className="size-4" aria-hidden />
            Recordar
          </button>
        ) : (
          <EstadoQuieto estado={t.estado} />
        )}
      </div>
    </motion.li>
  )
}

function Recuperar({ n, e, ahora }: { n: Negocio; e: EstadoNegocio; ahora: Date }) {
  const marcar = useDemo((s) => s.marcarRecuperado)
  const [abierto, setAbierto] = useState<EstadoNegocio['dormidos'][number]>()
  const pendientes = e.dormidos.filter((c) => !e.recuperados.includes(c.tel))

  return (
    <Tarjeta nivel={2} titulo={`${capitalizar(n.textos.clientes)} para recuperar`} bajada={`No vienen hace más de ${n.recuperarDias} días. Un mensaje y vuelven.`}>
      <ul className="-my-2 flex flex-col divide-y divide-linea">
        <AnimatePresence initial={false}>
          {pendientes.slice(0, 5).map((c) => {
            const dias = Math.round((ahora.getTime() - Date.parse(c.ultimaVisita)) / 86_400_000)
            return (
              <motion.li key={c.tel} layout exit={{ opacity: 0, x: 40 }} className="flex items-center gap-3 py-2.5">
                <div className="mono grid size-9 shrink-0 place-items-center rounded-full bg-superficie-2 text-xs font-bold" aria-hidden>
                  {iniciales(c.nombre)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.nombre}</p>
                  <p className="truncate text-xs text-suave">
                    Hace <span className="mono">{dias}</span> días · <span className="mono">{c.visitas}</span> visitas · {c.servicioHabitual}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAbierto(c)}
                  className="grid size-11 shrink-0 place-items-center rounded-full text-exito ring-1 ring-inset ring-exito/40 transition-colors hover:bg-exito/10"
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
            {/* Se ve como WhatsApp a propósito. */}
            <div className="rounded-medio bg-wa-chat p-4">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-wa-burbuja px-3.5 py-2.5 text-[15px] text-wa-texto shadow-sm">
                {textoMensaje(n, n.mensajes.recuperar, null, abierto.nombre, ahora)}
                <span className="mt-1 flex items-center justify-end gap-1 text-xs text-wa-hora">
                  {horaCorta(ahora)}
                  <CheckCheck className="size-3.5 text-wa-tilde" aria-label="Leído" />
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
    </Tarjeta>
  )
}
