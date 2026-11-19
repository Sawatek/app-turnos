// Página principal del producto: landing para dueños de negocios que viven de sus turnos.
// Estilo editorial asimétrico (como una revista): grilla de 12 columnas en la compu y de 6 en el celular,
// titulares grandes en una grotesca editorial (Bricolage Grotesque), bloques corridos del eje y ritmo distinto en cada sección.
// Textos comerciales (nombre, slogan, contacto, precios) en ./marca.ts.
import '@fontsource-variable/bricolage-grotesque/opsz.css'
import { motion } from 'motion/react'
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Brush,
  CalendarCheck,
  ChartColumn,
  Check,
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
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router'
import { DEMOS_FIJAS } from '@/plantillas/demos'
import { estiloTema } from '@/tema/TemaNegocio'
import { cn } from '@/ui/cn'
import { Logo } from '@/ui/Logo'
import { Celular } from './Celular'
import { CalculadoraFaltas } from './CalculadoraFaltas'
import { ConversacionWhatsApp } from './ConversacionWhatsApp'
import { CtaDemo, EnlaceBoton, Encabezado, Pie, SaltarAlContenido, useMarcaSitio } from './comunes'
import { CONTACTO, DEMOS, MARCA, PLANES, linkContacto, precioPlan } from './marca'
import { PantallaDeInicio } from './PantallaDeInicio'
import { Preguntas, type Pregunta } from './Preguntas'
import { VitrinaApp } from './VitrinaApp'

const entrada = (retraso = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, delay: retraso, ease: [0.2, 0, 0, 1] as const } },
})

/** La grilla de la página: 6 columnas en el celular, 12 en la compu. Cada hijo dice qué columnas ocupa. */
const GRILLA = 'grid grid-cols-6 gap-x-4 lg:grid-cols-12 lg:gap-x-8'
/** Ocupa todo el ancho de la grilla. */
const TODO = 'col-span-6 lg:col-span-12'

/** Antetítulo de sección, como el de una revista: "01 — El problema". */
function Folio({ n, children, className }: { n: string; children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('folio flex items-center gap-3 text-acento-texto', className)}>
      <span className="num">{n}</span>
      <span aria-hidden className="h-px w-8 bg-acento-borde" />
      <span>{children}</span>
    </p>
  )
}

function Seccion({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`t-${id}`} className={cn('relative scroll-mt-20 px-5 py-24 sm:px-8 sm:py-32', className)}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  )
}

/** Un dato o ventaja en formato "índice": filete arriba, etiqueta y texto. */
function Entrada({ Icono, titulo, children, className }: { Icono?: LucideIcon; titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <li className={cn('border-t border-linea pt-5', className)}>
      <h3 className="flex items-center gap-2 text-base">
        {Icono && <Icono className="size-4 shrink-0 text-acento-texto" aria-hidden />}
        {titulo}
      </h3>
      <p className="mt-2 text-suave [text-wrap:pretty]">{children}</p>
    </li>
  )
}

// ---------- Portada ----------

