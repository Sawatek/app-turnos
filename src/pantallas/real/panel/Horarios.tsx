// Horarios: semana de cada profesional (varias franjas por día, ej. 9–13 y 14–20) y francos/vacaciones.
import { CalendarOff, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { guardarHorarios, useBloqueos, useHorarios, useProfesionales, useRefrescar, type Franja, type Horario } from '@/datos/real/panel'
import { claveDia, minutosDe } from '@/dominio/tiempo'
import { Boton } from '@/ui/Boton'
import { cn } from '@/ui/cn'
import { FilaBloqueo, HojaBloqueo } from './Bloqueos'
import { Cargando, DIAS, Encabezado, ErrorEnLinea, Exito, FalloCarga, SEMANA, Tarjeta, Vacio, hhmm, useAccion, usePanel } from './comunes'

export function Horarios() {
  const { negocioId } = usePanel()
  const profs = useProfesionales(negocioId)
  const horarios = useHorarios(negocioId)
  const [elegido, setElegido] = useState<string | null>(null)
  const lista = profs.data ?? []
  const profId = lista.some((p) => p.id === elegido) ? elegido! : (lista[0]?.id ?? null)

  return (
    <div className="flex flex-col gap-4">
      <Encabezado titulo="Horarios" bajada="En qué días y horarios atiende cada profesional. Si corta al mediodía, agregá dos franjas." />

      {profs.isPending || horarios.isPending ? (
        <Cargando />
      ) : profs.isError || horarios.isError ? (
        <FalloCarga error={profs.error ?? horarios.error} onReintentar={() => void Promise.all([profs.refetch(), horarios.refetch()])} />
      ) : !profId ? (
        <Vacio>Primero cargá un profesional en la sección Equipo.</Vacio>
      ) : (
        <>
          {lista.length > 1 && (
            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">Elegir profesional</legend>
              {lista.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={p.id === profId}
                  onClick={() => setElegido(p.id)}
                  className={cn(
                    'h-11 rounded-full px-4 text-sm font-semibold transition-colors',
                    p.id === profId ? 'bg-texto text-fondo' : 'bg-superficie text-suave ring-1 ring-linea hover:text-texto',
                  )}
                >
                  {p.nombre}
                </button>
              ))}
            </fieldset>
          )}
          <Editor key={profId} profesionalId={profId} nombre={lista.find((p) => p.id === profId)!.nombre} inicial={horarios.data.filter((h) => h.profesional_id === profId)} />
        </>
      )}

      <Francos />
    </div>
  )
}

type FranjaEditable = Franja & { clave: number }
let siguienteClave = 0
const conClave = (f: Franja): FranjaEditable => ({ ...f, clave: siguienteClave++ })

function validar(franjas: FranjaEditable[]): Record<number, string> {
  const errores: Record<number, string> = {}
  for (const dia of SEMANA) {
    const delDia = franjas.filter((f) => f.dia === dia).toSorted((a, b) => a.desde.localeCompare(b.desde))
    if (delDia.some((f) => !f.desde || !f.hasta)) errores[dia] = 'Completá desde y hasta.'
    else if (delDia.some((f) => minutosDe(f.hasta) <= minutosDe(f.desde))) errores[dia] = 'Cada franja tiene que terminar después de empezar.'
    else if (delDia.some((f, i) => i > 0 && minutosDe(f.desde) < minutosDe(delDia[i - 1]!.hasta))) errores[dia] = 'Las franjas de este día se pisan.'
  }
  return errores
}

