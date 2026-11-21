// "Mis turnos" de un cliente en TODOS los negocios donde reservó (/mis-turnos).
// Con sesión por celular: próximos e historial, con confirmar, cancelar y agregar al calendario. Sin sesión: ingreso.
import { ArrowRight, CalendarPlus, Check, Clock, LogOut, Phone, RefreshCw, Store } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { cancelarTurno, confirmarTurno, ErrorCliente, salirCliente, vigente } from '@/datos/real/cliente'
import { useMarcas, useRefrescarCuenta, useTurnosGlobales, type MarcaNegocio, type TurnoGlobal } from '@/datos/real/cliente-cuenta'
import { telefonoLegible } from '@/datos/real/cliente-telefono'
import { supabase } from '@/datos/supabase'
import { useSesion } from '@/datos/sesion'
import { capitalizar, diaLargo, diaRelativo, horaCorta } from '@/dominio/tiempo'
import { Boton } from '@/ui/Boton'
import { Hoja } from '@/ui/Hoja'
import { InsigniaEstado } from '@/ui/Insignia'
import { Logo } from '@/ui/Logo'
import { Talon } from '@/ui/Talon'
import { cn } from '@/ui/cn'
import { Cargando } from '../NoEncontrado'
import { agregarAlCalendario } from '../real/cliente/calendario'
import { useAhora } from '../real/cliente/contexto'
import { InvitacionIngreso } from '../real/cliente/Ingreso'
import { Encabezado, Fecha, TurnoACancelar } from '../real/cliente/MisTurnos'
import { faltaPara, numeroDeTalon } from '../real/cliente/Pase'

const horas = (h: number) => `${h} ${h === 1 ? 'hora' : 'horas'}`

export default function MisTurnosGlobal() {
  const sesion = useSesion()
  useEffect(() => {
    document.title = 'Mis turnos · SawaTek Turnos'
  }, [])

  return (
    <div className="relative mx-auto min-h-dvh max-w-lg px-5 pt-segura pb-12">
      {/* Hoja cuadriculada arriba, que se desvanece (como en la app de cada negocio). Decorativa. */}
      <div aria-hidden className="cuadricula pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <header className="pt-8 pb-7">
        <p className="rotulo text-suave">Tu cuenta</p>
        <h1 className="mt-1 text-[2.75rem] leading-[0.95]">Mis turnos</h1>
        <p className="mt-2 text-[15px] text-suave">Tus turnos en todos los negocios donde reservaste.</p>
      </header>
      {!supabase ? (
        <p className="rounded-grande border border-dashed border-linea p-5 text-suave">Esta versión de la app no está conectada a la base.</p>
      ) : sesion === undefined ? (
        <Cargando />
      ) : !sesion ? (
        <InvitacionIngreso
          titulo="Entrá con tu celular"
          texto="El mismo con el que reservás. Te llega un código por WhatsApp."
        />
      ) : (
        <Cuenta uid={sesion.user.id} telefono={telefonoLegible(sesion.user.phone) || sesion.user.email || ''} />
      )}
    </div>
  )
}

