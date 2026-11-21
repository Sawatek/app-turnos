// Cuentas con mail y contraseña (dueños y profesionales), creadas por SawaTek SIN depender del mail:
// la Edge Function admin-usuarios crea la cuenta confirmada y devuelve la contraseña UNA vez.
import { KeyRound, LayoutDashboard, Search, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  crearCuenta,
  resetearContrasena,
  useCuentas,
  useNegociosAdmin,
  useProfesionalesDe,
  useRefrescarAdmin,
  type Cuenta,
  type CuentaCreada,
  type RolStaff,
} from '@/datos/admin'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { Pastillas } from '@/ui/Pastillas'
import { Cargando, ContrasenaNueva, ErrorEnLinea, FalloCarga, Insignia, Selector, Tarjeta, fechaCorta, useAccion } from './comunes'

const ROLES: Record<RolStaff, string> = { dueno: 'Dueño', profesional: 'Profesional' }

export function Cuentas() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
      <CrearCuenta />
      <ListaCuentas />
    </div>
  )
}

function CrearCuenta() {
  const [params] = useSearchParams()
  const negocios = useNegociosAdmin()
  const refrescar = useRefrescarAdmin()
  const [nombre, setNombre] = useState(params.get('nombre') ?? '')
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [negocioId, setNegocioId] = useState(params.get('negocio') ?? '')
  const [rol, setRol] = useState<RolStaff>('dueno')
  const [profesionalId, setProfesionalId] = useState('')
  const [creada, setCreada] = useState<CuentaCreada & { slug?: string }>()
  const [errores, setErrores] = useState<{ nombre?: string; email?: string }>({})
  const profesionales = useProfesionalesDe(negocioId && rol === 'profesional' ? negocioId : null)
  const a = useAccion()
  const negocio = negocios.data?.find((n) => n.id === negocioId)

  const enviar = (ev: React.FormEvent) => {
    ev.preventDefault()
    const e = {
      nombre: nombre.trim().length < 2 ? 'Escribí el nombre de la persona.' : undefined,
      email: /^\S+@\S+\.\S+$/.test(email.trim()) ? undefined : 'Escribí un mail válido.',
    }
    setErrores(e)
    if (e.nombre || e.email) return
    void a.correr(async () => {
      const r = await crearCuenta({ email, nombre, negocioId: negocioId || null, rol, profesionalId: profesionalId || null })
      setCreada({ ...r, slug: negocio?.slug })
      setNombre('')
      setEmail('')
      setProfesionalId('')
      await refrescar()
    })
  }

  return (
    <Tarjeta titulo="Crear una cuenta" bajada="Para el dueño o alguien del equipo. Queda confirmada al instante: no hace falta que le llegue ningún mail.">
      {creada ? (
        <ContrasenaNueva email={creada.email} contrasena={creada.contrasena} onListo={() => setCreada(undefined)}>
          {creada.slug && (
            <p className="text-sm">
              Entra en{' '}
              <Link to={`/${creada.slug}/panel`} className="inline-flex items-center gap-1 font-semibold text-acento-texto underline">
                <LayoutDashboard className="size-4" aria-hidden />
                {location.host}/{creada.slug}/panel
              </Link>
            </p>
          )}
        </ContrasenaNueva>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={enviar} noValidate>
          <Campo etiqueta="Nombre y apellido" autoComplete="off" value={nombre} onChange={(e) => setNombre(e.target.value)} error={errores.nombre} />
          <Campo etiqueta="Mail" type="email" autoComplete="off" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errores.email} />
          <Selector etiqueta="Negocio" value={negocioId} onChange={(e) => setNegocioId(e.target.value)} disabled={negocios.isPending}>
            <option value="">Sin negocio (solo la cuenta)</option>
            {negocios.data?.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nombre} (/{n.slug})
              </option>
            ))}
          </Selector>
          {negocioId && (
            <Pastillas
              etiqueta="Rol en el negocio"
              valor={rol}
              opciones={[
                { id: 'dueno', texto: 'Dueño' },
                { id: 'profesional', texto: 'Profesional' },
              ]}
              onCambiar={setRol}
            />
          )}
          {negocioId && rol === 'profesional' && (
            <Selector
              etiqueta="Ficha del profesional"
              value={profesionalId}
              onChange={(e) => setProfesionalId(e.target.value)}
              ayuda="Vinculala para que vea su agenda."
            >
              <option value="">Sin vincular</option>
              {profesionales.data
                ?.filter((p) => !p.user_id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
            </Selector>
          )}
          <Boton type="submit" cargando={a.ocupado}>
            <UserPlus className="size-5" aria-hidden />
            Crear cuenta
          </Boton>
          <ErrorEnLinea texto={a.error} />
        </form>
      )}
    </Tarjeta>
  )
}

