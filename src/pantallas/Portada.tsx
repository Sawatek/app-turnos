import { motion } from 'motion/react'
import { LayoutDashboard, MonitorSmartphone, Plus, Smartphone } from 'lucide-react'
import { Link } from 'react-router'
import { useTodosLosNegocios } from '@/datos/negocios'
import { RUBROS } from '@/plantillas/rubros'
import { useTemaNegocio, estiloTema } from '@/tema/TemaNegocio'
import { Logo } from '@/ui/Logo'

const SAWATEK = { nombre: 'SawaTek', color: '#e0b352', modo: 'oscuro', personalidad: 'moderna' } as const

/** Portada interna para el vendedor: todas las demos a mano. */
export default function Portada() {
  useTemaNegocio(SAWATEK, 'SawaTek · Demos de turnos')
  const { lista: negocios } = useTodosLosNegocios()

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-5 pt-segura pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-8">
        <div>
          <p className="text-sm font-bold tracking-wide text-acento-texto uppercase">SawaTek · Turnos</p>
          <h1 className="mt-1 text-4xl">Demos para mostrar</h1>
          <p className="mt-2 max-w-lg text-suave">
            Cada demo es la app de un negocio con su marca. Abrila en el celular del cliente, en el panel del dueño, o las dos juntas en modo escenario.
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