function Cuenta({ uid, telefono }: { uid: string; telefono: string }) {
  const turnos = useTurnosGlobales(uid)
  const marcas = useMarcas((turnos.data ?? []).map((t) => t.negocioId))
  const refrescar = useRefrescarCuenta(uid)
  const ahora = useAhora()
  const [ocupado, setOcupado] = useState<string>()
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [cancelando, setCancelando] = useState<TurnoGlobal>()
  const [errorCancelar, setErrorCancelar] = useState<string>()
  const [aviso, setAviso] = useState('')
  const [saliendo, setSaliendo] = useState(false)

  const ahoraMs = ahora.getTime()
  const lista = turnos.data ?? []
  const proximos = lista.filter((t) => vigente(t, ahoraMs)).toSorted((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))
  const historial = lista.filter((t) => !vigente(t, ahoraMs))
  const enPlazo = (t: TurnoGlobal) => Date.parse(t.inicio) - ahoraMs >= t.cancelacionHoras * 3_600_000
  const marca = (t: TurnoGlobal): MarcaNegocio => ({ ...marcas.data?.get(t.negocioId), nombre: t.negocio })

  const confirmar = async (t: TurnoGlobal) => {
    setOcupado(t.id)
    setErrores((e) => ({ ...e, [t.id]: '' }))
    try {
      await confirmarTurno(t.id)
      await refrescar()
      setAviso(`Listo: confirmaste tu turno en ${t.negocio}.`)
    } catch (err) {
      setErrores((e) => ({ ...e, [t.id]: err instanceof ErrorCliente ? err.message : 'No se pudo confirmar. Probá de nuevo.' }))
      void refrescar()
    } finally {
      setOcupado(undefined)
    }
  }

  const cancelar = async () => {
    if (!cancelando) return
    const t = cancelando
    setOcupado(t.id)
    setErrorCancelar(undefined)
    try {
      await cancelarTurno(t.id)
      await refrescar()
      setCancelando(undefined)
      setAviso(`Cancelaste tu turno en ${t.negocio}. ¡Gracias por avisar!`)
    } catch (err) {
      const e = err instanceof ErrorCliente ? err : null
      setErrorCancelar(
        e?.codigo === 'fuera_de_plazo'
          ? `Faltan menos de ${horas(t.cancelacionHoras)}: ya no se puede cancelar desde la app. Escribile al negocio.`
          : (e?.message ?? 'No se pudo cancelar. Probá de nuevo.'),
      )
      void refrescar()
    } finally {
      setOcupado(undefined)
    }
  }

  return (
    <div className="flex flex-col gap-9">
      <output aria-live="polite" className={aviso ? 'block border-l-2 border-exito py-1 pl-3 text-sm font-semibold text-exito' : 'sr-only'}>
        {aviso}
      </output>

      {turnos.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3 border-l-2 border-peligro py-1 pl-4 text-peligro">
          <p className="font-semibold">No pudimos traer tus turnos. Revisá tu conexión y probá de nuevo.</p>
          <Boton variante="secundario" onClick={() => void turnos.refetch()}>
            <RefreshCw className="size-4" aria-hidden />
            Reintentar
          </Boton>
        </div>
      ) : turnos.isPending ? (
        <Cargando />
      ) : lista.length === 0 ? (
        <div className="cuadricula flex flex-col items-center gap-2 rounded-grande border border-dashed border-linea px-6 py-10 text-center">
          <Store className="size-9 text-acento-texto" aria-hidden />
          <p className="titulo mt-1 text-xl">Todavía no tenés turnos</p>
          <p className="text-sm text-suave">Cuando reserves en un negocio con tu celular, lo vas a ver acá.</p>
        </div>
      ) : (
        <>
          <section aria-labelledby="t-proximos" className="flex flex-col gap-4">
            <Encabezado id="t-proximos" cuenta={proximos.length}>
              Próximos
            </Encabezado>
            {proximos.length === 0 ? (
              <p className="text-sm text-suave">No tenés turnos próximos.</p>
            ) : (
              proximos.map((t) => (
                <TalonGlobal
                  key={t.id}
                  t={t}
                  m={marca(t)}
                  ahora={ahora}
                  sePuede={enPlazo(t)}
                  ocupado={ocupado === t.id && !cancelando}
                  error={errores[t.id]}
                  onConfirmar={() => void confirmar(t)}
                  onCancelar={() => {
                    setErrorCancelar(undefined)
                    setCancelando(t)
                  }}
                />
              ))
            )}
          </section>

          {historial.length > 0 && (
            <section aria-labelledby="t-historial">
              <Encabezado id="t-historial" cuenta={historial.length}>
                Historial
              </Encabezado>
              <ul className="divide-y divide-linea border-b border-linea">
                {historial.map((t) => (
                  <li key={t.id} className="grid grid-cols-[3.5rem_1fr] gap-x-4">
                    <Fecha inicio={t.inicio} />
                    <div className="flex min-w-0 items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{t.negocio}</p>
                        <p className="truncate text-sm text-suave">
                          {t.servicio} · <span className="mono text-[0.8125rem]">{horaCorta(t.inicio)}</span>
                        </p>
                      </div>
                      {t.estado === 'pendiente' || t.estado === 'confirmado' ? (
                        <span className="rotulo shrink-0 text-suave">Pasado</span>
                      ) : (
                        <InsigniaEstado estado={t.estado} className="mr-1 shrink-0" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="t-negocios">
            <Encabezado id="t-negocios">Tus negocios</Encabezado>
            <ul className="divide-y divide-linea border-b border-linea">
              {[...new Map(lista.map((t) => [t.negocioId, t])).values()].map((t) => (
                <li key={t.negocioId}>
                  <Link to={`/${t.slug}`} className="group flex min-h-16 items-center gap-3 py-2">
                    <span aria-hidden className="shrink-0">
                      <Logo negocio={marca(t)} className="size-10 rounded-chico text-xs" />
                    </span>
                    <span className="flex-1 font-semibold">{t.negocio}</span>
                    <span className="text-sm font-semibold text-acento-texto">Reservar</span>
                    <ArrowRight className="size-4 text-acento-texto transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <div className="flex flex-col items-start gap-1">
        <p className="rotulo text-suave">Entraste con</p>
        <p className="mono flex items-center gap-1.5 font-semibold">
          <Phone className="size-4 text-suave" aria-hidden />
          {telefono}
        </p>
        <Boton
          variante="peligro"
          className="-ml-3 mt-1"
          cargando={saliendo}
          onClick={() => {
            setSaliendo(true)
            void salirCliente().finally(() => setSaliendo(false))
          }}
        >
          <LogOut className="size-5" aria-hidden />
          Salir
        </Boton>
      </div>

      <Hoja abierta={!!cancelando} onCerrar={() => setCancelando(undefined)} titulo="¿Cancelar el turno?">
        {cancelando && (
          <div className="flex flex-col gap-4 pb-2">
            <TurnoACancelar servicio={cancelando.servicio} negocio={cancelando.negocio} inicio={cancelando.inicio} ahora={ahora} />
            {errorCancelar && (
              <p role="alert" className="border-l-2 border-peligro py-1 pl-3 text-sm font-semibold text-peligro">
                {errorCancelar}
              </p>
            )}
            <Boton variante="peligro" tamano="grande" className="ring-1 ring-peligro/40 ring-inset" cargando={ocupado === cancelando.id} onClick={() => void cancelar()}>
              Sí, cancelar
            </Boton>
          </div>
        )}
      </Hoja>
    </div>
  )
}

interface PropsTalon {
  t: TurnoGlobal
  m: MarcaNegocio
  ahora: Date
  sePuede: boolean
  ocupado: boolean
  error?: string
  onConfirmar: () => void
  onCancelar: () => void
}

/** Un turno de cualquier negocio, como el talón de ese mostrador. El sello golpea si el estado cambia mientras se mira. */
function TalonGlobal({ t, m, ahora, sePuede, ocupado, error, onConfirmar, onCancelar }: PropsTalon) {
  const [estadoInicial] = useState(t.estado)
  const cambio = t.estado !== estadoInicial
  return (
    <Talon
      key={cambio ? 'cambio' : 'igual'}
      className={cn(cambio && 'golpe')}
      aria-label={`Turno en ${t.negocio}: ${t.servicio}, ${diaRelativo(t.inicio, ahora)} a las ${horaCorta(t.inicio)}`}
      cuerpo={
        <div className="px-4 pt-3.5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <Link to={`/${t.slug}`} className="flex min-h-8 min-w-0 items-center gap-2.5 font-bold underline-offset-4 hover:underline">
              <span aria-hidden className="shrink-0">
                <Logo negocio={m} className="size-8 rounded-chico text-[11px]" />
              </span>
              <span className="truncate">{t.negocio}</span>
            </Link>
            <span className="rotulo shrink-0 text-suave">
              N.º <span className="text-texto">{numeroDeTalon(t.id)}</span>
            </span>
          </div>
          <p className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="titulo text-xl leading-tight">{capitalizar(diaRelativo(t.inicio, ahora))}</span>
            <span className="rotulo text-acento-texto">{faltaPara(t.inicio, ahora)}</span>
          </p>
          <p className="cifra mt-1 pb-2 text-[4.75rem]">{horaCorta(t.inicio)}</p>
        </div>
      }
      sello={<InsigniaEstado key={t.estado} estado={t.estado} animar={cambio} className="bg-superficie/85 text-sm" />}
      talon={
        <div className="px-4 pt-8 pb-4">
          <p className="font-semibold">
            {t.servicio}
            {t.profesional ? ` con ${t.profesional}` : ''}
          </p>
          <p className="mt-0.5 text-sm text-suave">
            {capitalizar(diaLargo(t.inicio))}
            {m.direccion ? ` · ${m.direccion}` : ''}
          </p>
          {!sePuede && (
            <p className="mt-3 flex items-start gap-2 rounded-chico border border-dashed border-acento-borde px-3 py-2 text-xs font-semibold text-acento-texto">
              <Clock className="mt-px size-3.5 shrink-0" aria-hidden />
              Faltan menos de {horas(t.cancelacionHoras)}: para cancelarlo o cambiarlo, escribile al negocio.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {t.estado === 'pendiente' && (
              <Boton ancho cargando={ocupado} onClick={onConfirmar}>
                <Check className="size-4" strokeWidth={3} aria-hidden />
                Confirmar asistencia
              </Boton>
            )}
            {sePuede && (
              <Boton variante="peligro" tamano="chico" onClick={onCancelar}>
                Cancelar
              </Boton>
            )}
            <button
              type="button"
              onClick={() =>
                agregarAlCalendario({
                  id: t.id,
                  inicio: t.inicio,
                  fin: t.fin,
                  titulo: `${t.servicio} en ${t.negocio}`,
                  lugar: m.direccion,
                  archivo: `turno-${t.slug}`,
                })
              }
              className="inline-flex h-11 items-center gap-1.5 rounded-medio px-3 text-sm font-semibold text-acento-texto hover:bg-acento-suave"
            >
              <CalendarPlus className="size-4" aria-hidden />
              Agregar al calendario
            </button>
          </div>
          {error && <p role="alert" className="mt-2 text-sm font-semibold text-peligro">{error}</p>}
        </div>
      }
    />
  )
}
