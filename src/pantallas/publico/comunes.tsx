// Piezas compartidas del sitio público: tema de la marca, encabezado, pie y links con forma de botón.
import { Link } from 'react-router'
import { cn } from '@/ui/cn'
import { useTemaNegocio } from '@/tema/TemaNegocio'
import { CONTACTO, MARCA, linkContacto } from './marca'

/** Aplica la marca de la plataforma (colores, personalidad, título de la pestaña). */
export function useMarcaSitio(titulo?: string) {
  useTemaNegocio(MARCA, titulo ? `${titulo} · ${MARCA.nombre}` : `${MARCA.nombre} · ${MARCA.slogan}`)
}

const ESTILOS = {
  primario: 'bg-acento text-sobre-acento hover:brightness-110 sombra-suave',
  secundario: 'bg-superficie-2 text-texto ring-1 ring-linea hover:bg-linea/70',
  fantasma: 'text-acento-texto hover:bg-acento-suave',
} as const
const TAMANOS = { chico: 'h-11 px-4 text-sm', medio: 'h-12 px-5 text-[15px]', grande: 'h-14 px-6 text-base' } as const

interface PropsEnlace {
  href: string
  children: React.ReactNode
  variante?: keyof typeof ESTILOS
  tamano?: keyof typeof TAMANOS
  className?: string
  externo?: boolean
}

/** Link con forma de botón: interno (react-router) o externo (WhatsApp, mail). */
export function EnlaceBoton({ href, children, variante = 'primario', tamano = 'medio', className, externo }: PropsEnlace) {
  const clases = cn(
    'inline-flex select-none items-center justify-center gap-2 rounded-medio font-semibold transition-[filter,background-color] duration-200',
    ESTILOS[variante],
    TAMANOS[tamano],
    className,
  )
  if (externo || /^(https?:|mailto:)/.test(href)) {
    const nueva = href.startsWith('http')
    return (
      <a href={href} className={clases} {...(nueva ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    )
  }
  return (
    <Link to={href} className={clases}>
      {children}
    </Link>
  )
}

/** "Pedí tu demo": WhatsApp o mail si están cargados en marca.ts; si no, la lista de demos. */
export function CtaDemo({ tamano = 'medio', className, texto = 'Pedí tu demo' }: { tamano?: PropsEnlace['tamano']; className?: string; texto?: string }) {
  const { href, externo } = linkContacto()
  return (
    <EnlaceBoton href={href} externo={externo} tamano={tamano} className={className}>
      {texto}
    </EnlaceBoton>
  )
}

/** Isotipo + nombre de la plataforma. */
export function MarcaSitio({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('inline-flex min-h-11 items-center gap-2.5 rounded-chico font-bold tracking-tight', className)}>
      <img src="/icono.svg" alt="" width={32} height={32} className="size-8 rounded-[9px]" />
      <span className="text-[17px]">{MARCA.nombre}</span>
    </Link>
  )
}

/** Link "saltar al contenido" para teclado y lectores de pantalla. */
export function SaltarAlContenido() {
  return (
    <a
      href="#contenido"
      className="sr-only rounded-medio bg-acento px-4 py-3 font-semibold text-sobre-acento focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
    >
      Saltar al contenido
    </a>
  )
}

const ANIO = new Date().getFullYear()

const NAV = [
  { href: '#como-funciona', texto: 'Cómo funciona' },
  { href: '#funciones', texto: 'Funciones' },
  { href: '#rubros', texto: 'Rubros' },
  { href: '#precios', texto: 'Precios' },
  { href: '#preguntas', texto: 'Preguntas' },
]

/** Barra superior fija. En la landing muestra las secciones; en las otras páginas, solo marca y CTA. */
export function Encabezado({ secciones = false }: { secciones?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-linea/70 bg-fondo/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <MarcaSitio />
        {secciones && (
          <nav aria-label="Secciones" className="hidden lg:block">
            <ul className="flex items-center gap-1 text-sm font-semibold text-suave">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a href={n.href} className="inline-flex h-11 items-center rounded-chico px-3 transition-colors hover:text-texto">
                    {n.texto}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <CtaDemo tamano="chico" />
      </div>
    </header>
  )
}

/** Pie con legales, demos y acceso para negocios. */
export function Pie() {
  const dominio = typeof window === 'undefined' ? '' : window.location.host
  return (
    <footer className="border-t border-linea bg-superficie/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 pb-[max(3rem,env(safe-area-inset-bottom))] sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <MarcaSitio />
          <p className="mt-2 max-w-xs text-sm text-suave">{MARCA.slogan}. Hecho en Argentina para negocios que viven de sus turnos.</p>
        </div>

        <nav aria-labelledby="pie-producto">
          <h2 id="pie-producto" className="text-sm font-bold">Producto</h2>
          <ul className="mt-2 text-sm text-suave">
            <li><Link to="/demos" className="inline-flex min-h-11 items-center hover:text-texto">Ver todas las demos</Link></li>
            <li><a href="/#precios" className="inline-flex min-h-11 items-center hover:text-texto">Precios</a></li>
            <li><a href="/#preguntas" className="inline-flex min-h-11 items-center hover:text-texto">Preguntas frecuentes</a></li>
            {CONTACTO.email && (
              <li><a href={`mailto:${CONTACTO.email}`} className="inline-flex min-h-11 items-center hover:text-texto">{CONTACTO.email}</a></li>
            )}
          </ul>
        </nav>

        <nav aria-labelledby="pie-legales">
          <h2 id="pie-legales" className="text-sm font-bold">Legales</h2>
          <ul className="mt-2 text-sm text-suave">
            <li><Link to="/terminos" className="inline-flex min-h-11 items-center hover:text-texto">Términos y condiciones</Link></li>
            <li><Link to="/privacidad" className="inline-flex min-h-11 items-center hover:text-texto">Política de privacidad</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-bold">Acceso para negocios</h2>
          <p className="mt-3 text-sm text-suave">
            Cada negocio entra a su panel desde su propio link:
            <span className="mt-1 block font-semibold text-texto [overflow-wrap:anywhere]">{dominio}/tu-negocio/panel</span>
          </p>
          <p className="mt-2 text-sm text-suave">¿Sacaste un turno? <Link to="/mis-turnos" className="inline-flex min-h-11 items-center font-semibold text-acento-texto underline-offset-4 hover:underline">Mis turnos</Link></p>
          <Link to="/admin" className="inline-flex min-h-11 items-center text-sm font-semibold text-acento-texto underline-offset-4 hover:underline">
            Ingreso del equipo {MARCA.corto}
          </Link>
        </div>
      </div>
      <p className="mx-auto max-w-6xl px-5 pb-8 text-xs text-suave">© {ANIO} {MARCA.nombre}. Todos los derechos reservados.</p>
    </footer>
  )
}
