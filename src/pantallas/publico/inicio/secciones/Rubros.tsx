// Rubros: índice de rubros con su demo (si hay una fija) o el pedido de una demo parecida.
/* oxlint-disable jsx-a11y/no-redundant-roles */
import { ArrowUpRight } from 'lucide-react'
import { DEMOS_FIJAS } from '@/plantillas/demos'
import { cn } from '@/ui/cn'
import { Enlace } from '@/ui/Enlace'
import { linkContacto } from '../../marca'
import { RUBROS, type Rubro } from '../contenido'
import { Folio, GRILLA, Seccion, TODO, TituloSeccion } from '../editorial'

/** A dónde lleva cada rubro: su demo fija; si no tiene, pedir una (con contacto) o ver las parecidas. */
function LinkRubro({ demo }: { demo: Rubro['demo'] }) {
  const fija = demo && DEMOS_FIJAS.find((n) => n.slug === demo)
  const contacto = linkContacto()
  const [href, texto] = fija
    ? [`/${fija.slug}`, `Ver la demo de ${fija.nombre}`]
    : contacto.externo
      ? [contacto.href, 'Pedí la demo de tu rubro']
      : ['/demos', 'Ver demos parecidas']
  return (
    <Enlace href={href} variante="texto">
      {texto}
      <ArrowUpRight className="size-4 shrink-0" aria-hidden />
    </Enlace>
  )
}

export function Rubros() {
  return (
    <Seccion id="rubros">
      <div className={GRILLA}>
        <div className="col-span-6 lg:col-span-7">
          <Folio />
          <TituloSeccion className="mt-5">
            Ya viene armada <em>para tu rubro</em>
          </TituloSeccion>
        </div>
        <p className="col-span-6 mt-8 text-lg text-suave text-pretty sm:col-span-5 sm:col-start-2 lg:col-span-4 lg:col-start-9 lg:mt-0 lg:self-end">
          Arrancás con una plantilla de tu rubro: servicios, duraciones y textos típicos. Después la ajustás como quieras.
        </p>

        {/* Índice de rubros: filas alternadas, una contra el margen y la siguiente corrida (la sangría, solo desde sm) */}
        <ul role="list" className={cn('mt-16 border-b border-linea', TODO)}>
          {RUBROS.map(({ Icono, titulo, texto, demo }, i) => {
            const corrida = i % 2 === 1
            return (
              <li
                key={titulo}
                className={cn('aparecer grid gap-y-3 border-t border-linea py-8 lg:grid-cols-12 lg:items-baseline lg:gap-x-8', corrida && 'sm:pl-[10%] lg:pl-0')}
              >
                <h3 className={cn('titular flex items-baseline gap-3 text-destacado', corrida ? 'lg:col-span-5 lg:col-start-3' : 'lg:col-span-6')}>
                  {Icono && <Icono className="size-5 shrink-0 -translate-y-0.5 text-acento-texto" aria-hidden />}
                  {titulo}
                </h3>
                <p className={cn('text-suave text-pretty', corrida ? 'lg:col-span-3' : 'lg:col-span-4')}>{texto}</p>
                <div className="lg:col-span-2 lg:justify-self-end">
                  <LinkRubro demo={demo} />
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </Seccion>
  )
}