function Editor({ profesionalId, nombre, inicial }: { profesionalId: string; nombre: string; inicial: Horario[] }) {
  const { negocioId } = usePanel()
  const refrescar = useRefrescar(negocioId)
  const accion = useAccion()
  const [franjas, setFranjas] = useState<FranjaEditable[]>(() => inicial.map((h) => conClave({ dia: h.dia, desde: hhmm(h.desde), hasta: hhmm(h.hasta) })))
  const [errores, setErrores] = useState<Record<number, string>>({})
  const [guardado, setGuardado] = useState(false)

  const cambiar = (clave: number, cambios: Partial<Franja>) => {
    setGuardado(false)
    setFranjas((l) => l.map((f) => (f.clave === clave ? { ...f, ...cambios } : f)))
  }
  const agregar = (dia: number) => {
    setGuardado(false)
    setFranjas((l) => {
      const ultima = l.filter((f) => f.dia === dia).toSorted((a, b) => b.hasta.localeCompare(a.hasta))[0]
      const desde = ultima ? ultima.hasta : '09:00'
      const finMin = Math.min(minutosDe(desde) + 240, 23 * 60 + 55)
      const hasta = `${String(Math.floor(finMin / 60)).padStart(2, '0')}:${String(finMin % 60).padStart(2, '0')}`
      return [...l, conClave({ dia, desde, hasta: ultima ? hasta : '13:00' })]
    })
  }
  const quitar = (clave: number) => {
    setGuardado(false)
    setFranjas((l) => l.filter((f) => f.clave !== clave))
  }

  const guardar = async () => {
    const e = validar(franjas)
    setErrores(e)
    setGuardado(false)
    if (Object.keys(e).length) return
    const listo = await accion.correr(async () => {
      await guardarHorarios(
        profesionalId,
        franjas.map(({ dia, desde, hasta }) => ({ dia, desde, hasta })),
      )
      await Promise.all([refrescar('horarios'), refrescar('turnos')])
    })
    setGuardado(listo)
  }

  return (
    <Tarjeta titulo={`Semana de ${nombre}`}>
      <ul className="flex flex-col divide-y divide-linea">
        {SEMANA.map((dia) => {
          const delDia = franjas.filter((f) => f.dia === dia)
          return (
            <li key={dia} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-4" aria-label={DIAS[dia]}>
              <p className="w-28 shrink-0 pt-2.5 font-semibold">{DIAS[dia]}</p>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {delDia.length === 0 && <p className="pt-2.5 text-sm text-suave">Cerrado</p>}
                {delDia.map((f, i) => (
                  <div key={f.clave} className="flex items-center gap-2">
                    <input
                      type="time"
                      step={300}
                      aria-label={`${DIAS[dia]}, franja ${i + 1}: desde`}
                      value={f.desde}
                      onChange={(e) => cambiar(f.clave, { desde: e.target.value })}
                      className="num h-11 min-w-0 max-w-40 flex-1 rounded-medio border border-linea bg-superficie px-2.5 text-[16px] outline-none focus:border-acento"
                    />
                    <span className="text-suave" aria-hidden>
                      a
                    </span>
                    <input
                      type="time"
                      step={300}
                      aria-label={`${DIAS[dia]}, franja ${i + 1}: hasta`}
                      value={f.hasta}
                      onChange={(e) => cambiar(f.clave, { hasta: e.target.value })}
                      className="num h-11 min-w-0 max-w-40 flex-1 rounded-medio border border-linea bg-superficie px-2.5 text-[16px] outline-none focus:border-acento"
                    />
                    <button
                      type="button"
                      onClick={() => quitar(f.clave)}
                      className="grid size-11 shrink-0 place-items-center rounded-full text-suave hover:bg-peligro/10 hover:text-peligro"
                      aria-label={`Quitar franja ${i + 1} del ${DIAS[dia].toLowerCase()}`}
                    >
                      <Trash2 className="size-4.5" aria-hidden />
                    </button>
                  </div>
                ))}
                <ErrorEnLinea texto={errores[dia]} />
              </div>
              <Boton variante="fantasma" tamano="chico" className="h-11 self-start" onClick={() => agregar(dia)} aria-label={`Agregar franja al ${DIAS[dia].toLowerCase()}`}>
                <Plus className="size-4" aria-hidden />
                Franja
              </Boton>
            </li>
          )
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-linea pt-4">
        <Boton cargando={accion.ocupado} onClick={() => void guardar()}>
          Guardar horarios
        </Boton>
        <Exito texto={guardado ? 'Horarios guardados' : undefined} />
        <ErrorEnLinea texto={accion.error} />
      </div>
    </Tarjeta>
  )
}

function Francos() {
  const { negocioId } = usePanel()
  const [abierta, setAbierta] = useState(false)
  const [hoy] = useState(() => claveDia(new Date()))
  const [rango] = useState(() => {
    const ahora = Date.now()
    return { desde: new Date(ahora).toISOString(), hasta: new Date(ahora + 400 * 86_400_000).toISOString() }
  })
  const bloqueos = useBloqueos(negocioId, rango.desde, rango.hasta)
  return (
    <Tarjeta titulo="Francos, vacaciones y feriados">
      <div className="flex flex-col gap-3">
        {bloqueos.isPending ? (
          <Cargando />
        ) : bloqueos.isError ? (
          <FalloCarga error={bloqueos.error} onReintentar={() => void bloqueos.refetch()} />
        ) : bloqueos.data.length === 0 ? (
          <p className="text-sm text-suave">No hay días bloqueados por delante.</p>
        ) : (
          <ul className="-mx-4 divide-y divide-linea" aria-label="Bloqueos próximos">
            {bloqueos.data.map((b) => (
              <FilaBloqueo key={b.id} b={b} conDia />
            ))}
          </ul>
        )}
        <Boton variante="secundario" className="self-start" onClick={() => setAbierta(true)}>
          <CalendarOff className="size-4" aria-hidden />
          Agregar franco o vacaciones
        </Boton>
      </div>
      <HojaBloqueo abierta={abierta} onCerrar={() => setAbierta(false)} diaInicial={hoy} todoElDia titulo="Franco o vacaciones" />
    </Tarjeta>
  )
}
