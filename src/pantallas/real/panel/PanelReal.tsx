// Fase 2: panel del dueño y del profesional para un negocio REAL (conectado a la base).
//   · Ingreso con mail y contraseña → se aceptan las invitaciones pendientes → rol en ESTE negocio.
//   · Dueño (o SawaTek): agenda, clientes (y para recuperar), reportes, servicios, equipo, horarios, marca y ajustes.
//   · Profesional: su agenda (y sus bloqueos) y sus números.
//   · Aviso en vivo cuando entra un turno nuevo (salvo los que cargó el propio usuario).
// Los permisos los hace cumplir la base; acá solo se muestra lo que corresponde a cada rol.
import { ArrowLeft, CalendarDays, ChartColumn, Clock, LogOut, Palette, Scissors, Settings, Smartphone, UserRound, Users, type LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAcceso, useTurnosEnVivo, type TurnoPanel } from '@/datos/real/panel'
import { nombreDeUsuario, salir, useSesion } from '@/datos/sesion'
import { supabase } from '@/datos/supabase'
import { capitalizar, diaLargo } from '@/dominio/tiempo'
import type { Negocio } from '@/dominio/tipos'
import { Boton } from '@/ui/Boton'
import { Logo } from '@/ui/Logo'
import { cn } from '@/ui/cn'
import { BotonMiCuenta, PedirNombre } from './MiCuenta'
import { Cargando } from '../../NoEncontrado'
import type { PropsNegocioReal } from '../tipos'
import { Agenda } from './Agenda'
import { AvisosEnVivo } from './AvisoEnVivo'
import { Ajustes } from './Ajustes'
import { Clientes } from './Clientes'
import { ErrorEnLinea, ProveedorPanel, usePanel, type CtxPanel } from './comunes'
import { Equipo } from './Equipo'
import { Horarios } from './Horarios'
import { Ingreso } from './Ingreso'
import { PagoPendiente } from './PagoPendiente'
import { Marca } from './Marca'
import { Reportes } from './Reportes'
import { Servicios } from './Servicios'

type IdSeccion = 'agenda' | 'clientes' | 'reportes' | 'servicios' | 'equipo' | 'horarios' | 'marca' | 'ajustes'

const SECCIONES: { id: IdSeccion; texto: string; Icono: LucideIcon }[] = [
  { id: 'agenda', texto: 'Agenda', Icono: CalendarDays },
  { id: 'clientes', texto: 'Clientes', Icono: UserRound },
  { id: 'reportes', texto: 'Reportes', Icono: ChartColumn },
  { id: 'servicios', texto: 'Servicios', Icono: Scissors },
  { id: 'equipo', texto: 'Equipo', Icono: Users },
  { id: 'horarios', texto: 'Horarios', Icono: Clock },
  { id: 'marca', texto: 'Marca', Icono: Palette },
  { id: 'ajustes', texto: 'Ajustes', Icono: Settings },
]
/** El profesional no tiene navegación: entra a su agenda y, desde ahí, a sus números. */
const DEL_PROFESIONAL: IdSeccion[] = ['agenda', 'reportes']

export default function PanelReal({ n, meta }: PropsNegocioReal) {
  const sesion = useSesion()
  if (!supabase) {
    return (
      <Aviso titulo="El panel no está conectado" texto="Esta instalación no tiene configurada la base de datos, así que no se puede abrir el panel del negocio." />
    )
  }
  if (sesion === undefined) return <Cargando />
  if (!sesion) return <Ingreso n={n} />
  return (
    <ConSesion
      key={sesion.user.id}
      n={n}
      negocioId={meta.id}
      userId={sesion.user.id}
      email={sesion.user.email ?? ''}
      nombre={nombreDeUsuario(sesion.user)}
    />
  )
}

function Aviso({ titulo, texto, children }: { titulo: string; texto: string; children?: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl">{titulo}</h1>
      <p className="text-suave">{texto}</p>
      {children}
    </main>
  )
}

function ConSesion({ n, negocioId, userId, email, nombre }: { n: Negocio; negocioId: string; userId: string; email: string; nombre: string | null }) {
  const acceso = useAcceso(negocioId, userId)
  if (acceso.isPending) return <Cargando />
  if (acceso.isError)
    return (
      <Aviso titulo="No pudimos abrir el panel" texto="Revisá tu conexión y probá de nuevo.">
        <ErrorEnLinea texto={acceso.error.message} />
        <div className="mt-2 flex gap-2">
          <Boton onClick={() => void acceso.refetch()}>Reintentar</Boton>
          <Boton variante="secundario" onClick={() => void salir()}>
            Salir
          </Boton>
        </div>
      </Aviso>
    )
  const a = acceso.data
  if (a.bloqueado) return <PagoPendiente n={n} rol={a.bloqueado} email={email} />
  if (!a.rol)
    return (
      <Aviso titulo="No tenés acceso a este negocio" texto={`Entraste como ${email}, pero esa cuenta no es parte del equipo de ${n.nombre}. Si te invitaron, pedí que te inviten con este mail.`}>
        <Boton className="mt-2" onClick={() => void salir()}>
          <LogOut className="size-4" aria-hidden />
          Salir
        </Boton>
      </Aviso>
    )
  const ctx: CtxPanel = { n, negocioId, acceso: { ...a, rol: a.rol }, esDueno: a.rol === 'dueno', userId, nombre }
  return (
    <ProveedorPanel value={ctx}>
      <Estructura email={email} nombre={nombre} />
    </ProveedorPanel>
  )
}

