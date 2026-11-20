// Términos y condiciones / política de privacidad. Los textos están en ./legales/ y los datos de la empresa en ./marca.ts.
import { TriangleAlert } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router'
import { Encabezado, Pie, SaltarAlContenido, useMarcaSitio } from './comunes'
import { EMPRESA, MARCA } from './marca'
import { PRIVACIDAD } from './legales/privacidad'
import { TERMINOS } from './legales/terminos'

const PAGINAS = {
  terminos: { titulo: 'Términos y condiciones', secciones: TERMINOS, otra: { to: '/privacidad', texto: 'Política de privacidad' } },
  privacidad: { titulo: 'Política de privacidad', secciones: PRIVACIDAD, otra: { to: '/terminos', texto: 'Términos y condiciones' } },
}

const PROSA = [
  'text-[15px] leading-relaxed text-texto/90 sm:text-base',
  '[&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_li]:marker:text-suave',
  '[&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-bold',
  '[&_strong]:font-semibold [&_strong]:text-texto',
  '[&_a]:font-semibold [&_a]:text-acento-texto [&_a]:underline [&_a]:underline-offset-4',
  '[&_.aviso-legal]:rounded-medio [&_.aviso-legal]:bg-superficie [&_.aviso-legal]:p-4 [&_.aviso-legal]:text-sm [&_.aviso-legal]:ring-1 [&_.aviso-legal]:ring-linea',
].join(' ')

export default function Legal({ tipo }: { tipo: 'terminos' | 'privacidad' }) {
  const pagina = PAGINAS[tipo]
  useMarcaSitio(pagina.titulo)
  // Al entrar (o al pasar de una página legal a la otra) arrancar desde arriba: el router no restaura el scroll.
  useEffect(() => {
    if (pagina) window.scrollTo(0, 0)
  }, [pagina])

  return (
    <>
      <SaltarAlContenido />
      <Encabezado />
      <main id="contenido" tabIndex={-1} className="mx-auto max-w-6xl px-5 pt-10 pb-20 outline-none">
        <div role="note" className="flex gap-3 rounded-medio bg-aviso/10 p-4 text-sm ring-1 ring-aviso/40">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-aviso" aria-hidden />
          <p>
            <strong className="font-bold text-aviso">Borrador: revisar con un abogado antes de publicar.</strong>{' '}
            <span className="text-suave">Este texto es una base de trabajo y no constituye asesoramiento legal. Los datos marcados “a completar” faltan cargar.</span>
          </p>
        </div>

        <header className="mt-10 max-w-3xl">
          <p className="text-sm font-bold tracking-wide text-acento-texto uppercase">{MARCA.nombre}</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">{pagina.titulo}</h1>
          <p className="mt-3 text-suave">Última actualización: {EMPRESA.actualizacionLegales}</p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[240px_1fr]">
          <nav aria-labelledby="t-indice" className="lg:sticky lg:top-24 lg:self-start">
            <h2 id="t-indice" className="text-sm font-bold">En esta página</h2>
            <ol className="mt-2 grid gap-0.5 text-sm text-suave sm:grid-cols-2 lg:grid-cols-1">
              {pagina.secciones.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex min-h-11 items-center gap-2 rounded-chico py-1 hover:text-texto lg:min-h-9">
                    <span className="num w-5 shrink-0 text-xs text-suave">{i + 1}.</span>
                    {s.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="max-w-3xl">
            {pagina.secciones.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`t-${s.id}`} className="border-t border-linea py-8 first:border-t-0 first:pt-0">
                <h2 id={`t-${s.id}`} className="text-2xl">
                  <span className="num mr-2 text-suave">{i + 1}.</span>
                  {s.titulo}
                </h2>
                <div className={PROSA}>{s.contenido}</div>
              </section>
            ))}
            <p className="mt-4 border-t border-linea pt-8 text-suave">
              Ver también:{' '}
              <Link to={pagina.otra.to} className="font-semibold text-acento-texto underline underline-offset-4">
                {pagina.otra.texto}
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Pie />
    </>
  )
}
