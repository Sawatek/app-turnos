// Términos y condiciones (borrador) para la plataforma y para quienes sacan turnos en la app de un negocio.
// BORRADOR: revisar con un abogado antes de publicar.
import { Link } from 'react-router'
import { EMPRESA, MARCA } from '../marca'
import { Contacto, Dato, Empresa, type SeccionLegal } from './comunes'

const N = MARCA.nombre

export const TERMINOS: SeccionLegal[] = [
  {
    id: 'aceptacion',
    titulo: 'Quiénes somos y aceptación',
    contenido: (
      <>
        <p>
          Estos términos regulan el uso de {N}, una plataforma prestada por <Empresa /> (en adelante, “{MARCA.corto}”, “nosotros”). Al usar el sitio, la
          app de un negocio o el panel, aceptás estos términos y la <Link to="/privacidad">política de privacidad</Link>. Si no estás de acuerdo, no uses
          el servicio.
        </p>
        <p>Hay dos tipos de usuarios, y algunas cláusulas aplican solo a uno de ellos:</p>
        <ul>
          <li>
            <strong>Negocios</strong>: quienes contratan {N} para dar turnos a sus clientes (dueños, dueñas y sus equipos).
          </li>
          <li>
            <strong>Clientes</strong>: las personas que sacan turnos en la app de un negocio.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'servicio',
    titulo: 'Qué es el servicio',
    contenido: (
      <>
        <p>
          {N} les da a los negocios una app de turnos con su marca, recordatorios y confirmaciones por WhatsApp, un panel para administrar la agenda, los
          servicios, el equipo y los clientes, y herramientas de fidelidad.
        </p>
        <p>
          <strong>{MARCA.corto} no presta los servicios que se reservan</strong> (cortes, tratamientos, consultas, etc.): los presta cada negocio, que es
          el único responsable por ellos, por sus precios, su calidad, su atención y sus políticas de cancelación.
        </p>
      </>
    ),
  },
  {
    id: 'clientes',
    titulo: 'Para clientes: cómo sacar y manejar turnos',
    contenido: (
      <>
        <ul>
          <li>Usar la app para sacar turnos es gratis para vos.</li>
          <li>
            Entrás con tu celular y un código que te llega por WhatsApp. Tenés que usar un número propio y datos reales; sos responsable por el uso de tu
            cuenta.
          </li>
          <li>
            Al reservar, aceptás las condiciones que muestre el negocio (precio, duración, anticipación, plazo para cancelar y, si corresponde, seña).
          </li>
          <li>
            Si no podés ir, cancelá o cambiá el turno desde la app dentro del plazo que fije el negocio, así el horario le queda libre a otra persona.
          </li>
          <li>
            El negocio puede limitar la cantidad de turnos activos por persona o dejar de darte turnos si faltás seguido sin avisar.
          </li>
          <li>Los horarios disponibles los define el negocio; si un turno se modifica o cancela, te vamos a avisar.</li>
        </ul>
        <p>
          Cualquier reclamo por el servicio que te prestaron (la atención, el precio, la seña) tenés que hacérselo al negocio. Nosotros te ayudamos a
          contactarlo si hace falta.
        </p>
      </>
    ),
  },
  {
    id: 'negocios',
    titulo: 'Para negocios: alta, cuentas y equipo',
    contenido: (
      <ul>
        <li>{MARCA.corto} da de alta cada negocio y le asigna su link (por ejemplo, /tu-negocio). El dueño o dueña recibe el acceso a su panel.</li>
        <li>
          El negocio es responsable por los datos que carga (servicios, precios, horarios, textos, logo) y por las personas a las que invita a su
          equipo. Cada profesional accede solo a lo que su rol le permite.
        </li>
        <li>Las credenciales son personales. Si sospechás que alguien entró a tu cuenta, avisanos enseguida.</li>
        <li>
          El negocio declara que tiene derecho a usar el nombre, el logo y las imágenes que carga, y nos autoriza a mostrarlos en su app para prestar el
          servicio.
        </li>
      </ul>
    ),
  },
  {
    id: 'datos-negocio',
    titulo: 'Para negocios: datos de tus clientes',
    contenido: (
      <>
        <p>
          Respecto de los datos de sus clientes, el negocio es el <strong>responsable</strong> de la base de datos y {MARCA.corto} actúa como{' '}
          <strong>encargado del tratamiento</strong> (art. 25 de la Ley 25.326). Por eso:
        </p>
        <ul>
          <li>Tratamos esos datos solo para prestar el servicio y según las instrucciones del negocio, nunca para fines propios.</li>
          <li>Los protegemos con medidas de seguridad y confidencialidad, y los borramos o devolvemos al terminar el servicio.</li>
          <li>
            El negocio se compromete a usar los datos de sus clientes conforme a la ley, a no cargar datos sensibles (por ejemplo, diagnósticos o
            información clínica en las notas) y a no usar la plataforma para mandar mensajes no solicitados.
          </li>
          <li>Si un cliente ejerce sus derechos de acceso, rectificación o supresión, nos ayudamos mutuamente para responder en los plazos legales.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'whatsapp',
    titulo: 'Mensajes por WhatsApp',
    contenido: (
      <>
        <p>
          Los códigos de ingreso, confirmaciones y recordatorios se envían por la plataforma oficial de WhatsApp Business de Meta, con plantillas
          aprobadas por Meta y solo sobre turnos. El negocio no puede usarlos para publicidad.
        </p>
        <p>
          El envío depende de Meta y de la conexión del celular de cada cliente, por lo que no garantizamos que todos los mensajes lleguen ni que lleguen
          en un momento exacto. Los recordatorios ayudan a reducir las faltas, pero no garantizan que los clientes asistan.
        </p>
      </>
    ),
  },
  {
    id: 'precios',
    titulo: 'Para negocios: planes, precios y pagos',
    contenido: (
      <>
        <p>
          El negocio paga un abono mensual según el plan que contrate. Los precios vigentes se informan al contratar y en este sitio. Usar la app es
          gratis para los clientes de los negocios.
        </p>
        <ul>
          <li>El abono se paga por adelantado y se factura según la normativa de AFIP/ARCA.</li>
          <li>Si cambiamos los precios, lo avisamos con al menos 30 días de anticipación; si no estás de acuerdo, podés dar de baja el servicio.</li>
          <li>Si el abono no se paga, podemos suspender el servicio después de avisarte, hasta que se regularice.</li>
        </ul>
        <p>
          <strong>Señas</strong> (cuando estén disponibles): se cobran a través de Mercado Pago, directamente en la cuenta del negocio. {MARCA.corto} no
          recibe ese dinero. Las devoluciones y la política de seña las define y gestiona el negocio, que tiene que informarlas antes de que el cliente
          pague.
        </p>
      </>
    ),
  },
  {
    id: 'uso',
    titulo: 'Uso aceptable',
    contenido: (
      <>
        <p>No está permitido:</p>
        <ul>
          <li>Usar el servicio para actividades ilegales, o para ofrecer servicios ilegales.</li>
          <li>Cargar datos falsos, de terceros sin su autorización, o contenido ofensivo o que infrinja derechos de otros.</li>
          <li>Reservar turnos que no pensás usar, o hacer reservas automáticas o masivas.</li>
          <li>Intentar acceder a datos de otros negocios o clientes, vulnerar la seguridad o sobrecargar el sistema.</li>
          <li>Copiar, revender o hacer ingeniería inversa de la plataforma.</li>
        </ul>
        <p>Si se incumplen estas reglas, podemos suspender o dar de baja la cuenta, avisando cuando sea posible.</p>
      </>
    ),
  },
  {
    id: 'propiedad',
    titulo: 'Propiedad intelectual',
    contenido: (
      <p>
        La plataforma, su diseño, su código y la marca {N} son de {MARCA.corto}. El nombre, el logo y el contenido de cada negocio son del negocio. El uso
        del servicio no transfiere ningún derecho sobre ellos, más allá de lo necesario para prestarlo.
      </p>
    ),
  },
  {
    id: 'disponibilidad',
    titulo: 'Disponibilidad y soporte',
    contenido: (
      <p>
        Hacemos todo lo razonable para que el servicio esté disponible y funcione bien, pero puede haber interrupciones por mantenimiento, fallas de
        proveedores (alojamiento, WhatsApp, Mercado Pago) o causas ajenas. Cuando podamos, avisamos los mantenimientos programados. Damos soporte a los
        negocios por los canales que informemos al contratar.
      </p>
    ),
  },
  {
    id: 'responsabilidad',
    titulo: 'Responsabilidad',
    contenido: (
      <>
        <p>{MARCA.corto} no es responsable por:</p>
        <ul>
          <li>Los servicios que prestan los negocios, ni por los conflictos entre un negocio y sus clientes.</li>
          <li>Faltas, demoras o cancelaciones de turnos, ni por mensajes que no lleguen por causas ajenas.</li>
          <li>Los datos o contenidos que cargan los negocios y los clientes.</li>
          <li>Daños indirectos o lucro cesante.</li>
        </ul>
        <p>
          Frente a los negocios, nuestra responsabilidad total se limita al monto pagado por el negocio en los últimos 3 meses. Nada de esto limita los
          derechos que la Ley 24.240 de Defensa del Consumidor les da a quienes sean consumidores, ni la responsabilidad por dolo o culpa grave.
        </p>
      </>
    ),
  },
  {
    id: 'baja',
    titulo: 'Baja del servicio',
    contenido: (
      <>
        <p>
          <strong>Negocios</strong>: pueden dar de baja el servicio cuando quieran, con efecto al final del período pagado. Antes de la baja pueden pedir
          una copia de los datos de sus clientes y turnos; después los borramos según la política de privacidad.
        </p>
        <p>
          <strong>Clientes</strong>: pueden pedir la baja de su cuenta en cualquier momento desde la app, al negocio o escribiéndonos.
        </p>
        <p>
          Si el servicio se contrata a distancia y quien lo contrata es consumidor, tiene derecho a revocar la aceptación dentro de los 10 días corridos
          (art. 34 de la Ley 24.240) mediante el botón de arrepentimiento, sin costo.
        </p>
      </>
    ),
  },
  {
    id: 'cambios',
    titulo: 'Cambios en estos términos',
    contenido: (
      <p>
        Podemos actualizar estos términos. Si el cambio es importante, lo avisamos con anticipación en la app o por mail. Seguir usando el servicio
        después de que entren en vigencia significa que los aceptás.
      </p>
    ),
  },
  {
    id: 'ley',
    titulo: 'Ley aplicable y jurisdicción',
    contenido: (
      <p>
        Estos términos se rigen por las leyes de la República Argentina. Ante cualquier conflicto, intervienen los tribunales ordinarios de{' '}
        <Dato valor={EMPRESA.jurisdiccion} falta="ciudad" />, salvo que seas consumidor: en ese caso podés elegir los tribunales de tu domicilio.
      </p>
    ),
  },
  {
    id: 'contacto',
    titulo: 'Contacto',
    contenido: (
      <p>
        <Empresa />. Consultas, reclamos y soporte: <Contacto />.
      </p>
    ),
  },
]
