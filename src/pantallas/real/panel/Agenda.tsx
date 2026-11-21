// Agenda del día: el resumen como el pie de un ticket, el almanaque (día grande y pestañas de días),
// el filtro por profesional y la libreta con los turnos y bloqueos. Se actualiza sola cuando cambia un turno
// (useTurnosEnVivo en PanelReal).
import { CalendarPlus, CalendarSearch, ChartColumn, Check, ChevronLeft, ChevronRight, Lock, Phone, UserX, X } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  cambiarEstadoTurno,
  rangoDia,
  useAgenda,
  useBloqueos,
  useHorarios,
  useProfesionales,
  useRefrescar,
  useResumen,
  type TurnoPanel,
} from '@/datos/real/panel'
import { telefonoLegible } from '@/datos/real/cliente-telefono'
import { capitalizar, claveDia, diaLargo, diaSemana, enHora, horaCorta, mesCorto, minutosDe, nombreDia, numeroDia, precio, sumarDias } from '@/dominio/tiempo'
import type { EstadoTurno } from '@/dominio/tipos'
import { Boton } from '@/ui/Boton'
import { Hoja } from '@/ui/Hoja'
import { InsigniaEstado } from '@/ui/Insignia'
import { Pastillas } from '@/ui/Pastillas'
import { Talon } from '@/ui/Talon'
import { cn } from '@/ui/cn'
import { HojaBloqueo } from './Bloqueos'
import { BotonConfirmar, Cargando, ErrorEnLinea, FalloCarga, RAYADO, Vacio, hhmm, useAccion, usePanel } from './comunes'
import { armarLibreta, type Columna } from './renglones'
import { Libreta } from './Libreta'
import { HistorialMensajes } from './Mensajes'
import { HojaTurnoManual } from './TurnoManual'

export function Agenda() {
  const { esDueno, acceso } = usePanel()
  if (!esDueno && !acceso.profesionalId)
    return <Vacio>Todavía no tenés una agenda asignada en este negocio. Pedile al dueño que te vincule a tu ficha de profesional.</Vacio>
  return <AgendaDia />
}

const leerReloj = () => ({ dia: claveDia(new Date()), minuto: minutosDe(horaCorta(new Date())) })

/** Minuto del día en la Argentina, que avanza solo (para la línea de "ahora"). */
function useMinutoActual() {
  const [ahora, setAhora] = useState(leerReloj)
  useEffect(() => {
    const id = setInterval(() => setAhora(leerReloj()), 30_000)
    return () => clearInterval(id)
  }, [])
  return ahora
}

const consultaCompu = '(min-width: 1024px)'
/** ¿Pantalla de compu? (para repartir la libreta en una columna por profesional) */
function useEsCompu() {
  return useSyncExternalStore(
    (avisar) => {
      const m = matchMedia(consultaCompu)
      m.addEventListener('change', avisar)
      return () => m.removeEventListener('change', avisar)
    },
    () => matchMedia(consultaCompu).matches,
    () => false,
  )
}

type Hoja = { tipo: 'turno'; hora?: string; profesionalId?: string | null } | { tipo: 'bloqueo' } | null

