// Equipo: profesionales (datos, servicios que hace), invitaciones por mail, miembros con acceso al panel
// y "yo también atiendo" (el dueño vincula su cuenta a una ficha para tener agenda propia).
import { ChevronRight, MailPlus, Plus, UserRoundCheck } from 'lucide-react'
import { useState } from 'react'
import {
  cancelarInvitacion,
  guardarProfesional,
  invitar,
  quitarMiembro,
  useInvitaciones,
  useMiembros,
  useProfesionales,
  useRefrescar,
  useServicios,
  type Profesional,
} from '@/datos/real/panel'
import { atiendoYo } from '@/datos/real/panel-gestion'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { Hoja } from '@/ui/Hoja'
import { iniciales } from '@/ui/Logo'
import { cn } from '@/ui/cn'
import { BotonConfirmar, Cargando, Encabezado, ErrorEnLinea, Exito, FalloCarga, Interruptor, Selector, Tarjeta, Vacio, useAccion, usePanel } from './comunes'

export function Equipo() {
  const { negocioId } = usePanel()
  const profs = useProfesionales(negocioId)
  const servicios = useServicios(negocioId)
  const miembros = useMiembros(negocioId)
  const invitaciones = useInvitaciones(negocioId)
  const [editando, setEditando] = useState<Profesional | 'nuevo' | null>(null)

  const estadoUsuario = (p: Profesional) => {
    const m = miembros.data?.find((x) => x.profesionalId === p.id)
    if (m) return `Entra con ${m.nombre ? `${m.nombre} (${m.email})` : m.email}`
    const inv = invitaciones.data?.find((i) => i.profesional_id === p.id)
    if (inv) return `Invitación pendiente: ${inv.email}`
    return 'Sin acceso al panel'
  }
  const queHace = (p: Profesional) =>
    p.servicios.length === 0
      ? 'Todos los servicios'
      : (servicios.data ?? [])
          .filter((s) => p.servicios.includes(s.id))
          .map((s) => s.nombre)
          .join(', ')

  return (
    <div className="flex flex-col gap-4">
      <Encabezado titulo="Equipo" bajada="Quiénes atienden, qué hace cada uno y quién entra al panel.">
        <Boton onClick={() => setEditando('nuevo')}>
          <Plus className="size-5" aria-hidden />
          Nuevo profesional
        </Boton>
      </Encabezado>

      {profs.isPending ? (
        <Cargando />
      ) : profs.isError ? (
        <FalloCarga error={profs.error} onReintentar={() => void profs.refetch()} />
      ) : profs.data.length === 0 ? (
        <Vacio>Todavía no cargaste profesionales.</Vacio>
      ) : (
        <section aria-label="Profesionales" className="overflow-hidden rounded-grande bg-superficie ring-1 ring-linea">
          <ul className="divide-y divide-linea">
            {profs.data.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setEditando(p)}
                  aria-label={`Editar a ${p.nombre}`}
                  className={cn('flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-superficie-2/60', !p.activo && 'opacity-60')}
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-superficie-2 text-sm font-bold" aria-hidden>
                    {iniciales(p.nombre)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {p.nombre}
                      {p.rol && <span className="font-normal text-suave">· {p.rol}</span>}
                      {!p.activo && <span className="inline-flex h-6 items-center rounded-full bg-superficie-2 px-2.5 text-xs font-bold text-suave">Inactivo</span>}
                    </p>
                    <p className="truncate text-sm text-suave">{queHace(p)}</p>
                    <p className="truncate text-xs text-suave">{estadoUsuario(p)}</p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-suave" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <YoTambienAtiendo />

      <div className="grid gap-4 lg:grid-cols-2">
        <Invitar />
        <Tarjeta titulo="Con acceso al panel">
          {miembros.isPending ? (
            <Cargando />
          ) : miembros.isError ? (
            <FalloCarga error={miembros.error} onReintentar={() => void miembros.refetch()} />
          ) : (
            <ul className="flex flex-col divide-y divide-linea" aria-label="Miembros">
              {miembros.data.map((m) => (
                <FilaMiembro key={m.userId} email={m.email} nombre={m.nombre} rol={m.rol} profesional={m.profesional} userId={m.userId} />
              ))}
            </ul>
          )}
          {!!invitaciones.data?.length && (
            <>
              <h4 className="mt-4 mb-1 text-sm font-bold text-suave">Invitaciones pendientes</h4>
              <ul className="flex flex-col divide-y divide-linea" aria-label="Invitaciones pendientes">
                {invitaciones.data.map((i) => (
                  <FilaInvitacion key={i.id} id={i.id} email={i.email} profesional={profs.data?.find((p) => p.id === i.profesional_id)?.nombre} />
                ))}
              </ul>
            </>
          )}
        </Tarjeta>
      </div>

      <Hoja abierta={editando !== null} onCerrar={() => setEditando(null)} titulo={editando === 'nuevo' ? 'Nuevo profesional' : 'Editar profesional'}>
        {editando !== null && (
          <FormProfesional
            p={editando === 'nuevo' ? undefined : editando}
            ordenSiguiente={(profs.data?.reduce((m, p) => Math.max(m, p.orden), -1) ?? -1) + 1}
            onListo={() => setEditando(null)}
          />
        )}
      </Hoja>
    </div>
  )
}

const NUEVA = 'nueva'

/** El dueño también atiende: vincula su cuenta a una ficha (existente o nueva) y tiene su propia agenda. */
function YoTambienAtiendo() {
  const { negocioId, acceso, nombre } = usePanel()
  const profs = useProfesionales(negocioId)
  const invitaciones = useInvitaciones(negocioId)
  const refrescar = useRefrescar(negocioId)
  const accion = useAccion()
  const [elegido, setElegido] = useState('')
  const [hecho, setHecho] = useState<string>()
  // SawaTek entra como dueño sin ser miembro: no tiene agenda propia.
  if (acceso.superadmin) return null

  const mia = profs.data?.find((p) => p.id === acceso.profesionalId)
  const libres = (profs.data ?? []).filter((p) => !p.user_id && !invitaciones.data?.some((i) => i.profesional_id === p.id))
  const opcion = elegido === NUEVA || libres.some((p) => p.id === elegido) ? elegido : (libres[0]?.id ?? NUEVA)

  const listo = async (fn: () => Promise<unknown>, texto: string) => {
    setHecho(undefined)
    const ok = await accion.correr(async () => {
      await fn()
      await Promise.all([refrescar('acceso'), refrescar('profesionales'), refrescar('miembros'), refrescar('turnos')])
    })
    if (ok) setHecho(texto)
  }

  return (
    <Tarjeta titulo="¿Vos también atendés?">
      {mia ? (
        <div className="flex flex-wrap items-center gap-3">
          <UserRoundCheck className="size-5 shrink-0 text-exito" aria-hidden />
          <p className="min-w-0 flex-1 text-sm">
            Tu cuenta tiene la agenda de <b>{mia.nombre}</b>: en la Agenda podés filtrar tus turnos y en Horarios, cargar tus días.
          </p>
          <BotonConfirmar
            tamano="chico"
            texto="Desvincular"
            confirmar="Sí, desvincular"
            cargando={accion.ocupado}
            onConfirmar={() => void listo(() => atiendoYo(negocioId, null), 'Listo: tu cuenta ya no tiene agenda propia.')}
          />
        </div>
      ) : (
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(ev) => {
            ev.preventDefault()
            void listo(async () => {
              let id = opcion
              if (id === NUEVA) {
                const orden = (profs.data?.reduce((m, p) => Math.max(m, p.orden), -1) ?? -1) + 1
                id = await guardarProfesional(negocioId, null, { nombre: (nombre ?? 'Yo').slice(0, 60), rol: null, activo: true, orden }, [])
              }
              await atiendoYo(negocioId, id)
            }, 'Listo: ya tenés tu propia agenda.')
          }}
        >
          <Selector etiqueta="Mi ficha de profesional" className="sm:flex-1" value={opcion} onChange={(e) => setElegido(e.target.value)} ayuda="Vinculá tu cuenta a tu ficha y tené tu propia agenda.">
            {libres.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
            <option value={NUEVA}>Crear una ficha nueva{nombre ? ` (${nombre})` : ''}</option>
          </Selector>
          <Boton type="submit" cargando={accion.ocupado} className="sm:mb-7">
            <UserRoundCheck className="size-5" aria-hidden />
            Vincular mi cuenta
          </Boton>
        </form>
      )}
      <ErrorEnLinea texto={accion.error} />
      <Exito texto={hecho} />
    </Tarjeta>
  )
}

function FilaMiembro({ email, nombre, rol, profesional, userId }: { email: string; nombre: string | null; rol: string; profesional: string | null; userId: string }) {
  const { negocioId } = usePanel()
  const refrescar = useRefrescar(negocioId)
  const accion = useAccion()
  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{nombre ?? email}</p>
        <p className="truncate text-sm text-suave">
          {rol === 'dueno' ? 'Dueño' : `Profesional${profesional && profesional !== nombre ? ` · ${profesional}` : ''}`}
          {nombre ? ` · ${email}` : ''}
        </p>
        <ErrorEnLinea texto={accion.error} />
      </div>
      {rol === 'profesional' && (
        <BotonConfirmar
          tamano="chico"
          texto="Quitar"
          confirmar="Sí, quitar"
          cargando={accion.ocupado}
          onConfirmar={() =>
            void accion.correr(async () => {
              await quitarMiembro(negocioId, userId)
              await Promise.all([refrescar('miembros'), refrescar('profesionales'), refrescar('invitaciones')])
            })
          }
        />
      )}
    </li>
  )
}

function FilaInvitacion({ id, email, profesional }: { id: string; email: string; profesional?: string }) {
  const { negocioId } = usePanel()
  const refrescar = useRefrescar(negocioId)
  const accion = useAccion()
  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{email}</p>
        <p className="truncate text-sm text-suave">Profesional{profesional ? ` · ${profesional}` : ''} · todavía no entró</p>
        <ErrorEnLinea texto={accion.error} />
      </div>
      <BotonConfirmar
        tamano="chico"
        texto="Cancelar"
        confirmar="Sí, cancelar"
        cargando={accion.ocupado}
        onConfirmar={() =>
          void accion.correr(async () => {
            await cancelarInvitacion(id)
            await refrescar('invitaciones')
          })
        }
      />
    </li>
  )
}

function Invitar() {
  const { negocioId } = usePanel()
  const profs = useProfesionales(negocioId)
  const invitaciones = useInvitaciones(negocioId)
  const refrescar = useRefrescar(negocioId)
  const accion = useAccion()
  const [email, setEmail] = useState('')
  const [profElegido, setProfesional] = useState('')
  const [errorMail, setErrorMail] = useState<string>()
  const [enviada, setEnviada] = useState<string>()

  // Solo profesionales sin usuario y sin invitación pendiente.
  const libres = (profs.data ?? []).filter((p) => !p.user_id && !invitaciones.data?.some((i) => i.profesional_id === p.id))
  const profesionalId = libres.some((p) => p.id === profElegido) ? profElegido : (libres[0]?.id ?? '')

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setEnviada(undefined)
    const limpio = email.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(limpio)) return setErrorMail('Escribí un mail válido.')
    setErrorMail(undefined)
    const listo = await accion.correr(async () => {
      await invitar(negocioId, limpio, profesionalId)
      await refrescar('invitaciones')
    })
    if (listo) {
      setEnviada(`Listo: cuando ${limpio} entre al panel, va a ver su agenda.`)
      setEmail('')
    }
  }

  return (
    <Tarjeta titulo="Invitar a un profesional">
      {libres.length === 0 && !profs.isPending ? (
        <p className="text-sm text-suave">Todos los profesionales ya tienen acceso o una invitación. Cargá uno nuevo para invitarlo.</p>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-3" noValidate>
          <p className="text-sm text-suave">Cuando entre al panel con ese mail, queda vinculado a su ficha y ve solo su agenda.</p>
          <Campo etiqueta="Mail del profesional" type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} error={errorMail} />
          <Selector etiqueta="Es la agenda de" value={profesionalId} onChange={(e) => setProfesional(e.target.value)}>
            {libres.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Selector>
          <ErrorEnLinea texto={accion.error} />
          <Boton type="submit" cargando={accion.ocupado} disabled={!profesionalId}>
            <MailPlus className="size-5" aria-hidden />
            Invitar
          </Boton>
        </form>
      )}
      <Exito texto={enviada} />
    </Tarjeta>
  )
}

