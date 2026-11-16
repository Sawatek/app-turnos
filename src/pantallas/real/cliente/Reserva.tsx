import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { Check, MessageCircle, RefreshCw, Sparkles, Store, TriangleAlert, Users } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  ErrorCliente,
  profesionalesPara,
  reprogramar,
  reservar,
  useDisponibilidad,
  useHorarios,
  useRefrescar,
  type DiaDisponible,
} from '@/datos/real/cliente'
import { capitalizar, claveDia, diaRelativo, enAR, horaCorta, mesCorto, nombreDia, numeroDia, precio } from '@/dominio/tiempo'
import { OfertaInstalar } from '@/instalacion/OfertaInstalar'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { Hoja } from '@/ui/Hoja'
import { Etiqueta } from '@/ui/Insignia'
import { iniciales } from '@/ui/Logo'
import { cn } from '@/ui/cn'
import { linkWhatsApp, useReal, type OpcionesReserva } from './contexto'
import { Pase } from './Pase'

const DIAS = 14
const irSuave = (r: React.RefObject<HTMLElement | null>) => setTimeout(() => r.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
const aISO = (s: string) => new Date(s).toISOString()

interface Props {
  abierta: boolean
  opciones: OpcionesReserva
  onCerrar: () => void
}

export function Reserva({ abierta, opciones, onCerrar }: Props) {
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo={opciones.reprograma ? 'Cambiar horario' : 'Nuevo turno'}>
      {/* key: cada apertura arranca limpia */}
      {abierta && <Contenido key={JSON.stringify(opciones)} opciones={opciones} onCerrar={onCerrar} />}
    </Hoja>
  )
}

