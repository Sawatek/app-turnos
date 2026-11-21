import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Check, CreditCard, Lock, Users } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { textoMensaje, useDemo } from '@/datos/demo'
import { capacidadDelDia, huecosDelDia, profesionalesPara, type Hueco } from '@/dominio/horarios'
import { capitalizar, claveDia, diaRelativo, enAR, horaCorta, mesCorto, nombreDia, numeroDia, precio, sumarDias } from '@/dominio/tiempo'
import { OfertaInstalar } from '@/instalacion/OfertaInstalar'
import { Boton } from '@/ui/Boton'
import { Hoja } from '@/ui/Hoja'
import { Etiqueta } from '@/ui/Insignia'
import { cn } from '@/ui/cn'
import { scrollSuave } from '@/ui/movimiento'
import { iniciales } from '@/ui/Logo'
import { profesionalDe, servicioDe, useCliente, type OpcionesReserva } from './contexto'
import { Pase } from './Pase'

const DIAS = 14
const irSuave = (r: React.RefObject<HTMLElement | null>) => setTimeout(() => r.current?.scrollIntoView({ behavior: scrollSuave(), block: 'start' }), 60)

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
  const { n, e, ahora, irA } = useCliente()
  const reservar = useDemo((s) => s.reservar)
  const avisar = useDemo((s) => s.avisar)

  const [servicioId, setServicioId] = useState<string | undefined>(opciones.reprograma?.servicioId ?? opciones.servicioId)
  const [profesionalId, setProfesionalId] = useState<string | null | undefined>(
    opciones.reprograma ? opciones.reprograma.profesionalId : opciones.profesionalId,
  )
  const [dia, setDia] = useState<string | undefined>(opciones.inicio ? claveDia(opciones.inicio) : undefined)
  const [hueco, setHueco] = useState<Hueco | undefined>(
    opciones.inicio && opciones.profesionalId ? { inicio: new Date(opciones.inicio), profesionalId: opciones.profesionalId } : undefined,
  )
  const [vista, setVista] = useState<'elegir' | 'pago' | 'listo'>('elegir')
  const [error, setError] = useState<string>()
  const [pagando, setPagando] = useState(false)
  const [idListo, setIdListo] = useState<string>()
  // Se lee siempre del estado: si lo confirma desde el WhatsApp, el pase se actualiza solo.
  const turnoListo = idListo ? e.turnos.find((t) => t.id === idListo) : undefined

  const refProf = useRef<HTMLElement>(null)
  const refDia = useRef<HTMLElement>(null)
  const refHora = useRef<HTMLElement>(null)

  const servicio = servicioId ? servicioDe(n, servicioId) : undefined
  const staffPosible = servicioId ? profesionalesPara(n, servicioId) : []
  const hoy = claveDia(ahora)
  const turnosSinEste = opciones.reprograma ? e.turnos.filter((t) => t.id !== opciones.reprograma!.id) : e.turnos

  // Disponibilidad de los próximos 14 días para la elección actual (para la tira de días).
  const dias = useMemo(() => {
    if (!servicioId || profesionalId === undefined) return []
    return Array.from({ length: DIAS }, (_, i) => {
      const d = sumarDias(hoy, i)
      const huecos = huecosDelDia({ negocio: n, dia: d, servicioId, profesionalId, turnos: turnosSinEste, ahora })
      const capacidad = capacidadDelDia(n, d, servicioId) / (profesionalId ? n.staff.length : 1)
      return { dia: d, huecos, nivel: capacidad ? huecos.length / capacidad : -1 }
    })
  }, [n, servicioId, profesionalId, turnosSinEste, hoy, ahora])

  // Si el día elegido no tiene lugar (o no se eligió), se muestra el primer día con lugar.
  const diaElegido = dia && dias.some((d) => d.dia === dia && d.huecos.length) ? dia : dias.find((d) => d.huecos.length)?.dia
  const huecosDia = dias.find((d) => d.dia === diaElegido)?.huecos ?? []
  const grupos = [
    { titulo: 'Mañana', items: huecosDia.filter((h) => enAR(h.inicio).getHours() < 13) },
    { titulo: 'Tarde', items: huecosDia.filter((h) => enAR(h.inicio).getHours() >= 13 && enAR(h.inicio).getHours() < 19) },
    { titulo: 'Noche', items: huecosDia.filter((h) => enAR(h.inicio).getHours() >= 19) },
  ].filter((g) => g.items.length)

  const paso = !servicioId ? 1 : profesionalId === undefined ? 2 : !hueco ? 3 : 4
  const conSena = n.sena > 0 && !opciones.reprograma

  const confirmar = (senaPagada: number) => {
    if (!servicio || !hueco) return
    try {
      const t = reservar(
        n,
        { servicioId: servicio.id, profesionalId: hueco.profesionalId, inicio: hueco.inicio.toISOString(), minutos: servicio.minutos, senaPagada },
        opciones.reprograma?.id,
      )
      const nombre = e.usuario?.nombre ?? ''
      avisar(n.slug, {
        tipo: 'confirmacion',
        canal: 'whatsapp',
        turnoId: t.id,
        texto: textoMensaje(
          n,
          `¡Listo {nombre}! ${opciones.reprograma ? 'Cambiamos tu turno para' : 'Tu turno quedó para'} {dia} a las {hora}: {servicio} con {profesional}. ${Date.parse(t.inicio) - ahora.getTime() > 26 * 3_600_000 ? 'Te avisamos un día antes.' : 'Te avisamos 2 horas antes.'}`,
          t,
          nombre,
          ahora,
        ),
      })
      setIdListo(t.id)
      setVista('listo')
    } catch (err) {
      setError((err as Error).message)
      setHueco(undefined)
      setVista('elegir')
    }
  }

  const pagar = () => {
    setPagando(true)
    setTimeout(() => {
      setPagando(false)
      confirmar(n.sena)
    }, 1300)
  }

  if (vista === 'listo' && turnoListo) {
    return (
      <div className="flex flex-col pt-1 pb-4">
        <p className="rotulo text-acento-texto">Turno reservado</p>
        <h3 className="titulo mt-1 text-3xl">¡Listo, {e.usuario?.nombre.split(' ')[0]}!</h3>
        <p className="mt-1 text-[15px] text-suave">Te mandamos la confirmación por WhatsApp. Antes del turno te avisamos para que confirmes.</p>
        {/* El talón sale de la impresora, a saltitos, como el ticket del mostrador. */}
        <div className="imprimir mt-5" style={{ '--retraso': '120ms' } as React.CSSProperties}>
          <Pase n={n} t={turnoListo} ahora={ahora} />
        </div>
        {/* El mejor momento para ofrecer la app: recién reservó. */}
        <OfertaInstalar n={n} className="mt-5 w-full" />
        <div className="mt-5 grid w-full grid-cols-2 gap-2">
          <Boton variante="secundario" onClick={() => { onCerrar(); irA('turnos') }}>Mis turnos</Boton>
          <Boton onClick={onCerrar}>Listo</Boton>
        </div>
      </div>
    )
  }

  if (vista === 'pago' && servicio && hueco) {
    return (
      <div className="flex flex-col gap-5 pb-2">
        <div className="border-b border-linea pb-4">
          <p className="rotulo text-suave">Seña para reservar</p>
          <p className="cifra mt-2 text-6xl">{precio(n.sena)}</p>
          <p className="mt-3 text-sm text-suave">
            {servicio.nombre} · {capitalizar(diaRelativo(hueco.inicio, ahora))} <span className="mono">{horaCorta(hueco.inicio)}</span>. Se descuenta del total (
            <span className="mono">{precio(servicio.precio)}</span>).
          </p>
        </div>
        {/* Mercado Pago simulado: se ve como Mercado Pago a propósito (el prospecto lo reconoce al instante). */}
        <div className="overflow-hidden rounded-xl bg-white text-[#1d1d1f] ring-1 ring-black/10">
          <div className="flex items-center justify-between bg-[#009ee3] px-4 py-3 text-white">
            <b>Mercado Pago</b>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold tracking-wide uppercase">Simulado</span>
          </div>
          <div className="flex flex-col gap-2 p-4">
            {[
              { t: 'Dinero disponible', s: 'Saldo en tu cuenta', activo: true },
              { t: 'Tarjeta de débito', s: 'Visa terminada en 4421', activo: false },
            ].map((m) => (
              <div key={m.t} className={cn('flex items-center gap-3 rounded-xl border p-3', m.activo ? 'border-[#009ee3] bg-[#e6f6fd]' : 'border-black/10')}>
                <CreditCard className="size-5 text-[#009ee3]" aria-hidden />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{m.t}</p>
                  <p className="text-xs text-black/60">{m.s}</p>
                </div>
                {m.activo && <Check className="size-5 text-[#009ee3]" aria-hidden />}
              </div>
            ))}
            <button
              type="button"
              onClick={pagar}
              disabled={pagando}
              className="mt-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#009ee3] font-semibold text-white transition-opacity disabled:opacity-60"
            >
              {pagando ? 'Procesando pago…' : `Pagar ${precio(n.sena)}`}
            </button>
            <p className="flex items-center justify-center gap-1 text-xs text-black/60">
              <Lock className="size-3" aria-hidden />
              En la demo no se cobra nada.
            </p>
          </div>
        </div>
        <Boton variante="fantasma" onClick={() => setVista('elegir')}>Volver</Boton>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 pb-2">
      {/* Progreso: una regla con cuatro tramos que se van entintando. */}
      <div className="-mt-1 flex items-center gap-3">
        <p className="rotulo shrink-0 text-suave">
          Paso <span className="text-texto">{paso}</span>
          <span aria-hidden>/</span>
          <span className="sr-only"> de </span>4
        </p>
        <div className="flex flex-1 gap-1" aria-hidden>
          {[1, 2, 3, 4].map((p) => (
            <div key={p} className={cn('h-[3px] flex-1 transition-colors duration-300', p <= paso ? 'bg-acento' : 'bg-linea')} />
          ))}
        </div>
      </div>

      {error && <p role="alert" className="border-l-2 border-peligro py-1 pl-3 text-sm font-semibold text-peligro">{error}</p>}

      {/* 1. Servicio: la lista de precios del mostrador; la elegida queda marcada con tinta. */}
      <section aria-labelledby="t-serv">
        <Titulo id="t-serv" numero={1}>{n.textos.pregunta}</Titulo>
        <div className="flex flex-col divide-y divide-linea border-y border-linea">
          {n.servicios.map((s) => {
            const activo = s.id === servicioId
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={activo}
                onClick={() => {
                  setServicioId(s.id)
                  setHueco(undefined)
                  setError(undefined)
                  if (profesionalId && !profesionalesPara(n, s.id).some((p) => p.id === profesionalId)) setProfesionalId(undefined)
                  irSuave(profesionalId === undefined ? refProf : refDia)
                }}
                className={cn(
                  'relative flex min-h-16 items-center gap-3 px-3 py-3 text-left transition-colors',
                  activo ? 'bg-acento-suave' : 'hover:bg-superficie',
                )}
              >
                {activo && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-acento" />}
                <span className="min-w-0 flex-1">
                  <span className="flex w-full items-baseline gap-2">
                    <span className="font-semibold">{s.nombre}</span>
                    <span aria-hidden className={cn('mb-1 min-w-4 flex-1 border-b-2 border-dotted', s.precio > 0 ? 'border-linea' : 'border-transparent')} />
                    {s.precio > 0 && <span className="mono shrink-0 font-bold">{precio(s.precio)}</span>}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-suave">
                    <span>
                      <span className="mono text-[0.8125rem]">{s.minutos} min</span>
                      {s.detalle ? ` · ${s.detalle}` : ''}
                    </span>
                    {s.etiqueta && <Etiqueta>{s.etiqueta}</Etiqueta>}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={cn('grid size-6 shrink-0 place-items-center rounded-full', activo ? 'bg-acento text-sobre-acento' : 'ring-1 ring-linea')}
                >
                  {activo && <Check className="size-4" strokeWidth={3} />}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* 2. Profesional */}
      {servicioId && (
        <motion.section ref={refProf} aria-labelledby="t-prof" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="scroll-mt-4">
          <Titulo id="t-prof" numero={2}>{n.textos.conQuien}</Titulo>
          <div className="grid grid-cols-2 gap-2">
            {[{ id: null, nombre: 'Cualquiera', rol: 'Más horarios' }, ...staffPosible].map((p) => {
              const activo = profesionalId === p.id
              return (
                <button
                  key={p.id ?? 'cualquiera'}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => {
                    setProfesionalId(p.id)
                    setHueco(undefined)
                    irSuave(refDia)
                  }}
                  className={cn(
                    'flex min-h-16 items-center gap-3 rounded-medio p-3 text-left ring-inset transition-colors',
                    activo ? 'bg-acento-suave ring-2 ring-acento' : 'bg-superficie ring-1 ring-linea hover:ring-acento-borde',
                  )}
                >
                  <span
                    className={cn('grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold', p.id ? 'mono bg-superficie-2' : 'bg-acento text-sobre-acento')}
                    aria-hidden
                  >
                    {p.id ? iniciales(p.nombre) : <Users className="size-5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold leading-tight">{p.nombre}</span>
                    <span className="block truncate text-xs text-suave">{p.rol}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </motion.section>
      )}

      {/* 3. Día: hojas de almanaque. La que se elige queda entintada. */}
      {servicioId && profesionalId !== undefined && (
        <motion.section ref={refDia} aria-labelledby="t-dia" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="scroll-mt-4">
          <div className="flex items-baseline justify-between gap-3">
            <Titulo id="t-dia" numero={3}>¿Qué día?</Titulo>
            {diaElegido && <span className="rotulo text-suave">{capitalizar(mesCorto(`${diaElegido}T12:00:00-03:00`))}</span>}
          </div>
          <div className="sin-barra -mx-5 flex snap-x scroll-px-5 gap-2 overflow-x-auto px-5 pt-1 pb-1">
            {dias.map((d) => {
              const fecha = `${d.dia}T12:00:00-03:00`
              const cerrado = d.nivel < 0
              const lleno = !cerrado && d.huecos.length === 0
              const activo = d.dia === diaElegido
              return (
                <button
                  key={d.dia}
                  type="button"
                  aria-pressed={activo}
                  disabled={cerrado || lleno}
                  aria-label={`${diaRelativo(fecha, ahora)}: ${cerrado ? 'cerrado' : lleno ? 'sin lugar' : `${d.huecos.length} horarios`}`}
                  onClick={() => {
                    setDia(d.dia)
                    setHueco(undefined)
                    irSuave(refHora)
                  }}
                  className={cn(
                    'flex h-22 w-15 shrink-0 snap-start flex-col items-center overflow-hidden rounded-medio ring-inset transition-colors disabled:opacity-40',
                    activo ? 'bg-acento text-sobre-acento' : 'bg-superficie ring-1 ring-linea hover:ring-acento-borde',
                  )}
                >
                  <span className={cn('rotulo w-full py-1 text-center', activo ? 'bg-sobre-acento/15' : 'border-b border-linea text-suave')}>
                    {d.dia === hoy ? 'Hoy' : nombreDia(fecha)}
                  </span>
                  <span className="cifra grid flex-1 place-items-center text-[2rem]">{numeroDia(fecha)}</span>
                  {/* Cuántos horarios quedan: tres rayitas, como las marcas de una regla. */}
                  <span className="mb-2 flex gap-0.5" aria-hidden>
                    {[0.15, 0.4, 0.7].map((u) => (
                      <span key={u} className={cn('h-1 w-2', d.nivel > u ? (activo ? 'bg-sobre-acento' : 'bg-acento') : activo ? 'bg-sobre-acento/30' : 'bg-linea')} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.section>
      )}

      {/* 4. Horario: teclas con la hora en letra de ticket. */}
      {servicioId && profesionalId !== undefined && diaElegido && (
        <motion.section ref={refHora} aria-labelledby="t-hora" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="scroll-mt-4">
          <Titulo id="t-hora" numero={4}>¿A qué hora?</Titulo>
          {grupos.length === 0 ? (
            <p className="cuadricula rounded-medio border border-dashed border-linea p-4 text-sm text-suave">No quedan horarios este día. Probá otro.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {grupos.map((g) => (
                <div key={g.titulo}>
                  <p className="rotulo mb-2 text-suave">{g.titulo}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {g.items.map((h) => {
                      const activo = hueco?.inicio.getTime() === h.inicio.getTime()
                      return (
                        <motion.button
                          key={h.inicio.toISOString()}
                          type="button"
                          aria-pressed={activo}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => setHueco(h)}
                          className={cn(
                            'mono h-12 rounded-chico text-[15px] font-semibold transition-colors',
                            activo
                              ? 'bg-acento text-sobre-acento shadow-[inset_0_-3px_0_rgb(0_0_0/0.16)]'
                              : 'bg-superficie ring-1 ring-inset ring-linea hover:ring-acento-borde',
                          )}
                        >
                          {horaCorta(h.inicio)}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      )}

      {/* Resumen + confirmar: el talón listo para cortar. */}
      <AnimatePresence>
        {servicio && hueco && (
          <motion.div
            className="sticky bottom-0 -mx-5 border-t-2 border-texto bg-fondo/95 px-5 pt-3 pb-1 backdrop-blur"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
          >
            <div className="mb-3 flex items-end gap-3">
              <p className="cifra text-[2.75rem]">{horaCorta(hueco.inicio)}</p>
              <p className="min-w-0 flex-1 pb-0.5 text-sm leading-snug">
                <span className="flex items-baseline justify-between gap-2">
                  <b>{capitalizar(diaRelativo(hueco.inicio, ahora))}</b>
                  {servicio.precio > 0 && <span className="mono font-bold">{precio(servicio.precio)}</span>}
                </span>
                <span className="block truncate text-suave">
                  {servicio.nombre} con {profesionalDe(n, hueco.profesionalId)?.nombre}
                </span>
              </p>
            </div>
            <Boton tamano="grande" ancho onClick={() => (conSena ? setVista('pago') : confirmar(0))}>
              {conSena ? `Seguir · seña ${precio(n.sena)}` : opciones.reprograma ? 'Cambiar a este horario' : 'Confirmar turno'}
              <ArrowRight className="size-4" aria-hidden />
            </Boton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Título de cada paso, con su número en letra de ticket. */
function Titulo({ id, numero, children }: { id: string; numero: number; children: React.ReactNode }) {
  return (
    <h3 id={id} className="titulo mb-3 flex items-baseline gap-2.5 text-xl">
      <span aria-hidden className="mono text-sm font-bold text-acento-texto">
        0{numero}
      </span>
      {children}
    </h3>
  )
}
