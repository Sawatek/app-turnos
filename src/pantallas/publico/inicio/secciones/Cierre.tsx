// Cierre: el último llamado, con el titular más grande de la página corrido en dos líneas.
import { cn } from '@/ui/cn'
import { Enlace } from '@/ui/Enlace'
import { CtaDemo } from '../../comunes'
import { DEMOS, linkContacto } from '../../marca'
import { Folio, GRILLA, Halo, Seccion, TODO, TituloSeccion } from '../editorial'

export function Cierre() {
  return (
    <Seccion id="final" className="isolate overflow-x-clip border-t border-linea sm:py-36">
      <Halo className="right-[-15%] bottom-[-40%] size-[60vmax]" />
      <div className={GRILLA}>
        <Folio className={TODO} />
        <TituloSeccion className={cn('mt-6 text-portada', TODO)}>
          <span className="block">Mirá tu negocio</span>{' '}
          {/* La segunda línea corrida, solo desde sm */}
          <span className="block sm:pl-[8%] lg:pl-[16%]">
            con <em>su propia app</em>
          </span>
        </TituloSeccion>
        <div className="col-span-6 mt-12 sm:col-span-5 sm:col-start-2 lg:col-span-5 lg:col-start-7 lg:mt-16">
          <p className="text-entrada text-suave text-pretty">
            Te la mostramos con tu nombre, tu logo y tus servicios, y sacás un turno de prueba desde tu celular. Sin compromiso.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CtaDemo tamano="grande" />
            {/* Sin contacto, el botón principal ya lleva a la demo: un segundo botón quedaría repetido */}
            {linkContacto().via !== 'demos' && (
              <Enlace href={DEMOS.barberia} variante="secundario" tamano="grande">
                Ver una demo
              </Enlace>
            )}
          </div>
        </div>
      </div>
    </Seccion>
  )
}