function Estructura({ email, nombre }: { email: string; nombre: string | null }) {
  const { seccion } = useParams()
  const { n, negocioId, esDueno, acceso, userId } = usePanel()
  const [hoy] = useState(() => capitalizar(diaLargo(new Date())))
  const [nuevos, setNuevos] = useState<TurnoPanel[]>([])
  useTurnosEnVivo(negocioId, userId, (t) => setNuevos((l) => [t, ...l.filter((x) => x.id !== t.id)].slice(0, 3)))
  const visibles = esDueno ? SECCIONES : SECCIONES.filter((s) => s.id === 'agenda')
  const permitidas = esDueno ? SECCIONES.map((s) => s.id) : DEL_PROFESIONAL
  const actual: IdSeccion = permitidas.includes(seccion as IdSeccion) ? (seccion as IdSeccion) : 'agenda'
  const rolTexto = acceso.superadmin ? 'SawaTek (como dueño)' : esDueno ? 'Dueño' : 'Profesional'
  const conNavegacion = visibles.length > 1
  // Alto del encabezado fijo: lo que se pega arriba al bajar (ej.: los nombres de la libreta) va justo debajo.
  const [altoEncabezado, setAltoEncabezado] = useState(0)
  const medirEncabezado = (el: HTMLElement | null) => {
    if (!el) return
    const obs = new ResizeObserver(() => setAltoEncabezado(el.offsetHeight))
    obs.observe(el)
    return () => obs.disconnect()
  }

  return (
    <div
      className={cn('min-h-dvh', conNavegacion && 'lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]')}
      style={{ '--alto-encabezado': `${altoEncabezado}px` } as React.CSSProperties}
    >
      {/* Compu: el índice de una carpeta de archivo. Cartón (superficie) con pestañas numeradas;
          la sección actual es la pestaña que se mete en la hoja (mismo fondo que la página, sin el borde de por medio). */}
      {conNavegacion && (
        <aside className="hidden border-r border-linea bg-superficie lg:block">
          <div className="sticky top-0 flex h-dvh flex-col gap-8 py-6 pl-5">
            <div className="flex items-center gap-3 pr-5">
              <Logo negocio={n} className="size-10 rounded-chico text-sm" />
              <p className="rotulo leading-tight text-suave">
                Panel
                <br />
                del negocio
              </p>
            </div>
            <Navegacion visibles={visibles} actual={actual} slug={n.slug} lateral />
            <Link
              to={`/${n.slug}`}
              className="mt-auto mr-5 inline-flex min-h-11 items-center gap-2 border-t border-linea pt-4 text-sm font-semibold text-suave transition-colors hover:text-texto"
            >
              <Smartphone className="size-4" aria-hidden />
              Ver la app de {n.textos.clientes || 'clientes'}
            </Link>
          </div>
        </aside>
      )}

      <div className="relative min-w-0">
        {/* Hoja cuadriculada arriba, que se desvanece (decorativa). */}
        <div aria-hidden className="cuadricula pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <header ref={medirEncabezado} className="sticky top-0 z-30 border-b border-linea bg-fondo/92 pt-segura backdrop-blur-lg">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pb-3 sm:px-6 lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <Logo negocio={n} className={cn('size-10 rounded-chico text-sm', conNavegacion && 'lg:hidden')} />
              <div className="min-w-0">
                <h1 className="truncate text-xl leading-tight sm:text-2xl">{esDueno ? n.nombre : 'Tu agenda'}</h1>
                <p className="truncate text-sm text-suave">
                  {nombre ? `Hola, ${nombre.split(' ')[0]} · ` : ''}
                  {rolTexto} · {hoy}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                to={`/${n.slug}`}
                className={cn(
                  'hidden min-h-11 items-center gap-2 rounded-medio px-3.5 text-sm font-semibold ring-1 ring-inset ring-linea transition-colors hover:bg-superficie-2 sm:inline-flex',
                  conNavegacion && 'lg:hidden',
                )}
              >
                <Smartphone className="size-4" aria-hidden />
                Ver la app
              </Link>
              <BotonMiCuenta nombre={nombre} email={email} rol={rolTexto} />
            </div>
          </div>
        </header>

        <div className={cn('mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6 lg:px-10 lg:pt-8', conNavegacion ? 'pb-32 lg:pb-16' : 'pb-16')}>
          {!nombre && <PedirNombre />}

          {!esDueno && actual === 'reportes' && (
            <Link to={`/${n.slug}/panel`} className="mb-3 -ml-1 inline-flex h-11 items-center gap-2 rounded-medio px-1 text-sm font-semibold text-acento-texto">
              <ArrowLeft className="size-4" aria-hidden />
              Volver a la agenda
            </Link>
          )}

          <main>
            {actual === 'agenda' && <Agenda />}
            {actual === 'clientes' && <Clientes />}
            {actual === 'reportes' && <Reportes />}
            {actual === 'servicios' && <Servicios />}
            {actual === 'equipo' && <Equipo />}
            {actual === 'horarios' && <Horarios />}
            {actual === 'marca' && <Marca />}
            {actual === 'ajustes' && <Ajustes />}
          </main>
        </div>
      </div>

      <AvisosEnVivo turnos={nuevos} onCerrar={(id) => setNuevos((l) => l.filter((x) => x.id !== id))} />

      {/* Celular: la barra de abajo es una regla (marcas de milímetros arriba) y la sección actual lleva la marca de tinta. */}
      {conNavegacion && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-fondo/95 pb-segura backdrop-blur-xl lg:hidden">
          <Navegacion visibles={visibles} actual={actual} slug={n.slug} />
        </div>
      )}
    </div>
  )
}

