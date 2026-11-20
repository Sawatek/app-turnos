// Preguntas frecuentes: título fijo a la izquierda (en la compu) y el acordeón a la derecha.
import { Preguntas as Acordeon } from '../../Preguntas'
import { CONTACTO } from '../../marca'
import { PREGUNTAS } from '../contenido'
import { Folio, GRILLA, Seccion, TituloSeccion } from '../editorial'

export function Preguntas() {
  return (
    <Seccion id="preguntas" className="border-t border-linea">
      <div className={GRILLA}>
        <div className="col-span-6 lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <Folio />
            <TituloSeccion className="mt-5 text-subtitular">
              Preguntas <em>frecuentes</em>
            </TituloSeccion>
            <p className="mt-6 text-lg text-suave">
              {CONTACTO.whatsapp || CONTACTO.email ? '¿Te quedó alguna duda? Escribinos y te respondemos.' : '¿Te quedó alguna duda? Probá la demo como si fueras tu cliente.'}
            </p>
          </div>
        </div>
        <div className="col-span-6 mt-12 lg:col-span-7 lg:col-start-6 lg:mt-2">
          <Acordeon items={PREGUNTAS} />
        </div>
      </div>
    </Seccion>
  )
}
