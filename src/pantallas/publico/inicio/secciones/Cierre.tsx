// Cierre: el último llamado, como el talón que el negocio se lleva. Arriba el titular más grande de la página;
// abajo del corte, los botones. Al llegar, le cae el sello "Tu turno" (atado al scroll; quieto con "reducir movimiento").
import { cn } from '@/ui/cn'
import { Enlace } from '@/ui/Enlace'
import { Talon } from '@/ui/Talon'
import { CtaDemo } from '../../comunes'
import { DEMOS, linkContacto } from '../../marca'
import { Folio, GRILLA, Halo, Seccion, TODO, TituloSeccion } from '../editorial'

export function Cierre() {
  return (
    <Seccion id="final" className="isolate overflow-x-clip border-t border-linea sm:py-36">
      <Halo className="right-[-15%] bottom-[-30%] size-[60vmax]" />
      <div className={GRILLA}>
        <Talon
          as="div"
          className={cn('[--muesca:16px]', TODO)}
          sello={
            <span aria-hidden style={{ '--giro': '-8deg' } as React.CSSProperties} className="sello sellar-al-ver bg-superficie text-lg text-acento-texto sm:text-2xl">
              Tu turno
            </span>
          }
          cuerpo={
            <div className="px-6 pt-6 pb-12 sm:px-12 sm:pt-10 lg:px-16">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Folio />
                <p aria-hidden className="rotulo text-suave">
                  N.º 0001 · Tu negocio
                </p>
              </div>
              <TituloSeccion className="mt-8 text-portada">
                <span className="block">Mirá tu negocio</span>{' '}
                {/* La segunda línea corrida, solo desde sm */}
                <span className="block sm:pl-[8%] lg:pl-[16%]">
                  con <em>su propia app</em>
                </span>
              </TituloSeccion>
            </div>
          }
          talon={
            <div className="grid gap-8 px-6 pt-12 pb-8 sm:px-12 sm:pb-12 lg:grid-cols-12 lg:px-16">
              <p className="text-entrada text-suave text-pretty lg:col-span-6">
                Te la mostramos con tu nombre, tu logo y tus servicios, y sacás un turno de prueba desde tu celular. Sin compromiso.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row lg:col-span-5 lg:col-start-8 lg:items-start lg:justify-end">
                <CtaDemo tamano="grande" />
                {/* Sin contacto, el botón principal ya lleva a la demo: un segundo botón quedaría repetido */}
                {linkContacto().via !== 'demos' && (
                  <Enlace href={DEMOS.barberia} variante="secundario" tamano="grande">
                    Ver una demo
                  </Enlace>
                )}
              </div>
            </div>
          }
        />
      </div>
    </Seccion>
  )
}
