// Página principal del producto: landing para dueños de negocios que viven de sus turnos.
// Estilo editorial asimétrico (como una revista): grilla de 12 columnas en la compu y de 6 en el celular,
// titulares grandes en una grotesca editorial (Bricolage Grotesque), bloques corridos del eje y ritmo distinto en cada sección.
// Este archivo solo compone: cada sección está en ./inicio/secciones/, las piezas editoriales en ./inicio/editorial.tsx,
// los textos en ./inicio/contenido.tsx y lo comercial (nombre, contacto, precios) en ./marca.ts.
// El orden y el número de cada sección salen de SECCIONES (./inicio/secciones.ts): reordenar = mover una línea ahí.
// Se pre-genera con renderToString: nada del navegador (window, document) en el render, solo en efectos.
import '@fontsource-variable/bricolage-grotesque/opsz.css'
import { Encabezado, Pie, SaltarAlContenido, useMarcaSitio } from './comunes'
import { SECCIONES, type IdSeccion } from './inicio/secciones'
import { Cierre } from './inicio/secciones/Cierre'
import { ComoFunciona } from './inicio/secciones/ComoFunciona'
import { Portada } from './inicio/secciones/Portada'
import { Precios } from './inicio/secciones/Precios'
import { Preguntas } from './inicio/secciones/Preguntas'
import { Problema } from './inicio/secciones/Problema'
import { Rubros } from './inicio/secciones/Rubros'
import { TuMarca } from './inicio/secciones/TuMarca'

/** Qué componente dibuja cada sección de SECCIONES. */
const CUERPOS: Record<IdSeccion, () => React.ReactNode> = {
  problema: Problema,
  'como-funciona': ComoFunciona,
  precios: Precios,
  'tu-marca': TuMarca,
  rubros: Rubros,
  preguntas: Preguntas,
  final: Cierre,
}

export default function InicioPublico() {
  useMarcaSitio()
  return (
    <>
      <SaltarAlContenido />
      <Encabezado secciones />
      <main id="contenido" tabIndex={-1} className="overflow-x-clip outline-none">
        <Portada />
        {SECCIONES.map(({ id }) => {
          const Cuerpo = CUERPOS[id]
          return <Cuerpo key={id} />
        })}
      </main>
      <Pie amplio />
    </>
  )
}
