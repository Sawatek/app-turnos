import type { User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { ArrowRight, BellRing, Check, MessageCircle, RefreshCw, Store, TriangleAlert, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  anotarmeEnEspera,
  ErrorCliente,
  profesionalesPara,
  reprogramar,
  reservar,
  traerResumen,
  useDisponibilidad,
  useHorarios,
  useRefrescar,
  type DiaDisponible,
} from '@/datos/real/cliente'
import { capitalizar, claveDia, diaRelativo, enAR, horaCorta, mesCorto, nombreDia, numeroDia, precio } from '@/dominio/tiempo'
import { OfertaInstalar } from '@/instalacion/OfertaInstalar'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { guardarMiNombre, nombreDeUsuario } from '@/datos/sesion'
import { Hoja } from '@/ui/Hoja'
import { Etiqueta } from '@/ui/Insignia'
import { iniciales } from '@/ui/Logo'
import { Sello } from '@/ui/Sello'
import { Talon } from '@/ui/Talon'
import { cn } from '@/ui/cn'
import { scrollSuave } from '@/ui/movimiento'
import { diaLegible, linkWhatsApp, useReal, type OpcionesReserva } from './contexto'
import { FormIngreso } from './Ingreso'
import { Pase } from './Pase'

const DIAS = 14
const irSuave = (r: React.RefObject<HTMLElement | null>) => setTimeout(() => r.current?.scrollIntoView({ behavior: scrollSuave(), block: 'start' }), 60)
const aISO = (s: string) => new Date(s).toISOString()
const comoError = (err: unknown) => (err instanceof ErrorCliente ? err : new ErrorCliente('desconocido', 'Algo salió mal. Probá de nuevo en un momento.'))

/** Lo que hace el botón de abajo: reservar el horario elegido, o anotarse en la lista de espera del día. */
type Accion = 'reservar' | 'esperar'
/** Datos que llegan recién al entrar con el celular (la sesión del contexto todavía no se actualizó). */
interface Extra {
  nombre?: string
  telefono?: string | null
}

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
  const { n, negocioId, tomaTurnos, catalogo, resumen, turnos, ahora, irA, marcarPropio, telefonoE164, nombreCuenta, uid, cargandoCuenta } = useReal()
  const qc = useQueryClient()
  const refrescar = useRefrescar(negocioId)
  const viejo = opciones.reprograma

  const [servicioId, setServicioId] = useState<string | undefined>(viejo?.servicioId ?? opciones.servicioId)
  const [profesionalId, setProfesionalId] = useState<string | null | undefined>(viejo ? viejo.profesionalId : opciones.profesionalId)
  const [dia, setDia] = useState<string | undefined>(opciones.inicio ? claveDia(opciones.inicio) : undefined)
  const [hora, setHora] = useState<string | undefined>(opciones.inicio ? aISO(opciones.inicio) : undefined)
  const [error, setError] = useState<string>()
  const [nombre, setNombre] = useState(nombreCuenta ?? '')
  const [errorNombre, setErrorNombre] = useState<string>()
  // El nombre se pide solo la primera vez en el negocio, y si la cuenta todavía no tiene uno.
  const [forzarNombre, setForzarNombre] = useState(false)
  const pideNombre = forzarNombre || (!!uid && !cargandoCuenta && !resumen.clienteId && !nombreCuenta)
  const [enviando, setEnviando] = useState(false)
  const [listo, setListo] = useState<{ id: string; viejoSinCancelar: boolean }>()
  const [accion, setAccion] = useState<Accion>('reservar')
  /** Sin sesión: al confirmar se le pide el celular acá mismo, sin perder lo elegido. */
  const [ingresando, setIngresando] = useState(false)
  const [anotado, setAnotado] = useState<string>()
  const refNombre = useRef<HTMLDivElement>(null)

  const refProf = useRef<HTMLElement>(null)
  const refDia = useRef<HTMLElement>(null)
  const refHora = useRef<HTMLElement>(null)
  const refError = useRef<HTMLParagraphElement>(null)
  const refListo = useRef<HTMLDivElement>(null)
  const refResumen = useRef<HTMLDivElement>(null)

  const servicio = catalogo.servicios.find((s) => s.id === servicioId)
  const staffPosible = servicioId ? profesionalesPara(catalogo, servicioId) : []
  // Si el profesional elegido ya no hace este servicio (o no está activo), se vuelve a preguntar.
  const profElegido = profesionalId === null || staffPosible.some((p) => p.id === profesionalId) ? profesionalId : undefined

  const disponibilidad = useDisponibilidad(negocioId, servicio?.id, profElegido, DIAS)
  const dias = disponibilidad.data ?? []
  const hoy = claveDia(ahora)
  // Se puede elegir un día lleno (para anotarse en la lista de espera). Si no eligió, el primero con lugar.
  const diaElegido = dia && dias.some((d) => d.dia === dia && d.capacidad > 0) ? dia : dias.find((d) => d.libres > 0)?.dia
  const diaLleno = !!diaElegido && dias.find((d) => d.dia === diaElegido)?.libres === 0
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
    setTimeout(() => refError.current?.scrollIntoView({ behavior: scrollSuave(), block: 'center' }), 60)
  }

  /** El nombre a mandar (o null si falta y hay que pedirlo). */
  const nombreParaEnviar = (extra: Extra): string | undefined | null => {
    if (extra.nombre) return extra.nombre
    if (!pideNombre) return undefined
    if (nombre.trim().length < 2) {
      setErrorNombre('Poné tu nombre así te reconocen en el local.')
      return null
    }
    return nombre.trim()
  }

  /** Si falta el nombre, se lo pide (y se lleva el foco al campo). */
  const pedirNombre = (texto?: string) => {
    setForzarNombre(true)
    if (texto) setErrorNombre(texto)
    setTimeout(() => {
      refNombre.current?.scrollIntoView({ behavior: scrollSuave(), block: 'center' })
      refNombre.current?.querySelector('input')?.focus()
    }, 80)
  }

  const confirmar = async (extra: Extra = {}) => {
    if (!servicio || !elegido || enviando) return
    const nombreEnviado = nombreParaEnviar(extra)
    if (nombreEnviado === null) return
    setEnviando(true)
    setError(undefined)
    const tel = extra.telefono ?? telefonoE164
    const datos = {
      servicioId: servicio.id,
      inicio: elegido.inicio,
      profesionalId: profElegido ?? null,
      ...(nombreEnviado ? { nombre: nombreEnviado } : {}),
      ...(tel ? { telefono: tel } : {}),
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
      // El nombre que escribió queda también en su cuenta (para saludarlo y para la próxima).
      if (nombreEnviado && !extra.nombre && !nombreCuenta) void guardarMiNombre(nombreEnviado).catch(() => undefined)
      await refrescar()
      setListo({ id, viejoSinCancelar })
    } catch (err) {
      const e = comoError(err)
      if (e.codigo === 'horario_no_disponible') {
        // Alguien lo tomó antes: se refrescan los horarios y se pide otro.
        setHora(undefined)
        void qc.invalidateQueries({ queryKey: ['cliente-real', negocioId, 'agenda'] })
        irSuave(refHora)
      }
      if (e.codigo === 'falta_nombre') pedirNombre(e.message)
      else mostrarError(e.message)
    } finally {
      setEnviando(false)
    }
  }

  /** Lista de espera: "Avisame si se libera" un horario el día elegido. */
  const anotarme = async (extra: Extra = {}) => {
    if (!servicio || !diaElegido || enviando) return
    const nombreEnviado = nombreParaEnviar(extra)
    if (nombreEnviado === null) return
    setEnviando(true)
    setError(undefined)
    try {
      await anotarmeEnEspera(negocioId, {
        servicioId: servicio.id,
        dia: diaElegido,
        profesionalId: profElegido ?? null,
        ...(nombreEnviado ? { nombre: nombreEnviado } : {}),
      })
      if (nombreEnviado && !extra.nombre && !nombreCuenta) void guardarMiNombre(nombreEnviado).catch(() => undefined)
      await refrescar()
      setAnotado(diaElegido)
    } catch (err) {
      const e = comoError(err)
      if (e.codigo === 'falta_nombre') pedirNombre(e.message)
      else mostrarError(e.message)
    } finally {
      setEnviando(false)
    }
  }

  // La hoja venía scrolleada hasta el horario: al terminar se vuelve arriba, para ver el "¡Listo!" y el talón saliendo.
  const terminado = !!listo || !!anotado
  useEffect(() => {
    if (terminado) refListo.current?.scrollIntoView({ block: 'start' })
  }, [terminado])

  const ejecutar = (a: Accion, extra: Extra = {}) => (a === 'reservar' ? confirmar(extra) : anotarme(extra))

  /** El botón de abajo: sin sesión, primero el celular; con sesión, directo. */
  const alConfirmar = (a: Accion) => {
    setAccion(a)
    setError(undefined)
    if (!uid) {
      setIngresando(true)
      return
    }
    void ejecutar(a)
  }

  /** Entró con el código desde acá: si ya es cliente (o su cuenta tiene nombre), sigue solo; si no, pide el nombre. */
  const alEntrar = async (usuario: User) => {
    const nombreUsuario = nombreDeUsuario(usuario) ?? undefined
    const telefono = usuario.phone ? `+${usuario.phone.replace(/^\+/, '')}` : null
    const ficha = await traerResumen(negocioId).catch(() => null)
    setIngresando(false)
    if (!ficha?.clienteId && !nombreUsuario) {
      pedirNombre()
      return
    }
    await ejecutar(accion, { nombre: ficha?.clienteId ? undefined : nombreUsuario, telefono })
  }

  const alEsperar = () => {
    setHora(undefined)
    alConfirmar('esperar')
    if (!uid || pideNombre) setTimeout(() => refResumen.current?.scrollIntoView({ behavior: scrollSuave(), block: 'end' }), 80)
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

  if (anotado) {
    return (
      <div ref={refListo} className="flex scroll-mt-4 flex-col pt-1 pb-4">
        <Encabezado titulo="¡Te anotamos!" sello={<Sello tono="acento" tamano="grande" animar giro={-6} className="retraso-950">Anotado</Sello>}>
          Si se libera un horario, te avisamos por WhatsApp. Lo reserva el primero que llega.
        </Encabezado>
        <Impresora>
          <Talon
            as="div"
            cuerpo={
              <div className="px-4 pt-3.5 pb-4">
                <p className="rotulo flex items-center gap-1.5 text-suave">
                  <BellRing className="size-3.5" aria-hidden />
                  Lista de espera
                </p>
                <p className="titulo mt-3 text-2xl">{capitalizar(diaLegible(anotado, ahora))}</p>
                <p className="mt-1 font-semibold">
                  {servicio?.nombre ?? 'Tu servicio'}
                  {profElegido ? <span className="font-normal text-suave"> con {nombreDe(profElegido)}</span> : null}
                </p>
                <p className="mt-0.5 text-sm text-suave">Cualquier horario de ese día.</p>
              </div>
            }
          />
        </Impresora>
        <div className="mt-6 grid w-full grid-cols-2 gap-2">
          <Boton variante="secundario" onClick={() => { onCerrar(); irA('turnos') }}>Mis turnos</Boton>
          <Boton onClick={onCerrar}>Listo</Boton>
        </div>
      </div>
    )
  }

  if (listo) {
    const t = turnos.find((x) => x.id === listo.id)
    const primerNombre = (resumen.nombre ?? nombre).trim().split(' ')[0]
    return (
      <div ref={refListo} className="flex scroll-mt-4 flex-col pt-1 pb-4">
        <Encabezado
          titulo={primerNombre ? `¡Listo, ${primerNombre}!` : '¡Listo!'}
          sello={<Sello tono="exito" tamano="grande" animar giro={-7} className="retraso-950">{viejo ? 'Cambiado' : 'Reservado'}</Sello>}
        >
          {viejo ? 'Cambiamos tu turno.' : 'Tu turno quedó reservado.'} Antes del turno te avisamos por WhatsApp para que confirmes.
        </Encabezado>
        {listo.viejoSinCancelar && viejo && (
          <p role="alert" className="mt-4 flex items-start gap-2 border-l-2 border-aviso py-1 pl-3 text-sm font-semibold text-aviso">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            Tu turno anterior ({diaRelativo(viejo.inicio, ahora)} {horaCorta(viejo.inicio)}) no se pudo cancelar desde la app. Escribinos para liberarlo.
          </p>
        )}
        {t && (
          <Impresora>
            <Pase n={n} t={t} ahora={ahora} nota={conSena ? `Este turno lleva una seña de ${precio(n.sena)}: se paga en el local.` : undefined} />
          </Impresora>
        )}
        {/* El mejor momento para ofrecer la app: recién reservó. */}
        <OfertaInstalar n={n} className="mt-5 w-full" />
        <div className="mt-5 grid w-full grid-cols-2 gap-2">
          <Boton variante="secundario" onClick={() => { onCerrar(); irA('turnos') }}>Mis turnos</Boton>
          <Boton onClick={onCerrar}>Listo</Boton>
        </div>
      </div>
    )
  }

  const completo = !!servicio && (accion === 'esperar' ? !!diaElegido : !!elegido)

  return (
    <div className="flex flex-col gap-8 pb-2">
      <p className="sr-only" aria-live="polite">Paso {paso} de 4</p>

      {viejo && (
        <p className="rounded-medio border border-dashed border-linea px-4 py-3 text-sm">
          Tu turno actual: <b>{viejo.servicio}</b>, {diaRelativo(viejo.inicio, ahora)} a las <b className="mono">{horaCorta(viejo.inicio)}</b>. Lo cancelamos recién cuando confirmes el nuevo.
        </p>
      )}

      {error && (
        <p ref={refError} role="alert" className="flex items-start gap-2 border-l-2 border-peligro py-1 pl-3 text-sm font-semibold text-peligro">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {/* 1. Servicio: la lista de precios del mostrador. */}
      <section aria-labelledby="t-serv">
        <TituloPaso id="t-serv" numero={1} hecho={!!servicio}>{n.textos?.pregunta || '¿Qué te hacés?'}</TituloPaso>
        {catalogo.servicios.length === 0 ? (
          <p className="py-4 text-sm text-suave">Todavía no hay servicios para reservar.</p>
        ) : (
          <ul className="divide-y divide-linea">
            {catalogo.servicios.map((s) => {
              const activo = s.id === servicioId
              return (
                <li key={s.id}>
                  <button
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
                      'relative flex min-h-16 w-full flex-col justify-center gap-0.5 py-3 pr-1 pl-4 text-left transition-colors',
                      activo ? 'bg-acento-suave' : 'hover:bg-superficie',
                    )}
                  >
                    {/* Marca de tinta del elegido */}
                    <span aria-hidden className={cn('absolute inset-y-2 left-0 w-[3px] rounded-full transition-colors', activo ? 'bg-acento' : 'bg-transparent')} />
                    <span className="flex w-full items-baseline gap-2">
                      <span className="font-semibold">{s.nombre}</span>
                      <span aria-hidden className={cn('mb-1 min-w-4 flex-1 border-b-2 border-dotted', activo ? 'border-acento-borde' : 'border-linea')} />
                      {s.precio > 0 && <span className="mono font-bold">{precio(s.precio)}</span>}
                      <span aria-hidden className={cn('grid size-5 shrink-0 place-items-center self-center rounded-full', activo ? 'bg-acento text-sobre-acento' : 'ring-1 ring-inset ring-linea')}>
                        {activo && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-suave">
                      <span>
                        <span className="mono text-[0.8125rem]">{s.minutos} min</span>
                        {s.detalle ? ` · ${s.detalle}` : ''}
                      </span>
                      {s.etiqueta && <Etiqueta>{s.etiqueta}</Etiqueta>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* 2. Profesional: casilleros de una planilla, separados por líneas. */}
      {servicio && (
        <motion.section ref={refProf} aria-labelledby="t-prof" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="scroll-mt-4">
          <TituloPaso id="t-prof" numero={2} hecho={profElegido !== undefined}>{n.textos?.conQuien || '¿Con quién?'}</TituloPaso>
          <Casilleros columnas={2} cantidad={staffPosible.length + 1} className="mt-3">
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
                    'flex min-h-16 items-center gap-3 px-3 py-3 text-left transition-colors',
                    activo ? 'bg-acento text-sobre-acento' : 'bg-fondo hover:bg-superficie',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'mono grid size-10 shrink-0 place-items-center rounded-chico text-[0.8125rem] font-bold',
                      activo ? 'ring-[1.5px] ring-current ring-inset' : 'bg-superficie-2',
                    )}
                  >
                    {p.id ? iniciales(p.nombre) : <Users className="size-5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold leading-tight">{p.nombre}</span>
                    {p.rol && <span className={cn('block truncate text-xs', activo ? 'opacity-80' : 'text-suave')}>{p.rol}</span>}
                  </span>
                </button>
              )
            })}
          </Casilleros>
        </motion.section>
      )}

      {/* 3. Día: tira de calendario de taco. */}
      {servicio && profElegido !== undefined && (
        <motion.section ref={refDia} aria-labelledby="t-dia" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="scroll-mt-4">
          <TituloPaso
            id="t-dia"
            numero={3}
            hecho={!!diaElegido}
            extra={diaElegido && <span className="rotulo text-suave">{capitalizar(mesCorto(`${diaElegido}T12:00:00-03:00`))}</span>}
          >
            ¿Qué día?
          </TituloPaso>
          {disponibilidad.isError ? (
            <ErrorCarga onReintentar={() => void disponibilidad.refetch()} />
          ) : disponibilidad.isPending ? (
            <div className="-mx-5 mt-3 flex gap-2 overflow-hidden px-5" aria-busy="true" aria-label="Buscando días con lugar">
              {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-24 w-[4.25rem] shrink-0 animate-pulse rounded-chico bg-superficie-2" />)}
            </div>
          ) : !dias.some((d) => d.capacidad > 0) ? (
            <p className="mt-3 text-sm text-suave">
              No hay días de atención en los próximos {DIAS} días{profElegido ? ' con esta persona. Probá con "Cualquiera"' : ''}.
            </p>
          ) : (
            <>
              <div className="sin-barra -mx-5 mt-3 flex snap-x scroll-px-5 gap-2 overflow-x-auto px-5 pt-1 pb-1">
                {dias.map((d) => (
                  <HojaDeTaco
                    key={d.dia}
                    d={d}
                    hoy={hoy}
                    ahora={ahora}
                    activo={d.dia === diaElegido}
                    onClick={() => {
                      setDia(d.dia)
                      setHora(undefined)
                      setAccion('reservar')
                      setIngresando(false)
                      irSuave(refHora)
                    }}
                  />
                ))}
              </div>
              {!dias.some((d) => d.libres > 0) && (
                <p className="mt-3 text-sm text-suave">
                  No quedan horarios en los próximos {DIAS} días{profElegido ? ' con esta persona (probá con "Cualquiera")' : ''}. Elegí un día y te avisamos si se libera alguno.
                </p>
              )}
            </>
          )}
        </motion.section>
      )}

      {/* 4. Horario: el tablero de numeritos. */}
      {servicio && profElegido !== undefined && diaElegido && (
        <motion.section ref={refHora} aria-labelledby="t-hora" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="scroll-mt-4">
          <TituloPaso id="t-hora" numero={4} hecho={!!elegido}>¿A qué hora?</TituloPaso>
          {horarios.isError ? (
            <ErrorCarga onReintentar={() => void horarios.refetch()} />
          ) : horarios.isPending ? (
            <div className="mt-3 grid grid-cols-4 gap-px overflow-hidden rounded-medio bg-linea ring-1 ring-linea" aria-busy="true" aria-label="Buscando horarios">
              {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-14 animate-pulse bg-superficie" />)}
            </div>
          ) : diaLleno || grupos.length === 0 ? (
            <div className="cuadricula mt-3 flex flex-col items-start gap-3 rounded-grande border border-dashed border-linea p-5">
              <p className="text-sm">
                <b>No quedan horarios este día.</b> <span className="text-suave">Si alguien cancela, te avisamos por WhatsApp.</span>
              </p>
              <Boton variante="secundario" aria-pressed={accion === 'esperar'} onClick={alEsperar}>
                <BellRing className="size-4" aria-hidden />
                Avisame si se libera
              </Boton>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-5">
              {grupos.map((g) => (
                <fieldset key={g.titulo}>
                  <legend className="mb-2 flex w-full items-baseline justify-between">
                    <span className="rotulo text-suave">{g.titulo}</span>
                  </legend>
                  <Casilleros columnas={4} cantidad={g.items.length}>
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
                            setAccion('reservar')
                            setError(undefined)
                          }}
                          className={cn(
                            'cifra h-14 text-[1.5rem] transition-colors',
                            activo ? 'bg-acento text-sobre-acento' : 'bg-fondo hover:bg-superficie',
                          )}
                        >
                          {horaCorta(h.inicio)}
                        </motion.button>
                      )
                    })}
                  </Casilleros>
                </fieldset>
              ))}
              <Boton variante="fantasma" className="self-start px-2" onClick={alEsperar}>
                <BellRing className="size-4" aria-hidden />
                ¿Querés uno antes? Avisame si se libera
              </Boton>
            </div>
          )}
        </motion.section>
      )}

      {/* El talón del turno: se va completando a medida que elige y, completo, se corta para confirmar. */}
      <div ref={refResumen} className="sticky -bottom-4 z-10 -mx-5 bg-fondo/95 px-3 pt-2 pb-4 backdrop-blur">
        <Talon
          as="div"
          cuerpo={
            <ResumenTalon
              servicio={servicio}
              con={profElegido === undefined ? undefined : profElegido === null ? (elegido ? nombreDe(elegido.profesionalId) : 'Cualquiera') : nombreDe(profElegido)}
              dia={accion === 'esperar' ? diaElegido : elegido ? undefined : diaElegido}
              inicio={accion === 'reservar' ? elegido?.inicio : undefined}
              espera={accion === 'esperar' && !!diaElegido}
              ahora={ahora}
            />
          }
          talon={
            completo && (
              <motion.div className="flex flex-col gap-3 px-4 pt-4 pb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {conSena && accion === 'reservar' && (
                  <p className="rounded-chico border border-dashed border-acento-borde px-3 py-2 text-xs font-semibold text-acento-texto">
                    Este turno lleva una seña de {precio(n.sena)}. La seña se paga en el local.
                  </p>
                )}
                {ingresando && !uid ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-[15px] font-semibold">
                      {accion === 'reservar' ? 'Para reservar, entrá con tu celular.' : 'Para avisarte, entrá con tu celular.'}{' '}
                      <span className="font-normal text-suave">No perdés lo que elegiste.</span>
                    </p>
                    <FormIngreso onEntrar={alEntrar} />
                  </div>
                ) : (
                  <>
                    {pideNombre && (
                      <div ref={refNombre}>
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
                      </div>
                    )}
                    {accion === 'esperar' ? (
                      <Boton tamano="grande" ancho cargando={enviando} onClick={() => alConfirmar('esperar')}>
                        <BellRing className="size-4" aria-hidden />
                        Avisame si se libera
                      </Boton>
                    ) : (
                      <Boton tamano="grande" ancho cargando={enviando} onClick={() => alConfirmar('reservar')}>
                        {viejo ? 'Cambiar a este horario' : 'Confirmar turno'}
                        <ArrowRight className="size-4" aria-hidden />
                      </Boton>
                    )}
                  </>
                )}
              </motion.div>
            )
          }
        />
      </div>
    </div>
  )
}