function ListaCuentas() {
  const q = useCuentas()
  const [busqueda, setBusqueda] = useState('')
  if (q.isPending) return <Cargando />
  if (q.isError) return <FalloCarga error={q.error} onReintentar={() => void q.refetch()} />
  const b = busqueda.trim().toLowerCase()
  const visibles = q.data.filter(
    (c) => !b || c.email.includes(b) || c.nombre?.toLowerCase().includes(b) || c.negocios.some((n) => n.nombre.toLowerCase().includes(b) || n.slug.includes(b)),
  )
  return (
    <section aria-labelledby="t-cuentas" className="flex flex-col gap-3">
      <h2 id="t-cuentas" className="titulo border-b-2 border-texto pb-2 text-xl">
        Cuentas
      </h2>
      <div className="relative">
        <Campo etiqueta="Buscar cuenta" type="search" placeholder="Nombre, mail o negocio" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <Search className="pointer-events-none absolute right-4 bottom-4 size-5 text-suave" aria-hidden />
      </div>
      {visibles.length === 0 ? (
        <p className="cuadricula rounded-medio border border-dashed border-linea p-6 text-center text-suave">No hay cuentas que coincidan.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-linea border-y border-linea">
          {visibles.map((c) => (
            <FilaCuenta key={c.user_id} c={c} />
          ))}
        </ul>
      )}
    </section>
  )
}

function FilaCuenta({ c }: { c: Cuenta }) {
  const [confirmando, setConfirmando] = useState(false)
  const [nueva, setNueva] = useState<CuentaCreada>()
  const a = useAccion()
  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold">{c.nombre ?? 'Sin nombre'}</span>
            {c.es_superadmin && <Insignia estado="activo">SawaTek</Insignia>}
          </p>
          <p className="mono truncate text-[0.8125rem] text-suave">{c.email}</p>
          <p className="text-xs text-suave">
            {c.negocios.length ? c.negocios.map((n) => `${n.nombre} · ${ROLES[n.rol] ?? n.rol}`).join(' | ') : 'Sin negocio'}
            {' · '}
            {c.ultimo_ingreso ? `entró el ${fechaCorta(c.ultimo_ingreso)}` : 'nunca entró'}
          </p>
        </div>
        {!c.es_superadmin && !nueva && !confirmando && (
          <Boton variante="secundario" tamano="chico" className="h-11 shrink-0" onClick={() => setConfirmando(true)} aria-label={`Resetear la contraseña de ${c.email}`}>
            <KeyRound className="size-4" aria-hidden />
            Resetear
          </Boton>
        )}
      </div>
      {confirmando && (
        <div role="alertdialog" aria-label={`Confirmar reseteo de ${c.email}`} className="flex flex-col gap-2 rounded-medio border border-dashed border-linea p-3">
          <p className="text-sm">La contraseña actual deja de andar y se genera una nueva para pasarle a {c.nombre ?? c.email}.</p>
          <div className="flex flex-wrap gap-2">
            <Boton
              tamano="chico"
              className="h-11"
              cargando={a.ocupado}
              onClick={() =>
                void a.correr(async () => {
                  setNueva(await resetearContrasena(c.user_id))
                  setConfirmando(false)
                })
              }
            >
              Sí, generar una nueva
            </Boton>
            <Boton variante="secundario" tamano="chico" className="h-11" onClick={() => setConfirmando(false)}>
              Cancelar
            </Boton>
          </div>
          <ErrorEnLinea texto={a.error} />
        </div>
      )}
      {nueva && <ContrasenaNueva email={nueva.email} contrasena={nueva.contrasena} onListo={() => setNueva(undefined)} />}
    </li>
  )
}
