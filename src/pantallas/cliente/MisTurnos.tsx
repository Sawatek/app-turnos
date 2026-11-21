import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useDemo } from '@/datos/demo'
import { capitalizar, diaCorto, horaCorta } from '@/dominio/tiempo'
import type { Turno } from '@/dominio/tipos'
import { Boton } from '@/ui/Boton'
import { Hoja } from '@/ui/Hoja'
import { cn } from '@/ui/cn'
import { profesionalDe, servicioDe, useCliente } from './contexto'
import { numeroDeTalon, Pase } from './Pase'

const TEXTO_ESTADO: Record<Turno['estado'], string> = {
  confirmado: 'Vino',
  pendiente: 'Vino',
  asistio: 'Vino',
  falto: 'No vino',
  cancelado: 'Cancelado',
}

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
      <header className="pt-2">
        <p className="rotulo text-suave">{proximos.length ? `${proximos.length} por venir` : 'Nada por venir'}</p>
        <h1 className="mt-1 text-[2.75rem] leading-[0.95]">Mis turnos</h1>
      </header>

      {proximos.length === 0 ? (
        // Hoja en blanco del talonario: recuadro punteado sobre cuadrícula, esperando el primer turno.
        <div className="cuadricula flex flex-col items-start gap-1 rounded-grande border border-dashed border-linea p-6">
          <p className="titulo text-xl">No tenés turnos próximos</p>
          <p className="text-sm text-suave">Reservá en menos de 20 segundos.</p>
          <Boton onClick={() => abrirReserva()} className="mt-4">
            <Plus className="size-4" strokeWidth={2.75} aria-hidden />
            {n.textos.reservar}
          </Boton>
        </div>
      ) : (
        <section aria-labelledby="t-prox" className="flex flex-col gap-5">
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
        // Historial como la libreta del mostrador: una línea por turno, el estado en letra de ticket (sin sellos: uno solo por pantalla).
        <section aria-labelledby="t-hist">
          <h2 id="t-hist" className="titulo border-b-2 border-texto pb-2 text-xl">Historial</h2>
          <ul className="divide-y divide-linea">
            {historial.map((t) => {
              const estado = t.estado === 'pendiente' || t.estado === 'confirmado' ? 'asistio' : t.estado
              return (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <div className="w-16 shrink-0">
                    <p className="cifra text-2xl">{horaCorta(t.inicio)}</p>
                    <p className="rotulo mt-1 text-suave">{capitalizar(diaCorto(t.inicio))}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate font-semibold', estado === 'cancelado' && 'text-suave line-through')}>{servicioDe(n, t.servicioId)?.nombre}</p>
                    <p className="truncate text-sm text-suave">
                      con {profesionalDe(n, t.profesionalId)?.nombre} · <span className="mono text-[0.8125rem]">N.º {numeroDeTalon(t.id)}</span>
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rotulo shrink-0',
                      estado === 'cancelado' || estado === 'falto' ? 'text-peligro' : 'text-suave',
                    )}
                  >
                    {TEXTO_ESTADO[estado]}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <Hoja abierta={!!cancelando} onCerrar={() => setCancelando(undefined)} titulo="¿Cancelar el turno?">
        {cancelando && (
          <div className="flex flex-col gap-4 pb-2">
            <div className="flex items-center gap-4 border-y border-linea py-4">
              <div className="shrink-0">
                <p className="rotulo text-suave">{capitalizar(diaCorto(cancelando.inicio))}</p>
                <p className="cifra mt-1 text-5xl">{horaCorta(cancelando.inicio)}</p>
              </div>
              <p className="min-w-0 flex-1 text-[15px]">
                {servicioDe(n, cancelando.servicioId)?.nombre} con {profesionalDe(n, cancelando.profesionalId)?.nombre}.
                {cancelando.senaPagada > 0 && ' La seña queda a favor para tu próximo turno.'}
              </p>
            </div>
            <p className="text-sm text-suave">Si cancelás, el horario queda libre para otra persona.</p>
            <Boton variante="secundario" tamano="grande" onClick={() => { const t = cancelando; setCancelando(undefined); abrirReserva({ reprograma: t }) }}>
              Mejor cambiarlo de horario
            </Boton>
            <Boton variante="peligro" tamano="grande" className="ring-1 ring-inset ring-peligro/40" onClick={confirmarCancelacion}>
              Sí, cancelar
            </Boton>
          </div>
        )}
      </Hoja>
    </div>
  )
}
