import { Link, useParams } from 'react-router'
import { ArrowRight, LayoutDashboard, LoaderCircle, SearchX, Smartphone, Store } from 'lucide-react'
import { MARCA } from '@/pantallas/publico/marca'
import { clasesBoton } from '@/ui/clasesBoton'
import { cn } from '@/ui/cn'
import { Sello } from '@/ui/Sello'
import { Talon } from '@/ui/Talon'
import { useMarcaSitio } from '@/pantallas/publico/comunes'

/**
 * Página "no encontrada". Sirve para dos casos:
 * - un link de negocio que no existe (/:slug, /:slug/panel): "No encontramos este negocio";
 * - cualquier otra ruta desconocida: "No encontramos esta página".
 */
export function NoEncontrado() {
  const { slug } = useParams()
  const esNegocio = !!slug
  useMarcaSitio(esNegocio ? 'Negocio no encontrado' : 'Página no encontrada')

  const sugerencias = [
    {
      Icono: Smartphone,
      titulo: '¿Querías sacar un turno?',
      texto: 'Revisá el link que te pasó el negocio: tiene que ser exactamente igual, con su nombre al final.',
    },
    {
      Icono: LayoutDashboard,
      titulo: '¿Tenés un negocio con nosotros?',
      texto: 'Tu panel está en tu propio link, terminado en /panel (por ejemplo, /tu-negocio/panel).',
    },
  ]

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-16">
      {/* Lo inexistente responde 200 (es una SPA): que los buscadores no lo indexen. React lo sube al <head>. */}
      <meta name="robots" content="noindex" />
      <div aria-hidden className="cuadricula pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      {/* Un talón con un número que no salió: anulado con el sello en el corte (nunca sobre el número). */}
      <Talon
        as="div"
        cuerpo={
          <div className="px-5 pt-4 pb-5">
            <div className="flex items-center justify-between gap-3">
              <span className="rotulo text-suave">Error</span>
              <SearchX className="size-5 text-suave" aria-hidden />
            </div>
            <p className="cifra mt-3 pb-3 text-[6rem] text-suave" aria-hidden>
              404
            </p>
          </div>
        }
        sello={
          <Sello tono="peligro" tamano="medio" giro={-5} className="bg-superficie/85">
            Este número no salió
          </Sello>
        }
        talon={
          <div className="px-5 pt-8 pb-5">
            <h1 className="text-3xl">{esNegocio ? 'No encontramos este negocio' : 'No encontramos esta página'}</h1>
            <p className="mt-2 text-suave">
              {esNegocio
                ? 'Revisá el link. Puede que el negocio haya cambiado su dirección, que la demo se haya borrado o que el link tenga un error.'
                : 'Puede que el link esté mal escrito o que la página ya no exista.'}
            </p>
            <Link to="/" className={cn(clasesBoton(), 'mt-5')}>
              Ir al inicio
            </Link>
          </div>
        }
      />

      <ul className="mt-10 flex flex-col divide-y divide-linea border-y border-linea">
        {sugerencias.map(({ Icono, titulo, texto }) => (
          <li key={titulo} className="flex gap-3 py-4">
            <Icono className="mt-0.5 size-5 shrink-0 text-acento-texto" aria-hidden />
            <div>
              <h2 className="text-base">{titulo}</h2>
              <p className="text-sm text-suave">{texto}</p>
            </div>
          </li>
        ))}
        <li>
          <Link to="/demos" className="group flex min-h-14 items-center gap-3 py-4">
            <Store className="size-5 shrink-0 text-acento-texto" aria-hidden />
            <span className="flex-1 font-semibold group-hover:underline">Ver las demos de {MARCA.corto}</span>
            <ArrowRight className="size-5 text-suave transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </li>
      </ul>
    </main>
  )
}

export function Cargando() {
  return (
    <main className="grid min-h-dvh place-items-center" aria-busy="true">
      <span className="flex items-center gap-2.5 text-suave">
        <LoaderCircle className="size-6 animate-spin" aria-label="Cargando" />
        <span className="rotulo" aria-hidden>
          Cargando…
        </span>
      </span>
    </main>
  )
}
