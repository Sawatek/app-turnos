import { ArrowRight, BellRing, CalendarPlus, CalendarX2, Clock, LoaderCircle, MessageCircle, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import {
  borrarEspera,
  cancelarTurno,
  confirmarTurno,
  ErrorCliente,
  useMisEsperas,
  useMisResenas,
  useRefrescar,
  vigente,
  type Espera,
  type TurnoReal,
} from '@/datos/real/cliente'
import { capitalizar, claveDia, diaCorto, diaRelativo, horaCorta } from '@/dominio/tiempo'
import { Boton } from '@/ui/Boton'
import { Hoja } from '@/ui/Hoja'
import { InsigniaEstado } from '@/ui/Insignia'
import { Calificar } from './Calificar'
import { diaLegible, linkWhatsApp, useReal } from './contexto'
import { InvitacionIngreso } from './Ingreso'
import { Pase } from './Pase'

const horas = (h: number) => `${h} ${h === 1 ? 'hora' : 'horas'}`

export function MisTurnos() {
  const { uid, cargandoCuenta } = useReal()
  if (!uid) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="pt-1 text-3xl">Mis turnos</h1>
        <InvitacionIngreso
          titulo="Entrá para ver tus turnos"
          texto="Con tu celular y un código por WhatsApp. Sin contraseñas."
        />
      </div>
    )
  }
  if (cargandoCuenta) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="pt-1 text-3xl">Mis turnos</h1>
        <div className="grid place-items-center py-16" aria-busy="true">
          <LoaderCircle className="size-8 animate-spin text-suave" aria-label="Cargando tus turnos" />
        </div>
      </div>
    )
  }
  return <ListaTurnos />
}

