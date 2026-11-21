import { motion } from 'motion/react'
import { ArrowRight, Check, Gift, Info, MapPin, MessageCircle, Repeat2, Star, Zap } from 'lucide-react'
import { useCalificacion, useProximoLibre, vigente } from '@/datos/real/cliente'
import { capitalizar, diaRelativo, horaCorta, precio } from '@/dominio/tiempo'
import { Etiqueta } from '@/ui/Insignia'
import { Logo } from '@/ui/Logo'
import { Talon } from '@/ui/Talon'
import { cn } from '@/ui/cn'
import { linkMapa, linkWhatsApp, useReal } from './contexto'
import { Pase } from './Pase'

const entrada = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { delay: 0.04 * i, type: 'spring' as const, stiffness: 320, damping: 30 } },
})

/** Avisos opcionales de la configuración (texto suelto o lista de { titulo, detalle }). */
function avisosDe(config: unknown): { titulo: string; detalle?: string }[] {
  const crudo = (config as { avisos?: unknown }).avisos
  const lista = Array.isArray(crudo) ? crudo : typeof crudo === 'string' && crudo.trim() ? [crudo] : []
  return lista
    .map((a) => (typeof a === 'string' ? { titulo: a } : (a as { titulo?: unknown; detalle?: unknown })))
    .filter((a): a is { titulo: string; detalle?: string } => typeof a.titulo === 'string' && a.titulo.trim() !== '')
}

/** Inclinación de cada sello de la tarjeta (a mano, ninguno igual al de al lado). */
const GIROS = [-8, 5, -3, 9, -6, 2, -10, 6]

/** Mínimo de calificaciones para mostrar el promedio (con menos, un solo voto pesa demasiado). */
const MINIMO_CALIFICACIONES = 3

function Estrellas({ negocioId }: { negocioId: string }) {
  const c = useCalificacion(negocioId).data
  if (!c?.promedio || c.cantidad < MINIMO_CALIFICACIONES) return null
  const promedio = c.promedio.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return (
    <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold" aria-label={`Calificación: ${promedio} de 5, con ${c.cantidad} opiniones`}>
      <Star className="size-4 fill-current text-acento-texto" aria-hidden />
      <span className="num">{promedio}</span>
      <span className="font-normal text-suave">· {c.cantidad} opiniones</span>
    </p>
  )
}

