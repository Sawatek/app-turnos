// Fase 2: panel del dueño y del profesional para un negocio REAL (conectado a la base).
//   · Ingreso con mail y contraseña → se aceptan las invitaciones pendientes → rol en ESTE negocio.
//   · Dueño (o SawaTek): agenda, clientes, servicios, equipo, horarios y ajustes.
//   · Profesional: solo su agenda (y sus bloqueos).
// Los permisos los hace cumplir la base; acá solo se muestra lo que corresponde a cada rol.
import { CalendarDays, Clock, LogOut, Scissors, Settings, Smartphone, UserRound, Users, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAcceso, useTurnosEnVivo } from '@/datos/real/panel'
import { salir, useSesion } from '@/datos/sesion'
import { supabase } from '@/datos/supabase'
import { capitalizar, diaLargo } from '@/dominio/tiempo'
import type { Negocio } from '@/dominio/tipos'
import { Boton } from '@/ui/Boton'
import { Logo } from '@/ui/Logo'
import { cn } from '@/ui/cn'
import { Cargando } from '../../NoEncontrado'
import type { PropsNegocioReal } from '../tipos'
import { Agenda } from './Agenda'
import { Ajustes } from './Ajustes'
import { Clientes } from './Clientes'
import { ErrorEnLinea, ProveedorPanel, usePanel, type CtxPanel } from './comunes'
import { Equipo } from './Equipo'
import { Horarios } from './Horarios'
import { Ingreso } from './Ingreso'
import { Servicios } from './Servicios'

type IdSeccion = 'agenda' | 'clientes' | 'servicios' | 'equipo' | 'horarios' | 'ajustes'

const SECCIONES: { id: IdSeccion; texto: string; Icono: LucideIcon }[] = [
  { id: 'agenda', texto: 'Agenda', Icono: CalendarDays },
  { id: 'clientes', texto: 'Clientes', Icono: UserRound },
  { id: 'servicios', texto: 'Servicios', Icono: Scissors },
  { id: 'equipo', texto: 'Equipo', Icono: Users },
  { id: 'horarios', texto: 'Horarios', Icono: Clock },
  { id: 'ajustes', texto: 'Ajustes', Icono: Settings },
]

export default function PanelReal({ n, meta }: PropsNegocioReal) {
  const sesion = useSesion()
  if (!supabase) {
    return (
      <Aviso titulo="El panel no está conectado" texto="Esta instalación no tiene configurada la base de datos, así que no se puede abrir el panel del negocio." />
    )
  }
  if (sesion === undefined) return <Cargando />
  if (!sesion) return <Ingreso n={n} />
  return <ConSesion key={sesion.user.id} n={n} negocioId={meta.id} userId={sesion.user.id} email={sesion.user.email ?? ''} />
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

function ConSesion({ n, negocioId, userId, email }: { n: Negocio; negocioId: string; userId: string; email: string }) {
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
  if (!a.rol)
    return (
      <Aviso titulo="No tenés acceso a este negocio" texto={`Entraste como ${email}, pero esa cuenta no es parte del equipo de ${n.nombre}. Si te invitaron, pedí que te inviten con este mail.`}>
        <Boton className="mt-2" onClick={() => void salir()}>
          <LogOut className="size-4" aria-hidden />
          Salir
        </Boton>
      </Aviso>
    )
  const ctx: CtxPanel = { n, negocioId, acceso: { ...a, rol: a.rol }, esDueno: a.rol === 'dueno' }
  return (
    <ProveedorPanel value={ctx}>
      <Estructura email={email} />
    </ProveedorPanel>
  )
}

function Estructura({ email }: { email: string }) {
  const { seccion } = useParams()
  const { n, negocioId, esDueno, acceso } = usePanel()
  const [hoy] = useState(() => capitalizar(diaLargo(new Date())))
  useTurnosEnVivo(negocioId)
  const visibles = esDueno ? SECCIONES : SECCIONES.filter((s) => s.id === 'agenda')
  const actual: IdSeccion = visibles.some((s) => s.id === seccion) ? (seccion as IdSeccion) : 'agenda'
  const rolTexto = acceso.superadmin ? 'SawaTek (como dueño)' : esDueno ? 'Dueño' : 'Profesional'

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      {/* Navegación lateral (compu) */}
      {visibles.length > 1 && (
        <aside className="hidden border-r border-linea lg:block">
          <div className="sticky top-0 flex h-dvh flex-col gap-6 p-4">
            <div className="flex items-center gap-3 px-1 pt-2">
              <Logo negocio={n} className="size-10 text-sm" />
              <p className="titulo truncate text-base">{n.nombre}</p>
            </div>
            <Navegacion visibles={visibles} actual={actual} slug={n.slug} lateral />
          </div>
        </aside>
      )}

      <div className={cn('mx-auto w-full max-w-5xl px-4 pt-segura sm:px-6', visibles.length > 1 ? 'pb-28 lg:pb-12' : 'pb-12')}>
        <header className="flex items-center justify-between gap-3 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Logo negocio={n} className={cn('size-11 text-sm', visibles.length > 1 && 'lg:hidden')} />
            <div className="min-w-0">
              <h1 className="truncate text-xl leading-tight">{esDueno ? n.nombre : 'Tu agenda'}</h1>
              <p className="truncate text-sm text-suave">
                {rolTexto} · {hoy}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/${n.slug}`}
              className="hidden h-11 items-center gap-2 rounded-medio bg-superficie px-3.5 text-sm font-semibold ring-1 ring-linea sm:inline-flex"
            >
              <Smartphone className="size-4" aria-hidden />
              Ver la app
            </Link>
            <Boton variante="secundario" tamano="chico" className="h-11" onClick={() => void salir()} title={`Salir (${email})`}>
              <LogOut className="size-4" aria-hidden />
              Salir
            </Boton>
          </div>
        </header>

        <main>
          {actual === 'agenda' && <Agenda />}
          {actual === 'clientes' && <Clientes />}
          {actual === 'servicios' && <Servicios />}
          {actual === 'equipo' && <Equipo />}
          {actual === 'horarios' && <Horarios />}
          {actual === 'ajustes' && <Ajustes />}
        </main>
      </div>

      {/* Barra inferior (celular) */}
      {visibles.length > 1 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-fondo/95 pb-segura backdrop-blur lg:hidden">
          <Navegacion visibles={visibles} actual={actual} slug={n.slug} />
        </div>
      )}
    </div>
  )
}

function Navegacion({ visibles, actual, slug, lateral }: { visibles: typeof SECCIONES; actual: IdSeccion; slug: string; lateral?: boolean }) {
  return (
    <nav aria-label="Secciones del panel">
      <ul className={lateral ? 'flex flex-col gap-1' : 'mx-auto grid max-w-lg grid-cols-6'}>
        {visibles.map(({ id, texto, Icono }) => {
          const activo = id === actual
          return (
            <li key={id}>
              <Link
                to={id === 'agenda' ? `/${slug}/panel` : `/${slug}/panel/${id}`}
                aria-current={activo ? 'page' : undefined}
                className={cn(
                  'flex items-center font-semibold transition-colors',
                  lateral
                    ? cn('h-11 gap-3 rounded-medio px-3 text-[15px]', activo ? 'bg-acento-suave text-acento-texto' : 'text-suave hover:bg-superficie hover:text-texto')
                    : cn('h-15 flex-col justify-center gap-1 text-[11px]', activo ? 'text-acento-texto' : 'text-suave'),
                )}
              >
                <Icono className={lateral ? 'size-5' : 'size-5.5'} aria-hidden />
                {texto}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
