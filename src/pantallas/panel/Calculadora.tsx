import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { useEffect, useId, useState } from 'react'
import { precio } from '@/dominio/tiempo'
import type { Negocio } from '@/dominio/tipos'
import { Talon } from '@/ui/Talon'

/** Con recordatorios + confirmación con un toque, las faltas bajan alrededor de 70% (estimación conservadora). */
const REDUCCION = 0.7
const SEMANAS_POR_MES = 4.33

function Numero({ valor }: { valor: number }) {
  const mv = useMotionValue(valor)
  const texto = useTransform(mv, (v) => precio(Math.round(v / 100) * 100))
  useEffect(() => {
    const control = animate(mv, valor, { duration: 0.5, ease: [0.2, 0, 0, 1] })
    return () => control.stop()
  }, [mv, valor])
  return <motion.span>{texto}</motion.span>
}

/**
 * "¿Cuánta plata perdés por las faltas?": el argumento de venta con los números del propio dueño.
 * Es un ticket: arriba se cargan los números; abajo del corte, la cuenta.
 */
export function Calculadora({ n }: { n: Negocio }) {
  const conPrecio = n.servicios.filter((s) => s.precio > 0)
  const promedio = conPrecio.length ? Math.round(conPrecio.reduce((s, x) => s + x.precio, 0) / conPrecio.length / 500) * 500 : 15000
  const [faltas, setFaltas] = useState(4)
  const [ticket, setTicket] = useState(promedio)
  const idF = useId()
  const idT = useId()
  const idTitulo = useId()

  const perdida = faltas * SEMANAS_POR_MES * ticket
  const recuperas = perdida * REDUCCION

  return (
    <Talon
      as="section"
      aria-labelledby={idTitulo}
      cuerpo={
        <div className="px-4 pt-4 pb-5">
          <h2 id={idTitulo} className="titulo text-xl">¿Cuánto te cuestan las faltas?</h2>
          <p className="mt-0.5 text-sm text-suave">Mové los valores con tus números reales.</p>
          <div className="mt-5 flex flex-col gap-5">
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={idF} className="rotulo text-suave">Faltas por semana</label>
                <span className="mono font-bold">{faltas}</span>
              </div>
              <input id={idF} type="range" min={0} max={20} value={faltas} onChange={(e) => setFaltas(Number(e.target.value))} className="mt-2 h-2 w-full cursor-pointer accent-[var(--t-acento)]" />
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={idT} className="rotulo text-suave">Precio promedio del turno</label>
                <span className="mono font-bold">{precio(ticket)}</span>
              </div>
              <input id={idT} type="range" min={2000} max={Math.max(100000, promedio * 2)} step={500} value={ticket} onChange={(e) => setTicket(Number(e.target.value))} className="mt-2 h-2 w-full cursor-pointer accent-[var(--t-acento)]" />
            </div>
          </div>
        </div>
      }
      talon={
        <div className="px-4 pt-5 pb-4">
          <dl className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
              <dt className="rotulo shrink-0 text-suave">Perdés por mes</dt>
              <span aria-hidden className="min-w-4 flex-1 border-b-2 border-dotted border-linea" />
              <dd className="mono font-bold text-peligro"><Numero valor={perdida} /></dd>
            </div>
            <div className="flex flex-col gap-1 border-t-2 border-texto pt-3">
              <dt className="rotulo text-exito">Recuperás con la app</dt>
              <dd className="cifra text-[2.75rem] text-exito"><Numero valor={recuperas} /></dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-suave">
            Estimación: los recordatorios con confirmación reducen las faltas cerca de un {Math.round(REDUCCION * 100)}%. Al año son{' '}
            <span className="mono">{precio(Math.round((recuperas * 12) / 1000) * 1000)}</span>.
          </p>
        </div>
      }
    />
  )
}
