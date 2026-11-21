// Aviso cuando entra un turno nuevo (sale como un ticket impreso) mientras el panel está abierto (desde la app del cliente,
// o cargado por otra persona del equipo). Los que carga el propio usuario no se avisan.
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { TurnoPanel } from '@/datos/real/panel'
import { capitalizar, claveDia, diaRelativo, horaCorta } from '@/dominio/tiempo'
import { Talon } from '@/ui/Talon'
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
    // El turno nuevo sale como un ticket de la impresora (a saltitos), con la hora grande y el link para verlo.
    <motion.div
      layout
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
      className="pointer-events-auto mt-2 w-full max-w-sm drop-shadow-[0_18px_28px_hsl(var(--t-sombra)/0.35)] lg:mt-0"
    >
      <Talon
        as="div"
        className="imprimir"
        cuerpo={
          <div className="flex items-start gap-3 px-4 pt-3 pb-3.5">
            <div className="min-w-0 flex-1">
              <p className="rotulo text-acento-texto">Turno nuevo{t.origen === 'app' ? ' desde la app' : ''}</p>
              <p className="mt-1.5 flex items-baseline gap-2">
                <span className="cifra text-[2.5rem]">{horaCorta(t.inicio)}</span>
                <span className="titulo text-lg">{capitalizar(diaRelativo(t.inicio, ahora))}</span>
              </p>
            </div>
            <button type="button" onClick={onCerrar} className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-suave hover:bg-superficie-2" aria-label="Cerrar aviso">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        }
        talon={
          <div className="flex flex-wrap items-center justify-between gap-x-3 px-4 pt-2.5 pb-1.5">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">
              {t.clienteNombre} · {t.servicioNombre}
              {esDueno && t.profesionalNombre ? ` con ${t.profesionalNombre}` : ''}
            </p>
            <Link
              to={`/${n.slug}/panel?dia=${dia}`}
              onClick={onCerrar}
              className="inline-flex h-11 shrink-0 items-center text-sm font-semibold text-acento-texto underline underline-offset-4"
            >
              Ver en la agenda
            </Link>
          </div>
        }
      />
    </motion.div>
  )
}
