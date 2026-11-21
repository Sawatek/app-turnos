// Bloqueos: francos, vacaciones, feriados o un rato libre. Sin profesional = cierra todo el negocio.
// El dueño maneja todos; el profesional, solo los suyos (lo controla la base).
import { Lock } from 'lucide-react'
import { useState } from 'react'
import { borrarBloqueo, crearBloqueo, useProfesionales, useRefrescar, type Bloqueo } from '@/datos/real/panel'
import { capitalizar, claveDia, diaCorto, enHora, horaCorta, sumarDias } from '@/dominio/tiempo'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { Hoja } from '@/ui/Hoja'
import { cn } from '@/ui/cn'
import { BotonConfirmar, ErrorEnLinea, Interruptor, RAYADO, Selector, useAccion, usePanel } from './comunes'

const esMedianoche = (iso: string) => horaCorta(iso) === '00:00'

/** "Todo el día", "13:00 – 14:00", "Del lun 17 al vie 21"… */
export function textoBloqueo(b: Bloqueo, conDia: boolean) {
  const diasCompletos = esMedianoche(b.desde) && esMedianoche(b.hasta)
  const ultimo = new Date(Date.parse(b.hasta) - 1)
  if (diasCompletos) {
    if (claveDia(b.desde) === claveDia(ultimo)) return conDia ? `${capitalizar(diaCorto(b.desde))} · todo el día` : 'Todo el día'
    return `Del ${diaCorto(b.desde)} al ${diaCorto(ultimo)}`
  }
  if (claveDia(b.desde) === claveDia(ultimo)) return `${conDia ? `${capitalizar(diaCorto(b.desde))} · ` : ''}${horaCorta(b.desde)} – ${horaCorta(b.hasta)}`
  return `Del ${diaCorto(b.desde)} ${horaCorta(b.desde)} al ${diaCorto(b.hasta)} ${horaCorta(b.hasta)}`
}

/** ¿Puede este usuario borrar el bloqueo? (la base lo vuelve a chequear) */
export function useBloqueoPropio() {
  const { esDueno, acceso } = usePanel()
  return (b: Bloqueo) => esDueno || (!!b.profesionalId && b.profesionalId === acceso.profesionalId)
}

export function FilaBloqueo({ b, conDia }: { b: Bloqueo; conDia?: boolean }) {
  const { negocioId } = usePanel()
  const profs = useProfesionales(negocioId)
  const refrescar = useRefrescar(negocioId)
  const puede = useBloqueoPropio()(b)
  const accion = useAccion()
  const quien = b.profesionalId ? (profs.data?.find((p) => p.id === b.profesionalId)?.nombre ?? 'Profesional') : 'Todo el negocio'
  return (
    // Lo bloqueado se ve tachado (rayado), como en la libreta; el texto va sobre papel liso para que se lea.
    <li className="flex overflow-hidden rounded-medio bg-fondo ring-1 ring-inset ring-linea">
      <span aria-hidden className={cn('w-3.5 shrink-0 border-r border-linea', RAYADO)} />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 py-2 pr-2 pl-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-semibold">
            <Lock className="size-3.5 shrink-0 text-suave" aria-hidden />
            <span>
              Bloqueado · <span className="mono text-[0.9375rem] whitespace-nowrap">{textoBloqueo(b, !!conDia)}</span>
            </span>
          </p>
          <p className="truncate text-sm text-suave">
            {quien}
            {b.motivo ? ` · ${b.motivo}` : ''}
          </p>
          <ErrorEnLinea texto={accion.error} />
        </div>
        {puede && (
          <BotonConfirmar
            tamano="chico"
            texto="Quitar"
            confirmar="Sí, quitar"
            cargando={accion.ocupado}
            onConfirmar={() => void accion.correr(async () => {
              await borrarBloqueo(b.id)
              await refrescar('bloqueos')
              await refrescar('turnos')
            })}
          />
        )}
      </div>
    </li>
  )
}