/** Título de un paso, como el encabezado de una planilla: número de casillero y filete grueso abajo. */
function TituloPaso({ id, numero, hecho, extra, children }: { id: string; numero: number; hecho: boolean; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 border-b-2 border-texto pb-2">
      <h3 id={id} className="titulo flex items-baseline gap-2.5 text-xl">
        <span aria-hidden className={cn('mono inline-grid size-6 shrink-0 translate-y-[-2px] place-items-center rounded-chico text-xs font-bold', hecho ? 'bg-acento text-sobre-acento' : 'ring-1 ring-inset ring-suave/60 text-suave')}>
          {hecho ? <Check className="size-3.5" strokeWidth={3} /> : numero}
        </span>
        {children}
      </h3>
      {extra}
    </div>
  )
}

/**
 * Grilla de casilleros separados por líneas finas (como una planilla impresa), sin huecos grises:
 * si la última fila queda corta, se completa con casilleros en blanco.
 */
function Casilleros({ columnas, cantidad, className, children }: { columnas: 2 | 4; cantidad: number; className?: string; children: React.ReactNode }) {
  const blancos = (columnas - (cantidad % columnas)) % columnas
  return (
    <div className={cn('grid gap-px overflow-hidden rounded-medio bg-linea ring-1 ring-linea', columnas === 2 ? 'grid-cols-2' : 'grid-cols-4', className)}>
      {children}
      {Array.from({ length: blancos }, (_, i) => <div key={i} aria-hidden className="bg-fondo" />)}
    </div>
  )
}

