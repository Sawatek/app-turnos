// Consola de plataforma de SawaTek (/admin y /admin/:seccion). Solo para super admins.
//   · Resumen: métricas de toda la plataforma.
//   · Negocios: los reales, con su ficha (estado, plan, notas, marca, equipo, invitaciones, borrar).
//   · Demos: alta de demos de venta en 1 minuto y la lista de las creadas.
//   · Alta real: alta de un negocio real con la plantilla del rubro.
//   · Cuentas: crear cuentas con contraseña sin depender del mail, y resetearlas.
//   · Mensajes: registro de la cola (nunca muestra los códigos de ingreso).
// Sin Supabase configurado, solo queda el alta de demos (se guardan en este navegador).
import { BarChart3, Building2, LogOut, MailCheck, MessagesSquare, Sparkles, Store, Users, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useEsSuperadmin } from '@/datos/admin'
import { entrarConContrasena, nombreDeUsuario, pedirLinkDeIngreso, salir, useSesion } from '@/datos/sesion'
import { hayNube } from '@/datos/supabase'
import { useTemaNegocio } from '@/tema/TemaNegocio'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { Logo } from '@/ui/Logo'
import { Pastillas } from '@/ui/Pastillas'
import { cn } from '@/ui/cn'
import { Alta } from './Alta'
import { Cargando, ErrorEnLinea } from './comunes'
import { Cuentas } from './Cuentas'
import { Mensajes } from './Mensajes'
import { Negocios } from './Negocios'
import { Resumen } from './Resumen'

const PANEL = { nombre: 'SawaTek', color: '#e0b352', modo: 'oscuro', personalidad: 'moderna' } as const

type IdSeccion = 'resumen' | 'negocios' | 'demos' | 'nuevo' | 'cuentas' | 'mensajes'

const SECCIONES: { id: IdSeccion; texto: string; corto: string; titulo: string; bajada: string; Icono: LucideIcon }[] = [
  { id: 'resumen', texto: 'Resumen', corto: 'Resumen', titulo: 'Resumen', bajada: 'Cómo viene la plataforma este mes.', Icono: BarChart3 },
  { id: 'negocios', texto: 'Negocios', corto: 'Negocios', titulo: 'Negocios', bajada: 'Los negocios reales: estado, plan, marca y equipo.', Icono: Building2 },
  { id: 'demos', texto: 'Demos', corto: 'Demos', titulo: 'Nueva demo', bajada: 'En un minuto, la app del negocio con su marca.', Icono: Sparkles },
  { id: 'nuevo', texto: 'Nuevo negocio real', corto: 'Alta real', titulo: 'Nuevo negocio real', bajada: 'Con turnos, clientes y panel de verdad.', Icono: Store },
  { id: 'cuentas', texto: 'Cuentas', corto: 'Cuentas', titulo: 'Cuentas', bajada: 'Dueños y equipo: crear cuentas y resetear contraseñas.', Icono: Users },
  { id: 'mensajes', texto: 'Mensajes', corto: 'Mensajes', titulo: 'Mensajes', bajada: 'Todo lo que salió (o tiene que salir) por WhatsApp y push.', Icono: MessagesSquare },
]

export default function Admin() {
  useTemaNegocio(PANEL, 'SawaTek · Consola')
  const sesion = useSesion()
  if (!hayNube) return <Estructura secciones={SECCIONES.filter((s) => s.id === 'demos')} />
  if (sesion === undefined) return null
  if (!sesion) return <Ingreso />
  return <ConSesion key={sesion.user.id} userId={sesion.user.id} email={sesion.user.email ?? ''} nombre={nombreDeUsuario(sesion.user)} />
}

function ConSesion({ userId, email, nombre }: { userId: string; email: string; nombre: string | null }) {
  const sa = useEsSuperadmin(userId)
  if (sa.isPending) return <Cargando />
  if (sa.isError || !sa.data)
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-5 text-center">
        <h1 className="text-2xl">Esta cuenta no es de SawaTek</h1>
        <p className="text-suave">Entraste como {email}. La consola es solo para el equipo de SawaTek. Si tenés un negocio, entrá a su panel.</p>
        {sa.isError && <ErrorEnLinea texto="No pudimos verificar tu cuenta. Revisá tu conexión." className="justify-center" />}
        <Boton onClick={() => void salir()}>
          <LogOut className="size-4" aria-hidden />
          Salir
        </Boton>
      </main>
    )
  return <Estructura secciones={SECCIONES} email={email} nombre={nombre} />
}

