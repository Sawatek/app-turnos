// El problema: por qué se pierden turnos, y la calculadora con los números del dueño.
/* oxlint-disable jsx-a11y/no-redundant-roles */
import { CalculadoraFaltas } from '../../CalculadoraFaltas'
import { DOLORES } from '../contenido'
import { Folio, GRILLA, Seccion, TituloSeccion } from '../editorial'

export function Problema() {
  return (
    <Seccion id="problema" className="border-t border-linea">
      <div className={GRILLA}>
        <Folio className="col-span-6 lg:col-span-2 lg:pt-4" />
        <TituloSeccion className="col-span-6 mt-5 lg:col-span-9 lg:col-start-3 lg:mt-0">
          Cada falta es una silla vacía que <em>igual pagaste</em>
        </TituloSeccion>

        <div className="aparecer col-span-6 mt-12 lg:col-span-5 lg:col-start-3 lg:mt-16">
          <p className="capitular text-entrada">
            El alquiler, los sueldos y tu tiempo corren aunque el cliente no venga. Y casi siempre no viene por una de estas tres razones:
          </p>
          <ol role="list" className="mt-10">
            {DOLORES.map(({ titulo, texto }, i) => (
              <li key={titulo} className="grid grid-cols-[3rem_1fr] gap-x-2 border-t border-linea py-6">
                <span aria-hidden className="titular num text-3xl text-peligro">
                  {i + 1}.
                </span>
                <div>
                  <h3 className="text-lg font-bold">{titulo}</h3>
                  <p className="mt-1 text-suave">{texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* La calculadora se corre hacia abajo y hacia la derecha, fuera del eje del texto (desde sm: en el celular va a todo el ancho) */}
        <div className="aparecer col-span-6 mt-6 sm:col-span-5 sm:col-start-2 lg:col-span-5 lg:col-start-8 lg:mt-40">
          <CalculadoraFaltas />
        </div>
      </div>
    </Seccion>
  )
}