/** Una hoja del taco: el día de la semana arriba, el número grande y cuánto lugar queda (puntitos). */
function HojaDeTaco({ d, hoy, ahora, activo, onClick }: { d: DiaDisponible; hoy: string; ahora: Date; activo: boolean; onClick: () => void }) {
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
      disabled={cerrado}
      aria-label={`${nombre}: ${cerrado ? 'cerrado' : lleno ? 'sin lugar' : `${d.libres} ${d.libres === 1 ? 'horario' : 'horarios'}`}`}
      onClick={onClick}
      className={cn(
        'flex h-24 w-[4.25rem] shrink-0 snap-start flex-col overflow-hidden rounded-chico ring-1 transition-colors',
        activo ? 'bg-acento text-sobre-acento ring-acento' : 'bg-fondo ring-linea hover:bg-superficie',
        cerrado && 'cursor-not-allowed text-suave',
      )}
    >
      <span className={cn('rotulo grid h-6 w-full shrink-0 place-items-center', activo ? 'bg-sobre-acento/15' : 'bg-superficie-2', !activo && !cerrado && d.dia === hoy && 'text-acento-texto')}>
        {d.dia === hoy ? 'Hoy' : nombreDia(fecha)}
      </span>
      <span className={cn('cifra grid flex-1 place-items-center text-[2.125rem]', cerrado && 'line-through decoration-2 opacity-50', lleno && !activo && 'opacity-55')}>
        {numeroDia(fecha)}
      </span>
      {/* Cuánto lugar queda: tres puntitos (o la palabra, si no queda nada). */}
      <span aria-hidden className="flex h-5 shrink-0 items-start justify-center gap-1">
        {cerrado ? (
          <span className="mono text-[0.75rem] leading-none opacity-70">—</span>
        ) : lleno ? (
          <span className={cn('mono text-[0.75rem] leading-none font-semibold', activo ? '' : 'text-aviso')}>lleno</span>
        ) : (
          [0, 0.34, 0.67].map((u) => (
            <span key={u} className={cn('size-1.5 rounded-full', nivel > u ? (activo ? 'bg-sobre-acento' : 'bg-acento') : activo ? 'bg-sobre-acento/30' : 'bg-linea')} />
          ))
        )}
      </span>
    </button>
  )
}

