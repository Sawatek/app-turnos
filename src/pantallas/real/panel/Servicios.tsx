// Servicios: alta, edición y baja lógica (inactivo = no se puede reservar, pero queda en el historial).
import { ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { guardarServicio, useRefrescar, useServicios, type Servicio } from '@/datos/real/panel'
import { precio } from '@/dominio/tiempo'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { Hoja } from '@/ui/Hoja'
import { Etiqueta } from '@/ui/Insignia'
import { cn } from '@/ui/cn'
import { Cargando, Encabezado, ErrorEnLinea, FalloCarga, Interruptor, Vacio, useAccion, usePanel } from './comunes'

export function Servicios() {
  const { negocioId } = usePanel()
  const servicios = useServicios(negocioId)
  const [editando, setEditando] = useState<Servicio | 'nuevo' | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <Encabezado titulo="Servicios" bajada="Lo que tus clientes pueden reservar. Desactivá un servicio para dejar de ofrecerlo.">
        <Boton onClick={() => setEditando('nuevo')}>
          <Plus className="size-5" aria-hidden />
          Nuevo servicio
        </Boton>
      </Encabezado>

      {servicios.isPending ? (
        <Cargando />
      ) : servicios.isError ? (
        <FalloCarga error={servicios.error} onReintentar={() => void servicios.refetch()} />
      ) : servicios.data.length === 0 ? (
        <Vacio>Todavía no cargaste servicios.</Vacio>
      ) : (
        <section aria-label="Lista de servicios" className="overflow-hidden rounded-grande bg-superficie ring-1 ring-linea">
          <ul className="divide-y divide-linea">
            {servicios.data.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setEditando(s)}
                  aria-label={`Editar ${s.nombre}`}
                  className={cn('flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-superficie-2/60', !s.activo && 'opacity-60')}
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {s.nombre}
                      {s.etiqueta && <Etiqueta>{s.etiqueta}</Etiqueta>}
                      {!s.activo && <span className="inline-flex h-6 items-center rounded-full bg-superficie-2 px-2.5 text-xs font-bold text-suave">Inactivo</span>}
                    </p>
                    <p className="truncate text-sm text-suave">
                      {s.minutos} min · {s.precio ? precio(s.precio) : 'Sin precio'}
                      {s.detalle ? ` · ${s.detalle}` : ''}
                    </p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-suave" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Hoja abierta={editando !== null} onCerrar={() => setEditando(null)} titulo={editando === 'nuevo' ? 'Nuevo servicio' : 'Editar servicio'}>
        {editando !== null && (
          <FormServicio
            s={editando === 'nuevo' ? undefined : editando}
            ordenSiguiente={(servicios.data?.reduce((m, s) => Math.max(m, s.orden), -1) ?? -1) + 1}
            onListo={() => setEditando(null)}
          />
        )}
      </Hoja>
    </div>
  )
}

interface Errores {
  nombre?: string
  minutos?: string
  precio?: string
  orden?: string
}

function FormServicio({ s, ordenSiguiente, onListo }: { s?: Servicio; ordenSiguiente: number; onListo: () => void }) {
  const { negocioId } = usePanel()
  const refrescar = useRefrescar(negocioId)
  const accion = useAccion()
  const [nombre, setNombre] = useState(s?.nombre ?? '')
  const [minutos, setMinutos] = useState(String(s?.minutos ?? 30))
  const [monto, setMonto] = useState(String(s?.precio ?? 0))
  const [detalle, setDetalle] = useState(s?.detalle ?? '')
  const [etiqueta, setEtiqueta] = useState(s?.etiqueta ?? '')
  const [orden, setOrden] = useState(String(s?.orden ?? ordenSiguiente))
  const [activo, setActivo] = useState(s?.activo ?? true)
  const [errores, setErrores] = useState<Errores>({})

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const e: Errores = {}
    const min = Number(minutos)
    const pr = Number(monto || 0)
    const ord = Number(orden || 0)
    if (!nombre.trim()) e.nombre = 'Escribí el nombre del servicio.'
    if (!Number.isInteger(min) || min < 5 || min > 720) e.minutos = 'Entre 5 y 720 minutos.'
    if (!Number.isInteger(pr) || pr < 0) e.precio = 'Poné el precio en pesos, sin centavos (0 = no se muestra).'
    if (!Number.isInteger(ord)) e.orden = 'Tiene que ser un número entero.'
    setErrores(e)
    if (Object.keys(e).length) return
    const listo = await accion.correr(async () => {
      await guardarServicio(negocioId, s?.id ?? null, {
        nombre: nombre.trim(),
        minutos: min,
        precio: pr,
        detalle: detalle.trim() || null,
        etiqueta: etiqueta.trim() || null,
        orden: ord,
        activo,
      })
      await refrescar('servicios')
    })
    if (listo) onListo()
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4 pb-2" noValidate>
      <Campo etiqueta="Nombre del servicio" maxLength={80} value={nombre} onChange={(e) => setNombre(e.target.value)} error={errores.nombre} />
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Duración (minutos)" type="number" inputMode="numeric" min={5} max={720} step={5} value={minutos} onChange={(e) => setMinutos(e.target.value)} error={errores.minutos} />
        <Campo etiqueta="Precio ($)" type="number" inputMode="numeric" min={0} step={1} value={monto} onChange={(e) => setMonto(e.target.value)} error={errores.precio} />
      </div>
      <Campo etiqueta="Detalle (opcional)" maxLength={200} value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Ej.: incluye lavado" />
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Etiqueta (opcional)" maxLength={40} value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} placeholder="Ej.: Más pedido" />
        <Campo etiqueta="Orden" ayuda="Menor = aparece primero." type="number" inputMode="numeric" step={1} value={orden} onChange={(e) => setOrden(e.target.value)} error={errores.orden} />
      </div>
      <Interruptor etiqueta="Activo" ayuda={activo ? 'Se puede reservar.' : 'No aparece en la app de reservas.'} activo={activo} onCambiar={setActivo} />
      <ErrorEnLinea texto={accion.error} />
      <Boton type="submit" tamano="grande" cargando={accion.ocupado}>
        {s ? 'Guardar cambios' : 'Crear servicio'}
      </Boton>
    </form>
  )
}
