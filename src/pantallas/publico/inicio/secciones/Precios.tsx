// Precios: los planes de marca.ts. Sin precio cargado dicen "A definir"; sin contacto cargado no hay botones que prometan
// una persona (se ofrece la demo).
/* oxlint-disable jsx-a11y/no-redundant-roles */
import { ArrowUpRight, Check } from 'lucide-react'
import { cn } from '@/ui/cn'
import { Enlace } from '@/ui/Enlace'
import { Talon } from '@/ui/Talon'
import { DEMOS, PLANES, hayPrecios, linkContacto, precioPlan, type Plan } from '../../marca'
import { Folio, GRILLA, Seccion, TODO, TituloSeccion } from '../editorial'

/**
 * Columnas de la grilla de planes en la compu, una por plan: el recomendado, más ancho. Sale de PLANES, así que agregar
 * o sacar un plan, o cambiar cuál se recomienda, no desarma la fila (con col-span a mano había que sumar 12 justo).
 */
const COLUMNAS_PLANES = PLANES.map((p) => (p.destacado ? '1.3fr' : '1fr')).join(' ')
/** Cada plan a otra altura: el recomendado arriba; los demás bajan alternando (n = cuántos no recomendados van antes). */
const alturaPlan = (p: Plan, n: number) => (p.destacado ? '' : n % 2 ? 'lg:mt-44' : 'lg:mt-24')

export function Precios() {
  const contacto = linkContacto()
  const conContacto = contacto.via !== 'demos'
  return (
    <Seccion id="precios">
      <div className={GRILLA}>
        <div className="col-span-6 lg:col-span-7">
          <Folio />
          <TituloSeccion className="mt-5">
            Un abono mensual, <em>simple</em>
          </TituloSeccion>
        </div>
        {/* Corrido una columna solo desde sm: en el celular, a todo el ancho */}
        <div className="col-span-6 mt-8 sm:col-span-5 sm:col-start-2 lg:col-span-4 lg:col-start-9 lg:mt-0 lg:self-end">
          <p className="text-lg text-suave text-pretty">
            {hayPrecios()
              ? 'Precios finales por mes, en pesos.'
              : conContacto
                ? 'Estamos terminando de definir los precios. Escribinos y te pasamos una propuesta para tu negocio.'
                : 'Estamos terminando de definir los precios.'}
          </p>
          <p className="mt-3 text-sm font-semibold text-texto">Tus clientes no pagan nada por usar la app.</p>
        </div>

        <ul
          role="list"
          aria-label="Planes"
          style={{ '--columnas-planes': COLUMNAS_PLANES } as React.CSSProperties}
          className={cn('mt-16 grid gap-6 lg:grid-cols-[var(--columnas-planes)] lg:items-start lg:gap-8', TODO)}
        >
          {PLANES.map((p, i) => {
            const valor = precioPlan(p)
            const anteriores = PLANES.slice(0, i).filter((q) => !q.destacado).length
            const tinta = p.destacado ? 'text-sobre-acento' : 'text-acento-texto'
            return (
              // Cada plan es un talón: arriba nombre y precio; abajo del corte, lo que incluye. El recomendado va en tinta.
              <li key={p.nombre} className={cn('aparecer relative min-w-0', alturaPlan(p, anteriores))}>
                <Talon
                  as="div"
                  papel={p.destacado ? 'acento' : 'superficie'}
                  className="h-full"
                  sello={
                    p.destacado ? (
                      <span aria-hidden style={{ '--giro': '-6deg' } as React.CSSProperties} className="sello bg-acento text-sm text-sobre-acento">
                        Recomendado
                      </span>
                    ) : undefined
                  }
                  cuerpo={
                    <div className="p-6 sm:p-8">
                      <p aria-hidden className={cn('folio', p.destacado ? 'text-sobre-acento/80' : 'text-suave')}>
                        Plan {String(i + 1).padStart(2, '0')}
                      </p>
                      <h3 className="titular mt-3 text-3xl">
                        {p.nombre}
                        {p.destacado && <span className="sr-only"> (recomendado)</span>}
                      </h3>
                      <p className={cn('mt-1 text-sm', p.destacado ? 'text-sobre-acento/85' : 'text-suave')}>{p.para}</p>
                      <p className="mt-6">
                        {valor ? (
                          <>
                            <span className="cifra text-6xl">{valor}</span>
                            <span className={p.destacado ? 'text-sobre-acento/85' : 'text-suave'}> /mes</span>
                          </>
                        ) : (
                          <span className="titular text-4xl">A definir</span>
                        )}
                      </p>
                    </div>
                  }
                  talon={
                    <div className="flex flex-col p-6 pt-8 sm:p-8 sm:pt-9">
                      <ul role="list" className="flex flex-1 flex-col gap-2.5">
                        {p.incluye.map((x) => (
                          <li key={x} className="flex gap-2">
                            <Check className={cn('mt-0.5 size-5 shrink-0', tinta)} aria-hidden />
                            {x}
                          </li>
                        ))}
                      </ul>
                      {/* Sin contacto cargado no hay a quién consultarle: no se muestran botones que prometan una persona */}
                      {conContacto && (
                        <Enlace
                          href={contacto.href}
                          externo={contacto.externo}
                          variante={p.destacado ? 'secundario' : 'primario'}
                          className="mt-8 w-full"
                        >
                          {valor ? `Quiero el plan ${p.nombre}` : `Consultar el plan ${p.nombre}`}
                        </Enlace>
                      )}
                    </div>
                  }
                />
              </li>
            )
          })}
        </ul>
        {!conContacto && (
          <p className={cn('mt-12 text-lg text-suave', TODO)}>
            ¿Querés verla funcionando?{' '}
            <Enlace href={DEMOS.barberia} variante="texto">
              Ver la demo
              <ArrowUpRight className="size-4 shrink-0" aria-hidden />
            </Enlace>
          </p>
        )}
      </div>
    </Seccion>
  )
}
