// Piezas compartidas del sitio público: tema de la marca, encabezado, pie y el botón "Pedí tu demo".
// role="list" a propósito: Safari con VoiceOver les saca el rol de lista a las listas sin viñeta (y Tailwind se las saca a todas).
/* oxlint-disable jsx-a11y/no-redundant-roles */
import { Menu, Moon, Sun } from 'lucide-react'
import { Suspense, lazy, useEffect, useLayoutEffect, useState } from 'react'
import { Link } from 'react-router'
import type { Tamano } from '@/ui/Boton'
import { cn } from '@/ui/cn'
import { Enlace } from '@/ui/Enlace'
// Las secciones de la navegación (y su número de folio) salen de la misma lista que arma la landing.
import { NAV } from './inicio/secciones'
import { CONTACTO, DEMOS, MARCA, linkContacto } from './marca'
import { TEMA_SITIO, alternarEsquema, cssTemaSitio, escucharEsquema, esquemaVisible } from './temaSitio'

/** Aplica la marca de la plataforma (colores, personalidad, título de la pestaña). */
export function useMarcaSitio(titulo?: string) {
  const textoTitulo = titulo ? `${titulo} · ${MARCA.nombre}` : `${MARCA.nombre} · ${MARCA.slogan}`
  useLayoutEffect(() => {
    const raiz = document.documentElement
    // Los colores del sitio van en <style id="tema-sitio"> (claro u oscuro según el <meta name="color-scheme">).
    // La portada pre-generada ya lo trae; en el resto de las páginas se agrega acá la primera vez.
    if (!document.getElementById('tema-sitio')) {
      const estilo = document.createElement('style')
      estilo.id = 'tema-sitio'
      estilo.textContent = cssTemaSitio()
      document.head.append(estilo)
    }
    // Si se viene de la app de un negocio, su tema quedó en variables en línea (pisarían al <style>): se sacan.
    for (const k of Object.keys(TEMA_SITIO.light)) raiz.style.removeProperty(k)
    raiz.dataset.sitio = ''
    raiz.dataset.personalidad = MARCA.personalidad
    document.title = textoTitulo
    // Al ir a la app de un negocio, el tema del sitio deja de valer (ese negocio pone el suyo).
    return () => {
      delete raiz.dataset.sitio
    }
  }, [textoTitulo])
  // Color de la barra del celular: el fondo del esquema que se ve (y se actualiza si cambia).
  useEffect(() => {
    const pintar = () => document.querySelector('meta[name=theme-color]')?.setAttribute('content', TEMA_SITIO[esquemaVisible()]['--t-fondo']!)
    pintar()
    return escucharEsquema(pintar)
  }, [])
}

/**
 * Botón de modo claro / oscuro (dos estados: el del sistema y el opuesto). Los dos íconos están en el HTML y el CSS
 * muestra el que corresponde (variante sitio-oscuro): sale bien pre-generado y sigue al sistema sin JS.
 */
function BotonEsquema() {
  return (
    <button
      type="button"
      onClick={alternarEsquema}
      className="grid size-11 shrink-0 place-items-center rounded-full text-texto ring-1 ring-linea transition-colors hover:bg-superficie-2"
    >
      <span className="inline-flex sitio-oscuro:hidden">
        <Moon className="size-5" aria-hidden />
        <span className="sr-only">Pasar a modo oscuro</span>
      </span>
      <span className="hidden sitio-oscuro:inline-flex">
        <Sun className="size-5" aria-hidden />
        <span className="sr-only">Pasar a modo claro</span>
      </span>
    </button>
  )
}

interface PropsCta {
  tamano?: Tamano
  className?: string
  /** Texto con contacto cargado (abre WhatsApp o el mail). */
  texto?: string
  /** Texto sin contacto: el botón lleva a la demo, así que dice eso (no promete una persona). */
  textoSinContacto?: string
}

/**
 * "Pedí tu demo": WhatsApp o mail si están cargados en marca.ts.
 * Sin contacto, el botón dice lo que hace ("Ver la demo") y lleva a la demo de la barbería.
 */
export function CtaDemo({ tamano = 'medio', className, texto = 'Pedí tu demo', textoSinContacto = 'Ver la demo' }: PropsCta) {
  const { href, externo, via } = linkContacto()
  const sinContacto = via === 'demos'
  return (
    // El primario del sitio lleva una sombra suave: lo despega del fondo oscuro.
    <Enlace href={sinContacto ? DEMOS.barberia : href} externo={!sinContacto && externo} tamano={tamano} className={cn('sombra-suave', className)}>
      {sinContacto ? textoSinContacto : texto}
    </Enlace>
  )
}