export function HojaBloqueo({
  abierta,
  onCerrar,
  diaInicial,
  todoElDia = false,
  titulo = 'Bloquear horario',
}: {
  abierta: boolean
  onCerrar: () => void
  diaInicial: string
  todoElDia?: boolean
  titulo?: string
}) {
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo={titulo} descripcion="En ese rango no se van a poder sacar turnos.">
      <FormBloqueo diaInicial={diaInicial} todoElDiaInicial={todoElDia} onListo={onCerrar} />
    </Hoja>
  )
}

function FormBloqueo({ diaInicial, todoElDiaInicial, onListo }: { diaInicial: string; todoElDiaInicial: boolean; onListo: () => void }) {
  const { negocioId, esDueno, acceso } = usePanel()
  const profs = useProfesionales(negocioId)
  const refrescar = useRefrescar(negocioId)
  const accion = useAccion()
  const [profesional, setProfesional] = useState(esDueno ? '' : (acceso.profesionalId ?? ''))
  const [todoElDia, setTodoElDia] = useState(todoElDiaInicial)
  const [desdeDia, setDesdeDia] = useState(diaInicial)
  const [desdeHora, setDesdeHora] = useState('13:00')
  const [hastaDia, setHastaDia] = useState(diaInicial)
  const [hastaHora, setHastaHora] = useState('14:00')
  const [motivo, setMotivo] = useState('')
  const [errorRango, setErrorRango] = useState<string>()

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setErrorRango(undefined)
    if (!desdeDia || !hastaDia || (!todoElDia && (!desdeHora || !hastaHora))) return setErrorRango('Completá desde y hasta.')
    const desde = todoElDia ? enHora(desdeDia, '00:00') : enHora(desdeDia, desdeHora)
    const hasta = todoElDia ? enHora(sumarDias(hastaDia, 1), '00:00') : enHora(hastaDia, hastaHora)
    if (hasta <= desde) return setErrorRango('El final tiene que ser después del comienzo.')
    const listo = await accion.correr(async () => {
      await crearBloqueo(negocioId, { profesionalId: profesional || null, desde: desde.toISOString(), hasta: hasta.toISOString(), motivo: motivo.trim() || null })
      await refrescar('bloqueos')
      await refrescar('turnos')
    })
    if (listo) onListo()
  }

  const propio = profs.data?.find((p) => p.id === acceso.profesionalId)
  return (
    <form onSubmit={enviar} className="flex flex-col gap-4 pb-2" noValidate>
      {esDueno ? (
        <Selector etiqueta="Para quién" value={profesional} onChange={(e) => setProfesional(e.target.value)}>
          <option value="">Todo el negocio</option>
          {profs.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </Selector>
      ) : (
        <p className="text-sm text-suave">
          Bloqueo de tu agenda{propio ? ` (${propio.nombre})` : ''}.
        </p>
      )}
      <Interruptor etiqueta="Todo el día" ayuda="Para francos, vacaciones o feriados." activo={todoElDia} onCambiar={setTodoElDia} />
      <div className="grid grid-cols-2 gap-3">
        <Campo
          etiqueta="Desde el día"
          type="date"
          value={desdeDia}
          onChange={(e) => {
            setDesdeDia(e.target.value)
            if (e.target.value > hastaDia) setHastaDia(e.target.value)
          }}
        />
        {!todoElDia && <Campo etiqueta="Desde la hora" type="time" step={300} value={desdeHora} onChange={(e) => setDesdeHora(e.target.value)} />}
        <Campo etiqueta="Hasta el día" type="date" value={hastaDia} min={desdeDia} onChange={(e) => setHastaDia(e.target.value)} />
        {!todoElDia && <Campo etiqueta="Hasta la hora" type="time" step={300} value={hastaHora} onChange={(e) => setHastaHora(e.target.value)} />}
      </div>
      <ErrorEnLinea texto={errorRango} />
      <Campo etiqueta="Motivo (opcional, privado)" maxLength={120} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: vacaciones, trámite" />
      <ErrorEnLinea texto={accion.error} />
      <Boton type="submit" tamano="grande" cargando={accion.ocupado}>
        Bloquear
      </Boton>
    </form>
  )
}
