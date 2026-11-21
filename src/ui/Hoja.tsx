import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from './cn'

interface Props {
  abierta: boolean
  onCerrar: () => void
  titulo: string
  descripcion?: string
  children: React.ReactNode
  pie?: React.ReactNode
  className?: string
}

/**
 * Hoja que sube desde abajo (bottom sheet). Accesible (Radix Dialog: foco atrapado, Esc, lector de pantalla)
 * y se cierra arrastrando la manija hacia abajo. Solo la manija arrastra, así el contenido scrollea normal.
 */
export function Hoja({ abierta, onCerrar, titulo, descripcion, children, pie, className }: Props) {
  const arrastre = useDragControls()
  return (
    <Dialog.Root open={abierta} onOpenChange={(v) => !v && onCerrar()}>
      <AnimatePresence>
        {abierta && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-black/55"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className={cn(
                  'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-grande bg-fondo sombra-flotante outline-none',
                  className,
                )}
                initial={{ y: '100%' }}
                animate={{ y: 0, transition: { type: 'spring', stiffness: 380, damping: 36 } }}
                exit={{ y: '100%', transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
                drag="y"
                dragControls={arrastre}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.7 }}
                onDragEnd={(_, i) => (i.offset.y > 110 || i.velocity.y > 600) && onCerrar()}
              >
                <div
                  className="flex shrink-0 cursor-grab touch-none justify-center pt-2.5 pb-1 active:cursor-grabbing"
                  onPointerDown={(e) => arrastre.start(e)}
                  aria-hidden
                >
                  <div className="h-1 w-10 rounded-full bg-suave/40" />
                </div>
                {/* Encabezado arrancado de un talonario: abajo, el renglón punteado del corte. */}
                <div className="relative flex shrink-0 items-start justify-between gap-3 px-5 pt-1 pb-3.5">
                  <div aria-hidden className="troquel absolute inset-x-5 bottom-0 h-[1.5px]" />
                  <div>
                    <Dialog.Title className="titulo text-2xl">{titulo}</Dialog.Title>
                    {descripcion ? (
                      <Dialog.Description className="mt-0.5 text-sm text-suave">{descripcion}</Dialog.Description>
                    ) : (
                      <Dialog.Description className="sr-only">{titulo}</Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-suave hover:bg-superficie-2" aria-label="Cerrar">
                    <X className="size-5" aria-hidden />
                  </Dialog.Close>
                </div>
                <div className="sin-barra min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-4">{children}</div>
                {pie && <div className="shrink-0 border-t border-linea bg-fondo px-5 pt-3 pb-segura">{pie}</div>}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
