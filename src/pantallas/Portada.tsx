import { motion } from 'motion/react'
import { ArrowLeft, LayoutDashboard, MonitorSmartphone, Plus, Smartphone } from 'lucide-react'
import { Link } from 'react-router'
import { useTodosLosNegocios } from '@/datos/negocios'
import { RUBROS } from '@/plantillas/rubros'
import { MARCA } from '@/pantallas/publico/marca'
import { useMarcaSitio } from '@/pantallas/publico/comunes'
import { estiloTema } from '@/tema/TemaNegocio'
import { clasesBoton } from '@/ui/clasesBoton'
import { Logo } from '@/ui/Logo'
import { Talon } from '@/ui/Talon'

/** Lista de demos (/demos): para el vendedor en una reunión y para el que quiere ver cómo queda en su rubro. */
export default function Portada() {
  useMarcaSitio('Demos')
  const { lista: negocios } = useTodosLosNegocios()

  return (
    <main className="relative mx-auto min-h-dvh max-w-5xl px-5 pt-segura pb-16">
      <div aria-hidden className="cuadricula pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <Link to="/" className="mt-4 -ml-2 inline-flex h-11 items-center gap-1.5 rounded-chico px-2 text-sm font-semibold text-suave transition-colors hover:text-texto">
        <ArrowLeft className="size-4" aria-hidden />
        Volver al inicio
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-texto pt-4 pb-6">
        <div>
          <p className="rotulo text-acento-texto">{MARCA.nombre} · Talonario de demos</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">Demos de apps de turnos</h1>
          <p className="mt-3 max-w-xl text-suave">
            Cada demo es la app de un negocio de ejemplo, con su marca. Mirala como la ve el cliente, entrá al panel del dueño, o abrí las dos juntas en modo escenario
            (ideal en la compu). Los datos son de ejemplo: tocá lo que quieras.
          </p>
        </div>
        <Link to="/admin" className={clasesBoton({ tamano: 'grande' })}>
          <Plus className="size-5" aria-hidden />
          Nueva demo
        </Link>
      </header>

      {/* Un talonario: cada demo es un talón con la marca del negocio; abajo del corte, por dónde entrar. */}
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {negocios.map((n, i) => (
          <motion.li
            key={n.slug}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
            style={estiloTema(n)}
            data-personalidad={n.personalidad}
            className="text-texto"
          >
            <Talon
              aria-label={n.nombre}
              cuerpo={
                <div className="flex items-start gap-3 px-4 pt-4 pb-5">
                  <Logo negocio={n} className="size-14 shrink-0 text-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="rotulo text-acento-texto">{RUBROS[n.rubro].etiqueta}</p>
                    <h2 className="titulo mt-1 text-2xl">{n.nombre}</h2>
                    <p className="mt-1 flex items-baseline justify-between gap-2 text-sm text-suave">
                      <span className="mono truncate">/{n.slug}</span>
                      <span className="rotulo shrink-0">N.º {String(i + 1).padStart(2, '0')}</span>
                    </p>
                  </div>
                </div>
              }
              talon={
                <div className="grid grid-cols-3 divide-x divide-linea pt-1">
                  {[
                    { to: `/${n.slug}`, texto: 'Cliente', Icono: Smartphone },
                    { to: `/${n.slug}/panel`, texto: 'Dueño', Icono: LayoutDashboard },
                    { to: `/${n.slug}/escenario`, texto: 'Escenario', Icono: MonitorSmartphone },
                  ].map(({ to, texto, Icono }) => (
                    <Link
                      key={to}
                      to={to}
                      aria-label={`${texto}: ${n.nombre}`}
                      className="flex h-16 flex-col items-center justify-center gap-1 text-xs font-bold text-acento-texto transition-colors hover:bg-acento-suave"
                    >
                      <Icono className="size-5" aria-hidden />
                      {texto}
                    </Link>
                  ))}
                </div>
              }
            />
          </motion.li>
        ))}
      </ul>
    </main>
  )
}