function Portada() {
  const palabras = MARCA.slogan.split(' ')
  const ultima = palabras.pop()
  return (
    <section aria-labelledby="t-hero" className="relative isolate overflow-x-clip px-5 pt-10 pb-24 sm:px-8 sm:pt-16 lg:pb-32">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-20%] -z-10 size-[70vmax] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--t-acento)_16%,transparent),transparent)]"
      />
      {/* La palabra que vende, gigante y calada, detrás del celular */}
      <p
        aria-hidden
        className="titular calado deriva pointer-events-none absolute right-[-4%] bottom-6 -z-10 text-[clamp(7rem,22vw,21rem)] leading-none select-none"
      >
        Confirmo
      </p>

      <div className={cn('mx-auto max-w-7xl', GRILLA)}>
        <motion.p {...entrada()} className={cn('folio flex flex-wrap items-center gap-x-3 gap-y-1 text-suave', TODO)}>
          <span className="text-acento-texto">Turnos con tu marca</span>
          <span aria-hidden className="hidden h-px w-8 bg-linea sm:block" />
          <span className="basis-full sm:basis-auto">Para barberías, peluquerías, consultorios y más</span>
        </motion.p>

        <motion.h1 {...entrada(0.05)} id="t-hero" className="titular col-span-6 mt-6 text-portada sm:mt-8 lg:col-span-8">
          {palabras.join(' ')} <em className="text-acento-texto">{ultima}</em>
        </motion.h1>

        <motion.div {...entrada(0.1)} className="col-span-5 col-start-2 mt-10 lg:col-span-5 lg:col-start-2 lg:mt-14">
          <p className="border-l-2 border-acento-borde pl-5 text-entrada text-suave [text-wrap:pretty]">
            Tu negocio con <strong className="font-semibold text-texto">su propia app de turnos</strong>, con tu logo y tus colores. Tus clientes reservan
            en segundos, les llega el recordatorio por WhatsApp y confirman con un toque. Vos lo ves todo en vivo, desde el celular.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CtaDemo tamano="grande" />
            <EnlaceBoton href={DEMOS.barberia} variante="secundario" tamano="grande">
              Ver una demo
              <ArrowRight className="size-5" aria-hidden />
            </EnlaceBoton>
          </div>
          <ul className="mt-8 flex flex-col gap-2 text-sm text-suave sm:flex-row sm:flex-wrap sm:gap-x-6">
            {['Sin tiendas de apps', 'Sin contraseñas para tus clientes', 'Hecha en Argentina'].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="size-4 text-acento-texto" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* El celular baja respecto del título: no comparte su eje */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.15, ease: [0.2, 0, 0, 1] } }}
          className="col-span-6 mt-16 justify-self-center sm:justify-self-end lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-2 lg:mt-24 lg:justify-self-end"
        >
          <VitrinaApp />
        </motion.div>
      </div>
    </section>
  )
}

// ---------- 01 · El problema ----------

const DOLORES: { titulo: string; texto: string }[] = [
  { titulo: 'Se olvidan', texto: 'Sacaron el turno hace dos semanas y nadie se lo recordó. El horario queda vacío y no lo cobrás.' },
  { titulo: 'Avisan tarde, o nunca', texto: 'Cuando te enterás, ya no llegás a ofrecerle ese horario a otra persona.' },
  { titulo: 'Confirmás a mano', texto: 'Mensaje por mensaje, entre cliente y cliente. Tiempo que no estás atendiendo.' },
]

