import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { TrendingUp } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { precio } from '@/dominio/tiempo'
import type { Negocio } from '@/dominio/tipos'

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

/** "¿Cuánta plata perdés por las faltas?": el argumento de venta con los números del propio dueño. */
export function Calculadora({ n }: { n: Negocio }) {
  const conPrecio = n.servicios.filter((s) => s.precio > 0)
  const promedio = conPrecio.length ? Math.round(conPrecio.reduce((s, x) => s + x.precio, 0) / conPrecio.length / 500) * 500 : 15000
  const [faltas, setFaltas] = useState(4)
  const [ticket, setTicket] = useState(promedio)
  const idF = useId()
  const idT = useId()

  const perdida = faltas * SEMANAS_POR_MES * ticket
  const recuperas = perdida * REDUCCION

  return (
    <section aria-labelledby="t-calc" className="rounded-grande bg-superficie p-4 ring-1 ring-linea">
      <h2 id="t-calc" className="titulo text-base">¿Cuánto te cuestan las faltas?</h2>
      <p className="text-sm text-suave">Mové los valores con tus números reales.</p>

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor={idF} className="text-sm font-semibold">Faltas por semana</label>
            <span className="num font-bold">{faltas}</span>
          </div>
          <input id={idF} type="range" min={0} max={20} value={faltas} onChange={(e) => setFaltas(Number(e.target.value))} className="mt-2 h-2 w-full cursor-pointer accent-[var(--t-acento)]" />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor={idT} className="text-sm font-semibold">Precio promedio del turno</label>
            <span className="num font-bold">{precio(ticket)}</span>
          </div>
          <input id={idT} type="range" min={2000} max={Math.max(100000, promedio * 2)} step={500} value={ticket} onChange={(e) => setTicket(Number(e.target.value))} className="mt-2 h-2 w-full cursor-pointer accent-[var(--t-acento)]" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-medio bg-peligro/10 p-3">
          <p className="text-xs font-semibold text-peligro">Perdés por mes</p>
          <p className="titulo num mt-0.5 text-xl text-peligro"><Numero valor={perdida} /></p>
        </div>
        <div className="rounded-medio bg-exito/12 p-3">
          <p className="flex items-center gap-1 text-xs font-semibold text-exito"><TrendingUp className="size-3.5" aria-hidden />Recuperás con la app</p>
          <p className="titulo num mt-0.5 text-xl text-exito"><Numero valor={recuperas} /></p>
        </div>
      </div>
      <p className="mt-2 text-xs text-suave">
        Estimación: los recordatorios con confirmación reducen las faltas cerca de un {Math.round(REDUCCION * 100)}%. Al año son {precio(Math.round((recuperas * 12) / 1000) * 1000)}.
      </p>
    </section>
  )
}
