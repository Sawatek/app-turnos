import { motion } from 'motion/react'
import { ArrowRight, Check, Gift, MapPin, MessageCircle, Repeat2, Zap } from 'lucide-react'
import { proximoLibre } from '@/dominio/horarios'
import { capitalizar, diaRelativo, horaCorta, precio } from '@/dominio/tiempo'
import { Boton } from '@/ui/Boton'
import { Etiqueta } from '@/ui/Insignia'
import { cn } from '@/ui/cn'
import { profesionalDe, servicioDe, useCliente } from './contexto'
import { Pase } from './Pase'

const entrada = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { delay: 0.04 * i, type: 'spring' as const, stiffness: 320, damping: 30 } },
})

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

  return (
    <div className="flex flex-col gap-4">
      <motion.header {...entrada(0)} className="pt-1">
        <p className="text-sm font-semibold text-suave">{saludo},</p>
        <h1 className="text-3xl">{nombre}</h1>
      </motion.header>

      {proximo && (
        <motion.section {...entrada(1)} aria-labelledby="t-prox">
          <h2 id="t-prox" className="sr-only">Tu próximo turno</h2>
          <button type="button" className="block w-full text-left" onClick={() => irA('turnos')} aria-label="Ver mis turnos">
            <Pase n={n} t={proximo} ahora={ahora} compacto />
          </button>
        </motion.section>
      )}

      {/* Próximo libre */}
      {libre && servicioBase && (
        <motion.section
          {...entrada(2)}
          aria-labelledby="t-libre"
          className="relative overflow-hidden rounded-grande bg-acento p-5 text-sobre-acento sombra-suave"
        >
          <div className="pointer-events-none absolute -top-16 -right-12 size-48 rounded-full bg-sobre-acento/10" aria-hidden />
          <p id="t-libre" className="flex items-center gap-1.5 text-sm font-bold opacity-90">
            <Zap className="size-4" aria-hidden />
            Próximo libre
          </p>
          <p className="titulo num mt-1 text-4xl">
            {capitalizar(diaRelativo(libre.inicio, ahora))} {horaCorta(libre.inicio)}
          </p>
          <p className="mt-0.5 font-semibold opacity-90">
            {servicioBase.nombre} con {profesionalDe(n, libre.profesionalId)?.nombre}
            {servicioBase.precio ? ` · ${precio(servicioBase.precio)}` : ''}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => abrirReserva({ servicioId: servicioBase.id, profesionalId: libre.profesionalId, inicio: libre.inicio.toISOString() })}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-medio bg-sobre-acento font-bold text-acento transition-transform active:scale-[0.97]"
            >
              Reservar este
              <ArrowRight className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => abrirReserva({ servicioId: servicioBase.id })}
              className="inline-flex h-12 items-center justify-center rounded-medio px-4 font-bold ring-2 ring-sobre-acento/35 transition-colors hover:bg-sobre-acento/10"
            >
              Otro horario
            </button>
          </div>
        </motion.section>
      )}

      {ultimo && (
        <motion.div {...entrada(3)}>
          <Boton
            variante="secundario"
            ancho
            tamano="grande"
            className="justify-start"
            onClick={() => abrirReserva({ servicioId: ultimo.servicioId, profesionalId: ultimo.profesionalId })}
          >
            <Repeat2 className="size-5 text-acento-texto" aria-hidden />
            <span className="flex-1 text-left">
              Lo de siempre: {servicioDe(n, ultimo.servicioId)?.nombre} con {profesionalDe(n, ultimo.profesionalId)?.nombre}
            </span>
          </Boton>
        </motion.div>
      )}

      {/* Grid bento */}
      <div className="grid grid-cols-2 gap-3">
        <motion.section {...entrada(4)} aria-labelledby="t-fid" className="col-span-2 rounded-grande bg-superficie p-4 ring-1 ring-linea">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="t-fid" className="titulo text-base">Tu tarjeta</h2>
            <span className="num text-sm font-bold text-acento-texto">
              {Math.min(e.sellos, n.fidelidad.meta)}/{n.fidelidad.meta}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-suave">{n.fidelidad.texto}</p>
          <ol className="mt-3 flex gap-2" aria-label={`${e.sellos} de ${n.fidelidad.meta} sellos`}>
            {Array.from({ length: n.fidelidad.meta + 1 }, (_, i) => {
              const premio = i === n.fidelidad.meta
              const lleno = i < e.sellos
              return (
                <motion.li
                  key={i}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, transition: { delay: 0.2 + i * 0.05, type: 'spring', stiffness: 500, damping: 20 } }}
                  className={cn(
                    'grid aspect-square flex-1 place-items-center rounded-full text-xs font-extrabold',
                    premio ? 'border-2 border-dashed border-acento-borde bg-acento-suave text-acento-texto' : lleno ? 'bg-acento text-sobre-acento' : 'bg-superficie-2 text-suave',
                  )}
                >
                  {premio ? <Gift className="size-4" aria-label={n.fidelidad.premio} /> : lleno ? <Check className="size-4" strokeWidth={3} aria-hidden /> : i + 1}
                </motion.li>
              )
            })}
          </ol>
        </motion.section>

        <motion.section {...entrada(5)} aria-labelledby="t-serv-rap" className="col-span-2 rounded-grande bg-superficie p-4 ring-1 ring-linea">
          <h2 id="t-serv-rap" className="titulo text-base">Servicios</h2>
          <ul className="mt-2 divide-y divide-linea">
            {n.servicios.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => abrirReserva({ servicioId: s.id })} className="flex min-h-14 w-full items-center justify-between gap-3 py-2 text-left">
                  <span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                      {s.nombre}
                      {s.etiqueta && <Etiqueta>{s.etiqueta}</Etiqueta>}
                    </span>
                    <span className="text-sm text-suave">{s.minutos} min</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {s.precio > 0 && <span className="num font-bold">{precio(s.precio)}</span>}
                    <ArrowRight className="size-4 text-suave" aria-hidden />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.section {...entrada(6)} aria-labelledby="t-promos" className="col-span-2 flex flex-col gap-3">
          <h2 id="t-promos" className="titulo px-1 text-base">{n.promosTitulo}</h2>
          {n.promos.map((p) => (
            <article key={p.titulo} className="rounded-grande bg-acento-suave p-4 ring-1 ring-acento-borde/50">
              <Etiqueta className="bg-fondo/60">{p.etiqueta}</Etiqueta>
              <p className="titulo mt-2 text-lg">{p.titulo}</p>
              <p className="text-sm text-suave">{p.detalle}</p>
            </article>
          ))}
        </motion.section>

        <motion.a
          {...entrada(7)}
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(n.direccion)}`}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-28 flex-col justify-between rounded-grande bg-superficie p-4 ring-1 ring-linea"
        >
          <MapPin className="size-5 text-acento-texto" aria-hidden />
          <span>
            <span className="block text-sm font-bold">Cómo llegar</span>
            <span className="block text-xs text-suave">{n.direccion}</span>
          </span>
        </motion.a>
        <motion.a
          {...entrada(8)}
          href={`https://wa.me/549${n.whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-28 flex-col justify-between rounded-grande bg-superficie p-4 ring-1 ring-linea"
        >
          <MessageCircle className="size-5 text-acento-texto" aria-hidden />
          <span>
            <span className="block text-sm font-bold">Escribinos</span>
            <span className="num block text-xs text-suave">{n.whatsapp}</span>
          </span>
        </motion.a>
      </div>
    </div>
  )
}
