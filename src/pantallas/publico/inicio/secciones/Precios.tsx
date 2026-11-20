// Precios: los planes de marca.ts. Sin precio cargado dicen "A definir"; sin contacto cargado no hay botones que prometan
// una persona (se ofrece la demo).
/* oxlint-disable jsx-a11y/no-redundant-roles */
import { ArrowUpRight, Check } from 'lucide-react'
import { cn } from '@/ui/cn'
import { Enlace } from '@/ui/Enlace'
import { DEMOS, PLANES, hayPrecios, linkContacto, precioPlan, type Plan } from '../../marca'
import { Folio, GRILLA, Seccion, TODO, TituloSeccion } from '../editorial'

/** El recomendado se despega del fondo con el anillo de acento y más sombra. */
const estiloPlan = (p: Plan) => (p.destacado ? 'bg-superficie ring-2 ring-acento sombra-flotante' : 'bg-superficie/60 ring-1 ring-linea')
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
            return (
              <li key={p.nombre} className={cn('aparecer relative flex min-w-0 flex-col rounded-grande p-6 sm:p-8', estiloPlan(p), alturaPlan(p, anteriores))}>
                {p.destacado && (
                  <span aria-hidden className="absolute -top-3 left-6 rounded-full bg-acento px-3 py-1 text-xs font-bold text-sobre-acento sm:left-8">
                    Recomendado
                  </span>
                )}
                <p aria-hidden className="folio num text-suave">
                  Plan {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="titular mt-3 text-3xl">
                  {p.nombre}
                  {p.destacado && <span className="sr-only"> (recomendado)</span>}
                </h3>
                <p className="mt-1 text-sm text-suave">{p.para}</p>
                <p className="mt-6 border-t border-linea pt-6">
                  {valor ? (
                    <>
                      <span className="titular num text-5xl">{valor}</span>
                      <span className="text-suave"> /mes</span>
                    </>
                  ) : (
                    <span className="titular text-4xl">A definir</span>
                  )}
                </p>
                <ul role="list" className="mt-6 flex flex-1 flex-col gap-2.5">
                  {p.incluye.map((x) => (
                    <li key={x} className="flex gap-2">
                      <Check className="mt-0.5 size-5 shrink-0 text-acento-texto" aria-hidden />
                      {x}
                    </li>
                  ))}
                </ul>
                {/* Sin contacto cargado no hay a quién consultarle: no se muestran botones que prometan una persona */}
                {conContacto && (
                  <Enlace href={contacto.href} externo={contacto.externo} variante={p.destacado ? 'primario' : 'secundario'} className={cn('mt-8 w-full', p.destacado && 'sombra-suave')}>
                    {valor ? `Quiero el plan ${p.nombre}` : `Consultar el plan ${p.nombre}`}
                  </Enlace>
                )}
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
