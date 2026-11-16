import type { Negocio, RubroId } from '@/dominio/tipos'

type Plantilla = Omit<Negocio, 'slug' | 'nombre' | 'bajada' | 'direccion' | 'whatsapp' | 'logo'> & {
  etiqueta: string
  zonaEjemplo: string
}

const LUN_SAB = [1, 2, 3, 4, 5, 6]
const LUN_VIE = [1, 2, 3, 4, 5]

const mensajesBase = {
  recordatorio24: 'Hola {nombre}! Mañana {hora} tenés turno de {servicio} con {profesional} en {negocio}. ¿Confirmás?',
  recordatorio2: 'En 2 horas te esperamos en {negocio} ({hora}, {profesional}). {direccion}.',
  recuperar: 'Hola {nombre}! Hace un tiempo que no te vemos por {negocio}. Esta semana tenemos horarios libres, sacá tu turno desde la app.',
}

export const RUBROS: Record<RubroId, Plantilla> = {
  barberia: {
    etiqueta: 'Barbería',
    zonaEjemplo: 'Moreno',
    rubro: 'barberia',
    color: '#e0b352',
    modo: 'oscuro',
    personalidad: 'clasica',
    claim: 'Sacá tu turno en 20 segundos, sin llamar ni esperar respuesta.',
    servicios: [
      { id: 'corte', nombre: 'Corte', minutos: 30, precio: 12000 },
      { id: 'barba', nombre: 'Barba', minutos: 20, precio: 8000 },
      { id: 'corte-barba', nombre: 'Corte + barba', minutos: 45, precio: 17000, etiqueta: 'Más pedido' },
      { id: 'color', nombre: 'Color / mechas', minutos: 60, precio: 25000 },
    ],
    staff: [
      { id: 'p1', nombre: 'Tulio', rol: 'Dueño' },
      { id: 'p2', nombre: 'Nico', rol: 'Barbero' },
    ],
    horario: { dias: LUN_SAB, desde: '09:00', hasta: '20:00', descanso: ['13:00', '14:00'], intervalo: 15 },
    sena: 3000,
    promosTitulo: 'Promos de la semana',
    promos: [
      { etiqueta: 'Martes', titulo: '2x1 en corte', detalle: 'Vení con un amigo y pagan uno solo.' },
      { etiqueta: 'Solo app', titulo: 'Corte + barba $15.000', detalle: 'Reservando desde acá, en vez de $17.000.' },
    ],
    fidelidad: { meta: 5, texto: 'Cada 5 cortes, el siguiente es gratis.', premio: 'Corte gratis' },
    textos: { pregunta: '¿Qué te hacés?', conQuien: '¿Con quién?', reservar: 'Reservar', cliente: 'cliente', clientes: 'clientes' },
    mensajes: mensajesBase,
    recuperarDias: 35,
  },
  peluqueria: {
    etiqueta: 'Peluquería / estética',
    zonaEjemplo: 'Palermo',
    rubro: 'peluqueria',
    color: '#c2185b',
    modo: 'claro',
    personalidad: 'moderna',
    claim: 'Tu próximo turno, en dos toques. Te avisamos antes para que no se te pase.',
    servicios: [
      { id: 'corte', nombre: 'Corte y brushing', minutos: 45, precio: 18000 },
      { id: 'color', nombre: 'Color', minutos: 90, precio: 38000 },
      { id: 'mechas', nombre: 'Mechas / balayage', minutos: 150, precio: 65000, etiqueta: 'Tendencia' },
      { id: 'alisado', nombre: 'Alisado', minutos: 120, precio: 55000 },
    ],
    staff: [
      { id: 'p1', nombre: 'Flor', rol: 'Colorista' },
      { id: 'p2', nombre: 'Juli', rol: 'Estilista' },
      { id: 'p3', nombre: 'Cami', rol: 'Estilista', servicios: ['corte', 'alisado'] },
    ],
    horario: { dias: [2, 3, 4, 5, 6], desde: '10:00', hasta: '20:00', intervalo: 15 },
    sena: 5000,
    promosTitulo: 'Novedades',
    promos: [
      { etiqueta: 'Miércoles', titulo: '20% en color', detalle: 'Reservando desde la app.' },
      { etiqueta: 'Nuevo', titulo: 'Tratamiento de keratina', detalle: 'Consultá con Flor en tu próximo turno.' },
    ],
    fidelidad: { meta: 6, texto: 'Sumá 6 visitas y te regalamos un tratamiento.', premio: 'Tratamiento de regalo' },
    textos: { pregunta: '¿Qué te hacés?', conQuien: '¿Con quién?', reservar: 'Reservar', cliente: 'clienta', clientes: 'clientas' },
    mensajes: mensajesBase,
    recuperarDias: 45,
  },
  unas: {
    etiqueta: 'Uñas',
    zonaEjemplo: 'Caballito',
    rubro: 'unas',
    color: '#e8708a',
    modo: 'claro',
    personalidad: 'moderna',
    claim: 'Elegí servicio, día y horario. Te avisamos un día antes.',
    servicios: [
      { id: 'semi', nombre: 'Esmaltado semipermanente', minutos: 60, precio: 14000 },
      { id: 'kapping', nombre: 'Kapping', minutos: 75, precio: 18000 },
      { id: 'esculpidas', nombre: 'Esculpidas', minutos: 120, precio: 28000, etiqueta: 'Más pedido' },
      { id: 'service', nombre: 'Service / retoque', minutos: 60, precio: 16000 },
    ],
    staff: [
      { id: 'p1', nombre: 'Agus', rol: 'Manicura' },
      { id: 'p2', nombre: 'Meli', rol: 'Manicura' },
    ],
    horario: { dias: LUN_SAB, desde: '10:00', hasta: '19:00', intervalo: 15 },
    sena: 4000,
    promosTitulo: 'Promos',
    promos: [
      { etiqueta: 'Lunes', titulo: 'Semi + pies $22.000', detalle: 'Solo reservando desde la app.' },
      { etiqueta: 'Amigas', titulo: 'Traé una amiga', detalle: 'Las dos tienen 15% en esculpidas.' },
    ],
    fidelidad: { meta: 5, texto: 'Cada 5 turnos, un esmaltado de regalo.', premio: 'Esmaltado gratis' },
    textos: { pregunta: '¿Qué te hacés?', conQuien: '¿Con quién?', reservar: 'Reservar', cliente: 'clienta', clientes: 'clientas' },
    mensajes: mensajesBase,
    recuperarDias: 30,
  },
  odontologia: {
    etiqueta: 'Consultorio odontológico',
    zonaEjemplo: 'Paso del Rey',
    rubro: 'odontologia',
    color: '#2a9d8f',
    modo: 'claro',
    personalidad: 'serena',
    claim: 'Pedí tu turno, recibí el recordatorio y confirmá con un toque.',
    servicios: [
      { id: 'consulta', nombre: 'Consulta', minutos: 30, precio: 0, detalle: 'Obra social o particular' },
      { id: 'limpieza', nombre: 'Limpieza', minutos: 45, precio: 0 },
      { id: 'control', nombre: 'Control', minutos: 20, precio: 0 },
      { id: 'urgencia', nombre: 'Urgencia / dolor', minutos: 30, precio: 0, etiqueta: 'Prioridad' },
    ],
    staff: [
      { id: 'p1', nombre: 'Dra. Lema', rol: 'Odontóloga' },
      { id: 'p2', nombre: 'Dr. Paz', rol: 'Ortodoncia', servicios: ['consulta', 'control'] },
    ],
    horario: { dias: LUN_VIE, desde: '09:00', hasta: '18:00', descanso: ['13:00', '14:30'], intervalo: 15 },
    sena: 0,
    promosTitulo: 'Avisos del consultorio',
    promos: [
      { etiqueta: 'Obras sociales', titulo: 'OSDE · Swiss Medical · IOMA', detalle: 'Traé el carnet y el DNI.' },
      { etiqueta: 'Urgencias', titulo: 'Turnos del día', detalle: 'Si hay dolor, quedan lugares por día para urgencias.' },
    ],
    fidelidad: { meta: 2, texto: 'Te avisamos cuando te toque el próximo control.', premio: 'Control al día' },
    textos: { pregunta: '¿Qué necesitás?', conQuien: '¿Con qué profesional?', reservar: 'Pedir turno', cliente: 'paciente', clientes: 'pacientes' },
    mensajes: {
      recordatorio24: 'Hola {nombre}. Te recordamos tu turno de {servicio} mañana {hora} con {profesional} en {negocio}. ¿Confirmás asistencia?',
      recordatorio2: 'Hoy {hora} tenés turno con {profesional}. Traé el carnet de la obra social. Si no podés venir, cancelá desde la app así le damos el lugar a otro paciente.',
      recuperar: 'Hola {nombre}. Ya pasaron más de 6 meses de tu último control en {negocio}. Pedí tu turno desde la app.',
    },
    recuperarDias: 180,
  },
  salud: {
    etiqueta: 'Salud (kinesio, psico, nutri)',
    zonaEjemplo: 'Haedo',
    rubro: 'salud',
    color: '#4f6bd8',
    modo: 'claro',
    personalidad: 'serena',
    claim: 'Reservá tu sesión cuando quieras. Te recordamos un día antes.',
    servicios: [
      { id: 'primera', nombre: 'Primera consulta', minutos: 60, precio: 30000 },
      { id: 'sesion', nombre: 'Sesión', minutos: 45, precio: 22000 },
      { id: 'online', nombre: 'Sesión online', minutos: 45, precio: 20000, etiqueta: 'Por videollamada' },
    ],
    staff: [
      { id: 'p1', nombre: 'Lic. Sosa', rol: 'Kinesióloga' },
      { id: 'p2', nombre: 'Lic. Ferro', rol: 'Kinesiólogo' },
    ],
    horario: { dias: LUN_VIE, desde: '08:00', hasta: '20:00', intervalo: 15 },
    sena: 0,
    promosTitulo: 'Para tener en cuenta',
    promos: [
      { etiqueta: 'Paquetes', titulo: '10 sesiones', detalle: 'Abonando el paquete, 15% de descuento.' },
      { etiqueta: 'Cancelaciones', titulo: 'Avisá con 24 h', detalle: 'Así otra persona puede usar el horario.' },
    ],
    fidelidad: { meta: 10, texto: 'Tu tratamiento: sesiones realizadas.', premio: 'Alta del tratamiento' },
    textos: { pregunta: '¿Qué necesitás?', conQuien: '¿Con qué profesional?', reservar: 'Reservar', cliente: 'paciente', clientes: 'pacientes' },
    mensajes: mensajesBase,
    recuperarDias: 21,
  },
  tatuajes: {
    etiqueta: 'Tatuajes',
    zonaEjemplo: 'San Telmo',
    rubro: 'tatuajes',
    color: '#ef4444',
    modo: 'oscuro',
    personalidad: 'clasica',
    claim: 'Reservá tu sesión y dejá la seña desde el celular.',
    servicios: [
      { id: 'consulta', nombre: 'Consulta de diseño', minutos: 30, precio: 0 },
      { id: 'chico', nombre: 'Tatuaje chico', minutos: 60, precio: 45000 },
      { id: 'mediano', nombre: 'Tatuaje mediano', minutos: 180, precio: 120000 },
      { id: 'sesion', nombre: 'Sesión completa', minutos: 300, precio: 220000, etiqueta: 'Día entero' },
    ],
    staff: [
      { id: 'p1', nombre: 'Rama', rol: 'Tatuador' },
      { id: 'p2', nombre: 'Vicky', rol: 'Tatuadora · fine line' },
    ],
    horario: { dias: [2, 3, 4, 5, 6], desde: '12:00', hasta: '21:00', intervalo: 30 },
    sena: 15000,
    promosTitulo: 'Del estudio',
    promos: [
      { etiqueta: 'Flash day', titulo: 'Diseños flash $35.000', detalle: 'Último sábado de cada mes.' },
      { etiqueta: 'Cuidados', titulo: 'Kit de curación incluido', detalle: 'Con cada tatuaje.' },
    ],
    fidelidad: { meta: 3, texto: 'En tu tercer tatuaje, 20% off.', premio: '20% off' },
    textos: { pregunta: '¿Qué te querés hacer?', conQuien: '¿Con quién?', reservar: 'Reservar', cliente: 'cliente', clientes: 'clientes' },
    mensajes: mensajesBase,
    recuperarDias: 120,
  },
}

export const LISTA_RUBROS = Object.entries(RUBROS).map(([id, p]) => ({ id: id as RubroId, etiqueta: p.etiqueta }))

export const slugDe = (nombre: string) =>
  nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'mi-negocio'

export function negocioDesdePlantilla(
  rubro: RubroId,
  datos: { nombre: string; zona?: string; direccion?: string; whatsapp?: string; logo?: string; color?: string; slug?: string },
): Negocio {
  const { etiqueta, zonaEjemplo, ...base } = structuredClone(RUBROS[rubro])
  const zona = datos.zona?.trim() || zonaEjemplo
  return {
    ...base,
    slug: datos.slug ?? slugDe(datos.nombre),
    nombre: datos.nombre.trim(),
    bajada: `${etiqueta.split(' (')[0]!.split(' / ')[0]} · ${zona}`,
    direccion: datos.direccion?.trim() || `Av. Rivadavia 1200, ${zona}`,
    whatsapp: datos.whatsapp?.trim() || '11 2345-6789',
    logo: datos.logo,
    color: datos.color ?? base.color,
  }
}
