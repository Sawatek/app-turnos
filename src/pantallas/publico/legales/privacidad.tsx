// Política de privacidad (borrador). Ley 25.326 de Protección de los Datos Personales y normas de la AAIP.
// BORRADOR: revisar con un abogado antes de publicar.
import { Link } from 'react-router'
import { MARCA } from '../marca'
import { Contacto, Dato, Empresa, type SeccionLegal } from './comunes'

const N = MARCA.nombre

export const PRIVACIDAD: SeccionLegal[] = [
  {
    id: 'quienes-somos',
    titulo: 'Quiénes somos y a quién se aplica',
    contenido: (
      <>
        <p>
          {N} es una plataforma que les permite a negocios que trabajan con turnos (barberías, peluquerías, centros de estética, consultorios, estudios de
          tatuajes y similares) tener su propia app de reservas, mandar recordatorios y administrar su agenda. La presta <Empresa /> (en adelante,
          “{MARCA.corto}”, “nosotros”).
        </p>
        <p>Esta política explica qué datos personales tratamos, para qué, con quién los compartimos y cómo podés ejercer tus derechos. Se aplica a:</p>
        <ul>
          <li>
            <strong>Clientes de los negocios</strong>: las personas que sacan turnos en la app de un negocio.
          </li>
          <li>
            <strong>Negocios y sus equipos</strong>: dueños, dueñas y profesionales que usan el panel.
          </li>
          <li>
            <strong>Visitantes</strong> de este sitio.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'roles',
    titulo: 'Nuestro rol: responsable y encargado del tratamiento',
    contenido: (
      <>
        <p>
          <strong>Datos de los clientes de cada negocio.</strong> Cada negocio es el <em>responsable</em> de la base de datos de sus clientes: decide para
          qué y cómo se usan. {MARCA.corto} actúa como <em>encargado del tratamiento</em> (art. 25 de la Ley 25.326): los guarda y procesa por cuenta y
          orden del negocio, solo para prestarle el servicio, y no los usa para fines propios ni los cede a terceros, salvo a los proveedores necesarios
          que se detallan abajo.
        </p>
        <p>
          <strong>Datos de los negocios, sus equipos y visitantes del sitio.</strong> En este caso {MARCA.corto} es el <em>responsable</em> del
          tratamiento.
        </p>
        <p>
          Si sos cliente de un negocio y querés saber qué hace con tus datos fuera de la app (por ejemplo, si te escribe por otros medios), consultalo
          directamente con ese negocio.
        </p>
      </>
    ),
  },
  {
    id: 'datos',
    titulo: 'Qué datos guardamos',
    contenido: (
      <>
        <h3>Si sacás turnos en la app de un negocio</h3>
        <ul>
          <li>Tu nombre y tu número de celular (con el que entrás a la app).</li>
          <li>Tus turnos: servicio, profesional, día, hora, estado (confirmado, cancelado, si fuiste o no) y, si corresponde, el precio y la seña.</li>
          <li>Tu historial con ese negocio y tu tarjeta de fidelidad.</li>
          <li>
            Notas que el negocio cargue sobre vos (por ejemplo, “prefiere a Nico”). Son privadas del negocio: no las ve ningún otro negocio ni otros
            clientes.
          </li>
          <li>Si las activás, los datos técnicos para mandarte notificaciones al celular (la suscripción del navegador, sin tu ubicación ni contactos).</li>
        </ul>
        <h3>Si usás el panel de un negocio</h3>
        <ul>
          <li>Nombre, mail y rol (dueño o profesional). La contraseña se guarda cifrada: nadie, ni siquiera nosotros, puede verla.</li>
          <li>Los datos del negocio: nombre, logo, colores, dirección, WhatsApp, servicios, precios, horarios y equipo.</li>
        </ul>
        <h3>En todos los casos</h3>
        <ul>
          <li>
            Datos técnicos mínimos para que el servicio funcione y sea seguro: registros de acceso, dirección IP, tipo de dispositivo y navegador, y
            errores.
          </li>
        </ul>
        <p>
          <strong>No pedimos datos sensibles</strong> (como datos de salud, origen étnico o religión) y la app no está pensada para guardarlos. Los
          consultorios y centros de salud no deben cargar en las notas información clínica ni diagnósticos: para eso deben usar su historia clínica.
        </p>
      </>
    ),
  },
  {
    id: 'para-que',
    titulo: 'Para qué los usamos',
    contenido: (
      <>
        <ul>
          <li>Darte acceso con tu celular y un código, y mantener tu sesión abierta.</li>
          <li>Reservar, confirmar, cambiar y cancelar turnos, y mostrárselos al negocio y a su profesional.</li>
          <li>Mandarte la confirmación del turno, los recordatorios (24 h y 2 h antes) y los avisos de cambios o cancelaciones.</li>
          <li>Que el negocio administre su agenda, sus clientes y su programa de fidelidad.</li>
          <li>Prevenir abusos y fraudes, resolver problemas técnicos y dar soporte.</li>
          <li>Cumplir obligaciones legales.</li>
        </ul>
        <p>
          <strong>No vendemos datos personales</strong>, no mostramos publicidad de terceros y no usamos los datos de los clientes de un negocio para
          ofrecerles servicios de otros negocios.
        </p>
      </>
    ),
  },
  {
    id: 'base-legal',
    titulo: 'Consentimiento',
    contenido: (
      <>
        <p>
          Tratamos tus datos con tu consentimiento libre, expreso e informado (art. 5 de la Ley 25.326), que das al ingresar a la app y sacar un turno
          después de haber sido informado de esta política, y en la medida necesaria para cumplir la relación entre vos y el negocio (el turno que
          reservaste). Podés retirar tu consentimiento en cualquier momento; en ese caso no vamos a poder seguir gestionando tus turnos.
        </p>
        <p>
          Antes de pedirte el celular, la app te informa: que tus datos los recibe el negocio y los procesa {MARCA.corto}; para qué se usan; que darlos
          es necesario para reservar; y cómo ejercer tus derechos.
        </p>
      </>
    ),
  },
  {
    id: 'whatsapp',
    titulo: 'Mensajes por WhatsApp y notificaciones',
    contenido: (
      <>
        <p>
          Los códigos de ingreso, las confirmaciones y los recordatorios se mandan por WhatsApp, a través de la plataforma oficial de WhatsApp Business de
          Meta Platforms. Para eso, compartimos con Meta tu número de celular y el texto del mensaje (por ejemplo, el nombre del negocio, el día y la hora
          del turno). Meta trata esos datos según sus propias condiciones y su política de privacidad.
        </p>
        <p>
          Solo te mandamos mensajes relacionados con tus turnos. No mandamos publicidad por WhatsApp. Si un negocio quiere escribirte con promociones, lo
          hace por su cuenta y bajo su responsabilidad.
        </p>
        <p>
          Si respondés un mensaje (por ejemplo, tocando “Confirmo” o “Cambiar horario”), registramos tu respuesta para actualizar tu turno. Podés pedirle
          al negocio o a nosotros dejar de recibir recordatorios; los códigos de ingreso son necesarios para entrar a la app.
        </p>
        <p>
          Las notificaciones en el celular son opcionales: las activás vos y las podés desactivar en cualquier momento desde la configuración del
          navegador o del celular.
        </p>
      </>
    ),
  },
  {
    id: 'proveedores',
    titulo: 'Con quién los compartimos',
    contenido: (
      <>
        <p>Compartimos datos solo con:</p>
        <ul>
          <li>
            <strong>El negocio</strong> donde sacás el turno (y su equipo, según el rol de cada uno). Un negocio nunca ve los clientes ni los turnos de
            otro.
          </li>
          <li>
            <strong>Proveedores que nos ayudan a prestar el servicio</strong>, que actúan por nuestra cuenta y con obligaciones de confidencialidad y
            seguridad: alojamiento del sitio (Vercel), base de datos y autenticación (Supabase), mensajería (WhatsApp Business de Meta) y, cuando estén
            disponibles, envío de mails y cobro de señas (Mercado Pago, que trata los datos de pago directamente).
          </li>
          <li>
            <strong>Autoridades</strong>, cuando una ley o una orden judicial nos obligue.
          </li>
        </ul>
        <p>
          Algunos de estos proveedores guardan datos en servidores fuera de la Argentina (por ejemplo, en Estados Unidos o la Unión Europea). En esos
          casos hacemos la transferencia con las garantías que exige el art. 12 de la Ley 25.326 y la normativa de la Agencia de Acceso a la Información
          Pública (por ejemplo, cláusulas contractuales modelo).
        </p>
      </>
    ),
  },
  {
    id: 'almacenamiento',
    titulo: 'Cookies y almacenamiento en tu dispositivo',
    contenido: (
      <>
        <p>
          <strong>No usamos cookies de publicidad ni de seguimiento</strong>, ni herramientas que te sigan entre sitios. Usamos el almacenamiento local de
          tu navegador (como <em>localStorage</em> y la caché de la app) solo para lo necesario:
        </p>
        <ul>
          <li>Mantener tu sesión abierta para que no tengas que pedir un código cada vez.</li>
          <li>Recordar la configuración del negocio y tus preferencias, y que la app funcione sin conexión o se pueda instalar.</li>
          <li>En las demos, guardar los turnos de prueba en tu propio navegador.</li>
        </ul>
        <p>
          Podés borrar estos datos cuando quieras desde la configuración de tu navegador (“Borrar datos del sitio”). Si lo hacés, vas a tener que volver
          a ingresar.
        </p>
      </>
    ),
  },
  {
    id: 'conservacion',
    titulo: 'Cuánto tiempo los guardamos',
    contenido: (
      <>
        <p>
          Guardamos los datos mientras el negocio use {N} y vos sigas siendo su cliente. Si el negocio deja el servicio, puede pedir una copia de sus
          datos y después los borramos dentro de los 90 días, salvo lo que una ley nos obligue a conservar. Las copias de seguridad se borran en sus
          ciclos normales.
        </p>
        <p>Los registros técnicos se guardan por el tiempo mínimo necesario para la seguridad y el soporte.</p>
      </>
    ),
  },
  {
    id: 'seguridad',
    titulo: 'Cómo los protegemos',
    contenido: (
      <ul>
        <li>Toda la comunicación viaja cifrada (HTTPS).</li>
        <li>
          Los permisos los controla la base de datos, no la pantalla: cada negocio solo puede ver a sus clientes, cada profesional solo su agenda y cada
          cliente solo sus turnos.
        </li>
        <li>Las contraseñas se guardan cifradas y el ingreso de clientes usa códigos de un solo uso.</li>
        <li>El acceso de nuestro equipo a los datos es limitado y solo para soporte o seguridad.</li>
      </ul>
    ),
  },
  {
    id: 'derechos',
    titulo: 'Tus derechos',
    contenido: (
      <>
        <p>Como titular de tus datos tenés derecho a:</p>
        <ul>
          <li>
            <strong>Acceso</strong>: saber qué datos tuyos tenemos. Respondemos dentro de los 10 días corridos (art. 14).
          </li>
          <li>
            <strong>Rectificación y actualización</strong>: corregir datos equivocados o desactualizados.
          </li>
          <li>
            <strong>Supresión</strong>: pedir que se borren, salvo que debamos conservarlos por ley. Rectificación, actualización y supresión se
            resuelven dentro de los 5 días hábiles (art. 16).
          </li>
          <li>
            <strong>Retirar tu consentimiento</strong> y dejar de recibir recordatorios.
          </li>
        </ul>
        <p>
          Podés pedirlo al negocio donde sacás turnos o escribirnos a <Contacto />, desde el celular o mail registrado o acreditando tu identidad. Si nos
          escribís a nosotros por datos de un negocio, se lo informamos y lo resolvemos juntos. Algunos datos los podés cambiar vos mismo desde tu perfil
          en la app.
        </p>
        <p className="aviso-legal">
          El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a
          seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley N° 25.326.
        </p>
        <p className="aviso-legal">
          La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las
          denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de
          protección de datos personales.
        </p>
      </>
    ),
  },
  {
    id: 'menores',
    titulo: 'Menores de edad',
    contenido: (
      <p>
        La app no está dirigida a menores de 13 años. Si tenés entre 13 y 18, usala con la autorización de tu madre, padre o tutor. Si sos adulto
        responsable y creés que un menor nos dio datos sin autorización, escribinos y los borramos.
      </p>
    ),
  },
  {
    id: 'cambios',
    titulo: 'Cambios en esta política',
    contenido: (
      <p>
        Si cambiamos algo importante, lo vamos a avisar en la app o por mail antes de que empiece a regir. La fecha de la última actualización figura
        arriba. También podés leer los <Link to="/terminos">términos y condiciones</Link>.
      </p>
    ),
  },
  {
    id: 'contacto',
    titulo: 'Contacto',
    contenido: (
      <>
        <p>
          Responsable: <Empresa />. Para consultas sobre privacidad o para ejercer tus derechos: <Contacto />.
        </p>
        <p>
          Inscripción en el Registro Nacional de Bases de Datos: <Dato valor="" falta="número de inscripción" />.
        </p>
      </>
    ),
  },
]
