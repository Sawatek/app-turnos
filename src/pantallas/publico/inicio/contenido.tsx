// Contenido de la landing (textos de cada sección). Lo "comercial" que hay que completar (nombre, contacto, precios)
// no va acá: está en ../marca.ts.
import {
  BellRing,
  Brush,
  CalendarCheck,
  ChartColumn,
  Clock,
  Gift,
  Hand,
  HeartPulse,
  LayoutDashboard,
  ListChecks,
  Palette,
  PenTool,
  Repeat2,
  Scissors,
  Smartphone,
  Smile,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import { MARCA, hayPrecios } from '../marca'
import type { Pregunta } from '../Preguntas'

/** Un dato de una lista: ícono opcional, título y texto. */
export interface Item {
  Icono?: LucideIcon
  titulo: string
  texto: string
}

// ---------- El problema ----------

export const DOLORES: Item[] = [
  { titulo: 'Se olvidan', texto: 'Sacaron el turno hace dos semanas y nadie se lo recordó. El horario queda vacío y no lo cobrás.' },
  { titulo: 'Avisan tarde, o nunca', texto: 'Cuando te enterás, ya no llegás a ofrecerle ese horario a otra persona.' },
  { titulo: 'Confirmás a mano', texto: 'Mensaje por mensaje, entre cliente y cliente. Tiempo que no estás atendiendo.' },
]

// ---------- Cómo funciona (con los recordatorios por WhatsApp adentro del paso 3) ----------

export const PASOS: Item[] = [
  {
    Icono: Palette,
    titulo: 'Te armamos tu app',
    texto: 'Con tu logo, tus colores, tus servicios, precios y horarios. Recibís tu link y un QR para el local.',
  },
  {
    Icono: Smartphone,
    titulo: 'Tus clientes reservan',
    texto: 'Desde el link en tu Instagram, tu WhatsApp o Google Maps. Eligen servicio, profesional y horario en segundos.',
  },
  {
    Icono: CalendarCheck,
    titulo: 'Se confirman solos',
    texto: 'Los mensajes salen solos desde nuestro WhatsApp oficial, y cada uno dice el nombre de tu negocio. Llegan donde tu cliente ya mira.',
  },
]

/** Lo que le llega al cliente por WhatsApp: el ciclo recordatorio → "Confirmo" → se libera, explicado una sola vez. */
export const MOMENTOS: Item[] = [
  { Icono: CalendarCheck, titulo: 'Al reservar', texto: 'Le llega la confirmación con el día, la hora, el profesional y la dirección.' },
  { Icono: BellRing, titulo: '24 horas antes', texto: 'El recordatorio con dos botones: “Confirmo” y “Cambiar horario”.' },
  { Icono: Clock, titulo: '2 horas antes', texto: 'El último aviso, con la dirección para llegar sin vueltas.' },
  { Icono: Repeat2, titulo: 'Si no puede ir', texto: 'Cambia el horario desde el mismo mensaje y ese lugar se libera para otro.' },
]

// ---------- Tu marca y funciones ----------

export const VENTAJAS_PWA: Item[] = [
  { Icono: Palette, titulo: 'Tu marca', texto: 'Tu logo, tu color y tu estilo en cada pantalla. Los colores se ajustan solos para que todo se lea bien.' },
  { Icono: Smartphone, titulo: 'Sin tiendas', texto: 'Se instala desde el link o un QR, con tu ícono en el inicio. En iPhone y en Android.' },
  { Icono: BellRing, titulo: 'Con avisos', texto: 'Con la app instalada también reciben avisos, como cuando se libera un turno.' },
]

export const FUNCIONES: Item[] = [
  {
    Icono: LayoutDashboard,
    titulo: 'Panel y agenda en vivo',
    texto: 'Cada reserva aparece al instante. Marcás quién vino y quién no, cargás turnos a mano y bloqueás francos o feriados.',
  },
  { Icono: Users, titulo: 'Tu equipo, cada uno con lo suyo', texto: 'Cada profesional tiene su acceso y ve solo su agenda. Los precios y la configuración quedan para vos.' },
  {
    Icono: Gift,
    titulo: 'Clientes y fidelidad',
    texto: 'Historial, notas privadas y tarjeta de sellos. Y una lista de quienes hace rato que no vienen, con el mensaje listo para mandar.',
  },
  { Icono: ListChecks, titulo: 'Lista de espera', texto: 'Si un horario está lleno, se anotan. Cuando alguien cancela, les avisa solo y el primero que lo toma, lo reserva.' },
  {
    Icono: ChartColumn,
    titulo: 'Reportes simples',
    texto: 'Turnos, faltas, cuántos confirman, facturación estimada y los días y horarios más pedidos. Para decidir con números, no a ojo.',
  },
]

// ---------- Rubros ----------

/** Un rubro; `demo` es el slug de una demo fija (de ahí salen su nombre y su link). */
export interface Rubro extends Item {
  demo?: 'quetul' | 'lema' | 'nailed'
}

export const RUBROS: Rubro[] = [
  { Icono: Scissors, titulo: 'Barberías', texto: '“Lo de siempre” con un toque, promos para los días flojos y tarjeta de cortes.', demo: 'quetul' },
  { Icono: Brush, titulo: 'Peluquerías y estética', texto: 'Servicios largos bien calculados: color, mechas, alisado. Sin superposiciones.' },
  { Icono: Hand, titulo: 'Uñas', texto: 'Recordatorios para que el service no se pase y la agenda de cada manicura al día.', demo: 'nailed' },
  { Icono: Smile, titulo: 'Consultorios odontológicos', texto: 'Pacientes que confirman, agenda por profesional y notas privadas de cada paciente.', demo: 'lema' },
  { Icono: HeartPulse, titulo: 'Kinesiología, psicología y nutrición', texto: 'Sesiones semanales con recordatorio, para que nadie falte a la siguiente.' },
  { Icono: PenTool, titulo: 'Estudios de tatuajes', texto: 'Sesiones largas y consultas de diseño, sin ida y vuelta de mensajes.' },
]

// ---------- Preguntas ----------

export const PREGUNTAS: Pregunta[] = [
  {
    pregunta: '¿Cuánto sale?',
    respuesta: !hayPrecios() ? (
      'Estamos terminando de definir los planes. Pedí tu demo y te pasamos una propuesta según el tamaño de tu negocio.'
    ) : (
      <>
        Depende de cuántos profesionales tengas. Mirá los <a href="#precios">planes</a>; tus clientes no pagan nada.
      </>
    ),
  },
  {
    pregunta: '¿Mis clientes tienen que bajar una app?',
    respuesta:
      'No. Entran por un link (el de tu Instagram, tu WhatsApp o un QR en el local) y reservan desde el navegador. Si quieren, la agregan al inicio del celular con tu logo, sin pasar por ninguna tienda de apps.',
  },
  {
    // El ciclo completo (recordatorio → "Confirmo" → se libera) se explica una sola vez, en "Cómo funciona".
    pregunta: '¿Cómo funcionan los recordatorios por WhatsApp?',
    respuesta: (
      <>
        Salen solos: la confirmación al reservar y los recordatorios 24 y 2 horas antes, con el botón “Confirmo”. Lo ves mensaje por mensaje en{' '}
        <a href="#como-funciona">cómo funciona</a>.
      </>
    ),
  },
  {
    pregunta: '¿Desde qué número salen los mensajes?',
    respuesta: `Desde la cuenta oficial de WhatsApp Business de ${MARCA.corto}, con el nombre de tu negocio en cada mensaje. No hace falta que pongas tu celular ni que contestes nada.`,
  },
  {
    pregunta: '¿Mis clientes necesitan usuario y contraseña?',
    respuesta: 'No. Entran con su celular y un código que les llega por WhatsApp. Si son clientes de varios negocios, usan la misma cuenta en todos.',
  },
  {
    pregunta: '¿Puedo seguir dando turnos por teléfono o en el local?',
    respuesta: 'Sí. Los cargás a mano en el panel en segundos, y si choca con otro turno te avisa. A esos clientes también les llegan los recordatorios.',
  },
  {
    pregunta: '¿Sirve si trabajo con un equipo?',
    respuesta:
      'Sí. Cada profesional tiene su acceso y ve su agenda; vos ves todo y manejás precios, horarios y configuración. Cada uno puede tener sus propios servicios y horarios.',
  },
  {
    pregunta: '¿De quién son los datos de mis clientes?',
    respuesta: (
      <>
        Tuyos. Nosotros los guardamos y procesamos por cuenta tuya, solo para que funcionen los turnos y los recordatorios, cumpliendo la Ley 25.326 de
        protección de datos personales. Cada negocio ve únicamente a sus propios clientes. Más detalle en la <Link to="/privacidad">política de privacidad</Link>.
      </>
    ),
  },
  {
    pregunta: '¿Funciona en iPhone y en Android?',
    respuesta:
      'Sí, en cualquier celular con un navegador actualizado, y también en la compu. En Android se instala con un toque; en iPhone, desde Compartir → Agregar a inicio (la app les muestra cómo).',
  },
]
