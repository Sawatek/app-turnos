import { motion } from 'motion/react'
import { BellRing, Clock, FastForward, Home, MessageSquareText, RotateCcw, Smartphone, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAhora, useDemo, useEstadoNegocio } from '@/datos/demo'
import { useNegocio } from '@/datos/negocios'
import { linkConSala, useSalaDeEscenario } from '@/datos/sala'
import { hayNube } from '@/datos/supabase'
import { capitalizar, diaLargo, diaRelativo, horaCorta } from '@/dominio/tiempo'
import { useTemaNegocio } from '@/tema/TemaNegocio'
import { Hoja } from '@/ui/Hoja'
import { Logo } from '@/ui/Logo'
import { cn } from '@/ui/cn'
import { QR } from '../admin/QR'
import { Cargando, NoEncontrado } from '../NoEncontrado'

const HORA = 3_600_000
const CEL = { ancho: 390, alto: 844 }

/**
 * Modo escenario, para presentar en la compu: el celular del cliente y el panel del dueño, lado a lado y en vivo.
 * Los dos son iframes del mismo sitio: comparten el estado y se sincronizan solos.
 * Arriba, la "máquina del tiempo" para mostrar los recordatorios sin esperar.
 */
export default function Escenario() {
  const { slug } = useParams()
  const { negocio: n, cargando } = useNegocio(slug)
  useTemaNegocio(n, n ? `${n.nombre} · Escenario` : undefined)
  const e = useEstadoNegocio(n)
  const ahora = useAhora()
  const desfase = useDemo((s) => s.desfase)
  const adelantar = useDemo((s) => s.adelantar)
  const volver = useDemo((s) => s.volverAlPresente)
  const reiniciar = useDemo((s) => s.reiniciar)
  const refCel = useRef<HTMLElement>(null)
  const escala = useEscalaCelular(refCel)
  // Sala propia de esta presentación: solo se conectan el celular y el panel de acá (y el celular del prospecto, con el QR).
  const sala = useSalaDeEscenario(slug ?? '')
  const [conectar, setConectar] = useState(false)

  if (cargando) return <Cargando />
  if (!n) return <NoEncontrado />

  const t0 = ahora.getTime()
  const vigentes = e.turnos
    .filter((t) => (t.propio || t.deLaApp) && (t.estado === 'pendiente' || t.estado === 'confirmado') && Date.parse(t.inicio) > t0)
    .toSorted((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))
  const proximo = vigentes[0]

  // Cada atajo apunta al primer turno de prueba al que todavía le falta ese aviso.
  const saltarA = (momento: number) => adelantar(momento - t0)
  const para24 = vigentes.find((t) => !t.recordatorios.r24 && Date.parse(t.inicio) - 24 * HORA > t0)
  const para2 = vigentes.find((t) => !t.recordatorios.r2 && Date.parse(t.inicio) - 2 * HORA > t0)
  // Turno que ya está dentro de la ventana de un aviso: sale apenas pasan unos minutos desde la reserva.
  const avisoYa = vigentes.find((t) => {
    const i = Date.parse(t.inicio)
    return (!t.recordatorios.r24 && t0 >= i - 24 * HORA && t0 < i - 2 * HORA) || (!t.recordatorios.r2 && t0 >= i - 2 * HORA)
  })
  const avisoEs24 = avisoYa && t0 < Date.parse(avisoYa.inicio) - 2 * HORA
  const minutosParaAviso = avisoYa ? Math.max(1, 6 - (t0 - Date.parse(avisoYa.creado)) / 60_000) : 0

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-linea bg-superficie px-4 py-3">
        <Link to="/demos" className="grid size-10 place-items-center rounded-full hover:bg-superficie-2" aria-label="Volver a las demos">
          <Home className="size-5" aria-hidden />
        </Link>
        <Logo negocio={n} className="size-9 text-xs" />
        <div className="mr-auto min-w-0">
          <p className="truncate font-bold leading-tight">{n.nombre}</p>
          <p className="text-xs text-suave">Modo escenario</p>
        </div>

        {/* Máquina del tiempo */}
        <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Controlar el tiempo de la demo">
          <div className={cn('flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-bold', desfase ? 'bg-acento text-sobre-acento' : 'bg-superficie-2')}>
            <Clock className="size-4" aria-hidden />
            <span className="num">{capitalizar(diaLargo(ahora).split(' de ')[0]!)} · {horaCorta(ahora)}</span>
            {desfase !== 0 && <span className="text-xs font-semibold opacity-80">(simulado)</span>}
          </div>
          {avisoYa ? null : para24 ? (
            <BotonTiempo onClick={() => saltarA(Date.parse(para24.inicio) - 24 * HORA + 60_000)} Icono={MessageSquareText} destacado>
              Ir al recordatorio de 24 h
            </BotonTiempo>
          ) : (
            para2 && (
              <BotonTiempo onClick={() => saltarA(Date.parse(para2.inicio) - 2 * HORA + 60_000)} Icono={BellRing} destacado>
                Ir al aviso de 2 h
              </BotonTiempo>
            )
          )}
          {avisoYa && (
            <BotonTiempo onClick={() => adelantar(minutosParaAviso * 60_000)} Icono={avisoEs24 ? MessageSquareText : BellRing} destacado>
              {avisoEs24 ? 'Mostrar el recordatorio por WhatsApp' : 'Mostrar el aviso previo'}
            </BotonTiempo>
          )}
          {hayNube && (
            <BotonTiempo onClick={() => setConectar(true)} Icono={Smartphone}>
              Conectar un celular
            </BotonTiempo>
          )}
          <BotonTiempo onClick={() => adelantar(HORA)} Icono={FastForward}>+1 h</BotonTiempo>
          <BotonTiempo onClick={() => adelantar(24 * HORA)} Icono={FastForward}>+1 día</BotonTiempo>
          {desfase !== 0 && <BotonTiempo onClick={volver} Icono={Undo2}>Volver a hoy</BotonTiempo>}
          <BotonTiempo
            onClick={() => {
              if (confirm('¿Reiniciar la demo? Se borran los turnos de prueba y la sesión del cliente.')) reiniciar(n)
            }}
            Icono={RotateCcw}
          >
            Reiniciar
          </BotonTiempo>
        </div>
      </header>

      {proximo && (
        <p className="shrink-0 bg-acento-suave px-4 py-2 text-center text-sm text-acento-texto">
          Turno de prueba: <b>{capitalizar(diaRelativo(proximo.inicio, ahora))} {horaCorta(proximo.inicio)}</b>. Usá la máquina del tiempo para mostrar los recordatorios.
        </p>
      )}

      <main className="flex min-h-0 flex-1 gap-6 p-4 lg:p-6">
        {/* Celular del cliente */}
        <section aria-label={`App de ${n.nombre}, vista del ${n.textos.cliente}`} className="flex shrink-0 flex-col items-center gap-3" ref={refCel}>
          <p className="text-xs font-bold tracking-wide text-suave uppercase">Celular del {n.textos.cliente}</p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ width: (CEL.ancho + 24) * escala.valor, height: (CEL.alto + 24) * escala.valor }}
            className="relative"
          >
            <div
              className="absolute top-0 left-0 origin-top-left overflow-hidden rounded-[52px] bg-black p-3 shadow-2xl ring-1 ring-white/10"
              style={{ width: CEL.ancho + 24, height: CEL.alto + 24, transform: `scale(${escala.valor})` }}
            >
              <iframe title={`App de ${n.nombre}`} src={`/${n.slug}?sala=${sala}`} className="size-full rounded-[40px] bg-fondo" style={{ width: CEL.ancho, height: CEL.alto }} />
              <div className="pointer-events-none absolute top-5 left-1/2 h-7 w-28 -translate-x-1/2 rounded-full bg-black" aria-hidden />
            </div>
          </motion.div>
        </section>

        {/* Panel del dueño */}
        <section aria-label="Panel del dueño" className="flex min-w-0 flex-1 flex-col gap-3">
          <p className="text-xs font-bold tracking-wide text-suave uppercase">Compu del dueño</p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
            className="min-h-0 flex-1 overflow-hidden rounded-grande bg-fondo shadow-2xl ring-1 ring-linea"
          >
            <div className="flex h-9 items-center gap-1.5 border-b border-linea bg-superficie px-3" aria-hidden>
              <span className="size-3 rounded-full bg-[#ff5f57]" />
              <span className="size-3 rounded-full bg-[#febc2e]" />
              <span className="size-3 rounded-full bg-[#28c840]" />
            </div>
            <iframe title="Panel del dueño" src={`/${n.slug}/panel?embebido&sala=${sala}`} className="h-[calc(100%-2.25rem)] w-full" />
          </motion.div>
        </section>
      </main>
      <Hoja
        abierta={conectar}
        onCerrar={() => setConectar(false)}
        titulo="Conectá el celular del cliente"
        descripcion="Lo que haga en su celular aparece acá en vivo, y la máquina del tiempo le hace llegar los avisos."
      >
        <div className="flex flex-col items-center gap-4 pb-4 text-center">
          <QR texto={linkConSala(n.slug, sala)} className="size-56 rounded-medio" />
          <p className="text-sm text-suave">
            Escaneá con la cámara. Código de esta presentación: <b className="num text-texto">{sala}</b>
          </p>
          <p className="text-xs text-suave">Solo se conectan los celulares que entran con este QR: otras personas que abran la demo no ven nada de acá.</p>
        </div>
      </Hoja>
    </div>
  )
}

function BotonTiempo({ children, onClick, Icono, destacado }: { children: React.ReactNode; onClick: () => void; Icono: typeof Clock; destacado?: boolean }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cn(
        'inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors',
        destacado ? 'bg-acento text-sobre-acento' : 'bg-superficie-2 hover:bg-linea',
      )}
    >
      <Icono className="size-4" aria-hidden />
      {children}
    </motion.button>
  )
}

/** Escala el celular para que entre entero en el alto disponible. */
function useEscalaCelular(ref: React.RefObject<HTMLElement | null>) {
  const [valor, setValor] = useState(0.8)
  useEffect(() => {
    const medir = () => {
      const alto = (ref.current?.parentElement?.clientHeight ?? 800) - 40
      setValor(Math.min(1, Math.max(0.5, alto / (CEL.alto + 24))))
    }
    medir()
    const obs = new ResizeObserver(medir)
    if (ref.current?.parentElement) obs.observe(ref.current.parentElement)
    return () => obs.disconnect()
  }, [ref])
  return { valor }
}
