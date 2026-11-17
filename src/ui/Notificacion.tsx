import { AnimatePresence, motion } from 'motion/react'
import { BellRing, MessageCircle, X } from 'lucide-react'
import { useEffect, useEffectEvent, useState } from 'react'
import type { Aviso } from '@/dominio/tipos'
import { cn } from './cn'

interface Props {
  aviso: Aviso | null
  remitente: string
  logo: React.ReactNode
  onCerrar: () => void
  acciones?: React.ReactNode
  /** Si se pasa, se cierra sola a los X ms (pausado mientras el foco está adentro). Sin esto queda hasta que la cierren. */
  autoCerrar?: number
}

/**
 * Notificación que cae desde arriba, como en el celular.
 * WhatsApp se ve como WhatsApp (verde): el prospecto reconoce al instante cómo le llega a su cliente.
 * Se cierra con la X (teclado y lector de pantalla), arrastrándola hacia arriba o sola, si tiene autoCerrar.
 */
export function Notificacion({ aviso, remitente, logo, onCerrar, acciones, autoCerrar }: Props) {
  // Qué aviso tiene el foco adentro (si llega otro, ese arranca su propio conteo).
  const [enFoco, setEnFoco] = useState<string | null>(null)
  // Si se cerró con el foco adentro, el navegador no avisa el blur (el elemento desaparece): se olvida acá.
  if (enFoco && enFoco !== aviso?.id) setEnFoco(null)
  const cerrar = useEffectEvent(onCerrar)

  // Cierre automático: no corre mientras alguien está usando la notificación con el teclado.
  const id = aviso?.id
  useEffect(() => {
    if (!id || !autoCerrar || enFoco === id) return
    const t = setTimeout(cerrar, autoCerrar)
    return () => clearTimeout(t)
  }, [id, autoCerrar, enFoco])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-segura" aria-live="polite">
      <AnimatePresence>
        {aviso && (
          <motion.div
            key={aviso.id}
            className={cn(
              'pointer-events-auto w-full max-w-md rounded-[22px] p-3.5 sombra-flotante backdrop-blur-xl',
              aviso.canal === 'whatsapp' ? 'bg-wa-fondo/95 text-wa-tinta' : 'bg-superficie/95 text-texto ring-1 ring-linea',
            )}
            initial={{ y: -120, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 420, damping: 32 } }}
            exit={{ y: -120, opacity: 0, transition: { duration: 0.18 } }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.8, bottom: 0.1 }}
            onDragEnd={(_, i) => i.offset.y < -40 && onCerrar()}
            onFocus={() => setEnFoco(aviso.id)}
            onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setEnFoco(null)}
          >
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                {logo}
                <span
                  className={cn(
                    'absolute -right-1.5 -bottom-1.5 grid size-5 place-items-center rounded-full ring-2',
                    aviso.canal === 'whatsapp' ? 'bg-wa text-white ring-wa-fondo' : 'bg-acento text-sobre-acento ring-superficie',
                  )}
                  aria-hidden
                >
                  {aviso.canal === 'whatsapp' ? <MessageCircle className="size-3" /> : <BellRing className="size-3" />}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline justify-between gap-2 text-[13px]">
                  <b className="truncate font-bold">{aviso.canal === 'whatsapp' ? `WhatsApp · ${remitente}` : remitente}</b>
                  <span className="shrink-0 opacity-60">ahora</span>
                </p>
                <p className="mt-0.5 text-[14.5px] leading-snug">{aviso.texto}</p>
                {acciones && <div className="mt-2.5 flex gap-2">{acciones}</div>}
              </div>
              <button
                type="button"
                onClick={onCerrar}
                aria-label="Cerrar aviso"
                className="-mt-2 -mr-2 grid size-11 shrink-0 place-items-center rounded-full opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
