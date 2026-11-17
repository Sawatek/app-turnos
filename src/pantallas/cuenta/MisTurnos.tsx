// "Mis turnos" de un cliente en TODOS los negocios donde reservó (/mis-turnos).
// Con sesión por celular: próximos e historial, con confirmar, cancelar y agregar al calendario. Sin sesión: ingreso.
import { MotionConfig } from 'motion/react'
import { ArrowRight, CalendarPlus, CalendarX2, Clock, LogOut, Phone, RefreshCw, Store } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { cancelarTurno, confirmarTurno, ErrorCliente, salirCliente, vigente } from '@/datos/real/cliente'
import { useMarcas, useRefrescarCuenta, useTurnosGlobales, type MarcaNegocio, type TurnoGlobal } from '@/datos/real/cliente-cuenta'
import { telefonoLegible } from '@/datos/real/cliente-telefono'
import { supabase } from '@/datos/supabase'
import { useSesion } from '@/datos/sesion'
import { capitalizar, diaCorto, diaLargo, diaRelativo, horaCorta } from '@/dominio/tiempo'
import { Boton } from '@/ui/Boton'
import { Hoja } from '@/ui/Hoja'
import { InsigniaEstado } from '@/ui/Insignia'
import { Logo } from '@/ui/Logo'
import { Cargando } from '../NoEncontrado'
import { agregarAlCalendario } from '../real/cliente/calendario'
import { useAhora } from '../real/cliente/contexto'
import { InvitacionIngreso } from '../real/cliente/Ingreso'

const horas = (h: number) => `${h} ${h === 1 ? 'hora' : 'horas'}`