export function Inicio() {
  const { n, negocioId, tomaTurnos, catalogo, resumen, turnos, ahora, abrirReserva, irA, nombreCuenta, uid, cargandoCuenta } = useReal()
  const nombre = (resumen.nombre ?? nombreCuenta)?.trim().split(' ')[0]

  const proximo = turnos.filter((t) => vigente(t, ahora.getTime())).toSorted((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))[0]
  const ultimo = turnos.find((t) => t.estado !== 'cancelado') // vienen del más nuevo al más viejo

  // "Tiempo primero": el próximo horario libre del servicio de siempre (o del destacado), listo para reservar.
  const activo = (id: string) => catalogo.servicios.find((s) => s.id === id)
  const servicioBase =
    (ultimo && activo(ultimo.servicioId)) ?? catalogo.servicios.find((s) => s.etiqueta) ?? catalogo.servicios[0]
  const libre = useProximoLibre(negocioId, tomaTurnos ? servicioBase?.id : undefined)
  const profLibre = libre.data ? catalogo.profesionales.find((p) => p.id === libre.data!.profesionalId) : undefined
  const loDeSiempre =
    ultimo && activo(ultimo.servicioId) && catalogo.profesionales.some((p) => p.id === ultimo.profesionalId) ? ultimo : undefined

  const hora = Number(horaCorta(ahora).slice(0, 2))
  const saludo = hora < 6 ? 'Buenas noches' : hora < 13 ? 'Buen día' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'

  // Fidelidad: un sello por cada turno al que vino. Al completar la tarjeta se ve llena hasta el próximo sello.
  const meta = Math.max(0, n.fidelidad?.meta ?? 0)
  const sellos = meta ? (resumen.sellos > 0 && resumen.sellos % meta === 0 ? meta : resumen.sellos % meta) : 0
  const avisos = avisosDe(n)
  const promos = (n.promos ?? []).filter((p) => p.titulo)

  return (
    <div className="flex flex-col gap-5">
      {!uid ? (
        // Sin sesión: la vidriera del negocio, como la tapa de una libreta.
        <motion.header {...entrada(0)} className="flex flex-col items-start pt-4 pb-1">
          <Logo negocio={n} className="size-16 text-2xl" />
          <h1 className="mt-5 text-[2.75rem] leading-[0.95]">{n.nombre}</h1>
          {n.bajada && <p className="rotulo mt-3 text-acento-texto">{n.bajada}</p>}
          {n.claim && <p className="mt-2 max-w-xs text-[15px] text-suave">{n.claim}</p>}
          <Estrellas negocioId={negocioId} />
        </motion.header>
      ) : cargandoCuenta ? (
        <header className="flex flex-col gap-2 pt-1" aria-busy="true" aria-label="Cargando tu cuenta">
          <div className="h-4 w-24 animate-pulse rounded-chico bg-superficie-2" />
          <div className="h-10 w-44 animate-pulse rounded-chico bg-superficie-2" />
        </header>
      ) : (
        <motion.header {...entrada(0)} className="pt-2">
          <p className="rotulo text-suave">{saludo}{nombre ? ',' : ''}</p>
          <h1 className="mt-1 text-[2.75rem] leading-[0.95]">{nombre ?? '¡Hola!'}</h1>
          <Estrellas negocioId={negocioId} />
        </motion.header>
      )}

      {!tomaTurnos && (
        <motion.p {...entrada(1)} className="flex items-start gap-2 rounded-grande border border-dashed border-aviso/60 p-4 text-sm font-semibold text-aviso">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Todavía no tomamos turnos por la app. Mientras tanto, escribinos por WhatsApp.
        </motion.p>
      )}

      {avisos.map((a) => (
        <motion.aside {...entrada(1)} key={a.titulo} className="flex items-start gap-3 border-l-2 border-acento py-1 pl-4">
          <Info className="mt-0.5 size-5 shrink-0 text-acento-texto" aria-hidden />
          <div>
            <p className="font-semibold">{a.titulo}</p>
            {a.detalle && <p className="text-sm text-suave">{a.detalle}</p>}
          </div>
        </motion.aside>
      ))}

      {proximo && (
        <motion.section {...entrada(1)} aria-labelledby="t-prox">
          <h2 id="t-prox" className="rotulo mb-2 text-suave">Tu próximo turno</h2>
          <button type="button" className="block w-full rounded-grande text-left" onClick={() => irA('turnos')} aria-label="Ver mis turnos">
            <Pase n={n} t={proximo} ahora={ahora} compacto />
          </button>
        </motion.section>
      )}

      {/* Próximo libre: un talón listo para cortar. Es la forma más rápida de sacar turno. */}
      {tomaTurnos && servicioBase && (
        <motion.section {...entrada(2)} aria-labelledby="t-libre" aria-busy={libre.isPending || undefined}>
          <Talon
            as="div"
            papel="acento"
            cuerpo={
              <div className="px-5 pt-4 pb-5">
                <p id="t-libre" className="rotulo flex items-center gap-1.5 opacity-90">
                  <Zap className="size-3.5" aria-hidden />
                  Próximo libre
                </p>
                {libre.isPending ? (
                  <div className="mt-3 flex flex-col gap-2" aria-hidden>
                    <div className="h-14 w-52 animate-pulse rounded-chico bg-sobre-acento/20" />
                    <div className="h-5 w-56 animate-pulse rounded-chico bg-sobre-acento/15" />
                  </div>
                ) : libre.data ? (
                  <>
                    <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
                      <span className="titulo text-2xl">{capitalizar(diaRelativo(libre.data.inicio, ahora))}</span>
                      <span className="cifra text-[4.25rem]">{horaCorta(libre.data.inicio)}</span>
                    </p>
                    <p className="mt-2 font-semibold">
                      {servicioBase.nombre}
                      {profLibre ? ` con ${profLibre.nombre}` : ''}
                    </p>
                    {servicioBase.precio > 0 && <p className="mono mt-0.5 text-sm font-bold opacity-80">{precio(servicioBase.precio)}</p>}
                  </>
                ) : (
                  <p className="mt-2 font-semibold opacity-90">
                    {libre.isError ? 'No pudimos buscar horarios ahora.' : `No quedan horarios de ${servicioBase.nombre} en los próximos 14 días.`}
                  </p>
                )}
              </div>
            }
            talon={
              <div className="flex gap-2 px-4 pt-3.5 pb-4">
                {libre.data && (
                  <button
                    type="button"
                    onClick={() => abrirReserva({ servicioId: servicioBase.id, profesionalId: null, inicio: libre.data!.inicio })}
                    className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-medio bg-sobre-acento font-bold text-acento transition-transform active:scale-[0.97]"
                  >
                    Reservar este
                    <ArrowRight className="size-4" aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => abrirReserva({ servicioId: servicioBase.id })}
                  className={cn(
                    'inline-flex h-12 items-center justify-center rounded-medio px-4 font-bold ring-2 ring-inset ring-sobre-acento/40 transition-colors hover:bg-sobre-acento/10',
                    !libre.data && 'flex-1',
                  )}
                >
                  Otro horario
                </button>
              </div>
            }
          />
        </motion.section>
      )}

      {tomaTurnos && loDeSiempre && (
        <motion.div {...entrada(3)}>
          <button
            type="button"
            className="group flex min-h-14 w-full items-center gap-3 border-y border-linea py-3 text-left font-semibold"
            onClick={() => abrirReserva({ servicioId: loDeSiempre.servicioId, profesionalId: loDeSiempre.profesionalId })}
          >
            <Repeat2 className="size-5 shrink-0 text-acento-texto" aria-hidden />
            <span className="flex-1">
              Lo de siempre: {loDeSiempre.servicio} con {loDeSiempre.profesional}
            </span>
            <ArrowRight className="size-4 shrink-0 text-suave transition-transform group-hover:translate-x-0.5" aria-hidden />
          </button>
        </motion.div>
      )}

      {meta > 0 && uid && (
        // Tarjeta de sellos, literal: cada visita es un sello que cae (cada uno un poco torcido, como hechos a mano).
        <motion.section {...entrada(4)} aria-labelledby="t-fid" className="rounded-grande border border-dashed border-acento-borde p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="t-fid" className="titulo text-xl">Tu tarjeta</h2>
            <span className="mono text-sm font-bold text-acento-texto">
              {sellos}/{meta}
            </span>
          </div>
          {n.fidelidad.texto && <p className="mt-0.5 text-sm text-suave">{n.fidelidad.texto}</p>}
          <ol className="mt-4 flex flex-wrap gap-2" aria-label={`${sellos} de ${meta} sellos`}>
            {Array.from({ length: meta + 1 }, (_, i) => {
              const premio = i === meta
              const lleno = i < sellos
              return (
                <li
                  key={i}
                  style={{ '--giro': `${GIROS[i % GIROS.length]}deg`, '--retraso': `${200 + i * 70}ms` } as React.CSSProperties}
                  className={cn(
                    'grid size-10 place-items-center rounded-full text-xs font-extrabold',
                    premio
                      ? 'border-2 border-dashed border-acento-borde text-acento-texto'
                      : lleno
                        ? 'sello sellar rounded-full! p-0 text-acento-texto'
                        : 'mono border border-linea text-suave',
                  )}
                >
                  {premio ? <Gift className="size-4" aria-label={n.fidelidad.premio || 'Premio'} /> : lleno ? <Check className="size-4" strokeWidth={3} aria-hidden /> : i + 1}
                </li>
              )
            })}
          </ol>
          {sellos === meta && n.fidelidad.premio && (
            <p className="mt-3 text-sm font-semibold text-acento-texto">¡Completaste la tarjeta! Te toca: {n.fidelidad.premio}.</p>
          )}
        </motion.section>
      )}

      {catalogo.servicios.length > 0 && (
        // Lista de precios de mostrador: nombre, puntitos guía y precio en letra de ticket.
        <motion.section {...entrada(5)} aria-labelledby="t-serv-rap">
          <h2 id="t-serv-rap" className="titulo border-b-2 border-texto pb-2 text-xl">Servicios</h2>
          <ul className="divide-y divide-linea">
            {catalogo.servicios.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!tomaTurnos}
                  onClick={() => abrirReserva({ servicioId: s.id })}
                  className="group flex min-h-16 w-full flex-col justify-center gap-0.5 py-3 text-left disabled:cursor-default"
                >
                  <span className="flex w-full items-baseline gap-2">
                    <span className="font-semibold">{s.nombre}</span>
                    <span aria-hidden className="mb-1 min-w-4 flex-1 border-b-2 border-dotted border-linea" />
                    {s.precio > 0 && <span className="mono font-bold">{precio(s.precio)}</span>}
                    {tomaTurnos && <ArrowRight className="size-4 shrink-0 self-center text-suave transition-transform group-hover:translate-x-0.5" aria-hidden />}
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
            ))}
          </ul>
        </motion.section>
      )}

      {promos.length > 0 && (
        <motion.section {...entrada(6)} aria-labelledby="t-promos" className="flex flex-col gap-3">
          <h2 id="t-promos" className="titulo border-b-2 border-texto pb-2 text-xl">{n.promosTitulo || 'Promos'}</h2>
          {promos.map((p) => (
            <Talon
              key={p.titulo}
              as="div"
              cuerpo={
                <div className="rounded-grande bg-acento-suave px-4 py-4">
                  {p.etiqueta && <Etiqueta className="bg-fondo/60">{p.etiqueta}</Etiqueta>}
                  <p className="titulo mt-2 text-xl">{p.titulo}</p>
                  {p.detalle && <p className="text-sm text-suave">{p.detalle}</p>}
                </div>
              }
            />
          ))}
        </motion.section>
      )}

      {(n.direccion || n.whatsapp) && (
        <motion.div {...entrada(7)} className="grid grid-cols-2 border-y border-linea">
          {n.direccion && (
            <a
              href={linkMapa(n.direccion)}
              target="_blank"
              rel="noreferrer"
              className={cn('group flex min-h-28 flex-col justify-between gap-3 py-4 pr-3', n.whatsapp ? 'border-r border-linea' : 'col-span-2')}
            >
              <MapPin className="size-5 text-acento-texto" aria-hidden />
              <span>
                <span className="block font-bold group-hover:underline">Cómo llegar</span>
                <span className="block text-sm text-suave">{n.direccion}</span>
              </span>
            </a>
          )}
          {n.whatsapp && (
            <a
              href={linkWhatsApp(n.whatsapp)}
              target="_blank"
              rel="noreferrer"
              className={cn('group flex min-h-28 flex-col justify-between gap-3 py-4', n.direccion ? 'pl-4' : 'col-span-2')}
            >
              <MessageCircle className="size-5 text-acento-texto" aria-hidden />
              <span>
                <span className="block font-bold group-hover:underline">Escribinos</span>
                <span className="mono block text-sm text-suave">{n.whatsapp}</span>
              </span>
            </a>
          )}
        </motion.div>
      )}
    </div>
  )
}