function AgendaDia() {
  const { n, negocioId, esDueno, acceso } = usePanel()
  const reloj = useMinutoActual()
  const hoy = reloj.dia
  // El día va en el link (?dia=AAAA-MM-DD): así el aviso de turno nuevo puede abrir la agenda en ese día.
  const [params, setParams] = useSearchParams()
  const pedido = params.get('dia')
  const dia = pedido && /^\d{4}-\d{2}-\d{2}$/.test(pedido) ? pedido : hoy
  const setDia = (d: string) => setParams(d === hoy ? {} : { dia: d }, { replace: true })
  const [filtro, setFiltro] = useState<string | null>(null)
  const [hoja, setHoja] = useState<Hoja>(null)
  const [elegido, setElegido] = useState<string | null>(null)
  const esCompu = useEsCompu()

  const profFiltro = esDueno ? filtro : acceso.profesionalId
  const profs = useProfesionales(negocioId)
  const horarios = useHorarios(negocioId)
  const agenda = useAgenda(negocioId, dia, profFiltro)
  const resumen = useResumen(negocioId, dia, profFiltro)
  const { desde, hasta } = rangoDia(dia)
  const bloqueos = useBloqueos(negocioId, desde, hasta)

  const activos = (profs.data ?? []).filter((p) => p.activo)
  const turnos = agenda.data ?? []
  // Profesionales que se ven: el elegido, o los activos (más alguno inactivo que todavía tenga turnos ese día).
  const visibles = profFiltro
    ? (profs.data ?? []).filter((p) => p.id === profFiltro)
    : (profs.data ?? []).filter((p) => p.activo || turnos.some((t) => t.profesionalId === p.id))
  const idsVisibles = profFiltro ? [profFiltro] : visibles.map((p) => p.id)
  // En compu y con "Todos", una columna por profesional; si no, todos en una.
  const multi = esCompu && !profFiltro && visibles.length > 1
  const columnas: Columna[] = multi ? visibles.map((p) => ({ id: p.id, nombre: p.nombre })) : [{ id: null, nombre: '' }]

  /** Franjas de atención de un día de la semana, de los profesionales que se muestran. */
  const franjasDe = (d: string) => {
    const dds = diaSemana(enHora(d, '12:00'))
    return (horarios.data ?? [])
      .filter((h) => h.dia === dds && idsVisibles.includes(h.profesional_id))
      .map((h) => ({ desde: minutosDe(hhmm(h.desde)), hasta: minutosDe(hhmm(h.hasta)) }))
  }
  const bloqueosVisibles = (bloqueos.data ?? []).filter((b) => b.profesionalId === null || idsVisibles.includes(b.profesionalId))
  const renglones = armarLibreta({ dia, hoy, ahora: reloj.minuto, turnos, bloqueos: bloqueosVisibles, columnas, franjas: franjasDe(dia) })
  const turnoElegido = turnos.find((t) => t.id === elegido)
  const minutoPasado = dia < hoy ? 24 * 60 : dia === hoy ? reloj.minuto : -1

  return (
    <div className="flex flex-col gap-5">
      {/* Arriba, una sola pregunta: ¿qué tengo y quién sigue? Las cifras del mes viven en Reportes. */}
      <Almanaque dia={dia} hoy={hoy} onDia={setDia} cerrado={(d) => !!horarios.data && franjasDe(d).length === 0} />

      <DelDia dia={dia} hoy={hoy} r={resumen.data} turnos={turnos} minuto={reloj.minuto} onAbrir={setElegido} conProfesional={esDueno && !profFiltro} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {esDueno && activos.length > 1 ? (
          <Pastillas
            etiqueta="Filtrar por profesional"
            ocultarEtiqueta
            valor={filtro ?? 'todos'}
            opciones={[
              { id: 'todos', texto: 'Todos' },
              ...activos.map((p) => ({ id: p.id, texto: p.id === acceso.profesionalId ? `${p.nombre} (vos)` : p.nombre })),
            ]}
            onCambiar={(v) => setFiltro(v === 'todos' ? null : v)}
          />
        ) : (
          <span className="hidden lg:block" />
        )}
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Boton onClick={() => setHoja({ tipo: 'turno' })}>
            <CalendarPlus className="size-5" aria-hidden />
            Cargar turno
          </Boton>
          <Boton variante="secundario" onClick={() => setHoja({ tipo: 'bloqueo' })}>
            <Lock className="size-4" aria-hidden />
            Bloquear
          </Boton>
          {!esDueno && (
            <Link
              to={`/${n.slug}/panel/reportes`}
              className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-medio px-5 text-[15px] font-semibold text-acento-texto hover:bg-acento-suave sm:col-span-1"
            >
              <ChartColumn className="size-4" aria-hidden />
              Mis números
            </Link>
          )}
        </div>
      </div>

      {agenda.isPending || horarios.isPending ? (
        <Cargando texto="Cargando la agenda" />
      ) : agenda.isError ? (
        <FalloCarga error={agenda.error} onReintentar={() => void agenda.refetch()} />
      ) : !renglones ? (
        <Vacio>No hay turnos este día. Según los horarios, no se atiende: si querés, igual podés cargar un turno.</Vacio>
      ) : (
        <Libreta
          renglones={renglones}
          columnas={columnas}
          conProfesional={esDueno && !profFiltro && !multi && visibles.length > 1}
          minutoPasado={minutoPasado}
          vacia={turnos.length === 0 && bloqueosVisibles.length === 0}
          onAbrir={setElegido}
          onAnotar={(hora, profesionalId) => setHoja({ tipo: 'turno', hora, profesionalId })}
        />
      )}

      <HojaTurnoManual
        abierta={hoja?.tipo === 'turno'}
        onCerrar={() => setHoja(null)}
        diaInicial={dia}
        horaInicial={hoja?.tipo === 'turno' ? hoja.hora : undefined}
        profesionalInicial={(hoja?.tipo === 'turno' ? hoja.profesionalId : null) ?? profFiltro}
      />
      <HojaBloqueo abierta={hoja?.tipo === 'bloqueo'} onCerrar={() => setHoja(null)} diaInicial={dia} />
      <Hoja abierta={!!turnoElegido} onCerrar={() => setElegido(null)} titulo={turnoElegido ? `Turno de ${turnoElegido.clienteNombre}` : 'Turno'}>
        {turnoElegido && <DetalleTurno key={turnoElegido.id} t={turnoElegido} onListo={() => setElegido(null)} />}
      </Hoja>
    </div>
  )
}

