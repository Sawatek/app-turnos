// Cómo funciona: los tres pasos, y adentro del tercero el ciclo de WhatsApp (recordatorio → "Confirmo" → se libera),
// que se explica UNA sola vez en toda la página. El chat es la figura de la sección: en la compu va corrido a la derecha,
// más abajo que el título y pegado mientras se leen los pasos; en el celular, después de los pasos.
/* oxlint-disable jsx-a11y/no-redundant-roles */
import { Suspense, lazy } from 'react'
import { cn } from '@/ui/cn'
import { MOMENTOS, PASOS } from '../contenido'
import { Entrada, Folio, GRILLA, Seccion, TituloSeccion } from '../editorial'

const ConversacionWhatsApp = lazy(() => import('../../ConversacionWhatsApp').then((m) => ({ default: m.ConversacionWhatsApp })))

/** Sangría de cada paso: bajan en escalera hacia la derecha. Solo desde sm: en el celular no sobra ancho para adornos. */
const ESCALERA = ['', 'sm:pl-[8%]', 'sm:pl-[16%]']

export function ComoFunciona() {
  const ultimo = PASOS.length - 1
  return (
    <Seccion id="como-funciona" className="bg-superficie">
      <div className={GRILLA}>
        <div className="col-span-6 lg:col-span-7">
          <Folio />
          <TituloSeccion className="mt-5">
            Tres pasos y te olvidás de <em>confirmar a mano</em>
          </TituloSeccion>
        </div>

        <ol role="list" className="col-span-6 mt-16 flex flex-col gap-y-16 lg:col-span-7 lg:row-start-2 lg:mt-20">
          {PASOS.map(({ Icono, titulo, texto }, i) => (
            <li key={titulo} className={cn('aparecer', ESCALERA[i])}>
              <div className="flex items-end justify-between gap-4 border-b border-linea pb-4">
                {/* Calado con más trazo y en el color de texto del acento: el borde fino de .calado casi no se ve acá */}
                {/* El número del paso como el visor de "sacá número": mono angosta, calada en la tinta de la marca */}
                <span aria-hidden className="cifra text-numeral text-transparent [-webkit-text-stroke:2px_var(--t-acento-texto)]">
                  {i + 1}
                </span>
                {Icono && <Icono className="mb-2 size-6 text-acento-texto" aria-hidden />}
              </div>
              <h3 className="titular mt-6 text-3xl">
                <span className="sr-only">Paso {i + 1}: </span>
                {titulo}
              </h3>
              <p className="mt-3 max-w-xl text-suave text-pretty">{texto}</p>

              {/* El paso 3 se abre en lo que le llega al cliente, mensaje por mensaje */}
              {i === ultimo && (
                <>
                  <blockquote className="mt-10 border-l-2 border-acento pl-6">
                    <p className="titular text-destacado">Vos no mandás nada ni ponés tu número.</p>
                  </blockquote>
                  <ol role="list" aria-label="Qué le llega a tu cliente" className="mt-12 grid gap-x-8 gap-y-8 sm:grid-cols-2">
                    {MOMENTOS.map((m) => (
                      <Entrada key={m.titulo} Icono={m.Icono} titulo={m.titulo} nivel={4}>
                        {m.texto}
                      </Entrada>
                    ))}
                  </ol>
                </>
              )}
            </li>
          ))}
        </ol>

        {/* La figura: dentro de la banda pero más abajo que el título (no comparte su eje), y pegada mientras bajan los pasos */}
        <div className="col-span-6 mt-16 sm:col-span-5 sm:col-start-2 lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1 lg:mt-36">
          <Suspense fallback={<div aria-hidden className="h-[34.75rem] rounded-grande bg-superficie-2 sm:h-[27rem] lg:sticky lg:top-24 lg:h-[33rem]" />}>
            <ConversacionWhatsApp className="relative z-10 lg:sticky lg:top-24" />
          </Suspense>
        </div>
      </div>
    </Seccion>
  )
}
