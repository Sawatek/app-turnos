// Registro de la cola de mensajes de toda la plataforma. El código de los mensajes de ingreso nunca llega acá:
// la base lo saca antes de devolver la fila (admin_mensajes).
import { BellRing, Lock, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { ESTADOS_MENSAJE, TIPOS_MENSAJE, useMensajesAdmin, useNegociosAdmin, type FilaMensaje, type FiltroMensajes } from '@/datos/admin'
import { Boton } from '@/ui/Boton'
import { Cargando, FalloCarga, Insignia, Selector, fechaHora } from './comunes'

export function Mensajes() {
  const negocios = useNegociosAdmin()
  const [f, setF] = useState<FiltroMensajes>({ negocio: '', tipo: '', estado: '' })
  const q = useMensajesAdmin(f)
  const filas = q.data?.pages.flat() ?? []
  const cambiar = (k: keyof FiltroMensajes) => (e: React.ChangeEvent<HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <legend className="sr-only">Filtros</legend>
        <Selector etiqueta="Negocio" value={f.negocio} onChange={cambiar('negocio')}>
          <option value="">Todos</option>
          {negocios.data?.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nombre} (/{n.slug})
            </option>
          ))}
        </Selector>
        <Selector etiqueta="Tipo" value={f.tipo} onChange={cambiar('tipo')}>
          <option value="">Todos</option>
          {Object.entries(TIPOS_MENSAJE).map(([id, texto]) => (
            <option key={id} value={id}>
              {texto}
            </option>
          ))}
        </Selector>
        <Selector etiqueta="Estado" value={f.estado} onChange={cambiar('estado')}>
          <option value="">Todos</option>
          {Object.entries(ESTADOS_MENSAJE).map(([id, texto]) => (
            <option key={id} value={id}>
              {texto}
            </option>
          ))}
        </Selector>
      </fieldset>

      <section aria-labelledby="t-registro">
        <h2 id="t-registro" className="titulo border-b-2 border-texto pb-2 text-xl">
          Registro de mensajes
        </h2>
        {q.isPending ? (
          <Cargando />
        ) : q.isError ? (
          <FalloCarga error={q.error} onReintentar={() => void q.refetch()} />
        ) : filas.length === 0 ? (
          <p className="cuadricula mt-3 rounded-medio border border-dashed border-linea p-6 text-center text-suave">No hay mensajes con esos filtros.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-linea border-b border-linea">
            {filas.map((m) => (
              <FilaRegistro key={m.id} m={m} />
            ))}
          </ul>
        )}
        {q.hasNextPage && (
          <div className="flex justify-center pt-4">
            <Boton variante="secundario" tamano="chico" className="h-11" cargando={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
              Ver más viejos
            </Boton>
          </div>
        )}
      </section>
    </div>
  )
}

function FilaRegistro({ m }: { m: FilaMensaje }) {
  const Icono = m.canal === 'push' ? BellRing : MessageCircle
  return (
    <li className="flex flex-col gap-1 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Icono className="size-4 shrink-0 text-suave" aria-label={m.canal === 'push' ? 'Push' : 'WhatsApp'} />
        <span className="font-semibold">{TIPOS_MENSAJE[m.tipo] ?? m.tipo}</span>
        <Insignia estado={m.estado}>{ESTADOS_MENSAJE[m.estado] ?? m.estado}</Insignia>
        <span className="mono ml-auto text-xs text-suave">{fechaHora(m.creado)}</span>
      </div>
      <p className="text-sm text-suave">
        {m.negocio ?? 'Plataforma'} · a <span className="mono text-[0.8125rem]">{m.destino}</span>
        {m.intentos > 1 ? ` · ${m.intentos} intentos` : ''}
        {m.estado === 'pendiente' && Date.parse(m.programado) - Date.parse(m.creado) > 60_000 ? ` · programado para el ${fechaHora(m.programado)}` : ''}
      </p>
      {m.tipo === 'codigo' ? (
        <p className="flex items-center gap-1.5 text-sm text-suave">
          <Lock className="size-3.5 shrink-0" aria-hidden />
          Código de ingreso: no se muestra.
        </p>
      ) : (
        m.texto && <p className="border-l-2 border-linea pl-3 text-sm">{m.texto}</p>
      )}
      {m.error && <p className="text-sm font-semibold text-peligro">Error: {m.error}</p>}
    </li>
  )
}