export default function MisTurnosGlobal() {
  const sesion = useSesion()
  useEffect(() => {
    document.title = 'Mis turnos · SawaTek Turnos'
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto min-h-dvh max-w-lg px-5 pt-segura pb-12">
        <header className="pt-6 pb-5">
          <h1 className="text-3xl">Mis turnos</h1>
          <p className="mt-1 text-[15px] text-suave">Tus turnos en todos los negocios donde reservaste.</p>
        </header>
        {!supabase ? (
          <p className="rounded-grande bg-superficie p-5 text-suave ring-1 ring-linea">Esta versión de la app no está conectada a la base.</p>
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
    </MotionConfig>
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
    <div className="flex flex-col gap-6">
      <output aria-live="polite" className={aviso ? 'block rounded-medio bg-exito/12 px-4 py-3 text-sm font-semibold text-exito' : 'sr-only'}>
        {aviso}
      </output>

      {turnos.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-grande bg-peligro/12 p-5 text-peligro">
          <p className="font-semibold">No pudimos traer tus turnos. Revisá tu conexión y probá de nuevo.</p>
          <Boton variante="secundario" onClick={() => void turnos.refetch()}>
            <RefreshCw className="size-4" aria-hidden />
            Reintentar
          </Boton>
        </div>
      ) : turnos.isPending ? (
        <Cargando />
      ) : lista.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-grande bg-superficie px-6 py-10 text-center ring-1 ring-linea">
          <Store className="size-10 text-acento-texto" aria-hidden />
          <p className="font-semibold">Todavía no tenés turnos</p>
          <p className="text-sm text-suave">Cuando reserves en un negocio con tu celular, lo vas a ver acá.</p>
        </div>
      ) : (
        <>
          <section aria-labelledby="t-proximos" className="flex flex-col gap-3">
            <h2 id="t-proximos" className="titulo text-lg">Próximos</h2>
            {proximos.length === 0 ? (
              <p className="rounded-grande bg-superficie p-4 text-sm text-suave ring-1 ring-linea">No tenés turnos próximos.</p>
            ) : (
              proximos.map((t) => {
                const m = marca(t)
                const sePuede = enPlazo(t)
                return (
                  <article
                    key={t.id}
                    aria-label={`Turno en ${t.negocio}: ${t.servicio}, ${diaRelativo(t.inicio, ahora)} a las ${horaCorta(t.inicio)}`}
                    className="rounded-grande bg-superficie p-4 ring-1 ring-linea"
                  >
                    <div className="flex items-center gap-3">
                      <Logo negocio={m} className="size-11 shrink-0 rounded-chico text-sm" />
                      <div className="min-w-0 flex-1">
                        <Link to={`/${t.slug}`} className="block truncate font-bold underline-offset-4 hover:underline">
                          {t.negocio}
                        </Link>
                        <p className="truncate text-sm text-suave">
                          {t.servicio}
                          {t.profesional ? ` con ${t.profesional}` : ''}
                        </p>
                      </div>
                      <InsigniaEstado estado={t.estado} className="shrink-0" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-suave">{capitalizar(diaLargo(t.inicio))}</p>
                    <p className="titulo num text-4xl leading-none">{horaCorta(t.inicio)}</p>
                    {m.direccion && <p className="mt-1 text-sm text-suave">{m.direccion}</p>}
                    {!sePuede && (
                      <p className="mt-3 flex items-center gap-2 rounded-chico bg-acento-suave px-3 py-2 text-xs font-semibold text-acento-texto">
                        <Clock className="size-3.5 shrink-0" aria-hidden />
                        Faltan menos de {horas(t.cancelacionHoras)}: para cancelarlo o cambiarlo, escribile al negocio.
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {t.estado === 'pendiente' && (
                        <Boton cargando={ocupado === t.id && !cancelando} onClick={() => void confirmar(t)}>
                          Confirmar asistencia
                        </Boton>
                      )}
                      {sePuede && (
                        <Boton
                          variante="peligro"
                          onClick={() => {
                            setErrorCancelar(undefined)
                            setCancelando(t)
                          }}
                        >
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
                        className="inline-flex h-12 items-center gap-1.5 rounded-medio px-3 text-sm font-semibold text-acento-texto hover:bg-acento-suave"
                      >
                        <CalendarPlus className="size-4" aria-hidden />
                        Agregar al calendario
                      </button>
                    </div>
                    {errores[t.id] && <p role="alert" className="mt-2 text-sm font-semibold text-peligro">{errores[t.id]}</p>}
                  </article>
                )
              })
            )}
          </section>

          {historial.length > 0 && (
            <section aria-labelledby="t-historial">
              <h2 id="t-historial" className="titulo mb-2 text-lg">Historial</h2>
              <ul className="divide-y divide-linea rounded-grande bg-superficie px-4 ring-1 ring-linea">
                {historial.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-3">
                    <Logo negocio={marca(t)} className="size-9 shrink-0 rounded-chico text-xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{t.negocio}</p>
                      <p className="num truncate text-sm text-suave">
                        {t.servicio} · {capitalizar(diaCorto(t.inicio))} {horaCorta(t.inicio)}
                      </p>
                    </div>
                    {t.estado === 'pendiente' || t.estado === 'confirmado' ? (
                      <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-superficie-2 px-2.5 text-xs font-bold text-suave">Pasado</span>
                    ) : (
                      <InsigniaEstado estado={t.estado} className="shrink-0" />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="t-negocios">
            <h2 id="t-negocios" className="titulo mb-2 text-lg">Tus negocios</h2>
            <ul className="flex flex-col gap-2">
              {[...new Map(lista.map((t) => [t.negocioId, t])).values()].map((t) => (
                <li key={t.negocioId}>
                  <Link
                    to={`/${t.slug}`}
                    className="flex min-h-14 items-center gap-3 rounded-medio bg-superficie px-4 py-2 ring-1 ring-linea transition-colors hover:ring-acento-borde"
                  >
                    <Logo negocio={marca(t)} className="size-9 shrink-0 rounded-chico text-xs" />
                    <span className="flex-1 font-semibold">{t.negocio}</span>
                    <span className="text-sm text-suave">Reservar</span>
                    <ArrowRight className="size-4 text-suave" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <div className="flex flex-col gap-2 border-t border-linea pt-5">
        <p className="num flex items-center gap-1.5 text-sm text-suave">
          <Phone className="size-3.5" aria-hidden />
          {telefono}
        </p>
        <Boton
          variante="peligro"
          className="self-start"
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
            <div className="flex items-center gap-3 rounded-medio bg-superficie p-4 ring-1 ring-linea">
              <CalendarX2 className="size-6 shrink-0 text-peligro" aria-hidden />
              <p className="text-[15px]">
                {cancelando.servicio} en {cancelando.negocio}, el {diaCorto(cancelando.inicio)} a las <b className="num">{horaCorta(cancelando.inicio)}</b>.
              </p>
            </div>
            {errorCancelar && (
              <p role="alert" className="rounded-medio bg-peligro/12 px-4 py-3 text-sm font-semibold text-peligro">
                {errorCancelar}
              </p>
            )}
            <Boton variante="peligro" tamano="grande" className="ring-1 ring-peligro/40" cargando={ocupado === cancelando.id} onClick={() => void cancelar()}>
              Sí, cancelar
            </Boton>
          </div>
        )}
      </Hoja>
    </div>
  )
}
