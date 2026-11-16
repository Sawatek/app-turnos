// Tipos del dominio. Todo es serializable a JSON: así la configuración de un negocio
// puede vivir en el navegador (hoy) o en Supabase (después) sin cambios.

export type Personalidad = 'moderna' | 'clasica' | 'serena'
export type Modo = 'claro' | 'oscuro'
export type RubroId = 'barberia' | 'peluqueria' | 'unas' | 'odontologia' | 'salud' | 'tatuajes'

export interface Servicio {
  id: string
  nombre: string
  minutos: number
  /** Precio en pesos. 0 = no se muestra precio (ej.: obra social). */
  precio: number
  detalle?: string
  etiqueta?: string
}

export interface Profesional {
  id: string
  nombre: string
  rol: string
  /** Servicios que hace. Vacío o ausente = todos. */
  servicios?: string[]
}

export interface Horario {
  /** Días que abre: 0 = domingo … 6 = sábado. */
  dias: number[]
  desde: string // 'HH:mm'
  hasta: string // 'HH:mm'
  descanso?: [string, string]
  /** Cada cuántos minutos arranca un turno. */
  intervalo: number
}

export interface Promo {
  etiqueta: string
  titulo: string
  detalle: string
}

export interface Negocio {
  slug: string
  nombre: string
  rubro: RubroId
  /** Línea corta debajo del nombre: "Barbería · Moreno". */
  bajada: string
  direccion: string
  whatsapp: string
  /** Imagen del logo (data URL o URL). Sin logo se usan las iniciales. */
  logo?: string
  color: string
  modo: Modo
  personalidad: Personalidad
  claim: string
  servicios: Servicio[]
  staff: Profesional[]
  horario: Horario
  /** Seña en pesos. 0 = sin seña. */
  sena: number
  promosTitulo: string
  promos: Promo[]
  fidelidad: { meta: number; texto: string; premio: string }
  textos: {
    pregunta: string
    conQuien: string
    reservar: string
    cliente: string // "cliente" / "paciente"
    clientes: string
  }
  /** Plantillas con {nombre} {hora} {dia} {servicio} {profesional} {negocio} {direccion}. */
  mensajes: { recordatorio24: string; recordatorio2: string; recuperar: string }
  /** Días sin venir para considerar a alguien "para recuperar". */
  recuperarDias: number
}

export type EstadoTurno = 'pendiente' | 'confirmado' | 'cancelado' | 'asistio' | 'falto'

export interface Turno {
  id: string
  clienteNombre: string
  clienteTel: string
  servicioId: string
  profesionalId: string
  /** Inicio en ISO (UTC). */
  inicio: string
  minutos: number
  estado: EstadoTurno
  senaPagada: number
  /** Si lo sacó el usuario de la demo (y no es dato de ejemplo). */
  propio: boolean
  recordatorios: { r24?: string; r2?: string }
  creado: string
}

export interface ClienteResumen {
  nombre: string
  tel: string
  ultimaVisita: string // ISO
  visitas: number
  servicioHabitual: string
}

export type TipoAviso = 'codigo' | 'confirmacion' | 'r24' | 'r2' | 'promo' | 'sistema'

export interface Aviso {
  id: string
  tipo: TipoAviso
  canal: 'whatsapp' | 'push'
  texto: string
  turnoId?: string
  creado: string
  visto: boolean
}
