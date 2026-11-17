// Clientes: búsqueda, ficha con historial, mensajes y notas privadas (el cliente nunca las ve), alta manual
// y los que hace rato que no vienen (para recuperar).
import { ChevronRight, Search, Smartphone, UserPlus } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { crearCliente, editarCliente, guardarNota, useClientes, useHistorial, useNota, useRefrescar, type Cliente } from '@/datos/real/panel'
import { capitalizar, diaCorto, horaCorta } from '@/dominio/tiempo'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { Hoja } from '@/ui/Hoja'
import { InsigniaEstado } from '@/ui/Insignia'
import { iniciales } from '@/ui/Logo'
import { cn } from '@/ui/cn'
import { traerCliente } from '@/datos/real/panel-gestion'
import { HistorialMensajes } from './Mensajes'
import { Recuperar } from './Recuperar'
import { AreaTexto, Cargando, Encabezado, ErrorEnLinea, Exito, FalloCarga, Tarjeta, Vacio, useAccion, usePanel } from './comunes'

export function Clientes() {
  const { n, negocioId } = usePanel()
  const [busqueda, setBusqueda] = useState('')
  const diferida = useDeferredValue(busqueda)
  const clientes = useClientes(negocioId, diferida)
  const [elegido, setElegido] = useState<Cliente | null>(null)
  const [alta, setAlta] = useState(false)
  const [vista, setVista] = useState<'todos' | 'recuperar'>('todos')

  return (
    <div className="flex flex-col gap-4">
      <Encabezado titulo={capitalizar(n.textos.clientes || 'clientes')} bajada="Buscá por nombre o teléfono. Tocá uno para ver su historial y tus notas.">
        <Boton onClick={() => setAlta(true)}>
          <UserPlus className="size-5" aria-hidden />
          Nuevo cliente
        </Boton>
      </Encabezado>

      <fieldset className="grid grid-cols-2 gap-1 rounded-medio bg-superficie p-1 ring-1 ring-linea sm:max-w-sm">
        <legend className="sr-only">Qué clientes ver</legend>
        {(
          [
            ['todos', 'Todos'],
            ['recuperar', 'Para recuperar'],
          ] as const
        ).map(([id, texto]) => (
          <button
            key={id}
            type="button"
            aria-pressed={vista === id}
            onClick={() => setVista(id)}
            className={cn('h-11 rounded-chico text-sm font-semibold transition-colors', vista === id ? 'bg-acento text-sobre-acento' : 'text-suave hover:text-texto')}
          >
            {texto}
          </button>
        ))}
      </fieldset>

      {vista === 'recuperar' ? (
        <Recuperar
          onAbrir={(id) => {
            void traerCliente(id).then(setElegido, () => undefined)
          }}
        />
      ) : (
        <>
      <div className="relative">
        <Search className="pointer-events-none absolute bottom-4 left-4 size-5 text-suave" aria-hidden />
        <Campo etiqueta="Buscar cliente" type="search" autoComplete="off" placeholder="Nombre o teléfono" className="[&_input]:pl-11" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>

      {clientes.isPending ? (
        <Cargando />
      ) : clientes.isError ? (
        <FalloCarga error={clientes.error} onReintentar={() => void clientes.refetch()} />
      ) : clientes.data.length === 0 ? (
        <Vacio>{diferida.trim() ? `No encontramos a nadie con “${diferida.trim()}”.` : 'Todavía no hay clientes. Se suman solos cuando reservan, o cargalos a mano.'}</Vacio>
      ) : (
        <section aria-label="Lista de clientes" className="overflow-hidden rounded-grande bg-superficie ring-1 ring-linea">
          <ul className="divide-y divide-linea">
            {clientes.data.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setElegido(c)} className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-superficie-2/60">
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-superficie-2 text-xs font-bold" aria-hidden>
                    {iniciales(c.nombre)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.nombre}</p>
                    <p className="truncate text-sm text-suave">{c.telefono || 'Sin teléfono'}</p>
                  </div>
                  {c.user_id && (
                    <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-acento-suave px-2.5 text-xs font-bold text-acento-texto">
                      <Smartphone className="size-3" aria-hidden />
                      Usa la app
                    </span>
                  )}
                  <ChevronRight className="size-5 shrink-0 text-suave" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
        </>
      )}

      <Hoja abierta={alta} onCerrar={() => setAlta(false)} titulo="Nuevo cliente" descripcion="Para quien te pide turno por teléfono o en el local.">
        <FormCliente
          onListo={(c) => {
            setAlta(false)
            setElegido(c)
          }}
        />
      </Hoja>
      <Hoja abierta={!!elegido} onCerrar={() => setElegido(null)} titulo={elegido?.nombre ?? 'Cliente'} descripcion={elegido?.telefono ?? undefined}>
        {elegido && <Ficha key={elegido.id} c={elegido} onCambio={setElegido} />}
      </Hoja>
    </div>
  )
}

function FormCliente({ c, onListo }: { c?: Cliente; onListo: (c: Cliente) => void }) {
  const { negocioId } = usePanel()
  const refrescar = useRefrescar(negocioId)
  const accion = useAccion()
  const [nombre, setNombre] = useState(c?.nombre ?? '')
  const [telefono, setTelefono] = useState(c?.telefono ?? '')
  const [errorNombre, setErrorNombre] = useState<string>()

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!nombre.trim()) return setErrorNombre('Escribí el nombre.')
    setErrorNombre(undefined)
    let resultado: Cliente | null | undefined
    const listo = await accion.correr(async () => {
      if (c) {
        await editarCliente(c.id, nombre, telefono)
        resultado = { ...c, nombre: nombre.trim(), telefono: telefono.trim() || null }
      } else resultado = await crearCliente(negocioId, nombre, telefono)
      await Promise.all([refrescar('clientes'), refrescar('turnos')])
    })
    if (listo && resultado) onListo(resultado)
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4 pb-2" noValidate>
      <Campo etiqueta="Nombre" autoComplete="off" maxLength={80} value={nombre} onChange={(e) => setNombre(e.target.value)} error={errorNombre} />
      <Campo etiqueta="Teléfono (opcional)" type="tel" inputMode="tel" maxLength={30} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
      <ErrorEnLinea texto={accion.error} />
      <Boton type="submit" tamano={c ? 'medio' : 'grande'} variante={c ? 'secundario' : 'primario'} cargando={accion.ocupado}>
        {c ? 'Guardar datos' : 'Guardar cliente'}
      </Boton>
    </form>
  )
}