/** Renglón en blanco del talón: lo que todavía falta elegir. */
function Blanco({ children }: { children: string }) {
  return <span className="text-suave/80 underline decoration-linea decoration-dotted decoration-2 underline-offset-4">{children}</span>
}

/** Cuerpo del talón de la reserva: servicio, con quién, día y hora. Lo que falta queda como renglón en blanco. */
function ResumenTalon({
  servicio,
  con,
  dia,
  inicio,
  espera,
  ahora,
}: {
  servicio?: { nombre: string; precio: number; minutos: number }
  con?: string
  dia?: string
  inicio?: string
  espera: boolean
  ahora: Date
}) {
  const fecha = inicio ?? (dia ? `${dia}T12:00:00-03:00` : undefined)
  return (
    <div className="px-4 pt-3 pb-3.5">
      <p className="rotulo flex items-center justify-between gap-3 text-suave">
        <span>{espera ? 'Lista de espera' : 'Tu turno'}</span>
        {servicio && servicio.precio > 0 && <span className="mono text-[0.8125rem] font-bold tracking-normal text-texto normal-case">{precio(servicio.precio)}</span>}
      </p>
      <p className="mt-1.5 truncate text-[15px] font-semibold">
        {servicio ? servicio.nombre : <Blanco>Elegí qué te hacés</Blanco>}
        {servicio && (
          <>
            {' '}
            <span className="font-normal text-suave">con</span> {con ?? <Blanco>quién</Blanco>}
          </>
        )}
      </p>
      <p className="mt-1 flex items-end justify-between gap-3">
        <span className="titulo truncate pb-1 text-lg">{fecha ? capitalizar(diaRelativo(fecha, ahora)) : <Blanco>Día</Blanco>}</span>{' '}
        {espera ? (
          <span className="flex shrink-0 items-center gap-1.5 pb-1 text-sm font-semibold text-acento-texto">
            <BellRing className="size-4" aria-hidden />
            Si se libera
          </span>
        ) : (
          <span className={cn('shrink-0', inicio ? 'cifra text-[2.75rem]' : 'titulo pb-1 text-lg')}>{inicio ? horaCorta(inicio) : <Blanco>Hora</Blanco>}</span>
        )}
      </p>
    </div>
  )
}

/** La ranura de la impresora: el talón sale de abajo a saltitos (con "reducir movimiento", aparece entero). */
function Impresora({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div aria-hidden className="relative z-10 -mx-1.5 h-3 rounded-full bg-superficie-2 ring-1 ring-linea">
        <div className="absolute inset-x-3 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-black/70" />
      </div>
      <div className="imprimir retraso-150 -mt-1 text-left">{children}</div>
    </div>
  )
}

/** Título del final (reservado, anotado) con el sello que cae después de que se imprime el talón. */
function Encabezado({ titulo, sello, children }: { titulo: string; sello: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 className="titulo text-[2rem] leading-none">{titulo}</h3>
        {sello}
      </div>
      <p className="mt-2.5 text-[15px] text-suave">{children}</p>
    </div>
  )
}

function ErrorCarga({ onReintentar }: { onReintentar: () => void }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 border-l-2 border-peligro py-1 pl-3 text-sm font-semibold text-peligro" role="alert">
      No pudimos traer los horarios.
      <Boton tamano="medio" variante="secundario" onClick={onReintentar}>
        <RefreshCw className="size-4" aria-hidden />
        Reintentar
      </Boton>
    </div>
  )
}
