import { AnimatePresence, motion } from 'motion/react'
import { BellRing, MessageCircle } from 'lucide-react'
import type { Aviso } from '@/dominio/tipos'
import { cn } from './cn'

interface Props {
  aviso: Aviso | null
  remitente: string
  logo: React.ReactNode
  onCerrar: () => void
  acciones?: React.ReactNode
}

/**
 * Notificación que cae desde arriba, como en el celular.
 * WhatsApp se ve como WhatsApp (verde): el prospecto reconoce al instante cómo le llega a su cliente.
 */
export function Notificacion({ aviso, remitente, logo, onCerrar, acciones }: Props) {
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
