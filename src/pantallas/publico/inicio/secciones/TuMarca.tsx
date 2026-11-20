// Tu marca y funciones: la app instalable con la marca de cada negocio (celular a la izquierda, inclinado) y, abajo,
// lo que el dueño tiene en el panel, en formato índice de dos columnas.
/* oxlint-disable jsx-a11y/no-redundant-roles */
import { Wallet } from 'lucide-react'
import { Suspense, lazy } from 'react'
import { Link } from 'react-router'
import { DEMOS_FIJAS } from '@/plantillas/demos'
import { estiloTema } from '@/tema/TemaNegocio'
import { cn } from '@/ui/cn'
import { Logo } from '@/ui/Logo'
import { Celular } from '../../Celular'
import { FUNCIONES, VENTAJAS_PWA } from '../contenido'
import { Entrada, Folio, GRILLA, Seccion, TODO, TituloSeccion } from '../editorial'

const PantallaDeInicio = lazy(() => import('../../PantallaDeInicio').then((m) => ({ default: m.PantallaDeInicio })))

function SenasProximamente() {
  return (
    <>
      Señas con Mercado Pago{' '}
      <span className="rounded-full bg-superficie-2 px-2.5 py-0.5 text-xs font-bold text-suave ring-1 ring-linea">
        <span className="sr-only">(</span>Próximamente<span className="sr-only">)</span>
      </span>
    </>
  )
}

export function TuMarca() {
  return (
    <Seccion id="tu-marca" className="overflow-x-clip bg-superficie">
      <div className={GRILLA}>
        <div className="col-span-6 lg:col-span-7 lg:col-start-6">
          <Folio />
          <TituloSeccion className="mt-5">
            Tu app no lleva otra marca: <em>lleva la tuya</em>
          </TituloSeccion>
          <p className="mt-6 max-w-xl text-entrada text-suave text-pretty">
            Cada negocio tiene su propia app, con su nombre y su link. Tus clientes la usan como cualquier otra app del celular.
          </p>
          <ul role="list" className="mt-12 grid gap-8 sm:grid-cols-3 sm:gap-6">
            {VENTAJAS_PWA.map(({ Icono, titulo, texto }) => (
              <Entrada key={titulo} Icono={Icono} titulo={titulo}>
                {texto}
              </Entrada>
            ))}
          </ul>
          <ul role="list" className="mt-10 flex flex-wrap gap-2" aria-label="Demos de ejemplo">
            {DEMOS_FIJAS.map((n) => (
              <li key={n.slug}>
                {/* Cada chip con la marca de su demo (fondo, texto y logo de esa demo) */}
                <Link
                  to={`/${n.slug}`}
                  style={estiloTema(n)}
                  data-personalidad={n.personalidad}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-fondo pr-4 pl-1.5 text-sm font-bold text-texto ring-1 ring-linea transition-transform hover:-translate-y-0.5"
                >
                  <Logo negocio={n} className="size-8 rounded-full text-[11px]" />
                  {n.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* El celular va a la izquierda, inclinado y más abajo que el título (corrido solo desde sm) */}
        <div className="col-span-6 mt-16 justify-self-center sm:justify-self-start sm:pl-[10%] lg:col-span-4 lg:col-start-1 lg:row-start-1 lg:mt-28 lg:pl-0">
          <Celular className="w-[min(66vw,290px)] -rotate-3 lg:w-[300px] lg:-rotate-6">
            <Suspense fallback={null}>
              <PantallaDeInicio negocios={DEMOS_FIJAS} />
            </Suspense>
          </Celular>
          <p className="sr-only">
            La pantalla de inicio de un celular con las apps de {DEMOS_FIJAS.map((n) => n.nombre).join(', ')} instaladas, cada una con su logo y su color, y
            un aviso de que se liberó un turno.
          </p>
        </div>

        {/* Funciones: el título queda a la izquierda y el índice en dos columnas, corrido a la derecha */}
        <div className={cn('mt-24 grid gap-y-12 border-t border-linea pt-12 lg:mt-32 lg:grid-cols-12 lg:gap-x-8', TODO)}>
          <div className="lg:col-span-4">
            <h3 className="titular text-3xl">
              Todo para que tu agenda <em>no tenga huecos</em>
            </h3>
            <p className="mt-4 text-lg text-suave text-pretty">Sin planillas, sin cuaderno y sin contestar el mismo mensaje veinte veces por día.</p>
          </div>
          <ul role="list" className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
            {FUNCIONES.map(({ Icono, titulo, texto }) => (
              <Entrada key={titulo} Icono={Icono} titulo={titulo} nivel={4} className="aparecer">
                {texto}
              </Entrada>
            ))}
            <Entrada Icono={Wallet} nivel={4} className="border-dashed" titulo={<SenasProximamente />}>
              Cobrás la seña al reservar y la plata va directo a tu cuenta de Mercado Pago.
            </Entrada>
          </ul>
        </div>
      </div>
    </Seccion>
  )
}
