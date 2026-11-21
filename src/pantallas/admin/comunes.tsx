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

/** Planilla de cifras: celdas separadas por líneas finas (como una hoja de cálculo), sin tarjetas flotantes. */
export function Planilla({ columnas = 4, className, children }: { columnas?: 1 | 2 | 3 | 4; className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-medio bg-linea ring-1 ring-linea',
        columnas === 1 && 'grid-cols-1',
        columnas === 3 && 'sm:grid-cols-3',
        columnas === 4 && 'sm:grid-cols-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Número grande con su etiqueta (métricas): una celda de la planilla. */
export function Cifra({ etiqueta, valor, detalle, tono }: { etiqueta: string; valor: number | string; detalle?: string; tono?: 'exito' | 'peligro' | 'aviso' }) {
  return (
    <div className="flex flex-col bg-superficie p-3.5">
      <p className="rotulo text-suave">{etiqueta}</p>
      <p className={cn('cifra mt-2 text-[2.25rem]', tono === 'exito' && 'text-exito', tono === 'peligro' && 'text-peligro', tono === 'aviso' && 'text-aviso')}>{valor}</p>
      {detalle && <p className="mt-1 text-xs text-suave">{detalle}</p>}
    </div>
  )
}

const TONOS_ESTADO: Record<string, string> = {
  activo: 'text-exito',
  prueba: 'text-aviso',
  suspendido: 'text-peligro',
  enviado: 'text-exito',
  pendiente: 'text-aviso',
  enviando: 'text-aviso',
  error: 'text-peligro',
  cancelado: 'text-suave',
}

/** Estado en letra de ticket con su puntito de color (en las listas no van sellos: serían demasiados). */
export function Insignia({ estado, children }: { estado: string; children: React.ReactNode }) {
  return (
    <span className={cn('rotulo inline-flex shrink-0 items-center gap-1.5', TONOS_ESTADO[estado] ?? 'text-suave')}>
      <span aria-hidden className="size-2 rounded-full bg-current" />
      {children}
    </span>
  )
}

export const fechaHora = (d: string) => format(enAR(d), "d MMM yyyy, HH:mm", { locale: es }).replace('.', '')
export const fechaCorta = (d: string) => format(enAR(d), 'd MMM yyyy', { locale: es }).replace('.', '')

/**
 * La contraseña recién generada, para pasársela a la persona. Se muestra UNA vez: no queda guardada.
 */
export function ContrasenaNueva({ email, contrasena, children, onListo }: { email: string; contrasena: string; children?: React.ReactNode; onListo: () => void }) {
  const [copiada, setCopiada] = useState(false)
  return (
    <section aria-label="Contraseña generada" className="flex flex-col gap-3 rounded-medio border border-dashed border-acento-borde bg-acento-suave p-4">
      <p className="flex items-center gap-2 font-bold text-acento-texto">
        <KeyRound className="size-5 shrink-0" aria-hidden />
        Contraseña de {email}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code data-testid="contrasena" className="mono rounded-chico bg-fondo px-4 py-2.5 text-xl font-bold tracking-wider select-all ring-1 ring-linea">
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