function Ficha({ c, onCambio }: { c: Cliente; onCambio: (c: Cliente) => void }) {
  const { negocioId } = usePanel()
  const historial = useHistorial(negocioId, c.id)
  const turnos = historial.data ?? []
  const visitas = turnos.filter((t) => t.estado === 'asistio').length
  const faltas = turnos.filter((t) => t.estado === 'falto').length

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ['Turnos', turnos.length],
          ['Vino', visitas],
          ['No vino', faltas],
        ].map(([t, v]) => (
          <div key={t} className="rounded-medio bg-superficie p-3 ring-1 ring-linea">
            <p className="titulo num text-xl">{v}</p>
            <p className="text-xs font-semibold text-suave">{t}</p>
          </div>
        ))}
      </div>

      <Nota clienteId={c.id} />

      <HistorialMensajes clienteId={c.id} />

      <Tarjeta titulo="Historial">
        {historial.isPending ? (
          <Cargando />
        ) : turnos.length === 0 ? (
          <p className="text-sm text-suave">Todavía no tiene turnos.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-linea" aria-label="Historial de turnos">
            {turnos.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="num font-semibold">
                    {capitalizar(diaCorto(t.inicio))} · {horaCorta(t.inicio)}
                  </p>
                  <p className="truncate text-sm text-suave">
                    {t.servicioNombre} · {t.profesionalNombre}
                  </p>
                </div>
                <InsigniaEstado estado={t.estado} className="shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta titulo="Datos">
        <FormCliente c={c} onListo={onCambio} />
      </Tarjeta>
    </div>
  )
}

function Nota({ clienteId }: { clienteId: string }) {
  const { negocioId } = usePanel()
  const nota = useNota(negocioId, clienteId)
  if (nota.isPending) return <Cargando />
  return <EditorNota key={clienteId} clienteId={clienteId} inicial={nota.data?.texto ?? ''} />
}

function EditorNota({ clienteId, inicial }: { clienteId: string; inicial: string }) {
  const { negocioId } = usePanel()
  const refrescar = useRefrescar(negocioId)
  const accion = useAccion()
  const [texto, setTexto] = useState(inicial)
  const [base, setBase] = useState(inicial)
  const [guardada, setGuardada] = useState(false)
  return (
    <Tarjeta titulo="Notas privadas">
      <div className="flex flex-col gap-3">
        <AreaTexto
          etiqueta="Solo las ve tu equipo"
          maxLength={1000}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setGuardada(false)
          }}
          placeholder="Ej.: prefiere a la mañana, alergia a tal producto…"
        />
        <ErrorEnLinea texto={accion.error} />
        <div className="flex items-center gap-3">
          <Boton
            variante="secundario"
            cargando={accion.ocupado}
            disabled={texto === base}
            onClick={() =>
              void accion
                .correr(async () => {
                  await guardarNota(negocioId, clienteId, texto)
                })
                .then((ok) => {
                  setGuardada(ok)
                  if (!ok) return
                  setBase(texto)
                  void refrescar('nota', clienteId)
                })
            }
          >
            Guardar nota
          </Boton>
          <Exito texto={guardada ? 'Nota guardada' : undefined} />
        </div>
      </div>
    </Tarjeta>
  )
}