interface Errores {
  nombre?: string
  orden?: string
  servicios?: string
}

function FormProfesional({ p, ordenSiguiente, onListo }: { p?: Profesional; ordenSiguiente: number; onListo: () => void }) {
  const { negocioId } = usePanel()
  const servicios = useServicios(negocioId)
  const refrescar = useRefrescar(negocioId)
  const accion = useAccion()
  const [nombre, setNombre] = useState(p?.nombre ?? '')
  const [rol, setRol] = useState(p?.rol ?? '')
  const [orden, setOrden] = useState(String(p?.orden ?? ordenSiguiente))
  const [activo, setActivo] = useState(p?.activo ?? true)
  const [todos, setTodos] = useState(!p || p.servicios.length === 0)
  const [elegidos, setElegidos] = useState<string[]>(p?.servicios ?? [])
  const [errores, setErrores] = useState<Errores>({})

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const e: Errores = {}
    const ord = Number(orden || 0)
    if (!nombre.trim()) e.nombre = 'Escribí el nombre.'
    if (!Number.isInteger(ord)) e.orden = 'Tiene que ser un número entero.'
    if (!todos && elegidos.length === 0) e.servicios = 'Elegí al menos un servicio, o marcá que hace todos.'
    setErrores(e)
    if (Object.keys(e).length) return
    const listo = await accion.correr(async () => {
      await guardarProfesional(negocioId, p?.id ?? null, { nombre: nombre.trim(), rol: rol.trim() || null, orden: ord, activo }, todos ? [] : elegidos)
      await Promise.all([refrescar('profesionales'), refrescar('turnos')])
    })
    if (listo) onListo()
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4 pb-2" noValidate>
      <Campo etiqueta="Nombre" maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} error={errores.nombre} />
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Especialidad (opcional)" maxLength={60} value={rol} onChange={(e) => setRol(e.target.value)} placeholder="Ej.: Barbero" />
        <Campo etiqueta="Orden" ayuda="Menor = aparece primero." type="number" inputMode="numeric" step={1} value={orden} onChange={(e) => setOrden(e.target.value)} error={errores.orden} />
      </div>
      <Interruptor etiqueta="Activo" ayuda={activo ? 'Recibe turnos.' : 'No aparece para reservar.'} activo={activo} onCambiar={setActivo} />
      <Interruptor etiqueta="Hace todos los servicios" activo={todos} onCambiar={setTodos} />
      {!todos && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-semibold text-suave">Servicios que hace</legend>
          {(servicios.data ?? []).map((s) => (
            <label key={s.id} className="flex min-h-11 items-center gap-3 rounded-medio bg-superficie px-4 ring-1 ring-linea">
              <input
                type="checkbox"
                className="size-5 accent-[var(--t-acento)]"
                checked={elegidos.includes(s.id)}
                onChange={(e) => setElegidos((l) => (e.target.checked ? [...l, s.id] : l.filter((x) => x !== s.id)))}
              />
              <span className={cn('font-semibold', !s.activo && 'text-suave')}>
                {s.nombre}
                {!s.activo && ' (inactivo)'}
              </span>
            </label>
          ))}
          <ErrorEnLinea texto={errores.servicios} />
        </fieldset>
      )}
      <ErrorEnLinea texto={accion.error} />
      <Boton type="submit" tamano="grande" cargando={accion.ocupado}>
        {p ? 'Guardar cambios' : 'Crear profesional'}
      </Boton>
    </form>
  )
}
