// Página principal del producto: landing para dueños de negocios que viven de sus turnos.
// Textos comerciales (nombre, slogan, contacto, precios) en ./marca.ts.
import { MotionConfig, motion } from 'motion/react'
import {
  ArrowRight,
  BellRing,
  Brush,
  CalendarCheck,
  Check,
  Gift,
  Hand,
  HeartPulse,
  LayoutDashboard,
  MessageCircle,
  Palette,
  PenTool,
  QrCode,
  Scissors,
  Smartphone,
  Smile,
  Store,
  UserX,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router'
import { DEMOS_FIJAS } from '@/plantillas/demos'
import { estiloTema } from '@/tema/TemaNegocio'
import { cn } from '@/ui/cn'
import { CalculadoraFaltas } from './CalculadoraFaltas'
import { CtaDemo, EnlaceBoton, Encabezado, Pie, SaltarAlContenido, useMarcaSitio } from './comunes'
import { CONTACTO, DEMOS, MARCA, PLANES, linkContacto, precioPlan } from './marca'
import { MockupCelular } from './MockupCelular'
import { Preguntas, type Pregunta } from './Preguntas'

const entrada = (retraso = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, delay: retraso, ease: [0.2, 0, 0, 1] as const } },
})

function Titulo({ id, antetitulo, titulo, bajada, centrado }: { id: string; antetitulo: string; titulo: string; bajada?: React.ReactNode; centrado?: boolean }) {
  return (
    <div className={cn('max-w-2xl', centrado && 'mx-auto text-center')}>
      <p className="text-sm font-bold tracking-wide text-acento-texto uppercase">{antetitulo}</p>
      <h2 id={id} className="mt-2 text-3xl sm:text-4xl">{titulo}</h2>
      {bajada && <p className="mt-3 text-lg text-suave">{bajada}</p>}
    </div>
  )
}

function Seccion({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`t-${id}`} className={cn('scroll-mt-20 px-5 py-20 sm:py-24', className)}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  )
}

// ---------- Hero ----------

function Hero() {
  return (
    <section aria-labelledby="t-hero" className="relative overflow-hidden px-5 pt-10 pb-16 sm:pt-16 lg:pb-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--t-acento)_18%,transparent),transparent_65%)]"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="text-center lg:text-left">
          <motion.p {...entrada()} className="inline-flex items-center gap-2 rounded-full bg-acento-suave px-3 py-1.5 text-sm font-semibold text-acento-texto ring-1 ring-acento-borde">
            <Store className="size-4" aria-hidden />
            Para barberías, peluquerías, consultorios y más
          </motion.p>
          <motion.h1 {...entrada(0.05)} id="t-hero" className="mt-5 text-[2.6rem] leading-[1.05] sm:text-6xl">
            {MARCA.slogan}
          </motion.h1>
          <motion.p {...entrada(0.1)} className="mx-auto mt-5 max-w-xl text-lg text-suave sm:text-xl lg:mx-0">
            Tu negocio con su propia app de turnos, con tu logo y tus colores. Tus clientes reservan en segundos, les llega el recordatorio
            por WhatsApp y confirman con un toque. Vos lo ves todo en vivo, desde el celular.
          </motion.p>
          <motion.div {...entrada(0.15)} className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <CtaDemo tamano="grande" />
            <EnlaceBoton href={DEMOS.barberia} variante="secundario" tamano="grande">
              Ver una demo
              <ArrowRight className="size-5" aria-hidden />
            </EnlaceBoton>
          </motion.div>
          <motion.ul {...entrada(0.2)} className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-suave lg:justify-start">
            {['Sin tiendas de apps', 'Sin contraseñas para tus clientes', 'Hecha en Argentina'].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="size-4 text-acento-texto" aria-hidden />
                {t}
              </li>
            ))}
          </motion.ul>
        </div>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.15, ease: [0.2, 0, 0, 1] } }}>
          <MockupCelular />
        </motion.div>
      </div>
    </section>
  )
}

// ---------- El problema ----------

const DOLORES: { Icono: LucideIcon; titulo: string; texto: string }[] = [
  { Icono: UserX, titulo: 'Se olvidan', texto: 'Sacaron el turno hace dos semanas y nadie se lo recordó. El horario queda vacío y no lo cobrás.' },
  { Icono: BellRing, titulo: 'Avisan tarde, o nunca', texto: 'Cuando te enterás, ya no llegás a ofrecerle ese horario a otra persona.' },
  { Icono: MessageCircle, titulo: 'Confirmás a mano', texto: 'Mensaje por mensaje, entre cliente y cliente. Tiempo que no estás atendiendo.' },
]