/** Marcas de regla: una chica cada 8 px y una larga cada 40 px (decorativas, con los tokens del tema). */
const REGLA: React.CSSProperties = {
  backgroundImage: 'linear-gradient(to right, var(--t-linea) 1px, transparent 1px), linear-gradient(to right, var(--t-suave) 1px, transparent 1px)',
  backgroundSize: '8px 5px, 40px 9px',
  backgroundRepeat: 'repeat-x',
  backgroundPosition: '4px 0, 4px 0',
}

function Navegacion({ visibles, actual, slug, lateral }: { visibles: typeof SECCIONES; actual: IdSeccion; slug: string; lateral?: boolean }) {
  // En el celular la barra se desliza de costado: la sección actual siempre queda a la vista.
  const lista = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (lateral) return
    lista.current?.querySelector(`[data-seccion="${actual}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [actual, lateral])
  const link = (id: IdSeccion) => (id === 'agenda' ? `/${slug}/panel` : `/${slug}/panel/${id}`)

  if (lateral)
    return (
      <nav aria-label="Secciones del panel" className="-mr-px">
        {/* El número de cada pestaña sale de un contador de CSS: no es parte del nombre del link. */}
        <ul className="flex flex-col gap-0.5 [counter-reset:seccion]">
          {visibles.map(({ id, texto }) => {
            const activo = id === actual
            return (
              <li key={id} className="[counter-increment:seccion]">
                <Link
                  to={link(id)}
                  aria-current={activo ? 'page' : undefined}
                  className={cn(
                    'mono relative flex h-12 items-center gap-3 rounded-l-medio pr-4 pl-4 text-[0.8125rem] font-semibold tracking-[0.06em] uppercase transition-colors',
                    'before:w-5 before:text-[0.75rem] before:font-medium before:content-[counter(seccion,decimal-leading-zero)]',
                    activo
                      ? 'border-y border-l border-linea bg-fondo text-texto before:text-acento-texto'
                      : 'text-suave before:text-suave/70 hover:bg-fondo/50 hover:text-texto',
                  )}
                >
                  {activo && <span aria-hidden className="absolute inset-y-2.5 left-0 w-[3px] rounded-r-full bg-acento" />}
                  {texto}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    )

  return (
    <nav aria-label="Secciones del panel">
      <ul ref={lista} style={REGLA} className="sin-barra mx-auto flex max-w-2xl snap-x overflow-x-auto pt-1.5">
        {visibles.map(({ id, texto, Icono }) => {
          const activo = id === actual
          return (
            <li key={id} className="min-w-[4.5rem] flex-1 snap-start">
              <Link
                to={link(id)}
                aria-current={activo ? 'page' : undefined}
                data-seccion={id}
                className={cn(
                  'relative flex h-15 flex-col items-center justify-center gap-1 text-xs font-bold transition-colors',
                  activo ? 'text-texto' : 'text-suave hover:text-texto',
                )}
              >
                {activo && (
                  <motion.span
                    layoutId="seccion-activa-panel"
                    aria-hidden
                    className="absolute -top-1.5 h-[3px] w-9 rounded-b-full bg-acento"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <Icono className="size-5" aria-hidden />
                {texto}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