function Estructura({ secciones, email, nombre }: { secciones: typeof SECCIONES; email?: string; nombre?: string | null }) {
  const { seccion } = useParams()
  const actual = secciones.find((s) => s.id === seccion) ?? secciones[0]!
  const conNav = secciones.length > 1

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      {conNav && (
        <aside className="hidden border-r border-linea bg-superficie/40 lg:block">
          <div className="sticky top-0 flex h-dvh flex-col gap-8 px-4 py-5">
            <div className="flex items-center gap-3 px-1">
              <Logo negocio={PANEL} className="size-10 rounded-chico text-sm" />
              <div className="min-w-0">
                <p className="titulo truncate text-lg leading-tight">SawaTek</p>
                <p className="rotulo text-suave">Consola</p>
              </div>
            </div>
            <Navegacion secciones={secciones} actual={actual.id} lateral />
          </div>
        </aside>
      )}

      <div className={cn('mx-auto w-full max-w-6xl px-4 pt-segura sm:px-6', conNav ? 'pb-28 lg:pb-12' : 'pb-16')}>
        <header className="mt-5 mb-6 flex items-end gap-3 border-b-2 border-texto pb-3">
          {!conNav && <Logo negocio={PANEL} className="size-11 shrink-0 rounded-chico text-sm" />}
          <div className="mr-auto min-w-0">
            <p className="rotulo text-suave">Consola de SawaTek</p>
            <h1 className="mt-1 truncate text-3xl">{actual.titulo}</h1>
            <p className="mt-0.5 text-sm text-suave">{actual.bajada}</p>
          </div>
          {email && (
            <button
              type="button"
              onClick={() => void salir()}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-medio px-3.5 text-sm font-semibold ring-1 ring-inset ring-linea transition-colors hover:bg-superficie-2"
              title={`Salir (${email})`}
              aria-label={`Salir (${email})`}
            >
              <LogOut className="size-4" aria-hidden />
              <span className="hidden sm:inline">{nombre ?? email}</span>
            </button>
          )}
        </header>

        <main>
          {actual.id === 'resumen' && <Resumen />}
          {actual.id === 'negocios' && <Negocios />}
          {actual.id === 'demos' && <Alta key="demo" tipo="demo" />}
          {actual.id === 'nuevo' && <Alta key="real" tipo="real" />}
          {actual.id === 'cuentas' && <Cuentas />}
          {actual.id === 'mensajes' && <Mensajes />}
        </main>
      </div>

      {conNav && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-fondo/95 pb-segura backdrop-blur lg:hidden">
          <Navegacion secciones={secciones} actual={actual.id} />
        </div>
      )}
    </div>
  )
}

