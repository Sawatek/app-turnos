// Clientes: búsqueda, ficha con historial, mensajes y notas privadas (el cliente nunca las ve), alta manual
// y los que hace rato que no vienen (para recuperar).
import { ChevronRight, Search, Smartphone, UserPlus } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { crearCliente, editarCliente, guardarNota, useClientes, useHistorial, useNota, useRefrescar, type Cliente } from '@/datos/real/panel'
import { capitalizar, diaCorto, horaCorta, mesCorto } from '@/dominio/tiempo'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { Hoja } from '@/ui/Hoja'
import { InsigniaEstado } from '@/ui/Insignia'
import { Pastillas } from '@/ui/Pastillas'
import { cn } from '@/ui/cn'
import { telefonoLegible } from '@/datos/real/cliente-telefono'
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

      <Pastillas
        etiqueta="Qué clientes ver"
        ocultarEtiqueta
        valor={vista}
        opciones={[
          { id: 'todos', texto: 'Todos' },
          { id: 'recuperar', texto: 'Para recuperar' },
        ]}
        onCambiar={setVista}
      />

      {vista === 'recuperar' ? (
        <Recuperar
          onAbrir={(id) => {
            void traerCliente(id).then(setElegido, () => undefined)
          }}
        />
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute bottom-4 left-3.5 size-5 text-suave" aria-hidden />
            <Campo etiqueta="Buscar cliente" type="search" autoComplete="off" placeholder="Nombre o teléfono" className="[&_input]:pl-11" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>

          {clientes.isPending ? (
            <Cargando />
          ) : clientes.isError ? (
            <FalloCarga error={clientes.error} onReintentar={() => void clientes.refetch()} />
          ) : clientes.data.length === 0 ? (
            <Vacio>{diferida.trim() ? `No encontramos a nadie con “${diferida.trim()}”.` : 'Todavía no hay clientes. Se suman solos cuando reservan, o cargalos a mano.'}</Vacio>
          ) : (
            <Fichero clientes={clientes.data} onElegir={setElegido} />
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
      <Hoja abierta={!!elegido} onCerrar={() => setElegido(null)} titulo={elegido?.nombre ?? 'Cliente'} descripcion={telefonoLegible(elegido?.telefono) || undefined}>
        {elegido && <Ficha key={elegido.id} c={elegido} onCambio={setElegido} />}
      </Hoja>
    </div>
  )
}

/** Letra del fichero: la inicial sin tilde ("Ángela" va en la A); números y símbolos, en "#". */
function letraDe(nombre: string) {
  const l = nombre.trim().charAt(0).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
  return /[A-ZÑ]/.test(l) ? l : '#'
}

/**
 * Los clientes como la libreta de teléfonos: agrupados por letra, con la letra grande en el margen
 * (como el índice recortado de la agenda) y cada cliente en un renglón con su teléfono en letra de ticket.
 */
function Fichero({ clientes, onElegir }: { clientes: Cliente[]; onElegir: (c: Cliente) => void }) {
  const grupos = new Map<string, Cliente[]>()
  for (const c of clientes.toSorted((a, b) => a.nombre.localeCompare(b.nombre, 'es'))) {
    const l = letraDe(c.nombre)
    grupos.set(l, [...(grupos.get(l) ?? []), c])
  }
  return (
    <section aria-label="Lista de clientes" className="overflow-clip rounded-grande ring-1 ring-linea">
      <p className="rotulo flex justify-between border-b border-linea bg-superficie px-4 py-2.5 text-suave">
        <span>{clientes.length === 1 ? '1 cliente' : `${clientes.length} clientes`}</span>
        {clientes.length >= 100 && <span>Mostrando los primeros 100</span>}
      </p>
      {[...grupos].map(([letra, lista]) => (
        <div key={letra} className="grid grid-cols-[3.25rem_minmax(0,1fr)] border-b border-linea last:border-b-0 sm:grid-cols-[4.5rem_minmax(0,1fr)]">
          <p aria-hidden className="border-r border-acento-borde pt-2.5 text-center">
            <span className="cifra sticky top-[calc(var(--alto-encabezado,0px)+0.5rem)] text-[2rem] text-acento-texto">{letra}</span>
          </p>
          <ul className="divide-y divide-linea">
            {lista.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onElegir(c)} className="group flex min-h-15 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-superficie">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{c.nombre}</span>
                    <span className={cn('block truncate text-sm text-suave', c.telefono && 'mono')}>{telefonoLegible(c.telefono) || 'Sin teléfono'}</span>
                  </span>
                  {c.user_id && (
                    <span className="rotulo inline-flex shrink-0 items-center gap-1 text-acento-texto">
                      <Smartphone className="size-3.5" aria-hidden />
                      {/* En el celular, solo el ícono: el teléfono es el dato que importa y necesita el lugar. */}
                      <span className="sr-only sm:not-sr-only">Usa la app</span>
                    </span>
                  )}
                  <ChevronRight className="size-5 shrink-0 text-suave transition-transform group-hover:translate-x-0.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
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
      {/* La cuenta del cliente, como el pie de una planilla: turnos, cuántas vino y cuántas faltó. */}
      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-medio bg-linea ring-1 ring-linea">
        {(
          [
            ['Turnos', turnos.length, 'text-texto'],
            ['Vino', visitas, 'text-texto'],
            ['No vino', faltas, faltas ? 'text-peligro' : 'text-texto'],
          ] as const
        ).map(([t, v, color]) => (
          <div key={t} className="flex flex-col bg-fondo px-3 py-2.5">
            <dt className="rotulo text-suave">{t}</dt>
            <dd className={cn('cifra mt-1 text-[2.25rem]', color)}>{historial.isPending ? '–' : v}</dd>
          </div>
        ))}
      </dl>

      <Tarjeta titulo="Historial">
        {historial.isPending ? (
          <Cargando />
        ) : turnos.length === 0 ? (
          <p className="text-sm text-suave">Todavía no tiene turnos.</p>
        ) : (
          <ul className="-my-2 flex flex-col divide-y divide-linea" aria-label="Historial de turnos">
            {turnos.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <p className="w-[5.75rem] shrink-0 leading-tight">
                  <span className="cifra block text-[1.375rem]">{horaCorta(t.inicio)}</span>
                  <span className="rotulo text-suave">
                    {diaCorto(t.inicio)} {mesCorto(t.inicio)}
                  </span>
                </p>
                <p className="min-w-0 flex-1 text-sm">
                  <span className="block truncate font-semibold">{t.servicioNombre}</span>
                  <span className="block truncate text-suave">{t.profesionalNombre}</span>
                </p>
                <InsigniaEstado estado={t.estado} className="shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      {/* Primero lo que el dueño viene a buscar (cuántas vino y cuándo); después las notas, y al final lo técnico:
          qué mensajes salieron y los datos de contacto. */}
      <Nota clienteId={c.id} />

      <HistorialMensajes clienteId={c.id} />

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
