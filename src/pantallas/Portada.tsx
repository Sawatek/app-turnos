import { motion } from 'motion/react'
import { ArrowLeft, LayoutDashboard, MonitorSmartphone, Plus, Smartphone } from 'lucide-react'
import { Link } from 'react-router'
import { useTodosLosNegocios } from '@/datos/negocios'
import { RUBROS } from '@/plantillas/rubros'
import { MARCA } from '@/pantallas/publico/marca'
import { useTemaNegocio, estiloTema } from '@/tema/TemaNegocio'
import { Logo } from '@/ui/Logo'

/** Lista de demos (/demos): para el vendedor en una reunión y para el que quiere ver cómo queda en su rubro. */
export default function Portada() {
  useTemaNegocio(MARCA, `Demos · ${MARCA.nombre}`)
  const { lista: negocios } = useTodosLosNegocios()

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-5 pt-segura pb-16">
      <Link to="/" className="mt-4 -ml-2 inline-flex h-11 items-center gap-1.5 rounded-chico px-2 text-sm font-semibold text-suave transition-colors hover:text-texto">
        <ArrowLeft className="size-4" aria-hidden />
        Volver al inicio
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4 pt-4 pb-8">
        <div>
          <p className="text-sm font-bold tracking-wide text-acento-texto uppercase">{MARCA.nombre}</p>
          <h1 className="mt-1 text-4xl">Demos de apps de turnos</h1>
          <p className="mt-2 max-w-xl text-suave">
            Cada demo es la app de un negocio de ejemplo, con su marca. Mirala como la ve el cliente, entrá al panel del dueño, o abrí las dos juntas en modo escenario
            (ideal en la compu). Los datos son de ejemplo: tocá lo que quieras.
          </p>
        </div>
        <Link to="/admin" className="inline-flex h-12 items-center gap-2 rounded-medio bg-acento px-5 font-bold text-sobre-acento">
          <Plus className="size-5" aria-hidden />
          Nueva demo
        </Link>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {negocios.map((n, i) => (
          <motion.li
            key={n.slug}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
            style={estiloTema(n)}
            data-personalidad={n.personalidad}
            className="flex flex-col overflow-hidden rounded-grande bg-fondo text-texto ring-1 ring-linea sombra-suave"
          >
            <div className="flex items-center gap-3 p-4">
              <Logo negocio={n} className="size-14 text-lg" />
              <div className="min-w-0">
                <p className="titulo truncate text-lg">{n.nombre}</p>
                <p className="truncate text-sm text-suave">{RUBROS[n.rubro].etiqueta} · /{n.slug}</p>
              </div>
            </div>
            <div className="mt-auto grid grid-cols-3 border-t border-linea text-xs font-bold">
              {[
                { to: `/${n.slug}`, texto: 'Cliente', Icono: Smartphone },
                { to: `/${n.slug}/panel`, texto: 'Dueño', Icono: LayoutDashboard },
                { to: `/${n.slug}/escenario`, texto: 'Escenario', Icono: MonitorSmartphone },
              ].map(({ to, texto, Icono }) => (
                <Link key={to} to={to} className="flex h-16 flex-col items-center justify-center gap-1 text-acento-texto transition-colors hover:bg-acento-suave">
                  <Icono className="size-5" aria-hidden />
                  {texto}
                </Link>
              ))}
            </div>
          </motion.li>
        ))}
      </ul>
    </main>
  )
}
