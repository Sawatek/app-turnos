// Inicio de la app del cliente (demo). Mismo lenguaje que la app real (real/cliente/Inicio.tsx):
// talón "Próximo libre", lista de precios de mostrador, tarjeta de sellos y celdas separadas por líneas.
import { motion } from 'motion/react'
import { ArrowRight, Check, Gift, MapPin, MessageCircle, Repeat2, Zap } from 'lucide-react'
import { proximoLibre } from '@/dominio/horarios'
import { capitalizar, diaRelativo, horaCorta, precio } from '@/dominio/tiempo'
import { Etiqueta } from '@/ui/Insignia'
import { Talon } from '@/ui/Talon'
import { cn } from '@/ui/cn'
import { profesionalDe, servicioDe, useCliente } from './contexto'
import { Pase } from './Pase'

const entrada = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { delay: 0.04 * i, type: 'spring' as const, stiffness: 320, damping: 30 } },
})

/** Inclinación de cada sello de la tarjeta (a mano, ninguno igual al de al lado). */
const GIROS = [-8, 5, -3, 9, -6, 2, -10, 6]

export function Inicio() {
  const { n, e, ahora, abrirReserva, irA } = useCliente()
  const nombre = e.usuario?.nombre.split(' ')[0] ?? ''

  const mios = e.turnos.filter((t) => t.propio)
  const proximo = mios
    .filter((t) => (t.estado === 'pendiente' || t.estado === 'confirmado') && Date.parse(t.inicio) + t.minutos * 60_000 > ahora.getTime())
    .toSorted((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))[0]
  const ultimo = [...mios].toSorted((a, b) => Date.parse(b.creado) - Date.parse(a.creado))[0]

  // "Tiempo primero": el próximo horario libre del servicio más pedido, listo para reservar con un toque.
  const servicioBase = ultimo ? servicioDe(n, ultimo.servicioId) : (n.servicios.find((s) => s.etiqueta) ?? n.servicios[0])
  const libre = servicioBase ? proximoLibre({ negocio: n, servicioId: servicioBase.id, profesionalId: null, turnos: e.turnos, ahora }) : null

  const hora = Number(horaCorta(ahora).slice(0, 2))
  const saludo = hora < 6 ? 'Buenas noches' : hora < 13 ? 'Buen día' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'

  // Tarjeta de sellos: un sello por visita. Completa, se ve llena (el premio queda a la vista).
  const meta = Math.max(0, n.fidelidad.meta)
  const sellos = Math.min(e.sellos, meta)

  return (
    <div className="flex flex-col gap-5">
      <motion.header {...entrada(0)} className="pt-2">
        <p className="rotulo text-suave">{saludo},</p>
        <h1 className="mt-1 text-[2.75rem] leading-[0.95]">{nombre}</h1>
      </motion.header>

      {proximo && (
        <motion.section {...entrada(1)} aria-labelledby="t-prox">
          <h2 id="t-prox" className="rotulo mb-2 text-suave">Tu próximo turno</h2>
          <button type="button" className="block w-full rounded-grande text-left" onClick={() => irA('turnos')} aria-label="Ver mis turnos">
            <Pase n={n} t={proximo} ahora={ahora} compacto />
          </button>
        </motion.section>
      )}

      {/* Próximo libre: un talón listo para cortar. Es la forma más rápida de sacar turno. */}
      {libre && servicioBase && (
        <motion.section {...entrada(2)} aria-labelledby="t-libre">
          <Talon
            as="div"
            // Con un turno ya sacado, el protagonista es ese pase: el "próximo libre" baja la voz (papel común).
            papel={proximo ? 'superficie' : 'acento'}
            cuerpo={
              <div className="px-5 pt-4 pb-5">
                <p id="t-libre" className={cn('rotulo flex items-center gap-1.5', proximo ? 'text-acento-texto' : 'opacity-90')}>
                  <Zap className="size-3.5" aria-hidden />
                  Próximo libre
                </p>
                <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
                  <span className="titulo text-2xl">{capitalizar(diaRelativo(libre.inicio, ahora))}</span>
                  <span className={cn('cifra', proximo ? 'text-[3.25rem]' : 'text-[4.25rem]')}>{horaCorta(libre.inicio)}</span>
                </p>
                <p className="mt-2 font-semibold">
                  {servicioBase.nombre} con {profesionalDe(n, libre.profesionalId)?.nombre}
                </p>
                {servicioBase.precio > 0 && <p className={cn('mono mt-0.5 text-sm font-bold', proximo ? 'text-suave' : 'opacity-80')}>{precio(servicioBase.precio)}</p>}
              </div>
            }
            talon={
              <div className="flex gap-2 px-4 pt-3.5 pb-4">
                <button
                  type="button"
                  onClick={() => abrirReserva({ servicioId: servicioBase.id, profesionalId: libre.profesionalId, inicio: libre.inicio.toISOString() })}
                  className={cn(
                    'inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-medio font-bold transition-transform active:scale-[0.97]',
                    proximo ? 'bg-acento text-sobre-acento shadow-[inset_0_-3px_0_rgb(0_0_0/0.16)]' : 'bg-sobre-acento text-acento',
                  )}
                >
                  Reservar este
                  <ArrowRight className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => abrirReserva({ servicioId: servicioBase.id })}
                  className={cn(
                    'inline-flex h-12 items-center justify-center rounded-medio px-4 font-bold ring-inset transition-colors',
                    proximo ? 'ring-1 ring-linea hover:bg-superficie-2' : 'ring-2 ring-sobre-acento/40 hover:bg-sobre-acento/10',
                  )}
                >
                  Otro horario
                </button>
              </div>
            }
          />
        </motion.section>
      )}

      {ultimo && (
        <motion.div {...entrada(3)}>
          <button
            type="button"
            className="group flex min-h-14 w-full items-center gap-3 border-y border-linea py-3 text-left font-semibold"
            onClick={() => abrirReserva({ servicioId: ultimo.servicioId, profesionalId: ultimo.profesionalId })}
          >
            <Repeat2 className="size-5 shrink-0 text-acento-texto" aria-hidden />
            <span className="flex-1">
              Lo de siempre: {servicioDe(n, ultimo.servicioId)?.nombre} con {profesionalDe(n, ultimo.profesionalId)?.nombre}
            </span>
            <ArrowRight className="size-4 shrink-0 text-suave transition-transform group-hover:translate-x-0.5" aria-hidden />
          </button>
        </motion.div>
      )}

      {meta > 0 && (
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

      {n.servicios.length > 0 && (
        // Lista de precios de mostrador: nombre, puntitos guía y precio en letra de ticket.
        <motion.section {...entrada(5)} aria-labelledby="t-serv-rap">
          <h2 id="t-serv-rap" className="titulo border-b-2 border-texto pb-2 text-xl">Servicios</h2>
          <ul className="divide-y divide-linea">
            {n.servicios.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => abrirReserva({ servicioId: s.id })}
                  className="group flex min-h-16 w-full flex-col justify-center gap-0.5 py-3 text-left"
                >
                  <span className="flex w-full items-baseline gap-2">
                    <span className="font-semibold">{s.nombre}</span>
                    <span aria-hidden className={cn('mb-1 min-w-4 flex-1 border-b-2 border-dotted', s.precio > 0 ? 'border-linea' : 'border-transparent')} />
                    {s.precio > 0 && <span className="mono font-bold">{precio(s.precio)}</span>}
                    <ArrowRight className="size-4 shrink-0 self-center text-suave transition-transform group-hover:translate-x-0.5" aria-hidden />
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

      {n.promos.length > 0 && (
        <motion.section {...entrada(6)} aria-labelledby="t-promos" className="flex flex-col gap-3">
          <h2 id="t-promos" className="titulo border-b-2 border-texto pb-2 text-xl">{n.promosTitulo || 'Promos'}</h2>
          {n.promos.map((p) => (
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
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(n.direccion)}`}
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
              href={`https://wa.me/549${n.whatsapp.replace(/\D/g, '')}`}
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