function ListaTurnos() {
  const { n, negocioId, uid, turnos, resumen, ahora, abrirReserva, avisar, marcarPropio, tomaTurnos } = useReal()
  const refrescar = useRefrescar(negocioId)
  const resenas = useMisResenas(negocioId, uid)
  const [calificando, setCalificando] = useState<TurnoReal>()
  const [cancelando, setCancelando] = useState<TurnoReal>()
  const [ocupado, setOcupado] = useState<string>()
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorCancelar, setErrorCancelar] = useState<string>()

  const plazo = resumen.cancelacionHoras
  const ahoraMs = ahora.getTime()
  const proximos = turnos.filter((t) => vigente(t, ahoraMs)).toSorted((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))
  const historial = turnos.filter((t) => !vigente(t, ahoraMs)).toSorted((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio))
  /** ¿Todavía se puede cancelar (o cambiar) desde la app? */
  const enPlazo = (t: TurnoReal) => Date.parse(t.inicio) - ahoraMs >= plazo * 3_600_000

  const confirmar = async (t: TurnoReal) => {
    setOcupado(t.id)
    setErrores((e) => ({ ...e, [t.id]: '' }))
    try {
      marcarPropio(t.id)
      await confirmarTurno(t.id)
      await refrescar()
      avisar(`Listo: confirmaste tu turno de ${diaRelativo(t.inicio, ahora)} a las ${horaCorta(t.inicio)}.`)
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
      marcarPropio(t.id)
      await cancelarTurno(t.id)
      await refrescar()
      setCancelando(undefined)
      avisar(`Cancelaste tu turno de las ${horaCorta(t.inicio)}. El horario queda libre para otra persona. ¡Gracias por avisar!`)
    } catch (err) {
      const e = err instanceof ErrorCliente ? err : null
      setErrorCancelar(
        e?.codigo === 'fuera_de_plazo'
          ? `Faltan menos de ${horas(plazo)} para el turno: ya no se puede cancelar desde la app. Escribinos así lo liberamos.`
          : (e?.message ?? 'No se pudo cancelar. Probá de nuevo.'),
      )
      void refrescar()
    } finally {
      setOcupado(undefined)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="pt-1 text-3xl">Mis turnos</h1>

      {proximos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-grande bg-superficie px-6 py-10 text-center ring-1 ring-linea">
          <CalendarPlus className="size-10 text-acento-texto" aria-hidden />
          <p className="font-semibold">No tenés turnos próximos</p>
          <p className="text-sm text-suave">Reservá en menos de 20 segundos.</p>
          {tomaTurnos && <Boton onClick={() => abrirReserva()} className="mt-2">{n.textos?.reservar || 'Reservar'}</Boton>}
        </div>
      ) : (
        <section aria-labelledby="t-prox" className="flex flex-col gap-4">
          <h2 id="t-prox" className="sr-only">Próximos</h2>
          {proximos.map((t) => {
            const sePuede = enPlazo(t)
            return (
              <div key={t.id} className="flex flex-col gap-2">
                <Pase
                  n={n}
                  t={t}
                  ahora={ahora}
                  nota={
                    sePuede
                      ? plazo > 0 && `Podés cancelarlo o cambiarlo hasta ${horas(plazo)} antes.`
                      : `Faltan menos de ${horas(plazo)}: para cancelarlo o cambiarlo, escribinos.`
                  }
                  acciones={
                    <>
                      {t.estado === 'pendiente' && (
                        <Boton cargando={ocupado === t.id && !cancelando} onClick={() => void confirmar(t)}>
                          Confirmar asistencia
                        </Boton>
                      )}
                      {sePuede ? (
                        <>
                          {tomaTurnos && (
                            <Boton variante="secundario" onClick={() => abrirReserva({ reprograma: t })}>
                              Cambiar horario
                            </Boton>
                          )}
                          <Boton
                            variante="peligro"
                            onClick={() => {
                              setErrorCancelar(undefined)
                              setCancelando(t)
                            }}
                          >
                            Cancelar
                          </Boton>
                        </>
                      ) : (
                        n.whatsapp && (
                          <a
                            href={linkWhatsApp(n.whatsapp, `Hola, tengo un turno ${diaRelativo(t.inicio, ahora)} a las ${horaCorta(t.inicio)} y necesito cambiarlo.`)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-12 items-center gap-2 rounded-medio bg-superficie-2 px-4 text-[15px] font-semibold"
                          >
                            <MessageCircle className="size-4" aria-hidden />
                            Escribinos
                          </a>
                        )
                      )}
                    </>
                  }
                />
                {errores[t.id] && (
                  <p role="alert" className="px-1 text-sm font-semibold text-peligro">{errores[t.id]}</p>
                )}
              </div>
            )
          })}
        </section>
      )}

      <ListaEspera />

      {historial.length > 0 && (
        <section aria-labelledby="t-hist">
          <h2 id="t-hist" className="titulo mb-2 text-lg">Historial</h2>
          <ul className="divide-y divide-linea rounded-grande bg-superficie px-4 ring-1 ring-linea">
            {historial.map((t) => {
              const puntaje = resenas.data?.get(t.id)
              return (
                <li key={t.id} className="flex flex-col gap-2 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{t.servicio}{t.profesional ? ` · ${t.profesional}` : ''}</p>
                      <p className="num text-sm text-suave">{capitalizar(diaCorto(t.inicio))} · {horaCorta(t.inicio)}</p>
                    </div>
                    {/* Un turno que ya pasó sin marcarse sigue "pendiente" en la base: acá se muestra como pasado. */}
                    {t.estado === 'pendiente' || t.estado === 'confirmado' ? (
                      <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-superficie-2 px-2.5 text-xs font-bold text-suave">Pasado</span>
                    ) : (
                      <InsigniaEstado estado={t.estado} className="shrink-0" />
                    )}
                  </div>
                  {/* Solo se califica un turno al que vino, y una sola vez. */}
                  {t.estado === 'asistio' && resenas.data && resumen.clienteId &&
                    (puntaje ? (
                      <p className="flex items-center gap-1.5 text-sm text-suave">
                        <Star className="size-4 fill-current text-acento-texto" aria-hidden />
                        Tu calificación: <b className="num text-texto">{puntaje} de 5</b>
                      </p>
                    ) : (
                      <Boton variante="secundario" className="self-start" onClick={() => setCalificando(t)}>
                        <Star className="size-4" aria-hidden />
                        Calificar
                      </Boton>
                    ))}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <Link
        to="/mis-turnos"
        className="flex min-h-12 items-center justify-between gap-3 rounded-medio px-1 text-[15px] font-semibold text-acento-texto"
      >
        Ver mis turnos en todos los negocios
        <ArrowRight className="size-4" aria-hidden />
      </Link>

      <Hoja abierta={!!calificando} onCerrar={() => setCalificando(undefined)} titulo="¿Cómo te fue?">
        {calificando && resumen.clienteId && (
          <Calificar
            negocioId={negocioId}
            clienteId={resumen.clienteId}
            turno={calificando}
            negocio={n.nombre}
            onListo={() => {
              setCalificando(undefined)
              void resenas.refetch()
              avisar('¡Gracias por calificar! Le sirve mucho al negocio.')
            }}
          />
        )}
      </Hoja>

      <Hoja abierta={!!cancelando} onCerrar={() => setCancelando(undefined)} titulo="¿Cancelar el turno?">
        {cancelando && (
          <div className="flex flex-col gap-4 pb-2">
            <div className="flex items-center gap-3 rounded-medio bg-superficie p-4 ring-1 ring-linea">
              <CalendarX2 className="size-6 shrink-0 text-peligro" aria-hidden />
              <p className="text-[15px]">
                {cancelando.servicio} del {diaCorto(cancelando.inicio)} a las <b className="num">{horaCorta(cancelando.inicio)}</b>
                {cancelando.profesional ? ` con ${cancelando.profesional}` : ''}.
              </p>
            </div>
            {plazo > 0 && (
              <p className="flex items-center gap-2 text-sm text-suave">
                <Clock className="size-4 shrink-0" aria-hidden />
                Se puede cancelar hasta {horas(plazo)} antes del turno.
              </p>
            )}
            {errorCancelar && (
              <div role="alert" className="flex flex-col gap-3 rounded-medio bg-peligro/12 px-4 py-3 text-sm font-semibold text-peligro">
                {errorCancelar}
                {n.whatsapp && (
                  <a href={linkWhatsApp(n.whatsapp)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 self-start rounded-medio bg-wa px-4 text-[#062b14]">
                    <MessageCircle className="size-4" aria-hidden />
                    Escribir por WhatsApp
                  </a>
                )}
              </div>
            )}
            {tomaTurnos && !errorCancelar && (
              <Boton
                variante="secundario"
                tamano="grande"
                onClick={() => {
                  const t = cancelando
                  setCancelando(undefined)
                  abrirReserva({ reprograma: t })
                }}
              >
                Mejor cambiarlo de horario
              </Boton>
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

/** "Avisame si se libera": mis anotaciones de hoy en adelante, para borrarlas si ya no hacen falta. */
function ListaEspera() {
  const { negocioId, uid, ahora, avisar } = useReal()
  const hoy = claveDia(ahora)
  const esperas = useMisEsperas(negocioId, uid, hoy)
  const [borrando, setBorrando] = useState<string>()
  const [error, setError] = useState<string>()

  const borrar = async (e: Espera) => {
    setBorrando(e.id)
    setError(undefined)
    try {
      await borrarEspera(e.id)
      await esperas.refetch()
      avisar('Listo: ya no te avisamos por ese día.')
    } catch (err) {
      setError(err instanceof ErrorCliente ? err.message : 'No se pudo borrar. Probá de nuevo.')
      void esperas.refetch()
    } finally {
      setBorrando(undefined)
    }
  }

  if (esperas.isError) {
    return (
      <p role="alert" className="flex items-center justify-between gap-3 rounded-medio bg-peligro/12 px-4 py-3 text-sm font-semibold text-peligro">
        No pudimos traer tu lista de espera.
        <Boton variante="secundario" onClick={() => void esperas.refetch()}>Reintentar</Boton>
      </p>
    )
  }
  if (!esperas.data?.length) return null
  return (
    <section aria-labelledby="t-espera">
      <h2 id="t-espera" className="titulo mb-1 text-lg">Te avisamos si se libera</h2>
      <p className="mb-2 text-sm text-suave">Si alguien cancela ese día, te llega un WhatsApp. Lo reserva el primero que llega.</p>
      <ul className="divide-y divide-linea rounded-grande bg-superficie px-4 ring-1 ring-linea">
        {esperas.data.map((e) => {
          const fecha = `${e.dia}T12:00:00-03:00`
          return (
            <li key={e.id} className="flex items-center justify-between gap-3 py-2">
              <div className="flex min-w-0 items-center gap-3">
                <BellRing className="size-5 shrink-0 text-acento-texto" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{e.servicio}{e.profesional ? ` · ${e.profesional}` : ''}</p>
                  <p className="text-sm text-suave">
                    {capitalizar(diaLegible(e.dia, ahora))}
                    {e.avisado ? ' · Ya te avisamos' : ''}
                  </p>
                </div>
              </div>
              <Boton
                variante="peligro"
                className="shrink-0 px-3"
                cargando={borrando === e.id}
                aria-label={`Borrar aviso de ${e.servicio} del ${diaCorto(fecha)}`}
                onClick={() => void borrar(e)}
              >
                <Trash2 className="size-5" aria-hidden />
              </Boton>
            </li>
          )
        })}
      </ul>
      {error && <p role="alert" className="mt-2 px-1 text-sm font-semibold text-peligro">{error}</p>}
    </section>
  )
}
