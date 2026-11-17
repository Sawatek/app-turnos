// Negocios reales: lista con búsqueda y estado, y la ficha de cada uno (estado, plan, notas, marca, equipo, borrar).
import { ArrowLeft, ChevronRight, ImageUp, KeyRound, LayoutDashboard, Search, Smartphone, Trash2, X } from 'lucide-react'
import { useId, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import {
  ESTADOS,
  PLANES,
  actualizarNegocio,
  borrarInvitacion,
  useFichaNegocio,
  useNegociosAdmin,
  useRefrescarAdmin,
  type EstadoNegocio,
  type FichaNegocio,
} from '@/datos/admin'
import { borrarNegocio } from '@/datos/negocios'
import { estiloTema } from '@/tema/TemaNegocio'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { Logo } from '@/ui/Logo'
import { cn } from '@/ui/cn'
import { achicarLogo } from './Alta'
import { AreaTexto, Cargando, Cifra, ErrorEnLinea, Exito, FalloCarga, Insignia, Selector, Tarjeta, fechaCorta, useAccion } from './comunes'

const textoEstado = (e: string) => ESTADOS.find((x) => x.id === e)?.texto ?? e
const ROLES: Record<string, string> = { dueno: 'Dueño', profesional: 'Profesional' }

export function Negocios() {
  const [params] = useSearchParams()
  const id = params.get('id')
  return id ? <Ficha id={id} /> : <Lista />
}

// ---------- Lista ----------

function Lista() {
  const q = useNegociosAdmin()
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<EstadoNegocio | 'todos'>('todos')
  if (q.isPending) return <Cargando />
  if (q.isError) return <FalloCarga error={q.error} onReintentar={() => void q.refetch()} />

  const b = busqueda.trim().toLowerCase()
  const visibles = q.data.filter(
    (n) =>
      (filtro === 'todos' || n.estado === filtro) &&
      (!b || n.nombre.toLowerCase().includes(b) || n.slug.includes(b) || n.duenos.some((d) => d.email.includes(b) || d.nombre?.toLowerCase().includes(b))),
  )
  const cuenta = (e: EstadoNegocio) => q.data.filter((n) => n.estado === e).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Campo etiqueta="Buscar negocio" type="search" placeholder="Nombre, link o mail del dueño" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <Search className="pointer-events-none absolute right-4 bottom-4 size-5 text-suave" aria-hidden />
        </div>
        <Link to="/admin/nuevo" className="inline-flex h-13 items-center justify-center gap-2 rounded-medio bg-acento px-5 font-semibold text-sobre-acento">
          Nuevo negocio real
        </Link>
      </div>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Filtrar por estado</legend>
        {([{ id: 'todos', texto: `Todos (${q.data.length})` }, ...ESTADOS.map((e) => ({ id: e.id, texto: `${e.texto} (${cuenta(e.id)})` }))] as const).map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={filtro === o.id}
            onClick={() => setFiltro(o.id)}
            className={cn('h-11 rounded-full px-4 text-sm font-semibold', filtro === o.id ? 'bg-acento text-sobre-acento' : 'bg-superficie ring-1 ring-linea')}
          >
            {o.texto}
          </button>
        ))}
      </fieldset>

      <section aria-labelledby="t-reales" className="rounded-grande bg-superficie p-2 ring-1 ring-linea sm:p-3">
        <h2 id="t-reales" className="titulo px-2 pt-2 pb-1 text-base">
          Negocios reales
        </h2>
        {visibles.length === 0 ? (
          <p className="p-6 text-center text-suave">{q.data.length ? 'Ningún negocio coincide con la búsqueda.' : 'Todavía no hay negocios reales.'}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-linea">
            {visibles.map((n) => (
              <li key={n.id} className="flex items-center gap-3 px-2 py-3">
                <span aria-hidden className="size-10 shrink-0 rounded-medio ring-1 ring-linea" style={{ background: n.color ?? undefined }} />
                <Link to={`/admin/negocios?id=${n.id}`} className="min-w-0 flex-1" aria-label={`Ver ficha de ${n.nombre}`}>
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold">{n.nombre}</span>
                    <Insignia estado={n.estado}>{textoEstado(n.estado)}</Insignia>
                    {n.plan && <span className="text-xs font-semibold text-suave">{n.plan}</span>}
                  </p>
                  <p className="truncate text-sm text-suave">
                    /{n.slug} · {n.duenos.length ? n.duenos.map((d) => d.nombre ?? d.email).join(', ') : n.invitaciones_pendientes ? 'Dueño invitado' : 'Sin dueño'}
                  </p>
                  <p className="text-xs text-suave">
                    {n.turnos_mes} turnos este mes · {n.clientes} clientes · {n.equipo} en el equipo
                  </p>
                </Link>
                <Link
                  to={`/${n.slug}/panel`}
                  className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-medio bg-acento-suave px-3 text-xs font-bold text-acento-texto"
                >
                  <LayoutDashboard className="size-4" aria-hidden />
                  Panel
                </Link>
                <ChevronRight className="hidden size-5 shrink-0 text-suave sm:block" aria-hidden />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

// ---------- Ficha ----------

function Ficha({ id }: { id: string }) {
  const q = useFichaNegocio(id)
  return (
    <div className="flex flex-col gap-4">
      <Link to="/admin/negocios" className="inline-flex h-11 items-center gap-2 self-start text-sm font-semibold text-acento-texto">
        <ArrowLeft className="size-4" aria-hidden />
        Volver a negocios
      </Link>
      {q.isPending ? <Cargando /> : q.isError ? <FalloCarga error={q.error} onReintentar={() => void q.refetch()} /> : <FichaCargada f={q.data} />}
    </div>
  )
}

function FichaCargada({ f }: { f: FichaNegocio }) {
  const c = f.config
  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Datos del negocio" className="flex flex-wrap items-center gap-4 rounded-grande bg-superficie p-4 ring-1 ring-linea sm:p-5">
        <div style={estiloTema(c)} data-personalidad={c.personalidad}>
          <Logo negocio={c} className="size-16 text-lg" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="titulo flex flex-wrap items-center gap-2 text-2xl">
            {c.nombre}
            <Insignia estado={f.estado}>{textoEstado(f.estado)}</Insignia>
          </h2>
          <p className="text-sm text-suave">
            /{f.slug} · alta {fechaCorta(f.creado)}
            {f.plan ? ` · ${f.plan}` : ''}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Link to={`/${f.slug}`} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-medio bg-superficie-2 px-4 text-sm font-semibold sm:flex-none">
            <Smartphone className="size-4" aria-hidden />
            Abrir su app
          </Link>
          <Link to={`/${f.slug}/panel`} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-medio bg-acento-suave px-4 text-sm font-semibold text-acento-texto sm:flex-none">
            <LayoutDashboard className="size-4" aria-hidden />
            Abrir su panel
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Cifra etiqueta="Turnos este mes" valor={f.metricas.turnos_mes} />
        <Cifra etiqueta="Próximos turnos" valor={f.metricas.proximos} />
        <Cifra etiqueta="Clientes" valor={f.metricas.clientes} />
        <Cifra etiqueta="Mensajes con error" valor={f.metricas.mensajes_con_error} tono={f.metricas.mensajes_con_error ? 'peligro' : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Estado f={f} />
        <PlanYNotas f={f} />
      </div>
      <Marca f={f} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Equipo f={f} />
        <Invitaciones f={f} />
      </div>
      <Borrar f={f} />
    </div>
  )
}

function Estado({ f }: { f: FichaNegocio }) {
  const refrescar = useRefrescarAdmin()
  const [elegido, setElegido] = useState<EstadoNegocio | null>(null)
  const a = useAccion()
  const destino = ESTADOS.find((e) => e.id === elegido)
  const bloquear = destino?.id === 'suspendido'

  return (
    <Tarjeta titulo="Estado" bajada="Solo los negocios activos toman turnos.">
      <fieldset className="grid grid-cols-3 gap-2">
        <legend className="sr-only">Estado del negocio</legend>
        {ESTADOS.map((e) => (
          <button
            key={e.id}
            type="button"
            aria-pressed={f.estado === e.id}
            onClick={() => setElegido(e.id === f.estado ? null : e.id)}
            className={cn(
              'h-12 rounded-medio px-2 text-sm font-semibold',
              f.estado === e.id ? 'bg-acento text-sobre-acento' : elegido === e.id ? 'bg-superficie-2 ring-2 ring-acento' : 'bg-superficie-2 ring-1 ring-linea',
            )}
          >
            {e.texto}
          </button>
        ))}
      </fieldset>
      {destino && (
        <div role="alertdialog" aria-label="Confirmar cambio de estado" className="mt-3 flex flex-col gap-3 rounded-medio bg-superficie-2 p-3.5">
          <p className="text-sm">
            {bloquear ? (
              <>
                ¿Bloquear <b>{f.config.nombre}</b> por falta de pago?
              </>
            ) : (
              <>
                ¿Pasar <b>{f.config.nombre}</b> a <b>{destino.texto.toLowerCase()}</b>?
              </>
            )}{' '}
            {destino.detalle}
          </p>
          <div className="flex flex-wrap gap-2">
            <Boton
              tamano="chico"
              className="h-11"
              variante={bloquear ? 'peligro' : 'primario'}
              cargando={a.ocupado}
              onClick={() =>
                void a.correr(async () => {
                  await actualizarNegocio(f.id, { estado: destino.id })
                  setElegido(null)
                  await refrescar()
                })
              }
            >
              {bloquear ? 'Sí, bloquear por falta de pago' : `Sí, pasar a ${destino.texto.toLowerCase()}`}
            </Boton>
            <Boton tamano="chico" className="h-11" variante="secundario" onClick={() => setElegido(null)}>
              Cancelar
            </Boton>
          </div>
          <ErrorEnLinea texto={a.error} />
        </div>
      )}
    </Tarjeta>
  )
}

function PlanYNotas({ f }: { f: FichaNegocio }) {
  const refrescar = useRefrescarAdmin()
  const [plan, setPlan] = useState(f.plan ?? '')
  const [notas, setNotas] = useState(f.notas_internas)
  const [listo, setListo] = useState<string>()
  const a = useAccion()
  const opciones = [...PLANES.slice(1), ...(f.plan && !(PLANES as readonly string[]).includes(f.plan) ? [f.plan] : [])]

  return (
    <Tarjeta titulo="Plan y notas internas" bajada="Las notas solo las ve SawaTek.">
      <form
        className="flex flex-col gap-3"
        onSubmit={(ev) => {
          ev.preventDefault()
          setListo(undefined)
          void a.correr(async () => {
            await actualizarNegocio(f.id, { plan: plan || null, notas_internas: notas })
            await refrescar()
            setListo('Guardado.')
          })
        }}
      >
        <Selector etiqueta="Plan" value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="">{PLANES[0]}</option>
          {opciones.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Selector>
        <AreaTexto etiqueta="Notas internas" maxLength={4000} placeholder="Ej.: paga por transferencia el 10 de cada mes" value={notas} onChange={(e) => setNotas(e.target.value)} />
        <div className="flex flex-wrap items-center gap-3">
          <Boton type="submit" tamano="chico" className="h-11" cargando={a.ocupado}>
            Guardar plan y notas
          </Boton>
          <Exito texto={listo} />
        </div>
        <ErrorEnLinea texto={a.error} />
      </form>
    </Tarjeta>
  )
}

function Marca({ f }: { f: FichaNegocio }) {
  const refrescar = useRefrescarAdmin()
  const [nombre, setNombre] = useState(f.config.nombre)
  const [color, setColor] = useState(f.config.color)
  const [logo, setLogo] = useState<string | undefined>(f.config.logo)
  const [claim, setClaim] = useState(f.config.claim ?? '')
  const [listo, setListo] = useState<string>()
  const a = useAccion()
  const idLogo = useId()
  const idColor = useId()
  const vista = { ...f.config, nombre: nombre || f.config.nombre, color, logo }

  return (
    <Tarjeta titulo="Marca" bajada="Lo básico de cómo se ve su app. El resto lo ajusta el dueño desde su panel.">
      <form
        className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto]"
        onSubmit={(ev) => {
          ev.preventDefault()
          setListo(undefined)
          void a.correr(async () => {
            await actualizarNegocio(f.id, { nombre, color, claim, logo: logo ?? null })
            await refrescar()
            setListo('Marca guardada.')
          })
        }}
      >
        <div className="flex flex-col gap-3">
          <Campo etiqueta="Nombre del negocio" value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} />
          <Campo etiqueta="Frase de la app (claim)" value={claim} maxLength={160} onChange={(e) => setClaim(e.target.value)} />
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={idColor} className="text-sm font-semibold text-suave">
                Color de marca
              </label>
              <input id={idColor} type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-13 w-20 cursor-pointer rounded-medio border border-linea bg-superficie p-1" />
            </div>
            <label htmlFor={idLogo} className="inline-flex h-13 cursor-pointer items-center gap-2 rounded-medio bg-superficie-2 px-4 text-sm font-semibold">
              <ImageUp className="size-4" aria-hidden />
              {logo ? 'Cambiar logo' : 'Subir logo'}
            </label>
            <input
              id={idLogo}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const archivo = e.target.files?.[0]
                if (archivo) void achicarLogo(archivo).then(setLogo)
              }}
            />
            {logo && (
              <Boton variante="peligro" tamano="chico" className="h-13" onClick={() => setLogo(undefined)}>
                <X className="size-4" aria-hidden />
                Sacar logo
              </Boton>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Boton type="submit" tamano="chico" className="h-11" cargando={a.ocupado}>
              Guardar marca
            </Boton>
            <Exito texto={listo} />
          </div>
          <ErrorEnLinea texto={a.error} />
        </div>
        <div style={estiloTema(vista)} data-personalidad={vista.personalidad} className="flex w-full flex-col items-center justify-center gap-2 rounded-grande bg-fondo p-5 text-center text-texto md:w-56">
          <Logo negocio={vista} className="size-14 text-lg" />
          <p className="titulo text-lg">{vista.nombre}</p>
          <p className="text-xs text-suave">{claim}</p>
          <span className="mt-1 rounded-medio bg-acento px-4 py-2 text-xs font-bold text-sobre-acento">{vista.textos?.reservar || 'Reservar'}</span>
        </div>
      </form>
    </Tarjeta>
  )
}

function Equipo({ f }: { f: FichaNegocio }) {
  return (
    <Tarjeta titulo="Dueños y equipo">
      {f.equipo.length === 0 ? (
        <p className="text-sm text-suave">Nadie entró todavía al panel de este negocio.</p>
      ) : (
        <ul aria-label="Equipo" className="flex flex-col divide-y divide-linea">
          {f.equipo.map((p) => (
            <li key={p.user_id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-semibold">{p.nombre ?? 'Sin nombre'}</p>
                <p className="truncate text-sm text-suave">{p.email}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-suave">{ROLES[p.rol] ?? p.rol}</span>
            </li>
          ))}
        </ul>
      )}
      <Link to={`/admin/cuentas?negocio=${f.id}`} className="mt-3 inline-flex h-11 items-center gap-2 text-sm font-semibold text-acento-texto">
        <KeyRound className="size-4" aria-hidden />
        Crear una cuenta para este negocio
      </Link>
    </Tarjeta>
  )
}

function Invitaciones({ f }: { f: FichaNegocio }) {
  const refrescar = useRefrescarAdmin()
  const a = useAccion()
  return (
    <Tarjeta titulo="Invitaciones pendientes" bajada="Se aceptan solas cuando esa persona entra al panel con ese mail.">
      {f.invitaciones.length === 0 ? (
        <p className="text-sm text-suave">No hay invitaciones pendientes.</p>
      ) : (
        <ul aria-label="Invitaciones" className="flex flex-col divide-y divide-linea">
          {f.invitaciones.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-semibold">{i.nombre ?? i.email}</p>
                <p className="truncate text-sm text-suave">
                  {i.nombre ? `${i.email} · ` : ''}
                  {ROLES[i.rol]} · {fechaCorta(i.creado)}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Borrar la invitación de ${i.email}`}
                onClick={() => void a.correr(async () => (await borrarInvitacion(i.id), await refrescar()))}
                className="grid size-11 shrink-0 place-items-center rounded-full text-suave hover:bg-peligro/10 hover:text-peligro"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <ErrorEnLinea texto={a.error} className="mt-2" />
    </Tarjeta>
  )
}

/** Borrar en dos pasos: primero avisa, después hay que escribir el link del negocio. */
function Borrar({ f }: { f: FichaNegocio }) {
  const refrescar = useRefrescarAdmin()
  const ir = useNavigate()
  const [paso, setPaso] = useState<0 | 1>(0)
  const [texto, setTexto] = useState('')
  const a = useAccion()
  return (
    <section aria-label="Borrar negocio" className="rounded-grande p-4 ring-1 ring-peligro/40 sm:p-5">
      <h2 className="titulo text-lg text-peligro">Borrar negocio</h2>
      <p className="mt-0.5 text-sm text-suave">Borra el negocio con sus turnos, clientes, equipo y mensajes. No se puede deshacer.</p>
      {paso === 0 ? (
        <Boton variante="peligro" tamano="chico" className="mt-3 h-11 ring-1 ring-peligro/40" onClick={() => setPaso(1)}>
          <Trash2 className="size-4" aria-hidden />
          Borrar {f.config.nombre}
        </Boton>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <Campo etiqueta={`Para confirmar, escribí ${f.slug}`} autoComplete="off" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Boton
              variante="peligro"
              tamano="chico"
              className="h-11 ring-1 ring-peligro/40"
              disabled={texto.trim() !== f.slug}
              cargando={a.ocupado}
              onClick={() =>
                void a.correr(async () => {
                  await borrarNegocio(f.slug)
                  await refrescar({ sinFicha: true }) // la ficha no se vuelve a pedir: ese negocio ya no existe
                  await ir('/admin/negocios')
                })
              }
            >
              Borrar para siempre
            </Boton>
            <Boton
              variante="secundario"
              tamano="chico"
              className="h-11"
              onClick={() => {
                setPaso(0)
                setTexto('')
              }}
            >
              Cancelar
            </Boton>
          </div>
          <ErrorEnLinea texto={a.error} />
        </div>
      )}
    </section>
  )
}

