// Piezas compartidas por las secciones de la consola de SawaTek (mismo estilo que src/ui).
import { Check, Copy, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { mensajeAdmin } from '@/datos/admin'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { enAR } from '@/dominio/tiempo'
import { Boton } from '@/ui/Boton'
import { AreaTexto as AreaTextoBase } from '@/ui/Campo'
import { cn } from '@/ui/cn'
import { FalloCarga as FalloCargaBase, type PropsFalloCarga } from '@/ui/Estados'
import { Tarjeta as TarjetaBase } from '@/ui/Tarjeta'
import { useAccion as useAccionBase } from '@/ui/useAccion'

/** Corre una acción async con "cargando" y deja el error listo para mostrar (con los textos de la consola). */
export const useAccion = () => useAccionBase(mensajeAdmin)

export { Selector } from '@/ui/Campo'
export { Cargando, ErrorEnLinea, Exito, Vacio } from '@/ui/Estados'

/** En la consola los textos largos (notas internas) arrancan con 4 renglones. */
export const AreaTexto = (p: React.ComponentProps<typeof AreaTextoBase>) => <AreaTextoBase rows={4} {...p} />

export const FalloCarga = (p: PropsFalloCarga) => <FalloCargaBase mensaje={mensajeAdmin} {...p} />

/** En la consola cada tarjeta es una sección principal (h2, con bajada). */
export const Tarjeta = (p: Omit<React.ComponentProps<typeof TarjetaBase>, 'nivel'> & { titulo: string }) => <TarjetaBase nivel={2} {...p} />

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
      <Boton variante="fantasma" tamano="chico" className="self-start" onClick={onListo}>
        Listo, ya la pasé
      </Boton>
    </section>
  )
}
