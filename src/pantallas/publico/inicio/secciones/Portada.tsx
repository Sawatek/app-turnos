// Portada: la promesa (el slogan), el ciclo en una sola frase y el celular con la app de verdad.
// No lleva número de folio: no está en SECCIONES. Se pre-genera en el servidor (renderToString): nada del navegador en el render.
/* oxlint-disable jsx-a11y/no-redundant-roles */
import { ArrowRight, Check } from 'lucide-react'
import { Suspense, lazy } from 'react'
import { cn } from '@/ui/cn'
import { Enlace } from '@/ui/Enlace'
import { Celular } from '../../Celular'
import { CtaDemo } from '../../comunes'
import { DEMOS, MARCA, linkContacto } from '../../marca'
import { GRILLA, Halo, TODO } from '../editorial'

// El celular animado se baja aparte: trae media app demo (motion, fechas, colores).
const VitrinaApp = lazy(() => import('../../VitrinaApp').then((m) => ({ default: m.VitrinaApp })))

/** Lugar de la vitrina mientras carga: el mismo celular (vacío) y el alto de los controles de abajo, así no se mueve nada. */
function VitrinaCargando() {
  return (
    <div className="flex flex-col items-center">
      <Celular className="w-[min(78vw,330px)] sm:w-[330px] lg:w-[300px] xl:w-[316px]">{null}</Celular>
      <div aria-hidden className="mt-7 h-56 sm:h-32" />
    </div>
  )
}

export function Portada() {
  const palabras = MARCA.slogan.split(' ')
  const ultima = palabras.pop()
  return (
    <section aria-labelledby="t-hero" className="relative isolate overflow-x-clip px-5 pt-10 pb-24 sm:px-8 sm:pt-16 lg:pb-32">
      <Halo className="-top-40 right-[-20%] size-[70vmax]" />
      {/* La palabra que vende, gigante y calada, detrás del celular */}
      <p aria-hidden className="titular calado deriva pointer-events-none absolute right-[-4%] bottom-6 -z-10 text-gigante select-none">
        Confirmo
      </p>

      <div className={cn('mx-auto max-w-7xl', GRILLA)}>
        <p className={cn('folio entrar flex flex-wrap items-center gap-x-3 gap-y-1 text-suave', TODO)}>
          <span className="text-acento-texto">Turnos con tu marca</span>
          <span aria-hidden className="hidden h-px w-8 bg-linea sm:block" />
          <span className="basis-full sm:basis-auto">Para barberías, peluquerías, consultorios y más</span>
        </p>

        {/* El h1 solo sube (asomar), sin fundir: se ve desde el primer cuadro */}
        <h1 id="t-hero" className="titular asomar retraso-50 col-span-6 mt-6 text-portada sm:mt-8 lg:col-span-8">
          {palabras.join(' ')} <em>{ultima}</em>
        </h1>

        {/* La sangría editorial (columna corrida) va solo desde lg: en el celular los botones tienen que entrar en la primera pantalla */}
        <div className="entrar retraso-100 col-span-6 mt-10 lg:col-span-5 lg:col-start-2 lg:mt-14">
          <p className="border-l-2 border-acento-borde pl-5 text-entrada text-suave text-pretty">
            <strong className="font-semibold text-texto">Menos faltas</strong> en tu agenda. A tus clientes les llega el recordatorio por WhatsApp y
            confirman con un toque. Todo con tu logo, y sin que bajen nada.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CtaDemo tamano="grande" />
            {/* Sin contacto, el botón principal ya lleva a la demo: no se repite */}
            {linkContacto().via !== 'demos' && (
              <Enlace href={DEMOS.barberia} variante="secundario" tamano="grande">
                Ver una demo
                <ArrowRight className="size-5" aria-hidden />
              </Enlace>
            )}
          </div>
          <ul role="list" className="mt-8 flex flex-col gap-2 text-sm text-suave sm:flex-row sm:flex-wrap sm:gap-x-6">
            {['Sin tiendas de apps', 'Tus clientes no pagan nada', 'Hecha en Argentina'].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="size-4 text-acento-texto" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* El celular baja respecto del título: no comparte su eje */}
        <div className="entrar retraso-150 col-span-6 mt-16 justify-self-center sm:justify-self-end lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-2 lg:mt-24 lg:justify-self-end">
          <Suspense fallback={<VitrinaCargando />}>
            <VitrinaApp />
          </Suspense>
        </div>
      </div>
    </section>
  )
}