/** Isotipo + nombre de la plataforma. `compacto`: en el celular muestra el nombre corto (deja lugar en el encabezado). */
export function MarcaSitio({ className, compacto = false }: { className?: string; compacto?: boolean }) {
  return (
    <Link to="/" className={cn('inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-chico font-bold tracking-tight', className)}>
      <img src="/icono.svg" alt="" width={32} height={32} className="size-8 rounded-[9px]" />
      {compacto ? (
        <span className="text-[17px]">
          <span className="sm:hidden">{MARCA.corto}</span>
          <span className="hidden sm:inline">{MARCA.nombre}</span>
        </span>
      ) : (
        <span className="text-[17px]">{MARCA.nombre}</span>
      )}
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

// La hoja (y motion, que viene con ella) se baja recién la primera vez que se abre el menú: la portada no la necesita.
const Hoja = lazy(() => import('@/ui/Hoja').then((m) => ({ default: m.Hoja })))

/**
 * Menú "Secciones" del celular (bajo lg): abre una hoja con las mismas secciones que la barra de la compu.
 * Tocar una cierra la hoja y el link hace el salto al ancla (scroll-padding de estilos.css deja lugar al encabezado).
 */
function MenuSecciones() {
  const [abierta, setAbierta] = useState(false)
  const [usada, setUsada] = useState(false)
  return (
    <>
      <button
        type="button"
        aria-label="Secciones"
        aria-haspopup="dialog"
        aria-expanded={abierta}
        onClick={() => {
          setUsada(true)
          setAbierta(true)
        }}
        className="grid size-11 shrink-0 place-items-center rounded-full text-texto ring-1 ring-linea transition-colors hover:bg-superficie-2 lg:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </button>
      {usada && (
        <Suspense fallback={null}>
          <Hoja abierta={abierta} onCerrar={() => setAbierta(false)} titulo="Secciones" pie={<CtaDemo tamano="grande" className="w-full" />}>
            <ul role="list" className="border-b border-linea">
              {NAV.map((s) => (
                <li key={s.href} className="border-t border-linea">
                  <a
                    href={s.href}
                    onClick={() => setAbierta(false)}
                    className="flex min-h-14 items-baseline gap-4 py-3 transition-colors hover:text-acento-texto"
                  >
                    <span aria-hidden className="folio num text-acento-texto">
                      {s.n}
                    </span>
                    <span className="titular text-2xl">{s.texto}</span>
                  </a>
                </li>
              ))}
            </ul>
          </Hoja>
        </Suspense>
      )}
    </>
  )
}

/** Barra superior fija. En la landing muestra las secciones; en las otras páginas, solo marca y CTA. */
export function Encabezado({ secciones = false }: { secciones?: boolean }) {
  return (
    <header
      data-encabezado-sitio
      className="sticky top-0 z-40 border-b border-linea/70 bg-fondo/95 pt-[env(safe-area-inset-top)] lg:bg-fondo/85 lg:backdrop-blur-md"
    >
      <div className={cn('mx-auto flex h-16 items-center justify-between gap-3 px-5', secciones ? 'max-w-7xl sm:px-8' : 'max-w-6xl')}>
        <MarcaSitio compacto={secciones} />
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
        <div className="flex items-center gap-2">
          <BotonEsquema />
          {secciones && <MenuSecciones />}
          <CtaDemo tamano="chico" className="whitespace-nowrap" />
        </div>
      </div>
    </header>
  )
}

/** Pie con legales, demos y acceso para negocios. `amplio`: mismo ancho que la grilla de la landing. */
export function Pie({ amplio = false }: { amplio?: boolean }) {
  const ancho = amplio ? 'max-w-7xl sm:px-8' : 'max-w-6xl'
  const dominio = typeof window === 'undefined' ? '' : window.location.host
  return (
    <footer className="border-t border-linea bg-superficie/40">
      <div className={cn('mx-auto grid gap-10 px-5 py-12', ancho, 'pb-[max(3rem,env(safe-area-inset-bottom))] sm:grid-cols-2 lg:grid-cols-4')}>
        <div className="sm:col-span-2 lg:col-span-1">
          <MarcaSitio />
          <p className="mt-2 max-w-xs text-sm text-suave">{MARCA.slogan}. Hecho en Argentina para negocios que viven de sus turnos.</p>
        </div>

        <nav aria-labelledby="pie-producto">
          <h2 id="pie-producto" className="text-sm font-bold">Producto</h2>
          <ul className="mt-2 text-sm text-suave">
            <li><Link to="/demos" className="inline-flex min-h-11 items-center hover:text-texto">Ver todas las demos</Link></li>
            <li><Link to="/#precios" className="inline-flex min-h-11 items-center hover:text-texto">Precios</Link></li>
            <li><Link to="/#preguntas" className="inline-flex min-h-11 items-center hover:text-texto">Preguntas frecuentes</Link></li>
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
            <span className="mt-1 block font-semibold text-texto wrap-anywhere">{dominio}/tu-negocio/panel</span>
          </p>
          <p className="mt-2 text-sm text-suave">¿Sacaste un turno? <Link to="/mis-turnos" className="inline-flex min-h-11 items-center font-semibold text-acento-texto underline decoration-acento-borde underline-offset-4 transition-colors hover:decoration-acento">Mis turnos</Link></p>
          <Link to="/admin" className="inline-flex min-h-11 items-center text-sm font-semibold text-acento-texto underline-offset-4 hover:underline">
            Ingreso del equipo {MARCA.corto}
          </Link>
        </div>
      </div>
      <p className={cn('mx-auto px-5 pb-8 text-xs text-suave', ancho)}>© {ANIO} {MARCA.nombre}. Todos los derechos reservados.</p>
    </footer>
  )
}
