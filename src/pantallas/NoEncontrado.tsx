import { Link, useParams } from 'react-router'
import { ArrowRight, LayoutDashboard, LoaderCircle, SearchX, Smartphone, Store } from 'lucide-react'
import { MARCA } from '@/pantallas/publico/marca'
import { useTemaNegocio } from '@/tema/TemaNegocio'

/**
 * Página "no encontrada". Sirve para dos casos:
 * - un link de negocio que no existe (/:slug, /:slug/panel): "No encontramos este negocio";
 * - cualquier otra ruta desconocida: "No encontramos esta página".
 */
export function NoEncontrado() {
  const { slug } = useParams()
  const esNegocio = !!slug
  useTemaNegocio(MARCA, `${esNegocio ? 'Negocio no encontrado' : 'Página no encontrada'} · ${MARCA.nombre}`)

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
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16">
      {/* Lo inexistente responde 200 (es una SPA): que los buscadores no lo indexen. React lo sube al <head>. */}
      <meta name="robots" content="noindex" />
      <div className="text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-grande bg-superficie text-suave ring-1 ring-linea">
          <SearchX className="size-8" aria-hidden />
        </span>
        <p className="mt-6 text-sm font-bold tracking-wide text-acento-texto uppercase">Error 404</p>
        <h1 className="mt-2 text-3xl">{esNegocio ? 'No encontramos este negocio' : 'No encontramos esta página'}</h1>
        <p className="mt-3 text-suave">
          {esNegocio
            ? 'Revisá el link. Puede que el negocio haya cambiado su dirección, que la demo se haya borrado o que el link tenga un error.'
            : 'Puede que el link esté mal escrito o que la página ya no exista.'}
        </p>
        <Link
          to="/"
          className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-medio bg-acento px-6 font-semibold text-sobre-acento transition-[filter] hover:brightness-110"
        >
          Ir al inicio
        </Link>
      </div>

      <ul className="mt-10 flex flex-col gap-3">
        {sugerencias.map(({ Icono, titulo, texto }) => (
          <li key={titulo} className="flex gap-3 rounded-medio bg-superficie p-4 ring-1 ring-linea">
            <Icono className="mt-0.5 size-5 shrink-0 text-acento-texto" aria-hidden />
            <div>
              <h2 className="text-base">{titulo}</h2>
              <p className="text-sm text-suave">{texto}</p>
            </div>
          </li>
        ))}
        <li>
          <Link
            to="/demos"
            className="flex min-h-14 items-center gap-3 rounded-medio bg-superficie p-4 ring-1 ring-linea transition-colors hover:bg-superficie-2"
          >
            <Store className="size-5 shrink-0 text-acento-texto" aria-hidden />
            <span className="flex-1 font-semibold">Ver las demos de {MARCA.corto}</span>
            <ArrowRight className="size-5 text-suave" aria-hidden />
          </Link>
        </li>
      </ul>
    </main>
  )
}

export function Cargando() {
  return (
    <main className="grid min-h-dvh place-items-center" aria-busy="true">
      <LoaderCircle className="size-8 animate-spin text-suave" aria-label="Cargando" />
    </main>
  )
}
