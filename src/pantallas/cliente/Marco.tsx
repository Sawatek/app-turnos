// Marco de la app del cliente (demo): encabezado con la marca, barra inferior y botones de los avisos.
// Lo usan la app (AppCliente) y el celular de la landing, que muestra estas mismas piezas con datos de ejemplo.
import { motion } from 'motion/react'
import { Bell, CalendarDays, House, Plus, UserRound } from 'lucide-react'
import type { Negocio } from '@/dominio/tipos'
import { Logo } from '@/ui/Logo'
import { cn } from '@/ui/cn'

export type Tab = 'inicio' | 'turnos' | 'perfil'

/** Encabezado fijo: logo y nombre del negocio, y la campanita de avisos. */
export function EncabezadoCliente({ n, noVistos, onAvisos }: { n: Negocio; noVistos: number; onAvisos: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-fondo/85 px-5 pt-segura pb-3 backdrop-blur-lg">
      <div className="flex min-w-0 items-center gap-3">
        <Logo negocio={n} className="size-10 rounded-chico text-sm" />
        <div className="min-w-0">
          <p className="truncate font-bold leading-tight">{n.nombre}</p>
          <p className="truncate text-xs text-suave">{n.bajada}</p>
        </div>
      </div>
      <button
        type="button"
        className="relative grid size-11 place-items-center rounded-full bg-superficie ring-1 ring-linea"
        aria-label={noVistos ? `Avisos, ${noVistos} sin ver` : 'Avisos'}
        onClick={onAvisos}
      >
        <Bell className="size-5" aria-hidden />
        {noVistos > 0 && <span className="absolute top-2 right-2 size-2.5 rounded-full bg-peligro ring-2 ring-superficie" aria-hidden />}
      </button>
    </header>
  )
}

const TABS = [
  { id: 'inicio', texto: 'Inicio', Icono: House },
  { id: 'turnos', texto: 'Mis turnos', Icono: CalendarDays },
  { id: 'perfil', texto: 'Perfil', Icono: UserRound },
] as const

/** Barra inferior flotante: pestañas y el botón de reservar con el color de la marca. */
export function NavCliente({ n, tab, onTab, onReservar }: { n: Negocio; tab: Tab; onTab: (t: Tab) => void; onReservar: () => void }) {
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg px-4 pb-segura">
      <div className="flex items-center gap-1 rounded-[26px] bg-superficie/90 p-1.5 sombra-flotante ring-1 ring-linea backdrop-blur-xl">
        {TABS.map(({ id, texto, Icono }) => (
          <button
            key={id}
            type="button"
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => onTab(id)}
            className={cn(
              'relative flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] text-[11px] font-bold transition-colors',
              tab === id ? 'text-texto' : 'text-suave',
            )}
          >
            {tab === id && <motion.span layoutId="tab-activa" className="absolute inset-0 rounded-[20px] bg-superficie-2" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <Icono className="relative size-5" aria-hidden />
            <span className="relative">{texto}</span>
          </button>
        ))}
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={onReservar}
          className="flex h-14 items-center gap-1.5 rounded-[20px] bg-acento px-4 font-bold text-sobre-acento"
        >
          <Plus className="size-5" strokeWidth={2.75} aria-hidden />
          {n.textos.reservar}
        </motion.button>
      </div>
    </nav>
  )
}

/** Botón de respuesta rápida de una notificación (Confirmo, Cambiar horario, Completar código). */
export function AccionAviso({ children, onClick, secundaria, className }: { children: React.ReactNode; onClick: () => void; secundaria?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative h-10 flex-1 rounded-xl px-3 text-sm font-bold transition-transform active:scale-[0.97]',
        secundaria ? 'bg-black/8 text-current' : 'bg-wa text-[#062b14]',
        className,
      )}
    >
      {children}
    </button>
  )
}
