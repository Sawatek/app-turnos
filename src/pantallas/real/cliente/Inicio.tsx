import { motion } from 'motion/react'
import { ArrowRight, Check, Gift, Info, MapPin, MessageCircle, Repeat2, Star, Zap } from 'lucide-react'
import { useCalificacion, useProximoLibre, vigente } from '@/datos/real/cliente'
import { capitalizar, diaRelativo, horaCorta, precio } from '@/dominio/tiempo'
import { Etiqueta } from '@/ui/Insignia'
import { Logo } from '@/ui/Logo'
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
    <div className="flex flex-col gap-4">
      {!uid ? (
        // Sin sesión: la vidriera del negocio.
        <motion.header {...entrada(0)} className="flex flex-col items-center pt-3 pb-1 text-center">
          <Logo negocio={n} className="size-20 text-3xl sombra-suave" />
          <h1 className="mt-4 text-3xl">{n.nombre}</h1>
          {n.bajada && <p className="mt-1 text-sm font-semibold text-acento-texto">{n.bajada}</p>}
          {n.claim && <p className="mt-2 max-w-xs text-[15px] text-suave">{n.claim}</p>}
          <Estrellas negocioId={negocioId} />
        </motion.header>
      ) : cargandoCuenta ? (
        <header className="flex flex-col gap-2 pt-1" aria-busy="true" aria-label="Cargando tu cuenta">
          <div className="h-4 w-24 animate-pulse rounded-chico bg-superficie-2" />
          <div className="h-8 w-40 animate-pulse rounded-chico bg-superficie-2" />
        </header>
      ) : (
        <motion.header {...entrada(0)} className="pt-1">
          <p className="text-sm font-semibold text-suave">{saludo}{nombre ? ',' : ''}</p>
          <h1 className="text-3xl">{nombre ?? '¡Hola!'}</h1>
          <Estrellas negocioId={negocioId} />
        </motion.header>
      )}

      {!tomaTurnos && (
        <motion.p {...entrada(1)} className="flex items-start gap-2 rounded-grande bg-aviso/15 p-4 text-sm font-semibold text-aviso">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Todavía no tomamos turnos por la app. Mientras tanto, escribinos por WhatsApp.
        </motion.p>
      )}

      {avisos.map((a) => (
        <motion.aside {...entrada(1)} key={a.titulo} className="flex items-start gap-3 rounded-grande bg-superficie p-4 ring-1 ring-linea">
          <Info className="mt-0.5 size-5 shrink-0 text-acento-texto" aria-hidden />
          <div>
            <p className="font-semibold">{a.titulo}</p>
            {a.detalle && <p className="text-sm text-suave">{a.detalle}</p>}
          </div>
        </motion.aside>
      ))}

      {proximo && (
        <motion.section {...entrada(1)} aria-labelledby="t-prox">
          <h2 id="t-prox" className="sr-only">Tu próximo turno</h2>
          <button type="button" className="block w-full text-left" onClick={() => irA('turnos')} aria-label="Ver mis turnos">
            <Pase n={n} t={proximo} ahora={ahora} compacto />
          </button>
        </motion.section>
      )}

      {/* Próximo libre */}
      {tomaTurnos && servicioBase && (
        <motion.section
          {...entrada(2)}
          aria-labelledby="t-libre"
          aria-busy={libre.isPending || undefined}
          className="relative overflow-hidden rounded-grande bg-acento p-5 text-sobre-acento sombra-suave"
        >
          <div className="pointer-events-none absolute -top-16 -right-12 size-48 rounded-full bg-sobre-acento/10" aria-hidden />
          <p id="t-libre" className="flex items-center gap-1.5 text-sm font-bold opacity-90">
            <Zap className="size-4" aria-hidden />
            Próximo libre
          </p>
          {libre.isPending ? (
            <div className="mt-2 flex flex-col gap-2" aria-hidden>
              <div className="h-9 w-44 animate-pulse rounded-chico bg-sobre-acento/20" />
              <div className="h-5 w-56 animate-pulse rounded-chico bg-sobre-acento/15" />
            </div>
          ) : libre.data ? (
            <>
              <p className="titulo num mt-1 text-4xl">
                {capitalizar(diaRelativo(libre.data.inicio, ahora))} {horaCorta(libre.data.inicio)}
              </p>
              <p className="mt-0.5 font-semibold opacity-90">
                {servicioBase.nombre}
                {profLibre ? ` con ${profLibre.nombre}` : ''}
                {servicioBase.precio ? ` · ${precio(servicioBase.precio)}` : ''}
              </p>
            </>
          ) : (
            <p className="mt-1 font-semibold opacity-90">
              {libre.isError ? 'No pudimos buscar horarios ahora.' : `No quedan horarios de ${servicioBase.nombre} en los próximos 14 días.`}
            </p>
          )}
          <div className="mt-4 flex gap-2">
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
                'inline-flex h-12 items-center justify-center rounded-medio px-4 font-bold ring-2 ring-sobre-acento/35 transition-colors hover:bg-sobre-acento/10',
                !libre.data && 'flex-1',
              )}
            >
              Otro horario
            </button>
          </div>
        </motion.section>
      )}

      {tomaTurnos && loDeSiempre && (
        <motion.div {...entrada(3)}>
          <button
            type="button"
            className="flex min-h-14 w-full items-center gap-2.5 rounded-medio bg-superficie-2 px-6 py-3 text-left font-semibold transition-colors hover:bg-linea/60"
            onClick={() => abrirReserva({ servicioId: loDeSiempre.servicioId, profesionalId: loDeSiempre.profesionalId })}
          >
            <Repeat2 className="size-5 shrink-0 text-acento-texto" aria-hidden />
            <span className="flex-1">
              Lo de siempre: {loDeSiempre.servicio} con {loDeSiempre.profesional}
            </span>
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {meta > 0 && uid && (
          <motion.section {...entrada(4)} aria-labelledby="t-fid" className="col-span-2 rounded-grande bg-superficie p-4 ring-1 ring-linea">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="t-fid" className="titulo text-base">Tu tarjeta</h2>
              <span className="num text-sm font-bold text-acento-texto">
                {sellos}/{meta}
              </span>
            </div>
            {n.fidelidad.texto && <p className="mt-0.5 text-sm text-suave">{n.fidelidad.texto}</p>}
            <ol className="mt-3 flex gap-2" aria-label={`${sellos} de ${meta} sellos`}>
              {Array.from({ length: meta + 1 }, (_, i) => {
                const premio = i === meta
                const lleno = i < sellos
                return (
                  <motion.li
                    key={i}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1, transition: { delay: 0.2 + i * 0.05, type: 'spring', stiffness: 500, damping: 20 } }}
                    className={cn(
                      'grid aspect-square max-w-12 flex-1 place-items-center rounded-full text-xs font-extrabold',
                      premio ? 'border-2 border-dashed border-acento-borde bg-acento-suave text-acento-texto' : lleno ? 'bg-acento text-sobre-acento' : 'bg-superficie-2 text-suave',
                    )}
                  >
                    {premio ? <Gift className="size-4" aria-label={n.fidelidad.premio || 'Premio'} /> : lleno ? <Check className="size-4" strokeWidth={3} aria-hidden /> : i + 1}
                  </motion.li>
                )
              })}
            </ol>
            {sellos === meta && n.fidelidad.premio && (
              <p className="mt-3 text-sm font-semibold text-acento-texto">¡Completaste la tarjeta! Te toca: {n.fidelidad.premio}.</p>
            )}
          </motion.section>
        )}

        {catalogo.servicios.length > 0 && (
          <motion.section {...entrada(5)} aria-labelledby="t-serv-rap" className="col-span-2 rounded-grande bg-superficie p-4 ring-1 ring-linea">
            <h2 id="t-serv-rap" className="titulo text-base">Servicios</h2>
            <ul className="mt-2 divide-y divide-linea">
              {catalogo.servicios.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={!tomaTurnos}
                    onClick={() => abrirReserva({ servicioId: s.id })}
                    className="flex min-h-14 w-full items-center justify-between gap-3 py-2 text-left disabled:cursor-default"
                  >
                    <span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                        {s.nombre}
                        {s.etiqueta && <Etiqueta>{s.etiqueta}</Etiqueta>}
                      </span>
                      <span className="text-sm text-suave">{s.minutos} min{s.detalle ? ` · ${s.detalle}` : ''}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {s.precio > 0 && <span className="num font-bold">{precio(s.precio)}</span>}
                      {tomaTurnos && <ArrowRight className="size-4 text-suave" aria-hidden />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.section>
        )}

        {promos.length > 0 && (
          <motion.section {...entrada(6)} aria-labelledby="t-promos" className="col-span-2 flex flex-col gap-3">
            <h2 id="t-promos" className="titulo px-1 text-base">{n.promosTitulo || 'Promos'}</h2>
            {promos.map((p) => (
              <article key={p.titulo} className="rounded-grande bg-acento-suave p-4 ring-1 ring-acento-borde/50">
                {p.etiqueta && <Etiqueta className="bg-fondo/60">{p.etiqueta}</Etiqueta>}
                <p className="titulo mt-2 text-lg">{p.titulo}</p>
                {p.detalle && <p className="text-sm text-suave">{p.detalle}</p>}
              </article>
            ))}
          </motion.section>
        )}

        {n.direccion && (
          <motion.a
            {...entrada(7)}
            href={linkMapa(n.direccion)}
            target="_blank"
            rel="noreferrer"
            className={cn('flex min-h-28 flex-col justify-between rounded-grande bg-superficie p-4 ring-1 ring-linea', !n.whatsapp && 'col-span-2')}
          >
            <MapPin className="size-5 text-acento-texto" aria-hidden />
            <span>
              <span className="block text-sm font-bold">Cómo llegar</span>
              <span className="block text-xs text-suave">{n.direccion}</span>
            </span>
          </motion.a>
        )}
        {n.whatsapp && (
          <motion.a
            {...entrada(8)}
            href={linkWhatsApp(n.whatsapp)}
            target="_blank"
            rel="noreferrer"
            className={cn('flex min-h-28 flex-col justify-between rounded-grande bg-superficie p-4 ring-1 ring-linea', !n.direccion && 'col-span-2')}
          >
            <MessageCircle className="size-5 text-acento-texto" aria-hidden />
            <span>
              <span className="block text-sm font-bold">Escribinos</span>
              <span className="num block text-xs text-suave">{n.whatsapp}</span>
            </span>
          </motion.a>
        )}
      </div>
    </div>
  )
}
