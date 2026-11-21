// Marco de la app del cliente (demo): encabezado con la marca, barra inferior y botones de los avisos.
// Lo usan la app (AppCliente) y el celular de la landing, que muestra estas mismas piezas con datos de ejemplo.
// Mismo lenguaje que la app real (real/cliente/ClienteReal.tsx): encabezado con línea fina y barra plana como una regla.
import { motion } from 'motion/react'
import { Bell, CalendarDays, House, Plus, UserRound } from 'lucide-react'
import type { Negocio } from '@/dominio/tipos'
import { Logo } from '@/ui/Logo'
import { cn } from '@/ui/cn'

export type Tab = 'inicio' | 'turnos' | 'perfil'

/** Encabezado fijo: logo y nombre del negocio, y la campanita de avisos. */
export function EncabezadoCliente({ n, noVistos, onAvisos }: { n: Negocio; noVistos: number; onAvisos: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-linea/70 bg-fondo/90 px-5 pt-segura pb-3 backdrop-blur-lg">
      <Logo negocio={n} className="size-9 rounded-chico text-xs" />
      <div className="min-w-0 flex-1">
        <p className="titulo truncate text-lg leading-tight">{n.nombre}</p>
        {n.bajada && <p className="rotulo truncate text-[0.6875rem] text-suave">{n.bajada}</p>}
      </div>
      <button
        type="button"
        className="relative grid size-11 shrink-0 place-items-center rounded-full text-suave transition-colors hover:bg-superficie-2 hover:text-texto"
        aria-label={noVistos ? `Avisos, ${noVistos} sin ver` : 'Avisos'}
        onClick={onAvisos}
      >
        <Bell className="size-5" aria-hidden />
        {noVistos > 0 && <span className="absolute top-2.5 right-2.5 size-2.5 rounded-full bg-peligro ring-2 ring-fondo" aria-hidden />}
      </button>
    </header>
  )
}

const TABS = [
  { id: 'inicio', texto: 'Inicio', Icono: House },
  { id: 'turnos', texto: 'Mis turnos', Icono: CalendarDays },
  { id: 'perfil', texto: 'Perfil', Icono: UserRound },
] as const

/** Barra de abajo como una regla: pestañas planas con una marca de tinta arriba de la activa, y la tecla de reservar. */
export function NavCliente({ n, tab, onTab, onReservar }: { n: Negocio; tab: Tab; onTab: (t: Tab) => void; onReservar: () => void }) {
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg border-t border-linea bg-fondo/95 px-3 pt-1.5 pb-segura backdrop-blur-xl">
      <div className="flex items-center gap-1">
        {TABS.map(({ id, texto, Icono }) => (
          <button
            key={id}
            type="button"
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => onTab(id)}
            className={cn(
              'relative flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[0.75rem] font-bold transition-colors',
              tab === id ? 'text-texto' : 'text-suave hover:text-texto',
            )}
          >
            {tab === id && (
              <motion.span
                layoutId="tab-activa"
                className="absolute -top-1.5 h-[3px] w-8 rounded-b-full bg-acento"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <Icono className="relative size-5" aria-hidden />
            <span className="relative">{texto}</span>
          </button>
        ))}
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={onReservar}
          className="flex h-13 items-center gap-1.5 rounded-medio bg-acento px-5 font-bold text-sobre-acento shadow-[inset_0_-3px_0_rgb(0_0_0/0.16)]"
        >
          <Plus className="size-5" strokeWidth={2.75} aria-hidden />
          {n.textos.reservar}
        </motion.button>
      </div>
    </nav>
  )
}

/** Botón de respuesta rápida de una notificación (Confirmo, Cambiar horario, Completar código). Verde de WhatsApp a propósito. */
export function AccionAviso({ children, onClick, secundaria, className }: { children: React.ReactNode; onClick: () => void; secundaria?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative min-h-11 flex-1 rounded-xl px-3 text-sm font-bold transition-transform active:scale-[0.97]',
        secundaria ? 'bg-black/8 text-current' : 'bg-wa text-[#062b14]',
        className,
      )}
    >
      {children}
    </button>
  )
}
