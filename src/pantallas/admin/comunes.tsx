// Piezas compartidas por las secciones de la consola de SawaTek (mismo estilo que src/ui).
import { Check, CircleAlert, CircleCheck, Copy, KeyRound, LoaderCircle } from 'lucide-react'
import { useId, useState } from 'react'
import { mensajeAdmin } from '@/datos/admin'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { enAR } from '@/dominio/tiempo'
import { Boton } from '@/ui/Boton'
import { cn } from '@/ui/cn'

/** Corre una acción async con "cargando" y deja el error listo para mostrar. */
export function useAccion() {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string>()
  const correr = async (fn: () => Promise<unknown>) => {
    setOcupado(true)
    setError(undefined)
    try {
      await fn()
      return true
    } catch (e) {
      setError(mensajeAdmin(e))
      return false
    } finally {
      setOcupado(false)
    }
  }
  return { ocupado, error, setError, correr }
}

const claseControl =
  'rounded-medio border border-linea bg-superficie px-4 text-[17px] text-texto outline-none transition-colors placeholder:text-suave/70 focus:border-acento aria-invalid:border-peligro'

export function Selector({ etiqueta, ayuda, className, children, ...resto }: React.SelectHTMLAttributes<HTMLSelectElement> & { etiqueta: string; ayuda?: string }) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-suave">
        {etiqueta}
      </label>
      <select id={id} aria-describedby={ayuda ? `${id}-d` : undefined} className={cn(claseControl, 'h-13 min-w-0 appearance-auto')} {...resto}>
        {children}
      </select>
      {ayuda && (
        <p id={`${id}-d`} className="text-sm text-suave">
          {ayuda}
        </p>
      )}
    </div>
  )
}

export function AreaTexto({ etiqueta, ayuda, className, ...resto }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { etiqueta: string; ayuda?: string }) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-suave">
        {etiqueta}
      </label>
      <textarea id={id} rows={4} aria-describedby={ayuda ? `${id}-d` : undefined} className={cn(claseControl, 'min-h-28 py-3 leading-snug')} {...resto} />
      {ayuda && (
        <p id={`${id}-d`} className="text-sm text-suave">
          {ayuda}
        </p>
      )}
    </div>
  )
}

