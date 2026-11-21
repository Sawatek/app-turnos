// Clientes para recuperar: los que no vienen hace más de N días (y no tienen turnos por delante),
// con su último servicio. Un toque les manda el "te extrañamos" por WhatsApp (como máximo uno cada 30 días).
import { HeartHandshake, Send } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { useRefrescar } from '@/datos/real/panel'
import { recuperarCliente, useParaRecuperar, type ParaRecuperar } from '@/datos/real/panel-gestion'
import { capitalizar, diaCorto, mesCorto, numeroDia } from '@/dominio/tiempo'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { Cargando, ErrorEnLinea, FalloCarga, Tarjeta, Vacio, useAccion, usePanel } from './comunes'
import { InsigniaMensaje } from './Mensajes'

/** Texto por defecto del "te extrañamos" (el mismo que arma la base si el negocio no cargó uno). */
export const RECUPERAR_POR_DEFECTO =
  'Hola {nombre}, hace un tiempo que no te vemos por {negocio}. ¿Querés sacar un turno? Entrá a la app y elegí el horario que te quede mejor: {link}'

const DIA_MS = 86_400_000

export function Recuperar({ onAbrir }: { onAbrir: (clienteId: string) => void }) {
  const { n, negocioId } = usePanel()
  const porDefecto = Number.isInteger(n.recuperarDias) && n.recuperarDias > 0 ? n.recuperarDias : 30
  const [texto, setTexto] = useState(String(porDefecto))
  const valido = /^\d{1,4}$/.test(texto.trim()) && Number(texto) >= 1 && Number(texto) <= 3650
  const dias = useDeferredValue(valido ? Number(texto) : porDefecto)
  const lista = useParaRecuperar(negocioId, dias)
  const [ahora] = useState(() => Date.now())
  const plantilla = (n.mensajes?.recuperar || RECUPERAR_POR_DEFECTO).replaceAll('{negocio}', n.nombre).replaceAll('{link}', 'el link de la app')

  return (
    <div className="flex flex-col gap-4">
      <Tarjeta>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <Campo
            etiqueta="Sin venir hace más de (días)"
            type="number"
            inputMode="numeric"
            min={1}
            max={3650}
            className="sm:w-56"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            error={valido ? undefined : 'Entre 1 y 3650 días.'}
          />
          <div className="flex-1 text-sm">
            <p className="rotulo mb-1.5 text-suave">Les llega por WhatsApp</p>
            <p className="rounded-medio rounded-tl-none bg-wa-fondo px-3 py-2 text-wa-tinta">{plantilla.replaceAll('{nombre}', 'Ana')}</p>
            <p className="mt-1.5 text-suave">El texto se cambia en Marca.</p>
          </div>
        </div>
      </Tarjeta>

      {lista.isPending ? (
        <Cargando texto="Buscando clientes" />
      ) : lista.isError ? (
        <FalloCarga error={lista.error} onReintentar={() => void lista.refetch()} />
      ) : lista.data.length === 0 ? (
        <Vacio>No hay clientes que lleven más de {dias} días sin venir. ¡Bien ahí!</Vacio>
      ) : (
        <section aria-label="Clientes para recuperar" className="overflow-hidden rounded-grande ring-1 ring-linea">
          <p className="rotulo border-b border-linea bg-superficie px-4 py-2.5 text-suave">
            {lista.data.length === 1 ? '1 cliente' : `${lista.data.length} clientes`} sin venir hace más de {dias} días.
          </p>
          <ul className="divide-y divide-linea">
            {lista.data.map((c) => (
              <Fila key={c.clienteId} c={c} ahora={ahora} onAbrir={() => onAbrir(c.clienteId)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Fila({ c, ahora, onAbrir }: { c: ParaRecuperar; ahora: number; onAbrir: () => void }) {
  const { negocioId } = usePanel()
  const refrescar = useRefrescar(negocioId)
  const accion = useAccion()
  const hace = Math.floor((ahora - Date.parse(c.ultimaVisita)) / DIA_MS)
  const reciente = !!c.enviado && ahora - Date.parse(c.enviado) < 30 * DIA_MS && c.estadoEnvio !== 'error'

  return (
    // En el margen, cuántos días hace que no viene, grande: es lo que ordena la lista y lo que importa de un vistazo.
    <li className="grid grid-cols-[3.25rem_minmax(0,1fr)] sm:grid-cols-[4.5rem_minmax(0,1fr)]">
      <p aria-hidden className="border-r border-acento-borde pt-3 text-center leading-none">
        <span className="cifra block text-[1.75rem] text-acento-texto sm:text-[2.25rem]">{hace}</span>
        <span className="rotulo text-suave">días</span>
      </p>
      <div className="flex min-w-0 flex-wrap items-center gap-3 px-4 py-3">
      <button type="button" onClick={onAbrir} className="flex min-h-11 min-w-0 flex-1 basis-56 text-left" aria-label={`Ver la ficha de ${c.nombre}`}>
        <span className="min-w-0">
          <span className="block truncate font-semibold">{c.nombre}</span>
          <span className="block text-sm text-suave">
            Vino por última vez el {numeroDia(c.ultimaVisita)} de {mesCorto(c.ultimaVisita)} (hace {hace} días) · {c.ultimoServicio}
          </span>
          <span className="mono block text-xs text-suave">{c.visitas === 1 ? '1 visita' : `${c.visitas} visitas`}</span>
        </span>
      </button>
      <div className="flex w-full flex-col items-stretch gap-1 sm:w-auto sm:items-end">
        {reciente ? (
          <p className="flex flex-wrap items-center gap-2 text-sm text-suave sm:justify-end">
            <HeartHandshake className="size-4 text-acento-texto" aria-hidden />
            Mensaje enviado el {capitalizar(diaCorto(c.enviado!)).toLowerCase()}
            {c.estadoEnvio && <InsigniaMensaje estado={c.estadoEnvio} />}
          </p>
        ) : !c.conCelular ? (
          <p className="text-sm text-suave">Sin celular cargado</p>
        ) : (
          <Boton
            variante="secundario"
            tamano="chico"
            className="h-11"
            cargando={accion.ocupado}
            onClick={() =>
              void accion.correr(async () => {
                await recuperarCliente(c.clienteId)
                await Promise.all([refrescar('recuperar'), refrescar('mensajes')])
              })
            }
          >
            <Send className="size-4" aria-hidden />
            Mandar “te extrañamos”
          </Boton>
        )}
        <ErrorEnLinea texto={accion.error} />
      </div>
      </div>
    </li>
  )
}
