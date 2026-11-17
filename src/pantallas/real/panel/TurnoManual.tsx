// Cargar un turno a mano (llamada, mostrador, WhatsApp). Se ofrecen los horarios libres,
// pero se puede poner cualquier otro: si choca con otro turno, la base lo rechaza y se avisa.
import { UserPlus, X } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import {
  crearCliente,
  crearTurnoManual,
  useClientes,
  useLibres,
  useProfesionales,
  useRefrescar,
  useServicios,
  type Cliente,
} from '@/datos/real/panel'
import { enHora, horaCorta, precio } from '@/dominio/tiempo'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { Hoja } from '@/ui/Hoja'
import { cn } from '@/ui/cn'
import { AreaTexto, ErrorEnLinea, Selector, useAccion, usePanel } from './comunes'

export function HojaTurnoManual({
  abierta,
  onCerrar,
  diaInicial,
  profesionalInicial,
}: {
  abierta: boolean
  onCerrar: () => void
  diaInicial: string
  profesionalInicial: string | null
}) {
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Cargar turno" descripcion="Para turnos que te piden por teléfono, WhatsApp o en el local.">
      <FormTurno diaInicial={diaInicial} profesionalInicial={profesionalInicial} onListo={onCerrar} />
    </Hoja>
  )
}

interface Errores {
  cliente?: string
  servicio?: string
  profesional?: string
  hora?: string
  sena?: string
}

