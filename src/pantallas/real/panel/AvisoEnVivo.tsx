// Aviso discreto cuando entra un turno nuevo mientras el panel está abierto (desde la app del cliente,
// o cargado por otra persona del equipo). Los que carga el propio usuario no se avisan.
import { AnimatePresence, motion } from 'motion/react'
import { CalendarPlus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { TurnoPanel } from '@/datos/real/panel'
import { capitalizar, claveDia, diaRelativo, horaCorta } from '@/dominio/tiempo'
import { usePanel } from './comunes'

const DURACION = 12_000

export function AvisosEnVivo({ turnos, onCerrar }: { turnos: TurnoPanel[]; onCerrar: (id: string) => void }) {
  return (
    <output
      aria-live="polite"
      aria-label="Turnos nuevos"
      className="pointer-events-none fixed inset-x-0 top-0 z-[45] flex flex-col items-center gap-2 px-3 pt-segura lg:inset-x-auto lg:top-auto lg:right-6 lg:bottom-6 lg:items-end lg:px-0"
    >
      <AnimatePresence initial={false}>
        {turnos.map((t) => (
          <Aviso key={t.id} t={t} onCerrar={() => onCerrar(t.id)} />
        ))}
      </AnimatePresence>
    </output>
  )
}

function Aviso({ t, onCerrar }: { t: TurnoPanel; onCerrar: () => void }) {
  const { n, esDueno } = usePanel()
  // Se cierra solo; el temporizador no se reinicia cuando el panel se vuelve a dibujar.
  const cerrar = useRef(onCerrar)
  useEffect(() => {
    cerrar.current = onCerrar
  })
  useEffect(() => {
    const id = setTimeout(() => cerrar.current(), DURACION)
    return () => clearTimeout(id)
  }, [])
  const [ahora] = useState(() => new Date())
  const dia = claveDia(t.inicio)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
      className="pointer-events-auto mt-2 flex w-full max-w-sm items-start gap-3 rounded-grande bg-superficie p-3 pl-4 ring-1 ring-linea sombra-flotante lg:mt-0"
    >
      <CalendarPlus className="mt-0.5 size-5 shrink-0 text-acento-texto" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Turno nuevo{t.origen === 'app' ? ' desde la app' : ''}</p>
        <p className="truncate text-sm">
          {t.clienteNombre} · {t.servicioNombre}
          {esDueno && t.profesionalNombre ? ` con ${t.profesionalNombre}` : ''}
        </p>
        <p className="text-sm text-suave">
          {capitalizar(diaRelativo(t.inicio, ahora))} a las {horaCorta(t.inicio)}
        </p>
        <Link
          to={`/${n.slug}/panel?dia=${dia}`}
          onClick={onCerrar}
          className="mt-1 inline-flex h-11 items-center text-sm font-semibold text-acento-texto underline underline-offset-4"
        >
          Ver en la agenda
        </Link>
      </div>
      <button type="button" onClick={onCerrar} className="-mt-1 -mr-1 grid size-11 shrink-0 place-items-center rounded-full text-suave hover:bg-superficie-2" aria-label="Cerrar aviso">
        <X className="size-4" aria-hidden />
      </button>
    </motion.div>
  )
}
