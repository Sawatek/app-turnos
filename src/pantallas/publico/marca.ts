// Todo lo "comercial" del sitio público en un solo lugar: nombre, slogan, contacto, empresa y planes.
// El nombre comercial todavía no está decidido: cambiarlo acá cambia la landing, los legales y la 404.
// Lo que dice COMPLETAR hay que llenarlo antes de publicar. Si queda vacío, el sitio lo resuelve solo
// (por ejemplo: sin WhatsApp ni mail de contacto, "Pedí tu demo" pasa a decir "Ver la demo" y lleva a la demo).
// index.html tiene su propia copia del nombre y la descripción (meta tags): actualizarla también.

export const MARCA = {
  nombre: 'SawaTek Turnos',
  /** Nombre corto (logo, firma de los mensajes). */
  corto: 'SawaTek',
  slogan: 'Turnos que se confirman solos',
  descripcion:
    'La app de turnos con la marca de tu negocio: tus clientes reservan en segundos, les llega el recordatorio por WhatsApp y confirman con un toque.',
  /** Color y modo del sitio (se aplican con useTemaNegocio): tinta azul de sello sobre papel. */
  color: '#2b44c8',
  modo: 'claro',
  personalidad: 'clasica',
} as const

/**
 * El papel del sitio: la paleta generada tiñe los neutros con el tono de la marca (quedaría un blanco azulado de oficina);
 * el sitio de la plataforma usa un papel cálido, de libreta. Mismos contrastes (texto y "suave" siguen pasando AA).
 * Lo aplican useMarcaSitio (en el navegador) y el pre-render de la portada (estatico.tsx).
 */
export const PAPEL_SITIO = {
  '--t-fondo': '#f4efe4',
  '--t-superficie': '#fffcf5',
  '--t-superficie-2': '#ebe4d6',
  '--t-linea': '#d9d0bd',
  '--t-acento-suave': '#e4e5f6',
} as const

/**
 * El papel del sitio en modo oscuro: papel carbónico cálido (no el negro azulado que saldría de la paleta) y la tinta
 * azul más clara para que el texto en tinta pase AA sobre todas las superficies (5,9:1 sobre la más clara).
 */
export const PAPEL_SITIO_OSCURO = {
  '--t-fondo': '#14130f',
  '--t-superficie': '#1c1a16',
  '--t-superficie-2': '#26231d',
  '--t-linea': '#3a352c',
  '--t-texto': '#f3eee4',
  '--t-suave': '#b3ab9c',
  '--t-acento-texto': '#8199ff',
  '--t-acento-suave': '#1d2340',
} as const

export const CONTACTO = {
  /** COMPLETAR: WhatsApp comercial con código de país y sin signos, ej.: '5491123456789'. Vacío = no se muestra. */
  whatsapp: '',
  /** COMPLETAR: mail comercial y de privacidad, ej.: 'hola@sawatek.com.ar'. Vacío = no se muestra. */
  email: '',
  /** Texto con el que arranca el WhatsApp de "Pedí tu demo". */
  mensajeDemo: 'Hola! Tengo un negocio y quiero ver la demo de la app de turnos.',
}

/** Datos de la empresa para los legales. COMPLETAR antes de publicar (vacío se muestra como "a completar"). */
export const EMPRESA = {
  razonSocial: '',
  cuit: '',
  domicilio: '',
  /** Ciudad de los tribunales para los términos, ej.: 'la Ciudad Autónoma de Buenos Aires'. */
  jurisdiccion: '',
  /** Fecha de la última actualización de los legales. */
  actualizacionLegales: '16/11/2026',
}

export interface Plan {
  nombre: string
  /** Para quién es, en una línea. */
  para: string
  /** Precio mensual en pesos (sin IVA). null = "A definir". COMPLETAR. */
  precioMensual: number | null
  incluye: string[]
  destacado?: boolean
}

/** COMPLETAR: precios. Mientras estén en null, la landing muestra "A definir" y lleva a pedir una propuesta. */
export const PLANES: Plan[] = [
  {
    nombre: 'Independiente',
    para: 'Para quien atiende solo o sola',
    precioMensual: null,
    incluye: ['Tu app con tu marca', '1 profesional', 'Recordatorios y confirmación por WhatsApp', 'Panel y agenda en el celular'],
  },
  {
    nombre: 'Equipo',
    para: 'Para locales con varios profesionales',
    precioMensual: null,
    incluye: ['Todo lo de Independiente', 'Hasta 6 profesionales, cada uno con su agenda', 'Clientes, historial y notas', 'Fidelidad y promos'],
    destacado: true,
  },
  {
    nombre: 'A medida',
    para: 'Cadenas, varias sucursales o consultorios grandes',
    precioMensual: null,
    incluye: ['Todo lo de Equipo', 'Profesionales sin límite', 'Varias sucursales', 'Acompañamiento en la puesta en marcha'],
  },
]

/** Demos de fábrica que se muestran en la landing (tienen que existir en src/plantillas/demos.ts). */
export const DEMOS = { barberia: '/quetul', consultorio: '/lema', unas: '/nailed' } as const

export type Contacto = typeof CONTACTO

/**
 * A dónde lleva "Pedí tu demo": WhatsApp, si no mail, y si no hay contacto cargado, la lista de demos.
 * Recibe el contacto (por defecto, el de arriba) para poder probar cada rama sin tocar CONTACTO.
 */
export function linkContacto(contacto: Contacto = CONTACTO): { href: string; externo: boolean; via: 'whatsapp' | 'email' | 'demos' } {
  if (contacto.whatsapp)
    return { href: `https://wa.me/${contacto.whatsapp}?text=${encodeURIComponent(contacto.mensajeDemo)}`, externo: true, via: 'whatsapp' }
  if (contacto.email)
    return { href: `mailto:${contacto.email}?subject=${encodeURIComponent(`Demo de ${MARCA.nombre}`)}`, externo: true, via: 'email' }
  return { href: '/demos', externo: false, via: 'demos' }
}

const pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
export const precioPlan = (p: Plan) => (p.precioMensual == null ? null : pesos.format(p.precioMensual))
/** true si algún plan ya tiene precio cargado. */
export const hayPrecios = () => PLANES.some((p) => p.precioMensual != null)