function Problema() {
  return (
    <Seccion id="problema" className="border-t border-linea">
      <div className={GRILLA}>
        <Folio n="01" className="col-span-6 lg:col-span-2 lg:pt-4">El problema</Folio>
        <h2 id="t-problema" className="titular col-span-6 mt-5 text-titular lg:col-span-9 lg:col-start-3 lg:mt-0">
          Cada falta es una silla vacía que <em className="text-acento-texto">igual pagaste</em>
        </h2>

        <div className="aparecer col-span-6 mt-12 lg:col-span-5 lg:col-start-3 lg:mt-16">
          <p className="capitular text-entrada">
            El alquiler, los sueldos y tu tiempo corren aunque el cliente no venga. Y casi siempre no viene por una de estas tres razones:
          </p>
          <ol className="mt-10">
            {DOLORES.map(({ titulo, texto }, i) => (
              <li key={titulo} className="grid grid-cols-[3rem_1fr] gap-x-2 border-t border-linea py-6">
                <span aria-hidden className="titular num text-3xl text-peligro">
                  {i + 1}.
                </span>
                <div>
                  <h3 className="text-lg">{titulo}</h3>
                  <p className="mt-1 text-suave">{texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* La calculadora se corre hacia abajo y hacia la derecha, fuera del eje del texto */}
        <div className="aparecer col-span-6 mt-6 sm:col-span-5 sm:col-start-2 lg:col-span-5 lg:col-start-8 lg:mt-40">
          <CalculadoraFaltas />
        </div>
      </div>
    </Seccion>
  )
}

// ---------- 02 · Cómo funciona ----------

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

/** Sangría de cada paso: forman una escalera (más marcada en la compu). */
const ESCALERA = ['', 'pl-[12%] lg:pl-0 lg:pt-28', 'pl-[24%] lg:pl-0 lg:pt-56']

function ComoFunciona() {
  return (
    <Seccion id="como-funciona">
      <div className={GRILLA}>
        <Folio n="02" className="col-span-6 lg:col-span-6 lg:col-start-6">Cómo funciona</Folio>
        <h2 id="t-como-funciona" className="titular col-span-6 mt-5 text-titular lg:col-span-7 lg:col-start-6">
          Tres pasos y te olvidás de <em className="text-acento-texto">confirmar a mano</em>
        </h2>

        <ol className={cn('mt-16 grid gap-y-14 lg:mt-20 lg:grid-cols-3 lg:gap-x-10', TODO)}>
          {PASOS.map(({ Icono, titulo, texto }, i) => (
            <li key={titulo} className={cn('aparecer', ESCALERA[i])}>
              <div className="flex items-end justify-between gap-4 border-b border-linea pb-4">
                <span aria-hidden className="titular calado num text-[clamp(5rem,4rem+4vw,8.5rem)] leading-[0.8]">
                  {i + 1}
                </span>
                <Icono className="mb-2 size-6 text-acento-texto" aria-hidden />
              </div>
              <h3 className="titular mt-6 text-3xl">
                <span className="sr-only">Paso {i + 1}: </span>
                {titulo}
              </h3>
              <p className="mt-3 max-w-sm text-suave [text-wrap:pretty]">{texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </Seccion>
  )
}

// ---------- 03 · WhatsApp ----------

const MOMENTOS: { Icono: LucideIcon; cuando: string; texto: string }[] = [
  { Icono: CalendarCheck, cuando: 'Al reservar', texto: 'Le llega la confirmación con el día, la hora, el profesional y la dirección.' },
  { Icono: BellRing, cuando: '24 horas antes', texto: 'El recordatorio con dos botones: “Confirmo” y “Cambiar horario”.' },
  { Icono: Clock, cuando: '2 horas antes', texto: 'El último aviso, con la dirección para llegar sin vueltas.' },
  { Icono: Repeat2, cuando: 'Si no puede ir', texto: 'Cambia el horario desde el mismo mensaje y ese lugar se libera para otro.' },
]

function SeccionWhatsApp() {
  return (
    <Seccion id="whatsapp" className="bg-superficie">
      <div className={GRILLA}>
        <div className="col-span-6 lg:col-span-7">
          <Folio n="03">Recordatorios por WhatsApp</Folio>
          <h2 id="t-whatsapp" className="titular mt-5 text-titular">
            Tu cliente toca <em className="text-acento-texto">“Confirmo”</em> y listo
          </h2>
          <p className="mt-6 max-w-xl text-entrada text-suave [text-wrap:pretty]">
            Los mensajes salen solos, por el WhatsApp oficial y con el nombre de tu negocio. Llegan donde tu cliente ya mira.
          </p>
          <blockquote className="mt-12 ml-[8%] border-l-2 border-acento pl-6 lg:ml-[14%]">
            <p className="titular text-[clamp(1.75rem,1.3rem+1.6vw,2.75rem)] leading-[1.1]">Vos no mandás nada ni ponés tu número.</p>
          </blockquote>
          <ol className="mt-14 grid gap-x-8 gap-y-8 sm:grid-cols-2">
            {MOMENTOS.map(({ Icono, cuando, texto }) => (
              <Entrada key={cuando} Icono={Icono} titulo={cuando}>
                {texto}
              </Entrada>
            ))}
          </ol>
        </div>
        {/* El chat queda dentro de la banda pero más abajo que el título: no comparte su eje */}
        <div className="col-span-6 mt-16 sm:col-span-5 sm:col-start-2 lg:col-span-4 lg:col-start-9 lg:mt-36">
          <ConversacionWhatsApp className="relative z-10 lg:sticky lg:top-24" />
        </div>
      </div>
    </Seccion>
  )
}

// ---------- 04 · Tu marca, instalable ----------

const VENTAJAS_PWA: { Icono: LucideIcon; titulo: string; texto: string }[] = [
  { Icono: Palette, titulo: 'Tu marca', texto: 'Tu logo, tu color y tu estilo en cada pantalla. Los colores se ajustan solos para que todo se lea bien.' },
  { Icono: Smartphone, titulo: 'Sin tiendas', texto: 'Se instala desde el link o un QR, con tu ícono en el inicio. En iPhone y en Android.' },
  { Icono: BellRing, titulo: 'Con avisos', texto: 'Con la app instalada también reciben avisos, como cuando se libera un turno.' },
]

function SeccionTuMarca() {
  return (
    <Seccion id="tu-marca" className="overflow-x-clip">
      <div className={GRILLA}>
        <div className="col-span-6 lg:col-span-7 lg:col-start-6">
          <Folio n="04">Tu marca</Folio>
          <h2 id="t-tu-marca" className="titular mt-5 text-titular">
            Tus clientes no ven otra marca: <em className="text-acento-texto">ven la tuya</em>
          </h2>
          <p className="mt-6 max-w-xl text-entrada text-suave [text-wrap:pretty]">
            Cada negocio tiene su propia app, con su nombre y su link. Tus clientes la usan como cualquier otra app del celular.
          </p>
          <ul className="mt-12 grid gap-8 sm:grid-cols-3 sm:gap-6">
            {VENTAJAS_PWA.map(({ Icono, titulo, texto }) => (
              <Entrada key={titulo} Icono={Icono} titulo={titulo}>
                {texto}
              </Entrada>
            ))}
          </ul>
          <ul className="mt-10 flex flex-wrap gap-2" aria-label="Demos de ejemplo">
            {DEMOS_FIJAS.map((n) => (
              <li key={n.slug}>
                <Link
                  to={`/${n.slug}`}
                  style={estiloTema(n)}
                  data-personalidad={n.personalidad}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-fondo pr-4 pl-1.5 text-sm font-bold text-texto ring-1 ring-linea transition-transform hover:-translate-y-0.5"
                >
                  <Logo negocio={n} className="size-8 rounded-full text-[11px]" />
                  {n.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* El celular va a la izquierda, inclinado y más abajo que el título */}
        <div className="col-span-6 mt-16 pl-[10%] lg:col-span-4 lg:col-start-1 lg:row-start-1 lg:mt-28 lg:pl-0">
          <Celular className="w-[min(66vw,290px)] -rotate-3 lg:w-[300px] lg:-rotate-6">
            <PantallaDeInicio negocios={DEMOS_FIJAS} />
          </Celular>
          <p className="sr-only">
            La pantalla de inicio de un celular con las apps de {DEMOS_FIJAS.map((n) => n.nombre).join(', ')} instaladas, cada una con su logo y su color, y
            un aviso de que se liberó un turno.
          </p>
        </div>
      </div>
    </Seccion>
  )
}

// ---------- 05 · Funciones ----------

const FUNCIONES: { Icono: LucideIcon; titulo: string; texto: string }[] = [
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

function Funciones() {
  return (
    <Seccion id="funciones" className="border-t border-linea">
      <div className={GRILLA}>
        <div className="col-span-6 lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <Folio n="05">Funciones</Folio>
            <h2 id="t-funciones" className="titular mt-5 text-[clamp(2.25rem,1.5rem+2.4vw,3.75rem)] leading-[1.02]">
              Todo lo que necesitás para <em className="text-acento-texto">llenar la agenda</em>
            </h2>
            <p className="mt-6 text-lg text-suave [text-wrap:pretty]">Sin planillas, sin cuaderno y sin contestar el mismo mensaje veinte veces por día.</p>
          </div>
        </div>

        <ul className="col-span-6 mt-14 lg:col-span-7 lg:col-start-6 lg:mt-2">
          {FUNCIONES.map(({ Icono, titulo, texto }, i) => (
            <li
              key={titulo}
              className={cn(
                'aparecer grid gap-x-8 gap-y-2 border-t border-linea py-8 sm:grid-cols-[minmax(0,15rem)_1fr]',
                // La primera, como nota de tapa: más grande y a todo el ancho.
                i === 0 && 'sm:grid-cols-1',
              )}
            >
              <h3 className={cn('flex items-start gap-3', i === 0 ? 'titular text-3xl sm:text-4xl' : 'text-lg')}>
                <Icono className={cn('shrink-0 text-acento-texto', i === 0 ? 'mt-1.5 size-7' : 'mt-1 size-5')} aria-hidden />
                {titulo}
              </h3>
              <p className={cn('text-suave [text-wrap:pretty]', i === 0 && 'max-w-xl text-entrada sm:pl-10')}>{texto}</p>
            </li>
          ))}
          <li className="grid gap-x-8 gap-y-2 border-y border-dashed border-linea py-8 sm:grid-cols-[minmax(0,15rem)_1fr]">
            <h3 className="flex flex-wrap items-start gap-x-3 gap-y-2 text-lg text-suave">
              <Wallet className="mt-1 size-5 shrink-0" aria-hidden />
              Señas con Mercado Pago
              <span className="rounded-full bg-superficie-2 px-2.5 py-0.5 text-xs font-bold text-suave ring-1 ring-linea">Próximamente</span>
            </h3>
            <p className="text-suave">Cobrás la seña al reservar y la plata va directo a tu cuenta de Mercado Pago.</p>
          </li>
        </ul>
      </div>
    </Seccion>
  )
}

// ---------- 06 · Rubros ----------

const RUBROS: { Icono: LucideIcon; nombre: string; texto: string; demo?: { href: string; nombre: string } }[] = [
  { Icono: Scissors, nombre: 'Barberías', texto: '“Lo de siempre” con un toque, promos para los días flojos y tarjeta de cortes.', demo: { href: DEMOS.barberia, nombre: 'QueTul' } },
  { Icono: Brush, nombre: 'Peluquerías y estética', texto: 'Servicios largos bien calculados: color, mechas, alisado. Sin superposiciones.' },
  { Icono: Hand, nombre: 'Uñas', texto: 'Recordatorios para que el service no se pase y la agenda de cada manicura al día.', demo: { href: DEMOS.unas, nombre: 'Nailed' } },
  { Icono: Smile, nombre: 'Consultorios odontológicos', texto: 'Pacientes que confirman, agenda por profesional y notas privadas de cada paciente.', demo: { href: DEMOS.consultorio, nombre: 'Consultorio Lema' } },
  { Icono: HeartPulse, nombre: 'Kinesiología, psicología y nutrición', texto: 'Sesiones semanales con recordatorio, para que nadie falte a la siguiente.' },
  { Icono: PenTool, nombre: 'Estudios de tatuajes', texto: 'Sesiones largas y consultas de diseño, sin ida y vuelta de mensajes.' },
]

const CLASE_LINK_RUBRO =
  'inline-flex min-h-11 items-center gap-1.5 font-semibold text-acento-texto underline decoration-acento-borde underline-offset-4 transition-colors hover:decoration-acento'

function LinkRubro({ demo }: { demo?: { href: string; nombre: string } }) {
  const contacto = linkContacto()
  if (demo)
    return (
      <Link to={demo.href} className={CLASE_LINK_RUBRO}>
        Ver la demo de {demo.nombre}
        <ArrowUpRight className="size-4 shrink-0" aria-hidden />
      </Link>
    )
  if (contacto.externo)
    return (
      <a href={contacto.href} className={CLASE_LINK_RUBRO}>
        Pedí la demo de tu rubro
        <ArrowUpRight className="size-4 shrink-0" aria-hidden />
      </a>
    )
  return (
    <Link to="/demos" className={CLASE_LINK_RUBRO}>
      Ver demos parecidas
      <ArrowUpRight className="size-4 shrink-0" aria-hidden />
    </Link>
  )
}

function Rubros() {
  return (
    <Seccion id="rubros" className="border-t border-linea">
      <div className={GRILLA}>
        <div className="col-span-6 lg:col-span-7">
          <Folio n="06">Rubros</Folio>
          <h2 id="t-rubros" className="titular mt-5 text-titular">
            Pensada para cada <em className="text-acento-texto">tipo de negocio</em>
          </h2>
        </div>
        <p className="col-span-5 col-start-2 mt-8 text-lg text-suave [text-wrap:pretty] lg:col-span-4 lg:col-start-9 lg:mt-0 lg:self-end">
          Arrancás con una plantilla de tu rubro: servicios, duraciones y textos típicos. Después la ajustás como quieras.
        </p>

        {/* Índice de rubros: filas alternadas, una contra el margen y la siguiente corrida */}
        <ul className={cn('mt-16 border-b border-linea', TODO)}>
          {RUBROS.map(({ Icono, nombre, texto, demo }, i) => {
            const corrida = i % 2 === 1
            return (
              <li key={nombre} className={cn('aparecer grid gap-y-3 border-t border-linea py-8 lg:grid-cols-12 lg:items-baseline lg:gap-x-8', corrida && 'pl-[10%] lg:pl-0')}>
                <h3
                  className={cn(
                    'titular flex items-baseline gap-3 text-[clamp(1.75rem,1.3rem+1.8vw,3rem)] leading-[1.05]',
                    corrida ? 'lg:col-span-5 lg:col-start-3' : 'lg:col-span-6',
                  )}
                >
                  <Icono className="size-5 shrink-0 -translate-y-0.5 text-acento-texto" aria-hidden />
                  {nombre}
                </h3>
                <p className={cn('text-suave [text-wrap:pretty]', corrida ? 'lg:col-span-3' : 'lg:col-span-4')}>{texto}</p>
                <div className="lg:col-span-2 lg:justify-self-end">
                  <LinkRubro demo={demo} />
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </Seccion>
  )
}

// ---------- 07 · Precios ----------

/** Cada plan a otra altura y con otro ancho: el recomendado sobresale. */
const LUGAR_PLAN = ['lg:col-span-4 lg:mt-24 xl:col-span-4', 'lg:col-span-4 xl:col-span-5', 'lg:col-span-4 lg:mt-44 xl:col-span-3']

function Precios() {
  const sinPrecios = PLANES.every((p) => p.precioMensual == null)
  return (
    <Seccion id="precios" className="bg-superficie">
      <div className={GRILLA}>
        <div className="col-span-6 lg:col-span-7">
          <Folio n="07">Precios</Folio>
          <h2 id="t-precios" className="titular mt-5 text-titular">
            Un abono mensual, <em className="text-acento-texto">sin sorpresas</em>
          </h2>
        </div>
        <div className="col-span-5 col-start-2 mt-8 lg:col-span-4 lg:col-start-9 lg:mt-0 lg:self-end">
          <p className="text-lg text-suave [text-wrap:pretty]">
            {sinPrecios ? 'Estamos terminando de definir los precios. Escribinos y te pasamos una propuesta para tu negocio.' : 'Precios finales por mes, en pesos.'}
          </p>
          <p className="mt-3 text-sm font-semibold text-texto">Tus clientes no pagan nada por usar la app.</p>
        </div>

        <ul className={cn('mt-16 grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8', TODO)}>
          {PLANES.map((p, i) => {
            const valor = precioPlan(p)
            return (
              <li
                key={p.nombre}
                className={cn(
                  'aparecer relative flex flex-col rounded-grande p-6 sm:p-8',
                  p.destacado ? 'bg-fondo ring-2 ring-acento sombra-flotante' : 'bg-fondo/60 ring-1 ring-linea',
                  LUGAR_PLAN[i],
                )}
              >
                {p.destacado && (
                  <span className="absolute -top-3 left-6 rounded-full bg-acento px-3 py-1 text-xs font-bold text-sobre-acento sm:left-8">Recomendado</span>
                )}
                <p aria-hidden className="folio num text-suave">
                  Plan {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="titular mt-3 text-3xl">{p.nombre}</h3>
                <p className="mt-1 text-sm text-suave">{p.para}</p>
                <p className="mt-6 border-t border-linea pt-6">
                  {valor ? (
                    <>
                      <span className="titular num text-5xl">{valor}</span>
                      <span className="text-suave"> /mes</span>
                    </>
                  ) : (
                    <span className="titular text-4xl">A definir</span>
                  )}
                </p>
                <ul className="mt-6 flex flex-1 flex-col gap-2.5">
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
                  className="mt-8 w-full text-center"
                >
                  {valor ? `Quiero el plan ${p.nombre}` : `Consultar el plan ${p.nombre}`}
                </EnlaceBoton>
              </li>
            )
          })}
        </ul>
      </div>
    </Seccion>
  )
}

// ---------- 08 · Preguntas ----------

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
      <div className={GRILLA}>
        <div className="col-span-6 lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <Folio n="08">Preguntas frecuentes</Folio>
            <h2 id="t-preguntas" className="titular mt-5 text-[clamp(2.25rem,1.5rem+2.4vw,3.75rem)] leading-[1.02]">
              Lo que nos preguntan <em className="text-acento-texto">siempre</em>
            </h2>
            <p className="mt-6 text-lg text-suave">
              {CONTACTO.whatsapp || CONTACTO.email ? '¿Te quedó alguna duda? Escribinos y te respondemos.' : '¿Te quedó alguna duda? Mirá las demos o pedinos una.'}
            </p>
          </div>
        </div>
        <div className="col-span-6 mt-12 lg:col-span-7 lg:col-start-6 lg:mt-2">
          <Preguntas items={PREGUNTAS} />
        </div>
      </div>
    </Seccion>
  )
}

// ---------- Cierre ----------

function CtaFinal() {
  return (
    <section aria-labelledby="t-final" className="relative isolate overflow-x-clip border-t border-linea px-5 py-24 sm:px-8 sm:py-36">
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-15%] bottom-[-40%] -z-10 size-[60vmax] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--t-acento)_18%,transparent),transparent)]"
      />
      <div className={cn('mx-auto max-w-7xl', GRILLA)}>
        <Folio n="09" className={TODO}>
          Tu turno
        </Folio>
        <h2 id="t-final" className={cn('titular mt-6 text-portada', TODO)}>
          <span className="block">Mirá tu negocio</span>{' '}
          <span className="block pl-[8%] lg:pl-[16%]">
            con <em className="text-acento-texto">su propia app</em>
          </span>
        </h2>
        <div className="col-span-5 col-start-2 mt-12 lg:col-span-5 lg:col-start-7 lg:mt-16">
          <p className="text-entrada text-suave [text-wrap:pretty]">
            Te la mostramos con tu nombre, tu logo y tus servicios, y sacás un turno de prueba desde tu celular. Sin compromiso.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
    <>
      <SaltarAlContenido />
      <Encabezado secciones />
      <main id="contenido" tabIndex={-1} className="overflow-x-clip outline-none">
        <Portada />
        <Problema />
        <ComoFunciona />
        <SeccionWhatsApp />
        <SeccionTuMarca />
        <Funciones />
        <Rubros />
        <Precios />
        <SeccionPreguntas />
        <CtaFinal />
      </main>
      <Pie amplio />
    </>
  )
}