function Problema() {
  return (
    <Seccion id="problema" className="bg-superficie/50">
      <div className="grid items-start gap-12 lg:grid-cols-2">
        <div>
          <Titulo
            id="t-problema"
            antetitulo="El problema"
            titulo="Cada falta es una silla vacía que igual pagaste"
            bajada="El alquiler, los sueldos y tu tiempo corren aunque el cliente no venga. Y casi siempre no viene por lo mismo:"
          />
          <ul className="mt-8 flex flex-col gap-5">
            {DOLORES.map(({ Icono, titulo, texto }) => (
              <li key={titulo} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-medio bg-peligro/10 text-peligro">
                  <Icono className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-base">{titulo}</h3>
                  <p className="text-suave">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <CalculadoraFaltas />
      </div>
    </Seccion>
  )
}

// ---------- Cómo funciona ----------

const PASOS = [
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
    texto: 'Un día antes les llega el recordatorio por WhatsApp. Tocan “Confirmo” y listo; si no pueden, cambian el horario y el lugar se libera.',
  },
]

function ComoFunciona() {
  return (
    <Seccion id="como-funciona">
      <Titulo id="t-como-funciona" antetitulo="Cómo funciona" titulo="Tres pasos y te olvidás de confirmar a mano" centrado />
      <ol className="mt-12 grid gap-5 md:grid-cols-3">
        {PASOS.map(({ Icono, titulo, texto }, i) => (
          <li key={titulo} className="relative rounded-grande bg-superficie p-6 ring-1 ring-linea">
            <div className="flex items-center justify-between">
              <span className="grid size-12 place-items-center rounded-medio bg-acento-suave text-acento-texto ring-1 ring-acento-borde">
                <Icono className="size-6" aria-hidden />
              </span>
              <span className="num text-5xl font-extrabold text-linea" aria-hidden>
                {i + 1}
              </span>
            </div>
            <h3 className="mt-5 text-xl">
              <span className="sr-only">Paso {i + 1}: </span>
              {titulo}
            </h3>
            <p className="mt-2 text-suave">{texto}</p>
          </li>
        ))}
      </ol>
    </Seccion>
  )
}

// ---------- Funciones ----------

function Funcion({ Icono, titulo, children, className, extra }: { Icono: LucideIcon; titulo: string; children: React.ReactNode; className?: string; extra?: React.ReactNode }) {
  return (
    <li className={cn('flex flex-col rounded-grande bg-superficie p-6 ring-1 ring-linea', className)}>
      <Icono className="size-7 text-acento-texto" aria-hidden />
      <h3 className="mt-4 text-xl">{titulo}</h3>
      <p className="mt-2 text-suave">{children}</p>
      {extra}
    </li>
  )
}

function Funciones() {
  return (
    <Seccion id="funciones" className="bg-superficie/50">
      <Titulo
        id="t-funciones"
        antetitulo="Funciones"
        titulo="Todo lo que necesitás para llenar la agenda"
        bajada="Sin planillas, sin cuaderno y sin contestar el mismo mensaje veinte veces por día."
      />
      <ul className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <Funcion
          Icono={Palette}
          titulo="Tu app, con tu marca"
          className="lg:col-span-2"
          extra={
            <div className="mt-5 flex flex-wrap gap-2" aria-hidden>
              {DEMOS_FIJAS.map((n) => (
                <span
                  key={n.slug}
                  style={estiloTema(n)}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-fondo px-3 text-sm font-bold text-texto ring-1 ring-linea"
                >
                  <span className="size-3.5 rounded-full bg-acento" />
                  {n.nombre}
                </span>
              ))}
            </div>
          }
        >
          Tu nombre, tu logo y tus colores. Tus clientes no ven otra marca: ven la tuya, en el celular y en el ícono cuando la instalan. Los colores se
          ajustan solos para que todo se lea bien.
        </Funcion>
        <Funcion Icono={MessageCircle} titulo="Recordatorios por WhatsApp">
          24 horas y 2 horas antes. Con un botón de “Confirmo” que confirma el turno en tu agenda, sin que hagas nada.
        </Funcion>
        <Funcion Icono={LayoutDashboard} titulo="Panel y agenda en vivo">
          Cada reserva aparece al instante. Marcás quién vino y quién no, cargás turnos a mano y bloqueás francos o feriados.
        </Funcion>
        <Funcion Icono={Users} titulo="Tu equipo, cada uno con lo suyo">
          Cada profesional tiene su acceso y ve solo su agenda. Los precios y la configuración quedan para vos.
        </Funcion>
        <Funcion Icono={Gift} titulo="Clientes y fidelidad">
          Historial, notas privadas y tarjeta de sellos. Y una lista de quienes hace rato que no vienen, con el mensaje listo para mandar.
        </Funcion>
        <Funcion Icono={QrCode} titulo="Instalable, sin tiendas" className="md:col-span-2 lg:col-span-1">
          Tus clientes entran por un link o un QR y reservan sin descargar nada. Si quieren, la agregan al inicio del celular con tu ícono, en Android y en
          iPhone.
        </Funcion>
        <li className="flex flex-col justify-center gap-3 rounded-grande border border-dashed border-linea p-6 sm:flex-row sm:items-center sm:justify-start md:col-span-2 lg:col-span-2">
          <Wallet className="size-7 shrink-0 text-suave" aria-hidden />
          <div>
            <h3 className="flex flex-wrap items-center gap-2 text-lg">
              Señas con Mercado Pago
              <span className="rounded-full bg-superficie-2 px-2.5 py-0.5 text-xs font-bold text-suave ring-1 ring-linea">Próximamente</span>
            </h3>
            <p className="text-suave">Cobrás la seña al reservar y la plata va directo a tu cuenta de Mercado Pago.</p>
          </div>
        </li>
      </ul>
    </Seccion>
  )
}

// ---------- Rubros ----------

const RUBROS: { Icono: LucideIcon; nombre: string; texto: string; demo?: { href: string; nombre: string } }[] = [
  { Icono: Scissors, nombre: 'Barberías', texto: '“Lo de siempre” con un toque, promos para los días flojos y tarjeta de cortes.', demo: { href: DEMOS.barberia, nombre: 'QueTul' } },
  { Icono: Brush, nombre: 'Peluquerías y estética', texto: 'Servicios largos bien calculados: color, mechas, alisado. Sin superposiciones.' },
  { Icono: Hand, nombre: 'Uñas', texto: 'Recordatorios para que el service no se pase y la agenda de cada manicura al día.', demo: { href: DEMOS.unas, nombre: 'Nailed' } },
  { Icono: Smile, nombre: 'Consultorios odontológicos', texto: 'Pacientes que confirman, agenda por profesional y notas privadas de cada paciente.', demo: { href: DEMOS.consultorio, nombre: 'Consultorio Lema' } },
  { Icono: HeartPulse, nombre: 'Kinesiología, psicología y nutrición', texto: 'Sesiones semanales con recordatorio, para que nadie falte a la siguiente.' },
  { Icono: PenTool, nombre: 'Estudios de tatuajes', texto: 'Sesiones largas y consultas de diseño, sin ida y vuelta de mensajes.' },
]

function Rubros() {
  const contacto = linkContacto()
  return (
    <Seccion id="rubros">
      <Titulo
        id="t-rubros"
        antetitulo="Rubros"
        titulo="Pensada para cada tipo de negocio"
        bajada="Arrancás con una plantilla de tu rubro: servicios, duraciones y textos típicos. Después la ajustás como quieras."
      />
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {RUBROS.map(({ Icono, nombre, texto, demo }) => (
          <li key={nombre} className="flex flex-col rounded-grande bg-superficie p-6 ring-1 ring-linea">
            <span className="grid size-11 place-items-center rounded-medio bg-superficie-2 text-acento-texto">
              <Icono className="size-5" aria-hidden />
            </span>
            <h3 className="mt-4 text-lg">{nombre}</h3>
            <p className="mt-1 flex-1 text-suave">{texto}</p>
            {demo ? (
              <Link to={demo.href} className="mt-4 inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-acento-texto underline-offset-4 hover:underline">
                Ver la demo de {demo.nombre}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            ) : contacto.externo ? (
              <a href={contacto.href} className="mt-4 inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-acento-texto underline-offset-4 hover:underline">
                Pedí la demo de tu rubro
                <ArrowRight className="size-4" aria-hidden />
              </a>
            ) : (
              <Link to="/demos" className="mt-4 inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-acento-texto underline-offset-4 hover:underline">
                Ver demos parecidas
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Seccion>
  )
}

// ---------- Precios ----------

function Precios() {
  const sinPrecios = PLANES.every((p) => p.precioMensual == null)
  return (
    <Seccion id="precios" className="bg-superficie/50">
      <Titulo
        id="t-precios"
        antetitulo="Precios"
        titulo="Un abono mensual, sin sorpresas"
        bajada={sinPrecios ? 'Estamos terminando de definir los precios. Escribinos y te pasamos una propuesta para tu negocio.' : 'Precios finales por mes, en pesos.'}
        centrado
      />
      <ul className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-3">
        {PLANES.map((p) => {
          const valor = precioPlan(p)
          return (
            <li
              key={p.nombre}
              className={cn(
                'relative flex flex-col rounded-grande bg-superficie p-6 ring-1',
                p.destacado ? 'ring-2 ring-acento sombra-flotante' : 'ring-linea',
              )}
            >
              {p.destacado && (
                <span className="absolute -top-3 left-6 rounded-full bg-acento px-3 py-1 text-xs font-bold text-sobre-acento">Recomendado</span>
              )}
              <h3 className="text-xl">{p.nombre}</h3>
              <p className="text-sm text-suave lg:min-h-10">{p.para}</p>
              <p className="mt-5">
                {valor ? (
                  <>
                    <span className="titulo num text-4xl">{valor}</span>
                    <span className="text-suave"> /mes</span>
                  </>
                ) : (
                  <span className="titulo text-3xl">A definir</span>
                )}
              </p>
              <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                {p.incluye.map((x) => (
                  <li key={x} className="flex gap-2">
                    <Check className="mt-0.5 size-5 shrink-0 text-acento-texto" aria-hidden />
                    {x}
                  </li>
                ))}
              </ul>
              <EnlaceBoton
                href={linkContacto().href}
                externo={linkContacto().externo}
                variante={p.destacado ? 'primario' : 'secundario'}
                className="mt-6 w-full"
              >
                {valor ? `Quiero el plan ${p.nombre}` : `Consultar el plan ${p.nombre}`}
              </EnlaceBoton>
            </li>
          )
        })}
      </ul>
      <p className="mt-6 text-center text-sm text-suave">Tus clientes no pagan nada por usar la app.</p>
    </Seccion>
  )
}

// ---------- Preguntas ----------

const PREGUNTAS: Pregunta[] = [
  {
    pregunta: '¿Mis clientes tienen que bajar una app?',
    respuesta:
      'No. Entran por un link (el de tu Instagram, tu WhatsApp o un QR en el local) y reservan desde el navegador. Si quieren, la agregan al inicio del celular con tu logo, sin pasar por ninguna tienda de apps.',
  },
  {
    pregunta: '¿Cómo funcionan los recordatorios por WhatsApp?',
    respuesta:
      'Al reservar les llega la confirmación, y después un recordatorio 24 horas antes y otro 2 horas antes. El de 24 horas trae un botón “Confirmo”: lo tocan y el turno aparece confirmado en tu agenda. Si no pueden ir, cambian el horario desde el mismo mensaje y ese lugar vuelve a quedar libre.',
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
    pregunta: '¿Cuánto sale?',
    respuesta: PLANES.every((p) => p.precioMensual == null) ? (
      'Estamos terminando de definir los planes. Pedí tu demo y te pasamos una propuesta según el tamaño de tu negocio.'
    ) : (
      <>
        Depende de cuántos profesionales tengas. Mirá los <a href="#precios">planes</a>; tus clientes no pagan nada.
      </>
    ),
  },
  {
    pregunta: '¿Funciona en iPhone y en Android?',
    respuesta:
      'Sí, en cualquier celular con un navegador actualizado, y también en la compu. En Android se instala con un toque; en iPhone, desde Compartir → Agregar a inicio (la app les muestra cómo).',
  },
]

function SeccionPreguntas() {
  return (
    <Seccion id="preguntas">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <Titulo
          id="t-preguntas"
          antetitulo="Preguntas frecuentes"
          titulo="Lo que nos preguntan siempre"
          bajada={
            CONTACTO.whatsapp || CONTACTO.email ? '¿Te quedó alguna duda? Escribinos y te respondemos.' : '¿Te quedó alguna duda? Mirá las demos o pedinos una.'
          }
        />
        <Preguntas items={PREGUNTAS} />
      </div>
    </Seccion>
  )
}

// ---------- CTA final ----------

function CtaFinal() {
  return (
    <section aria-labelledby="t-final" className="px-5 pb-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-grande bg-acento-suave px-6 py-14 text-center ring-1 ring-acento-borde sm:px-12 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,color-mix(in_oklch,var(--t-acento)_22%,transparent),transparent_70%)]"
        />
        <div className="relative">
          <h2 id="t-final" className="mx-auto max-w-2xl text-3xl sm:text-5xl">Mirá tu negocio con su propia app</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-suave">
            Te la mostramos con tu nombre, tu logo y tus servicios, y sacás un turno de prueba desde tu celular. Sin compromiso.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <CtaDemo tamano="grande" />
            <EnlaceBoton href="/demos" variante="secundario" tamano="grande">
              Ver todas las demos
            </EnlaceBoton>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function InicioPublico() {
  useMarcaSitio()
  // Llegando desde otra página con /#precios: el contenido se dibuja después de cargar, así que el salto se hace acá.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (id) document.getElementById(id)?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [])
  return (
    <MotionConfig reducedMotion="user">
      <SaltarAlContenido />
      <Encabezado secciones />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <Hero />
        <Problema />
        <ComoFunciona />
        <Funciones />
        <Rubros />
        <Precios />
        <SeccionPreguntas />
        <CtaFinal />
      </main>
      <Pie />
    </MotionConfig>
  )
}