/**
 * Lo del día, en una línea: cuántos turnos y cuántos confirmados (con una raya de avance), y si es hoy, quién sigue,
 * grande y tocable (abre el turno). Es lo que el dueño mira entre cliente y cliente: nada más arriba de la libreta.
 */
function DelDia({
  dia,
  hoy,
  r,
  turnos,
  minuto,
  onAbrir,
  conProfesional,
}: {
  dia: string
  hoy: string
  r?: { turnosDia: number; confirmados: number }
  turnos: TurnoPanel[]
  minuto: number
  onAbrir: (id: string) => void
  conProfesional: boolean
}) {
  const vigentes = turnos.filter((t) => t.estado !== 'cancelado').toSorted((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))
  // El que está ahora (empezó y no terminó) o, si no hay, el próximo.
  const sigue =
    dia === hoy
      ? vigentes.find((t) => minutosDe(horaCorta(t.fin)) > minuto && t.estado !== 'asistio' && t.estado !== 'falto')
      : undefined
  const falta = sigue ? minutosDe(horaCorta(sigue.inicio)) - minuto : 0
  const parte = r && r.turnosDia ? r.confirmados / r.turnosDia : 0
  return (
    <section aria-label="Resumen del día" className="flex flex-col gap-3">
      {sigue && (
        <button
          type="button"
          onClick={() => onAbrir(sigue.id)}
          className="flex items-center gap-4 rounded-medio bg-superficie px-4 py-3 text-left ring-1 ring-linea transition-colors hover:ring-suave/60"
        >
          <span className="rotulo shrink-0 text-acento-texto">{falta <= 0 ? 'Ahora' : 'Sigue'}</span>
          <span className="cifra shrink-0 text-[2rem]">{horaCorta(sigue.inicio)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{sigue.clienteNombre}</span>
            <span className="block truncate text-sm text-suave">
              {sigue.servicioNombre}
              {conProfesional && ` · ${sigue.profesionalNombre}`}
            </span>
          </span>
          {falta > 0 && <span className="rotulo hidden shrink-0 text-suave sm:block">{falta < 60 ? `en ${falta} min` : `en ${Math.floor(falta / 60)} h ${falta % 60 ? `${falta % 60} min` : ''}`}</span>}
        </button>
      )}
      <p className="flex items-center gap-3 text-sm text-suave">
        <span className="shrink-0">
          <b className="mono text-texto">{r ? r.turnosDia : '–'}</b> {r?.turnosDia === 1 ? 'turno' : 'turnos'}
          {' · '}
          <b className="mono text-texto">{r ? r.confirmados : '–'}</b> {r?.confirmados === 1 ? 'confirmado' : 'confirmados'}
        </span>
        <span aria-hidden className="h-[3px] min-w-8 flex-1 rounded-full bg-superficie-2">
          <span className="block h-full rounded-full bg-exito" style={{ width: `${Math.round(parte * 100)}%` }} />
        </span>
      </p>
    </section>
  )
}

/**
 * El almanaque: el día elegido grande (como la hoja del taco) con flechas, y abajo las pestañas de los próximos días,
 * como el canto de una agenda. Los días que no se atiende se ven tachados.
 */
function Almanaque({ dia, hoy, onDia, cerrado }: { dia: string; hoy: string; onDia: (d: string) => void; cerrado: (d: string) => boolean }) {
  const dias = Array.from({ length: 14 }, (_, i) => sumarDias(hoy, i - 1))
  const f = `${dia}T12:00:00-03:00`
  const fuera = !dias.includes(dia)
  const [lista, setLista] = useState<HTMLElement | null>(null)
  useEffect(() => {
    lista?.querySelector(`[data-dia="${dia}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [dia, lista])
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onDia(sumarDias(dia, -1))} className="-ml-2 grid size-11 place-items-center rounded-full hover:bg-superficie" aria-label="Día anterior">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          {/* El día en palabras, una sola vez (la tira de abajo ya muestra los números). */}
          <p aria-live="polite" className="titulo px-1 text-xl sm:text-2xl">
            {capitalizar(diaLargo(f))}
            {dia === hoy && <span className="rotulo ml-2 align-middle text-acento-texto">Hoy</span>}
          </p>
          <button type="button" onClick={() => onDia(sumarDias(dia, 1))} className="grid size-11 place-items-center rounded-full hover:bg-superficie" aria-label="Día siguiente">
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
        {dia !== hoy && (
          <Boton variante="secundario" tamano="chico" onClick={() => onDia(hoy)}>
            Volver a hoy
          </Boton>
        )}
      </div>
      <nav aria-label="Elegir día" ref={setLista} className="sin-barra -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max border-b-2 border-texto">
          {dias.map((d) => {
            const fd = `${d}T12:00:00-03:00`
            const activo = d === dia
            const sinAtencion = cerrado(d)
            return (
              <button
                key={d}
                type="button"
                data-dia={d}
                aria-pressed={activo}
                aria-label={`${capitalizar(diaLargo(fd))}${sinAtencion ? ', no se atiende' : ''}`}
                onClick={() => onDia(d)}
                className={cn(
                  'relative flex h-16 w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-t-chico transition-colors',
                  activo ? 'bg-texto text-fondo' : 'hover:bg-superficie',
                  !activo && sinAtencion && cn('text-suave', RAYADO),
                )}
              >
                <span className={cn('rotulo leading-none', !activo && 'text-suave', d === hoy && !activo && 'text-acento-texto')}>{d === hoy ? 'Hoy' : nombreDia(fd)}</span>
                <span className={cn('cifra text-[1.5rem]', !activo && sinAtencion && 'bg-fondo px-1')}>{numeroDia(fd)}</span>
              </button>
            )
          })}
          {/* La última pestaña abre el calendario para ir a cualquier fecha (el campo de fecha va encima, transparente). */}
          <label
            className={cn(
              'sticky right-0 ml-auto flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-t-chico border-l border-linea transition-colors focus-within:outline-2 focus-within:outline-acento',
              fuera ? 'bg-texto text-fondo' : 'bg-fondo text-suave hover:bg-superficie hover:text-texto',
            )}
          >
            {fuera ? (
              <>
                <span className="rotulo leading-none">{mesCorto(f)}</span>
                <span className="cifra text-[1.5rem]">{numeroDia(f)}</span>
              </>
            ) : (
              <>
                <CalendarSearch className="size-5" aria-hidden />
                <span className="rotulo leading-none">Otra</span>
              </>
            )}
            <input
              type="date"
              aria-label="Ir a una fecha"
              value={dia}
              onChange={(e) => e.target.value && onDia(e.target.value)}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker()
                } catch {
                  // Sin showPicker (navegadores viejos): el campo igual se puede usar con el teclado.
                }
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
      </nav>
    </div>
  )
}

const numeroDeTalon = (id: string) => id.replace(/-/g, '').slice(0, 4).toUpperCase()

/** El detalle del turno como su talón: arriba la hora grande y el sello; abajo del corte, los datos. Debajo, las acciones. */
function DetalleTurno({ t, onListo }: { t: TurnoPanel; onListo: () => void }) {
  const { negocioId } = usePanel()
  const refrescar = useRefrescar(negocioId)
  const accion = useAccion()
  const [hecho, setHecho] = useState<EstadoTurno | null>(null)

  const cambiar = (estado: EstadoTurno) => {
    setHecho(estado)
    void accion
      .correr(async () => {
        await cambiarEstadoTurno(t.id, estado)
        await refrescar('turnos')
      })
      .then((listo) => listo && onListo())
  }
  const activo = t.estado === 'pendiente' || t.estado === 'confirmado'
  const [ahora] = useState(() => Date.now())
  const yaEmpezo = Date.parse(t.inicio) <= ahora

  return (
    <div className="flex flex-col gap-4 pb-2">
      <Talon
        as="div"
        cuerpo={
          <div className="px-4 pt-3.5 pb-5">
            <p className="flex items-center justify-between gap-3">
              <span className="rotulo text-suave">{capitalizar(diaLargo(t.inicio))}</span>
              <span className="rotulo shrink-0 text-suave">
                N.º <span className="text-texto">{numeroDeTalon(t.id)}</span>
              </span>
            </p>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="cifra text-[4rem]">{horaCorta(t.inicio)}</span>
              <span className="mono text-sm text-suave">a {horaCorta(t.fin)}</span>
            </p>
          </div>
        }
        sello={<InsigniaEstado estado={t.estado} className="bg-superficie/85 text-sm" />}
        talon={
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 pt-7 pb-4 text-[15px]">
            <Dato titulo="Servicio">
              {t.servicioNombre}
              {t.precio > 0 && <span className="mono block text-sm font-normal text-suave">{precio(t.precio)}</span>}
            </Dato>
            <Dato titulo="Profesional">{t.profesionalNombre}</Dato>
            <Dato titulo="Seña">{t.sena > 0 ? <span className="mono">{precio(t.sena)}</span> : 'Sin seña'}</Dato>
            <Dato titulo="Origen">{t.origen === 'app' ? 'Lo sacó desde la app' : 'Cargado a mano'}</Dato>
            {t.clienteTelefono && (
              <Dato titulo="Teléfono" ancho>
                <a className="mono inline-flex min-h-11 items-center gap-2 text-acento-texto underline underline-offset-4" href={`tel:${t.clienteTelefono.replace(/[^\d+]/g, '')}`}>
                  <Phone className="size-4" aria-hidden />
                  {telefonoLegible(t.clienteTelefono)}
                </a>
              </Dato>
            )}
            {t.notas && (
              <Dato titulo="Notas" ancho>
                <span className="font-normal">{t.notas}</span>
              </Dato>
            )}
          </dl>
        }
      />

      {activo && (
        // Marcar si vino es poner el sello: botones con forma de sello (el texto es el del estado que queda).
        <div className="grid grid-cols-2 gap-2">
          <BotonSello tono="exito" cargando={accion.ocupado && hecho === 'asistio'} onClick={() => cambiar('asistio')}>
            <Check className="size-5" aria-hidden />
            Vino
          </BotonSello>
          <BotonSello tono="peligro" cargando={accion.ocupado && hecho === 'falto'} onClick={() => cambiar('falto')}>
            <UserX className="size-5" aria-hidden />
            No vino
          </BotonSello>
          {t.estado === 'pendiente' && !yaEmpezo && (
            <Boton className="col-span-2" cargando={accion.ocupado && hecho === 'confirmado'} onClick={() => cambiar('confirmado')}>
              Confirmar turno
            </Boton>
          )}
        </div>
      )}
      {(t.estado === 'asistio' || t.estado === 'falto') && (
        <Boton variante="secundario" cargando={accion.ocupado} onClick={() => cambiar('confirmado')}>
          <X className="size-4" aria-hidden />
          Deshacer (volver a confirmado)
        </Boton>
      )}
      {t.estado === 'cancelado' && (
        <Boton variante="secundario" cargando={accion.ocupado} onClick={() => cambiar('confirmado')}>
          Reactivar turno
        </Boton>
      )}
      {activo && <BotonConfirmar ancho texto="Cancelar turno" confirmar="Sí, cancelar" cargando={accion.ocupado && hecho === 'cancelado'} onConfirmar={() => cambiar('cancelado')} />}
      <ErrorEnLinea texto={accion.error} />
      <HistorialMensajes turnoId={t.id} />
    </div>
  )
}

function BotonSello({ tono, cargando, onClick, children }: { tono: 'exito' | 'peligro'; cargando: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Boton
      variante="secundario"
      cargando={cargando}
      onClick={onClick}
      className={cn(
        'mono min-h-14 rounded-chico bg-transparent tracking-[0.06em] uppercase ring-2 hover:bg-transparent',
        tono === 'exito' ? 'text-exito ring-exito/70 hover:ring-exito' : 'text-peligro ring-peligro/70 hover:ring-peligro',
      )}
    >
      {children}
    </Boton>
  )
}

function Dato({ titulo, ancho, children }: { titulo: string; ancho?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn('min-w-0', ancho && 'col-span-2')}>
      <dt className="rotulo text-suave">{titulo}</dt>
      <dd className="mt-0.5 font-semibold">{children}</dd>
    </div>
  )
}