function Contenido({ opciones, onCerrar }: { opciones: OpcionesReserva; onCerrar: () => void }) {
  const { n, negocioId, tomaTurnos, catalogo, resumen, turnos, ahora, irA, marcarPropio, telefonoE164 } = useReal()
  const qc = useQueryClient()
  const refrescar = useRefrescar(negocioId)
  const viejo = opciones.reprograma

  const [servicioId, setServicioId] = useState<string | undefined>(viejo?.servicioId ?? opciones.servicioId)
  const [profesionalId, setProfesionalId] = useState<string | null | undefined>(viejo ? viejo.profesionalId : opciones.profesionalId)
  const [dia, setDia] = useState<string | undefined>(opciones.inicio ? claveDia(opciones.inicio) : undefined)
  const [hora, setHora] = useState<string | undefined>(opciones.inicio ? aISO(opciones.inicio) : undefined)
  const [error, setError] = useState<string>()
  const [nombre, setNombre] = useState('')
  const [errorNombre, setErrorNombre] = useState<string>()
  const [pideNombre, setPideNombre] = useState(!resumen.clienteId)
  const [enviando, setEnviando] = useState(false)
  const [listo, setListo] = useState<{ id: string; viejoSinCancelar: boolean }>()

  const refProf = useRef<HTMLElement>(null)
  const refDia = useRef<HTMLElement>(null)
  const refHora = useRef<HTMLElement>(null)
  const refError = useRef<HTMLParagraphElement>(null)
  const refListo = useRef<HTMLDivElement>(null)

  const servicio = catalogo.servicios.find((s) => s.id === servicioId)
  const staffPosible = servicioId ? profesionalesPara(catalogo, servicioId) : []
  // Si el profesional elegido ya no hace este servicio (o no está activo), se vuelve a preguntar.
  const profElegido = profesionalId === null || staffPosible.some((p) => p.id === profesionalId) ? profesionalId : undefined

  const disponibilidad = useDisponibilidad(negocioId, servicio?.id, profElegido, DIAS)
  const dias = disponibilidad.data ?? []
  const hoy = claveDia(ahora)
  // Si el día elegido no tiene lugar (o no se eligió), se muestra el primero con lugar.
  const diaElegido = dia && dias.some((d) => d.dia === dia && d.libres > 0) ? dia : dias.find((d) => d.libres > 0)?.dia
  const horarios = useHorarios(negocioId, servicio?.id, diaElegido, profElegido)
  const libres = (horarios.data ?? []).filter((h) => Date.parse(h.inicio) > ahora.getTime())
  const elegido = hora ? libres.find((h) => h.inicio === hora) : undefined

  const grupos = [
    { titulo: 'Mañana', items: libres.filter((h) => enAR(h.inicio).getHours() < 13) },
    { titulo: 'Tarde', items: libres.filter((h) => enAR(h.inicio).getHours() >= 13 && enAR(h.inicio).getHours() < 19) },
    { titulo: 'Noche', items: libres.filter((h) => enAR(h.inicio).getHours() >= 19) },
  ].filter((g) => g.items.length)

  const paso = !servicio ? 1 : profElegido === undefined ? 2 : !elegido ? 3 : 4
  const conSena = n.sena > 0 && !viejo
  const nombreDe = (id: string) => catalogo.profesionales.find((p) => p.id === id)?.nombre ?? ''

  const mostrarError = (texto: string) => {
    setError(texto)
    setTimeout(() => refError.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
  }

  const confirmar = async () => {
    if (!servicio || !elegido || enviando) return
    if (pideNombre && nombre.trim().length < 2) {
      setErrorNombre('Poné tu nombre así te reconocen en el local.')
      return
    }
    setEnviando(true)
    setError(undefined)
    const datos = {
      servicioId: servicio.id,
      inicio: elegido.inicio,
      profesionalId: profElegido ?? null,
      ...(pideNombre ? { nombre: nombre.trim() } : {}),
      ...(telefonoE164 ? { telefono: telefonoE164 } : {}),
    }
    try {
      let id: string
      let viejoSinCancelar = false
      if (viejo) {
        marcarPropio(viejo.id)
        const r = await reprogramar(negocioId, viejo.id, datos)
        id = r.id
        viejoSinCancelar = !r.viejoCancelado
      } else {
        id = await reservar(negocioId, datos)
      }
      marcarPropio(id)
      await refrescar()
      setListo({ id, viejoSinCancelar })
      // La hoja venía scrolleada hasta el horario: se vuelve arriba para ver el "¡Listo!".
      setTimeout(() => refListo.current?.scrollIntoView({ block: 'start' }), 0)
    } catch (err) {
      const e = err instanceof ErrorCliente ? err : new ErrorCliente('desconocido', 'Algo salió mal. Probá de nuevo en un momento.')
      if (e.codigo === 'horario_no_disponible') {
        // Alguien lo tomó antes: se refrescan los horarios y se pide otro.
        setHora(undefined)
        void qc.invalidateQueries({ queryKey: ['cliente-real', negocioId, 'agenda'] })
        irSuave(refHora)
      }
      if (e.codigo === 'falta_nombre') {
        setPideNombre(true)
        setErrorNombre(e.message)
      } else {
        mostrarError(e.message)
      }
    } finally {
      setEnviando(false)
    }
  }

  if (!tomaTurnos) {
    return (
      <div className="flex flex-col items-center gap-3 pt-2 pb-4 text-center">
        <Store className="size-10 text-acento-texto" aria-hidden />
        <p className="font-semibold">Todavía no tomamos turnos por la app</p>
        <p className="text-sm text-suave">Mientras tanto, escribinos y te damos un horario.</p>
        {n.whatsapp && (
          <a href={linkWhatsApp(n.whatsapp)} target="_blank" rel="noreferrer" className="mt-2 inline-flex h-12 items-center gap-2 rounded-medio bg-wa px-5 font-semibold text-[#062b14]">
            <MessageCircle className="size-5" aria-hidden />
            Escribir por WhatsApp
          </a>
        )}
      </div>
    )
  }

  if (listo) {
    const t = turnos.find((x) => x.id === listo.id)
    const primerNombre = (resumen.nombre ?? nombre).trim().split(' ')[0]
    return (
      <div ref={refListo} className="flex scroll-mt-4 flex-col items-center pt-2 pb-4 text-center">
        <motion.div
          className="grid size-20 place-items-center rounded-full bg-exito/15 text-exito"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 18 }}
        >
          <Check className="size-10" strokeWidth={3} aria-hidden />
        </motion.div>
        <h3 className="titulo mt-4 text-2xl">{primerNombre ? `¡Listo, ${primerNombre}!` : '¡Listo!'}</h3>
        <p className="mt-1 text-[15px] text-suave">
          {viejo ? 'Cambiamos tu turno.' : 'Tu turno quedó reservado.'} Antes del turno te avisamos por WhatsApp para que confirmes.
        </p>
        {listo.viejoSinCancelar && viejo && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-medio bg-aviso/15 px-4 py-3 text-left text-sm font-semibold text-aviso">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            Tu turno anterior ({diaRelativo(viejo.inicio, ahora)} {horaCorta(viejo.inicio)}) no se pudo cancelar desde la app. Escribinos para liberarlo.
          </p>
        )}
        {t && (
          <motion.div className="mt-5 w-full text-left" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 28 }}>
            <Pase n={n} t={t} ahora={ahora} nota={conSena ? `Este turno lleva una seña de ${precio(n.sena)}: se paga en el local.` : undefined} />
          </motion.div>
        )}
        {/* El mejor momento para ofrecer la app: recién reservó. */}
        <OfertaInstalar n={n} className="mt-4 w-full" />
        <div className="mt-5 grid w-full grid-cols-2 gap-2">
          <Boton variante="secundario" onClick={() => { onCerrar(); irA('turnos') }}>Mis turnos</Boton>
          <Boton onClick={onCerrar}>Listo</Boton>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-7 pb-2">
      {/* Progreso */}
      <p className="sr-only" aria-live="polite">Paso {paso} de 4</p>
      <div className="-mt-1 flex items-center gap-2" aria-hidden>
        {[1, 2, 3, 4].map((p) => (
          <div key={p} className={cn('h-1.5 flex-1 rounded-full transition-colors duration-300', p <= paso ? 'bg-acento' : 'bg-superficie-2')} />
        ))}
      </div>

      {viejo && (
        <p className="rounded-medio bg-superficie px-4 py-3 text-sm ring-1 ring-linea">
          Tu turno actual: <b>{viejo.servicio}</b>, {diaRelativo(viejo.inicio, ahora)} a las <b className="num">{horaCorta(viejo.inicio)}</b>. Lo cancelamos recién cuando confirmes el nuevo.
        </p>
      )}

      {error && (
        <p ref={refError} role="alert" className="rounded-medio bg-peligro/12 px-4 py-3 text-sm font-semibold text-peligro">
          {error}
        </p>
      )}

      {/* 1. Servicio */}
      <section aria-labelledby="t-serv">
        <h3 id="t-serv" className="titulo mb-3 text-lg">{n.textos?.pregunta || '¿Qué te hacés?'}</h3>
        {catalogo.servicios.length === 0 ? (
          <p className="rounded-medio bg-superficie p-4 text-sm text-suave">Todavía no hay servicios para reservar.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {catalogo.servicios.map((s) => {
              const activo = s.id === servicioId
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => {
                    setServicioId(s.id)
                    setHora(undefined)
                    setError(undefined)
                    const sigue = profesionalId === null || profesionalesPara(catalogo, s.id).some((p) => p.id === profesionalId)
                    if (!sigue) setProfesionalId(undefined)
                    irSuave(sigue && profesionalId !== undefined ? refDia : refProf)
                  }}
                  className={cn(
                    'flex min-h-16 items-center justify-between gap-3 rounded-medio border-2 px-4 py-3 text-left transition-colors',
                    activo ? 'border-acento bg-acento-suave' : 'border-transparent bg-superficie ring-1 ring-linea hover:ring-acento-borde',
                  )}
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {s.nombre}
                      {s.etiqueta && <Etiqueta>{s.etiqueta}</Etiqueta>}
                    </p>
                    <p className="text-sm text-suave">{s.minutos} min{s.detalle ? ` · ${s.detalle}` : ''}</p>
                  </div>
                  {s.precio > 0 && <span className="num shrink-0 font-bold">{precio(s.precio)}</span>}
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* 2. Profesional */}
      {servicio && (
        <motion.section ref={refProf} aria-labelledby="t-prof" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="scroll-mt-4">
          <h3 id="t-prof" className="titulo mb-3 text-lg">{n.textos?.conQuien || '¿Con quién?'}</h3>
          <div className="grid grid-cols-2 gap-2">
            {[{ id: null, nombre: 'Cualquiera', rol: 'Más horarios' as string | null }, ...staffPosible].map((p) => {
              const activo = profElegido === p.id
              return (
                <button
                  key={p.id ?? 'cualquiera'}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => {
                    setProfesionalId(p.id)
                    setHora(undefined)
                    setError(undefined)
                    irSuave(refDia)
                  }}
                  className={cn(
                    'flex min-h-16 items-center gap-3 rounded-medio border-2 p-3 text-left transition-colors',
                    activo ? 'border-acento bg-acento-suave' : 'border-transparent bg-superficie ring-1 ring-linea hover:ring-acento-borde',
                  )}
                >
                  <span className={cn('grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold', p.id ? 'bg-superficie-2' : 'bg-acento text-sobre-acento')} aria-hidden>
                    {p.id ? iniciales(p.nombre) : <Users className="size-5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold leading-tight">{p.nombre}</span>
                    {p.rol && <span className="block truncate text-xs text-suave">{p.rol}</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.section>
      )}

      {/* 3. Día */}
      {servicio && profElegido !== undefined && (
        <motion.section ref={refDia} aria-labelledby="t-dia" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="scroll-mt-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 id="t-dia" className="titulo text-lg">¿Qué día?</h3>
            {diaElegido && <span className="text-sm font-semibold text-suave">{capitalizar(mesCorto(`${diaElegido}T12:00:00-03:00`))}</span>}
          </div>
          {disponibilidad.isError ? (
            <ErrorCarga onReintentar={() => void disponibilidad.refetch()} />
          ) : disponibilidad.isPending ? (
            <div className="-mx-5 flex gap-2 overflow-hidden px-5" aria-busy="true" aria-label="Buscando días con lugar">
              {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-20 w-15 shrink-0 animate-pulse rounded-medio bg-superficie-2" />)}
            </div>
          ) : !dias.some((d) => d.libres > 0) ? (
            <p className="rounded-medio bg-superficie p-4 text-sm text-suave">
              No quedan horarios en los próximos {DIAS} días{profElegido ? ' con esta persona. Probá con "Cualquiera"' : ''}.
            </p>
          ) : (
            <div className="sin-barra -mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1">
              {dias.map((d) => (
                <BotonDia
                  key={d.dia}
                  d={d}
                  hoy={hoy}
                  ahora={ahora}
                  activo={d.dia === diaElegido}
                  onClick={() => {
                    setDia(d.dia)
                    setHora(undefined)
                    irSuave(refHora)
                  }}
                />
              ))}
            </div>
          )}
        </motion.section>
      )}

      {/* 4. Horario */}
      {servicio && profElegido !== undefined && diaElegido && (
        <motion.section ref={refHora} aria-labelledby="t-hora" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="scroll-mt-4">
          <h3 id="t-hora" className="titulo mb-3 text-lg">¿A qué hora?</h3>
          {horarios.isError ? (
            <ErrorCarga onReintentar={() => void horarios.refetch()} />
          ) : horarios.isPending ? (
            <div className="grid grid-cols-4 gap-2" aria-busy="true" aria-label="Buscando horarios">
              {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-12 animate-pulse rounded-chico bg-superficie-2" />)}
            </div>
          ) : grupos.length === 0 ? (
            <p className="rounded-medio bg-superficie p-4 text-sm text-suave">No quedan horarios este día. Probá otro.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {grupos.map((g) => (
                <fieldset key={g.titulo}>
                  <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-suave">{g.titulo}</legend>
                  <div className="grid grid-cols-4 gap-2">
                    {g.items.map((h) => {
                      const activo = elegido?.inicio === h.inicio
                      return (
                        <motion.button
                          key={h.inicio}
                          type="button"
                          aria-pressed={activo}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => {
                            setHora(h.inicio)
                            setError(undefined)
                          }}
                          className={cn(
                            'num h-12 rounded-chico text-[15px] font-semibold transition-colors',
                            activo ? 'bg-acento text-sobre-acento' : 'bg-superficie ring-1 ring-linea hover:ring-acento-borde',
                          )}
                        >
                          {horaCorta(h.inicio)}
                        </motion.button>
                      )
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          )}
        </motion.section>
      )}

      {/* Resumen + confirmar */}
      <AnimatePresence>
        {servicio && elegido && (
          <motion.div
            className="sticky bottom-0 -mx-5 flex flex-col gap-3 border-t border-linea bg-fondo/95 px-5 pt-3 pb-1 backdrop-blur"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
          >
            <p className="text-sm">
              <b>{capitalizar(diaRelativo(elegido.inicio, ahora))} {horaCorta(elegido.inicio)}</b>
              <span className="text-suave">
                {' '}· {servicio.nombre} con {nombreDe(elegido.profesionalId)}
                {servicio.precio ? ` · ${precio(servicio.precio)}` : ''}
              </span>
            </p>
            {conSena && (
              <p className="rounded-chico bg-acento-suave px-3 py-2 text-xs font-semibold text-acento-texto">
                Este turno lleva una seña de {precio(n.sena)}. La seña se paga en el local.
              </p>
            )}
            {pideNombre && (
              <Campo
                etiqueta="Tu nombre"
                autoComplete="name"
                placeholder="Ej.: Martina"
                value={nombre}
                maxLength={80}
                onChange={(e) => {
                  setNombre(e.target.value)
                  setErrorNombre(undefined)
                }}
                ayuda="Es la primera vez: así te reconocen en el local."
                error={errorNombre}
              />
            )}
            <Boton tamano="grande" ancho cargando={enviando} onClick={() => void confirmar()}>
              {viejo ? 'Cambiar a este horario' : 'Confirmar turno'}
              <Sparkles className="size-4" aria-hidden />
            </Boton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function BotonDia({ d, hoy, ahora, activo, onClick }: { d: DiaDisponible; hoy: string; ahora: Date; activo: boolean; onClick: () => void }) {
  const fecha = `${d.dia}T12:00:00-03:00`
  const cerrado = d.capacidad === 0
  const lleno = !cerrado && d.libres === 0
  const nivel = d.capacidad ? d.libres / d.capacidad : 0
  const relativo = diaRelativo(fecha, ahora)
  const nombre = capitalizar(relativo) + (relativo === 'hoy' || relativo === 'mañana' ? ` ${numeroDia(fecha)}` : '')
  return (
    <button
      type="button"
      aria-pressed={activo}
      disabled={cerrado || lleno}
      aria-label={`${nombre}: ${cerrado ? 'cerrado' : lleno ? 'sin lugar' : `${d.libres} ${d.libres === 1 ? 'horario' : 'horarios'}`}`}
      onClick={onClick}
      className={cn(
        'flex h-20 w-15 shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-medio border-2 transition-colors disabled:opacity-40',
        activo ? 'border-acento bg-acento text-sobre-acento' : 'border-transparent bg-superficie ring-1 ring-linea',
      )}
    >
      <span className="text-[11px] font-bold uppercase">{d.dia === hoy ? 'Hoy' : nombreDia(fecha)}</span>
      <span className="num text-xl font-bold">{numeroDia(fecha)}</span>
      {/* Densidad: cuántos horarios quedan */}
      <span className="flex gap-0.5" aria-hidden>
        {[0, 0.34, 0.67].map((u) => (
          <span key={u} className={cn('size-1 rounded-full', nivel > u ? (activo ? 'bg-sobre-acento' : 'bg-acento') : activo ? 'bg-sobre-acento/30' : 'bg-linea')} />
        ))}
      </span>
    </button>
  )
}

function ErrorCarga({ onReintentar }: { onReintentar: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-medio bg-peligro/12 px-4 py-3 text-sm font-semibold text-peligro" role="alert">
      No pudimos traer los horarios.
      <Boton tamano="medio" variante="secundario" onClick={onReintentar}>
        <RefreshCw className="size-4" aria-hidden />
        Reintentar
      </Boton>
    </div>
  )
}