/** Grupo de botones excluyentes (radio) con etiqueta visible. */
export function Opciones<T extends string>({
  etiqueta,
  valor,
  opciones,
  onCambiar,
}: {
  etiqueta: string
  valor: T
  opciones: { id: T; texto: string }[]
  onCambiar: (v: T) => void
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-suave">{etiqueta}</legend>
      <div className="flex flex-wrap gap-2">
        {opciones.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={valor === o.id}
            onClick={() => onCambiar(o.id)}
            className={cn(
              'h-11 rounded-full px-4 text-sm font-semibold transition-colors',
              valor === o.id ? 'bg-acento text-sobre-acento' : 'bg-superficie ring-1 ring-linea hover:ring-acento-borde',
            )}
          >
            {o.texto}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function ErrorEnLinea({ texto, className }: { texto?: string; className?: string }) {
  if (!texto) return null
  return (
    <p role="alert" className={cn('flex items-start gap-2 text-sm font-semibold text-peligro', className)}>
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {texto}
    </p>
  )
}

export function Exito({ texto }: { texto?: string }) {
  return (
    <p aria-live="polite" className="flex min-h-5 items-center gap-2 text-sm font-semibold text-exito">
      {texto && <CircleCheck className="size-4 shrink-0" aria-hidden />}
      {texto}
    </p>
  )
}

export function Cargando() {
  return (
    <div className="grid place-items-center py-10" aria-busy="true">
      <LoaderCircle className="size-7 animate-spin text-suave" aria-label="Cargando" />
    </div>
  )
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-grande bg-superficie p-8 text-center text-suave ring-1 ring-linea">{children}</p>
}

export function FalloCarga({ error, onReintentar }: { error: unknown; onReintentar: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-grande bg-superficie p-6 text-center ring-1 ring-linea">
      <ErrorEnLinea texto={mensajeAdmin(error)} />
      <Boton variante="secundario" tamano="chico" onClick={onReintentar}>
        Reintentar
      </Boton>
    </div>
  )
}

export function Tarjeta({ titulo, bajada, children, className }: { titulo: string; bajada?: string; children: React.ReactNode; className?: string }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cn('rounded-grande bg-superficie p-4 ring-1 ring-linea sm:p-5', className)}>
      <h2 id={id} className="titulo text-lg">
        {titulo}
      </h2>
      {bajada && <p className="mt-0.5 text-sm text-suave">{bajada}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** Número grande con su etiqueta (métricas). */
export function Cifra({ etiqueta, valor, detalle, tono }: { etiqueta: string; valor: number | string; detalle?: string; tono?: 'exito' | 'peligro' | 'aviso' }) {
  return (
    <div className="rounded-medio bg-superficie-2/60 p-3.5">
      <p className="text-sm font-semibold text-suave">{etiqueta}</p>
      <p className={cn('num titulo mt-1 text-2xl', tono === 'exito' && 'text-exito', tono === 'peligro' && 'text-peligro', tono === 'aviso' && 'text-aviso')}>{valor}</p>
      {detalle && <p className="text-xs text-suave">{detalle}</p>}
    </div>
  )
}

const TONOS_ESTADO: Record<string, string> = {
  activo: 'bg-exito/15 text-exito',
  prueba: 'bg-aviso/15 text-aviso',
  suspendido: 'bg-peligro/12 text-peligro',
  enviado: 'bg-exito/15 text-exito',
  pendiente: 'bg-aviso/15 text-aviso',
  enviando: 'bg-aviso/15 text-aviso',
  error: 'bg-peligro/12 text-peligro',
  cancelado: 'bg-superficie-2 text-suave',
}

export function Insignia({ estado, children }: { estado: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-bold', TONOS_ESTADO[estado] ?? 'bg-superficie-2 text-suave')}>{children}</span>
}

export const fechaHora = (d: string) => format(enAR(d), "d MMM yyyy, HH:mm", { locale: es }).replace('.', '')
export const fechaCorta = (d: string) => format(enAR(d), 'd MMM yyyy', { locale: es }).replace('.', '')

/**
 * La contraseña recién generada, para pasársela a la persona. Se muestra UNA vez: no queda guardada.
 */
export function ContrasenaNueva({ email, contrasena, children, onListo }: { email: string; contrasena: string; children?: React.ReactNode; onListo: () => void }) {
  const [copiada, setCopiada] = useState(false)
  return (
    <section aria-label="Contraseña generada" className="flex flex-col gap-3 rounded-grande bg-acento-suave p-4 ring-1 ring-acento-borde">
      <p className="flex items-center gap-2 font-bold text-acento-texto">
        <KeyRound className="size-5 shrink-0" aria-hidden />
        Contraseña de {email}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code data-testid="contrasena" className="num rounded-medio bg-fondo px-4 py-2.5 font-mono text-xl font-bold tracking-wider select-all">
          {contrasena}
        </code>
        <Boton
          variante="secundario"
          tamano="chico"
          className="h-11"
          onClick={() => {
            void navigator.clipboard?.writeText(`${email}\n${contrasena}`).catch(() => undefined)
            setCopiada(true)
          }}
        >
          {copiada ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copiada ? 'Copiada' : 'Copiar mail y contraseña'}
        </Boton>
      </div>
      <p className="text-sm">Pasásela por WhatsApp o en persona. No se vuelve a mostrar: si se pierde, reseteala desde la lista de cuentas.</p>
      {children}
      <Boton variante="fantasma" tamano="chico" className="h-11 self-start" onClick={onListo}>
        Listo, ya la pasé
      </Boton>
    </section>
  )
}