function Navegacion({ secciones, actual, lateral }: { secciones: typeof SECCIONES; actual: IdSeccion; lateral?: boolean }) {
  return (
    <nav aria-label="Secciones de la consola">
      {lateral && <p className="rotulo mb-2 px-3 text-suave">Índice</p>}
      <ul className={lateral ? 'flex flex-col border-t border-linea' : 'mx-auto grid max-w-xl grid-cols-6'}>
        {secciones.map(({ id, texto, corto, Icono }, i) => {
          const activo = id === actual
          return (
            <li key={id} className={lateral ? 'border-b border-linea' : undefined}>
              <Link
                to={id === 'resumen' ? '/admin' : `/admin/${id}`}
                aria-current={activo ? 'page' : undefined}
                className={cn(
                  'relative flex items-center font-semibold transition-colors',
                  lateral
                    ? cn('h-12 gap-3 px-3 text-[15px] whitespace-nowrap', activo ? 'bg-acento-suave text-acento-texto' : 'text-suave hover:bg-superficie hover:text-texto')
                    : cn('h-15 flex-col justify-center gap-1 text-xs', activo ? 'text-acento-texto' : 'text-suave'),
                )}
              >
                {activo && (
                  <span aria-hidden className={cn('absolute bg-acento', lateral ? 'inset-y-0 left-0 w-[3px]' : '-top-px left-1/2 h-[3px] w-8 -translate-x-1/2')} />
                )}
                {lateral ? (
                  <span aria-hidden className="mono w-5 text-xs text-suave">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                ) : null}
                <Icono className={lateral ? 'size-4.5' : 'size-5.5'} aria-hidden />
                {lateral ? texto : corto}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

const MENSAJES_AUTH: Record<string, string> = {
  'Invalid login credentials': 'Mail o contraseña incorrectos.',
  'Email not confirmed': 'Tu usuario no está confirmado. Pedile a SawaTek que te cree la cuenta desde la consola.',
  'email rate limit exceeded': 'Se mandaron demasiados mails en la última hora. Probá en un rato o entrá con contraseña.',
}
const traducir = (msg: string) => MENSAJES_AUTH[msg] ?? msg

/**
 * Con Supabase, /admin pide ingresar. Por defecto con contraseña. El link al mail queda como alternativa:
 * el servicio de mails gratuito de Supabase manda muy pocos por hora.
 */
function Ingreso() {
  const [modo, setModo] = useState<'contrasena' | 'link'>('contrasena')
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [estado, setEstado] = useState<'inicio' | 'enviando' | 'enviado'>('inicio')
  const [error, setError] = useState<string>()
  const [errorMail, setErrorMail] = useState<string>()

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setError(undefined)
    setErrorMail(undefined)
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErrorMail('Escribí un mail válido.')
    if (modo === 'contrasena' && !contrasena) return setError('Escribí tu contraseña.')
    setEstado('enviando')
    try {
      if (modo === 'contrasena') {
        await entrarConContrasena(email, contrasena) // si sale bien, la sesión cambia y se muestra la consola
        return
      }
      await pedirLinkDeIngreso(email)
      setEstado('enviado')
    } catch (err) {
      setError(traducir((err as Error).message))
      setEstado('inicio')
    }
  }

  const cambiarModo = (m: typeof modo) => {
    setModo(m)
    setError(undefined)
    setErrorMail(undefined)
    setEstado('inicio')
  }

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-5">
      <div aria-hidden className="cuadricula pointer-events-none fixed inset-x-0 top-0 -z-10 h-96 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="border-b-2 border-texto pb-4">
        <Logo negocio={PANEL} className="size-12 rounded-chico text-base" />
        <p className="rotulo mt-5 text-acento-texto">SawaTek · Turnos</p>
        <h1 className="mt-1 text-4xl">Consola de SawaTek</h1>
        <p className="mt-2 text-suave">Ingresá con tu cuenta de SawaTek.</p>
      </div>

      <Pastillas
        etiqueta="Cómo querés entrar"
        ocultarEtiqueta
        valor={modo}
        opciones={[
          { id: 'contrasena', texto: 'Con contraseña' },
          { id: 'link', texto: 'Con link al mail' },
        ]}
        onCambiar={cambiarModo}
      />

      {estado === 'enviado' ? (
        <p aria-live="polite" className="flex items-start gap-3 border-l-2 border-exito py-1 pl-4">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-exito" aria-hidden />
          <span>
            Listo. Abrí el mail que te llegó a <b>{email}</b> y tocá el link. Si no lo ves, revisá spam.
          </span>
        </p>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
          <Campo etiqueta="Tu mail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} error={errorMail ?? (modo === 'link' ? error : undefined)} />
          {modo === 'contrasena' && (
            <Campo etiqueta="Contraseña" type="password" autoComplete="current-password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} error={error} />
          )}
          <Boton type="submit" tamano="grande" cargando={estado === 'enviando'}>
            {modo === 'contrasena' ? 'Entrar' : 'Mandarme el link'}
          </Boton>
          {modo === 'contrasena' && <p className="text-center text-sm text-suave">¿No tenés usuario o te olvidaste la contraseña? Pedíselo a otra persona de SawaTek.</p>}
        </form>
      )}
      <Link to="/demos" className="inline-flex h-11 items-center justify-center text-sm font-semibold text-acento-texto hover:underline">
        Volver a las demos
      </Link>
    </main>
  )
}