function FormTurno({ diaInicial, profesionalInicial, onListo }: { diaInicial: string; profesionalInicial: string | null; onListo: () => void }) {
  const { negocioId, esDueno, acceso } = usePanel()
  const servicios = useServicios(negocioId)
  const profesionales = useProfesionales(negocioId)
  const refrescar = useRefrescar(negocioId)
  const accion = useAccion()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [nuevo, setNuevo] = useState(false)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [servicioElegido, setServicio] = useState('')
  const [profElegido, setProfesional] = useState(esDueno ? (profesionalInicial ?? '') : (acceso.profesionalId ?? ''))
  const [dia, setDia] = useState(diaInicial)
  const [hora, setHora] = useState('')
  const [sena, setSena] = useState('0')
  const [notas, setNotas] = useState('')
  const [errores, setErrores] = useState<Errores>({})

  const activos = (servicios.data ?? []).filter((s) => s.activo)
  const servicioId = activos.some((s) => s.id === servicioElegido) ? servicioElegido : (activos[0]?.id ?? '')
  const serv = activos.find((s) => s.id === servicioId)
  const posibles = (profesionales.data ?? []).filter(
    (p) => (esDueno ? p.activo : p.id === acceso.profesionalId) && (p.servicios.length === 0 || p.servicios.includes(servicioId)),
  )
  const profesionalId = posibles.some((p) => p.id === profElegido) ? profElegido : (posibles[0]?.id ?? '')
  const libres = useLibres(negocioId, servicioId, dia, profesionalId)

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const e: Errores = {}
    if (!cliente && !(nuevo && nombre.trim())) e.cliente = nuevo ? 'Escribí el nombre del cliente.' : 'Elegí un cliente o cargá uno nuevo.'
    if (!serv) e.servicio = 'Elegí un servicio.'
    if (!profesionalId) e.profesional = 'Elegí quién lo atiende.'
    if (!dia || !/^\d\d:\d\d$/.test(hora)) e.hora = 'Elegí un horario libre o escribí otro.'
    const montoSena = Number(sena || 0)
    if (!Number.isInteger(montoSena) || montoSena < 0) e.sena = 'Poné un monto en pesos, sin centavos.'
    setErrores(e)
    if (Object.keys(e).length) return
    const listo = await accion.correr(async () => {
      let c = cliente
      if (!c) {
        c = await crearCliente(negocioId, nombre, telefono)
        // Si después falla el turno, el cliente ya queda elegido (no se duplica al reintentar).
        setCliente(c)
        setNuevo(false)
      }
      await crearTurnoManual(negocioId, {
        clienteId: c.id,
        servicioId,
        profesionalId,
        inicio: enHora(dia, hora).toISOString(),
        minutos: serv!.minutos,
        sena: esDueno ? montoSena : 0,
        notas,
      })
      await Promise.all([refrescar('turnos'), refrescar('clientes')])
    })
    if (listo) onListo()
  }

  const choque = accion.error?.includes('superpone')

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5 pb-2" noValidate>
      <ElegirCliente
        cliente={cliente}
        onCliente={setCliente}
        nuevo={nuevo}
        onNuevo={setNuevo}
        nombre={nombre}
        onNombre={setNombre}
        telefono={telefono}
        onTelefono={setTelefono}
        error={errores.cliente}
      />

      <Selector etiqueta="Servicio" value={servicioId} onChange={(e) => setServicio(e.target.value)} error={errores.servicio}>
        {activos.length === 0 && <option value="">No hay servicios activos</option>}
        {activos.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre} · {s.minutos} min{s.precio ? ` · ${precio(s.precio)}` : ''}
          </option>
        ))}
      </Selector>

      {esDueno ? (
        <Selector etiqueta="Profesional" value={profesionalId} onChange={(e) => setProfesional(e.target.value)} error={errores.profesional}>
          {posibles.length === 0 && <option value="">Nadie hace este servicio</option>}
          {posibles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </Selector>
      ) : (
        <ErrorEnLinea texto={errores.profesional ?? (posibles.length === 0 && !profesionales.isPending ? 'No hacés este servicio.' : undefined)} />
      )}

      <Campo etiqueta="Día" type="date" value={dia} onChange={(e) => setDia(e.target.value)} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold text-suave">Horarios libres</legend>
        {libres.isFetching && !libres.data ? (
          <p className="text-sm text-suave">Buscando horarios…</p>
        ) : libres.data?.length ? (
          <div className="flex flex-wrap gap-2">
            {libres.data.map((iso) => {
              const h = horaCorta(iso)
              return (
                <button
                  key={iso}
                  type="button"
                  aria-pressed={hora === h}
                  onClick={() => setHora(h)}
                  className={cn(
                    'num h-11 min-w-[4.25rem] rounded-medio px-3 text-[15px] font-bold transition-colors',
                    hora === h ? 'bg-acento text-sobre-acento' : 'bg-superficie ring-1 ring-linea hover:bg-superficie-2',
                  )}
                >
                  {h}
                </button>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-suave">No quedan horarios libres para ese día. Podés escribir otro horario abajo.</p>
        )}
      </fieldset>

      <Campo
        etiqueta="Hora del turno"
        ayuda="Elegí uno de arriba o escribí otro horario."
        type="time"
        step={300}
        value={hora}
        onChange={(e) => setHora(e.target.value)}
        error={errores.hora ?? (choque ? accion.error : undefined)}
      />

      {esDueno && (
        <Campo etiqueta="Seña cobrada ($)" type="number" inputMode="numeric" min={0} step={1} value={sena} onChange={(e) => setSena(e.target.value)} error={errores.sena} />
      )}
      <AreaTexto etiqueta="Notas del turno (opcional)" maxLength={500} value={notas} onChange={(e) => setNotas(e.target.value)} />

      {!choque && <ErrorEnLinea texto={accion.error} />}
      <Boton type="submit" tamano="grande" cargando={accion.ocupado}>
        Guardar turno
      </Boton>
    </form>
  )
}

function ElegirCliente(p: {
  cliente: Cliente | null
  onCliente: (c: Cliente | null) => void
  nuevo: boolean
  onNuevo: (v: boolean) => void
  nombre: string
  onNombre: (v: string) => void
  telefono: string
  onTelefono: (v: string) => void
  error?: string
}) {
  const { negocioId } = usePanel()
  const [busqueda, setBusqueda] = useState('')
  const diferida = useDeferredValue(busqueda)
  const clientes = useClientes(negocioId, diferida)

  if (p.cliente)
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold text-suave">Cliente</p>
        <div className="flex items-center justify-between gap-3 rounded-medio bg-acento-suave px-4 py-3 ring-1 ring-acento-borde">
          <div className="min-w-0">
            <p className="truncate font-semibold">{p.cliente.nombre}</p>
            {p.cliente.telefono && <p className="truncate text-sm text-suave">{p.cliente.telefono}</p>}
          </div>
          <Boton variante="fantasma" tamano="chico" className="h-11" onClick={() => p.onCliente(null)}>
            <X className="size-4" aria-hidden />
            Cambiar
          </Boton>
        </div>
      </div>
    )

  if (p.nuevo)
    return (
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1.5 text-sm font-semibold text-suave">Cliente nuevo</legend>
        <Campo etiqueta="Nombre del cliente" autoComplete="off" maxLength={80} value={p.nombre} onChange={(e) => p.onNombre(e.target.value)} error={p.error} />
        <Campo etiqueta="Teléfono (opcional)" type="tel" inputMode="tel" maxLength={30} value={p.telefono} onChange={(e) => p.onTelefono(e.target.value)} />
        <Boton variante="fantasma" tamano="chico" className="self-start" onClick={() => p.onNuevo(false)}>
          Buscar un cliente existente
        </Boton>
      </fieldset>
    )

  const lista = (clientes.data ?? []).slice(0, 6)
  return (
    <div className="flex flex-col gap-2">
      <Campo etiqueta="Buscar cliente" type="search" autoComplete="off" placeholder="Nombre o teléfono" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} error={p.error} />
      {lista.length > 0 ? (
        <ul className="overflow-hidden rounded-medio ring-1 ring-linea" aria-label="Clientes encontrados">
          {lista.map((c) => (
            <li key={c.id} className="border-b border-linea last:border-b-0">
              <button type="button" onClick={() => p.onCliente(c)} className="flex min-h-12 w-full items-center justify-between gap-3 bg-superficie px-4 py-2 text-left hover:bg-superficie-2">
                <span className="truncate font-semibold">{c.nombre}</span>
                {c.telefono && <span className="shrink-0 text-sm text-suave">{c.telefono}</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        diferida.trim() && !clientes.isFetching && <p className="text-sm text-suave">No encontramos a nadie con “{diferida.trim()}”.</p>
      )}
      <Boton
        variante="secundario"
        tamano="chico"
        className="self-start"
        onClick={() => {
          p.onNuevo(true)
          if (busqueda.trim() && !/^[\d\s+-]+$/.test(busqueda)) p.onNombre(busqueda.trim())
        }}
      >
        <UserPlus className="size-4" aria-hidden />
        Cliente nuevo
      </Boton>
    </div>
  )
}
