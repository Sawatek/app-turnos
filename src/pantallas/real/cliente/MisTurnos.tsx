import { ArrowRight, BellRing, CalendarPlus, Check, Clock, MessageCircle, Star, Trash2 } from 'lucide-react'
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
import { capitalizar, claveDia, diaCorto, diaRelativo, horaCorta, mesCorto, nombreDia, numeroDia } from '@/dominio/tiempo'
import { Boton, clasesBoton } from '@/ui/Boton'
import { Cargando } from '@/ui/Estados'
import { Hoja } from '@/ui/Hoja'
import { InsigniaEstado } from '@/ui/Insignia'
import { cn } from '@/ui/cn'
import { Calificar } from './Calificar'
import { linkWhatsApp, useReal } from './contexto'
import { InvitacionIngreso } from './Ingreso'
import { Pase } from './Pase'

const horas = (h: number) => `${h} ${h === 1 ? 'hora' : 'horas'}`

export function MisTurnos() {
  const { uid, cargandoCuenta } = useReal()
  if (!uid) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="pt-1 text-[2.75rem] leading-[0.95]">Mis turnos</h1>
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
        <h1 className="pt-1 text-[2.75rem] leading-[0.95]">Mis turnos</h1>
        <Cargando texto="Cargando tus turnos" />
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
    <div className="flex flex-col gap-9">
      <h1 className="pt-1 text-[2.75rem] leading-[0.95]">Mis turnos</h1>

      {proximos.length === 0 ? (
        // Hoja en blanco: todavía no sacó ningún talón.
        <div className="cuadricula flex flex-col items-center gap-2 rounded-grande border border-dashed border-linea px-6 py-10 text-center">
          <CalendarPlus className="size-9 text-acento-texto" aria-hidden />
          <p className="titulo mt-1 text-xl">No tenés turnos próximos</p>
          <p className="text-sm text-suave">Reservá en menos de 20 segundos.</p>
          {tomaTurnos && <Boton onClick={() => abrirReserva()} className="mt-3">{n.textos?.reservar || 'Reservar'}</Boton>}
        </div>
      ) : (
        <section aria-labelledby="t-prox" className="flex flex-col gap-4">
          <Encabezado id="t-prox" cuenta={proximos.length}>
            Próximos
          </Encabezado>
          {proximos.map((t, i) => {
            const sePuede = enPlazo(t)
            return (
              <div key={t.id} className="flex flex-col gap-2">
                {/* El próximo, entero; los que siguen, en talón corto (el detalle ya se ve en el primero). */}
                <Pase
                  n={n}
                  t={t}
                  ahora={ahora}
                  compacto={i > 0}
                  nota={
                    sePuede
                      ? plazo > 0 && `Podés cancelarlo o cambiarlo hasta ${horas(plazo)} antes.`
                      : `Faltan menos de ${horas(plazo)}: para cancelarlo o cambiarlo, escribinos.`
                  }
                  acciones={
                    <>
                      {t.estado === 'pendiente' && (
                        <Boton ancho cargando={ocupado === t.id && !cancelando} onClick={() => void confirmar(t)}>
                          <Check className="size-4" strokeWidth={3} aria-hidden />
                          Confirmar asistencia
                        </Boton>
                      )}
                      {sePuede ? (
                        <>
                          {tomaTurnos && (
                            <Boton variante="secundario" tamano="chico" onClick={() => abrirReserva({ reprograma: t })}>
                              Cambiar horario
                            </Boton>
                          )}
                          <Boton
                            variante="peligro"
                            tamano="chico"
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
                            className={clasesBoton({ variante: 'secundario', tamano: 'chico' })}
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
        // Libreta: un renglón por turno, la fecha en el margen y el estado sellado chico a la derecha.
        <section aria-labelledby="t-hist">
          <Encabezado id="t-hist" cuenta={historial.length}>
            Historial
          </Encabezado>
          <ul className="divide-y divide-linea border-b border-linea">
            {historial.map((t) => {
              const puntaje = resenas.data?.get(t.id)
              const calificable = t.estado === 'asistio' && resenas.data && resumen.clienteId
              return (
                <li key={t.id} className="grid grid-cols-[3.5rem_1fr] gap-x-4">
                  <Fecha inicio={t.inicio} />
                  <div className="flex min-w-0 flex-col gap-2 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{t.servicio}{t.profesional ? ` · ${t.profesional}` : ''}</p>
                        <p className="mono text-[0.8125rem] text-suave">
                          {nombreDia(t.inicio)} · {horaCorta(t.inicio)}
                        </p>
                      </div>
                      {/* Un turno que ya pasó sin marcarse sigue "pendiente" en la base: acá se muestra como pasado. */}
                      {t.estado === 'pendiente' || t.estado === 'confirmado' ? (
                        <span className="rotulo shrink-0 text-suave">Pasado</span>
                      ) : (
                        <InsigniaEstado estado={t.estado} className="mr-1 shrink-0" />
                      )}
                    </div>
                    {/* Solo se califica un turno al que vino, y una sola vez. */}
                    {calificable &&
                      (puntaje ? (
                        <p className="flex items-center gap-2 text-sm text-suave">
                          <span className="sr-only">Tu calificación:</span>
                          <span className="flex text-acento-texto" aria-hidden>
                            {[1, 2, 3, 4, 5].map((v) => (
                              <Star key={v} className={cn('size-3.5', v <= puntaje ? 'fill-current' : 'opacity-35')} />
                            ))}
                          </span>
                          <span className="mono text-[0.8125rem] text-texto">{puntaje} de 5</span>
                        </p>
                      ) : (
                        <Boton variante="secundario" tamano="chico" className="self-start" onClick={() => setCalificando(t)}>
                          <Star className="size-4" aria-hidden />
                          Calificar
                        </Boton>
                      ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <Link
        to="/mis-turnos"
        className="group flex min-h-14 items-center justify-between gap-3 border-y border-linea text-[15px] font-semibold"
      >
        Ver mis turnos en todos los negocios
        <ArrowRight className="size-4 text-acento-texto transition-transform group-hover:translate-x-0.5" aria-hidden />
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
            <TurnoACancelar servicio={cancelando.servicio} profesional={cancelando.profesional} inicio={cancelando.inicio} ahora={ahora} />
            {plazo > 0 && (
              <p className="flex items-center gap-2 text-sm text-suave">
                <Clock className="size-4 shrink-0" aria-hidden />
                Se puede cancelar hasta {horas(plazo)} antes del turno.
              </p>
            )}
            {errorCancelar && (
              <div role="alert" className="flex flex-col gap-3 border-l-2 border-peligro py-1 pl-3 text-sm font-semibold text-peligro">
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
            <Boton variante="peligro" tamano="grande" className="ring-1 ring-peligro/40 ring-inset" cargando={ocupado === cancelando.id} onClick={() => void cancelar()}>
              Sí, cancelar
            </Boton>
          </div>
        )}
      </Hoja>
    </div>
  )
}

/** Encabezado de sección como el de una planilla: título, filete grueso y la cuenta en letra de ticket. */
export function Encabezado({ id, cuenta, children }: { id: string; cuenta?: number; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b-2 border-texto pb-2">
      <h2 id={id} className="titulo text-xl">{children}</h2>
      {cuenta !== undefined && (
        <span className="mono text-sm font-bold text-suave" aria-hidden>
          {String(cuenta).padStart(2, '0')}
        </span>
      )}
    </div>
  )
}

/** La fecha en el margen de la libreta: el número grande y el día y el mes chiquitos. */
export function Fecha({ inicio }: { inicio: string }) {
  return (
    <div className="flex flex-col items-center justify-center border-r border-acento-borde py-3 pr-3">
      <span className="sr-only">{capitalizar(diaCorto(inicio))}</span>
      <span aria-hidden className="cifra text-[1.875rem]">{numeroDia(inicio)}</span>
      <span aria-hidden className="rotulo mt-1 text-suave">{mesCorto(inicio)}</span>
    </div>
  )
}

/** El turno que se va a cancelar, como un talón chico con la hora tachada a lápiz. */
export function TurnoACancelar({ servicio, profesional, inicio, ahora, negocio }: { servicio: string; profesional?: string; inicio: string; ahora: Date; negocio?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-medio border border-dashed border-peligro/50 px-4 py-3">
      <div className="min-w-0">
        <p className="titulo text-lg">{capitalizar(diaRelativo(inicio, ahora))}</p>
        <p className="text-[15px]">
          {servicio}
          {negocio ? ` en ${negocio}` : profesional ? <span className="text-suave"> con {profesional}</span> : null}
        </p>
      </div>
      <p className="cifra shrink-0 text-[2.5rem] text-suave line-through decoration-peligro decoration-[3px]">{horaCorta(inicio)}</p>
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
      <p role="alert" className="flex items-center justify-between gap-3 border-l-2 border-peligro py-1 pl-3 text-sm font-semibold text-peligro">
        No pudimos traer tu lista de espera.
        <Boton variante="secundario" onClick={() => void esperas.refetch()}>Reintentar</Boton>
      </p>
    )
  }
  if (!esperas.data?.length) return null
  return (
    <section aria-labelledby="t-espera">
      <Encabezado id="t-espera">Te avisamos si se libera</Encabezado>
      <p className="mt-2 text-sm text-suave">Si alguien cancela ese día, te llega un WhatsApp. Lo reserva el primero que llega.</p>
      <ul className="mt-2 divide-y divide-linea border-b border-linea">
        {esperas.data.map((e) => {
          const fecha = `${e.dia}T12:00:00-03:00`
          return (
            <li key={e.id} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-x-4">
              <Fecha inicio={fecha} />
              <div className="min-w-0 py-3">
                <p className="truncate font-semibold">{e.servicio}{e.profesional ? ` · ${e.profesional}` : ''}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-sm text-suave">
                  {capitalizar(diaRelativo(fecha, ahora).split(' ')[0]!)}
                  {e.avisado && (
                    <span className="inline-flex items-center gap-1 font-semibold text-acento-texto">
                      <BellRing className="size-3.5" aria-hidden />
                      Ya te avisamos
                    </span>
                  )}
                </p>
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
