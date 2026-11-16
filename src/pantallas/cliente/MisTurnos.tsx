import { CalendarPlus, CalendarX2 } from 'lucide-react'
import { useState } from 'react'
import { useDemo } from '@/datos/demo'
import { capitalizar, diaCorto, horaCorta } from '@/dominio/tiempo'
import type { Turno } from '@/dominio/tipos'
import { Boton } from '@/ui/Boton'
import { Hoja } from '@/ui/Hoja'
import { InsigniaEstado } from '@/ui/Insignia'
import { profesionalDe, servicioDe, useCliente } from './contexto'
import { Pase } from './Pase'

export function MisTurnos() {
  const { n, e, ahora, abrirReserva } = useCliente()
  const cambiarEstado = useDemo((s) => s.cambiarEstado)
  const avisar = useDemo((s) => s.avisar)
  const [cancelando, setCancelando] = useState<Turno>()

  const mios = e.turnos.filter((t) => t.propio)
  const vigente = (t: Turno) => (t.estado === 'pendiente' || t.estado === 'confirmado') && Date.parse(t.inicio) + t.minutos * 60_000 > ahora.getTime()
  const proximos = mios.filter(vigente).toSorted((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))
  const historial = mios.filter((t) => !vigente(t)).toSorted((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio))

  const confirmarCancelacion = () => {
    if (!cancelando) return
    cambiarEstado(n.slug, cancelando.id, 'cancelado')
    avisar(n.slug, {
      tipo: 'sistema',
      canal: 'push',
      texto: `Cancelaste tu turno de las ${horaCorta(cancelando.inicio)}. El horario queda libre para otra persona. ¡Gracias por avisar!`,
    })
    setCancelando(undefined)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="pt-1 text-3xl">Mis turnos</h1>

      {proximos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-grande bg-superficie px-6 py-10 text-center ring-1 ring-linea">
          <CalendarPlus className="size-10 text-acento-texto" aria-hidden />
          <p className="font-semibold">No tenés turnos próximos</p>
          <p className="text-sm text-suave">Reservá en menos de 20 segundos.</p>
          <Boton onClick={() => abrirReserva()} className="mt-2">{n.textos.reservar}</Boton>
        </div>
      ) : (
        <section aria-labelledby="t-prox" className="flex flex-col gap-4">
          <h2 id="t-prox" className="sr-only">Próximos</h2>
          {proximos.map((t) => (
            <Pase
              key={t.id}
              n={n}
              t={t}
              ahora={ahora}
              acciones={
                <>
                  {t.estado === 'pendiente' && (
                    <Boton tamano="chico" onClick={() => cambiarEstado(n.slug, t.id, 'confirmado')}>
                      Confirmar asistencia
                    </Boton>
                  )}
                  <Boton tamano="chico" variante="secundario" onClick={() => abrirReserva({ reprograma: t })}>
                    Cambiar horario
                  </Boton>
                  <Boton tamano="chico" variante="peligro" onClick={() => setCancelando(t)}>
                    Cancelar
                  </Boton>
                </>
              }
            />
          ))}
        </section>
      )}

      {historial.length > 0 && (
        <section aria-labelledby="t-hist">
          <h2 id="t-hist" className="titulo mb-2 text-lg">Historial</h2>
          <ul className="divide-y divide-linea rounded-grande bg-superficie px-4 ring-1 ring-linea">
            {historial.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{servicioDe(n, t.servicioId)?.nombre} · {profesionalDe(n, t.profesionalId)?.nombre}</p>
                  <p className="num text-sm text-suave">{capitalizar(diaCorto(t.inicio))} · {horaCorta(t.inicio)}</p>
                </div>
                <InsigniaEstado estado={t.estado === 'pendiente' || t.estado === 'confirmado' ? 'asistio' : t.estado} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <Hoja abierta={!!cancelando} onCerrar={() => setCancelando(undefined)} titulo="¿Cancelar el turno?">
        {cancelando && (
          <div className="flex flex-col gap-4 pb-2">
            <div className="flex items-center gap-3 rounded-medio bg-superficie p-4 ring-1 ring-linea">
              <CalendarX2 className="size-6 shrink-0 text-peligro" aria-hidden />
              <p className="text-[15px]">
                {servicioDe(n, cancelando.servicioId)?.nombre} del {diaCorto(cancelando.inicio)} a las <b className="num">{horaCorta(cancelando.inicio)}</b>.
                {cancelando.senaPagada > 0 && ' La seña queda a favor para tu próximo turno.'}
              </p>
            </div>
            <Boton variante="secundario" tamano="grande" onClick={() => { const t = cancelando; setCancelando(undefined); abrirReserva({ reprograma: t }) }}>
              Mejor cambiarlo de horario
            </Boton>
            <Boton variante="peligro" tamano="grande" className="ring-1 ring-peligro/40" onClick={confirmarCancelacion}>
              Sí, cancelar
            </Boton>
          </div>
        )}
      </Hoja>
    </div>
  )
}
