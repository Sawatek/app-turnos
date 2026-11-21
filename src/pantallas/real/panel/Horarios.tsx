// Horarios: semana de cada profesional (varias franjas por día, ej. 9–13 y 14–20) y francos/vacaciones.
import { CalendarOff, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { guardarHorarios, useBloqueos, useHorarios, useProfesionales, useRefrescar, type Franja, type Horario } from '@/datos/real/panel'
import { claveDia, minutosDe } from '@/dominio/tiempo'
import { Boton } from '@/ui/Boton'
import { claseControl } from '@/ui/Campo'
import { Pastillas } from '@/ui/Pastillas'
import { cn } from '@/ui/cn'
import { FilaBloqueo, HojaBloqueo } from './Bloqueos'
import { Cargando, DIAS, Encabezado, ErrorEnLinea, Exito, FalloCarga, RAYADO, SEMANA, Tarjeta, Vacio, hhmm, useAccion, usePanel } from './comunes'

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
            <Pastillas
              etiqueta="Elegir profesional"
              ocultarEtiqueta
              valor={profId}
              opciones={lista.map((p) => ({ id: p.id, texto: p.nombre }))}
              onCambiar={setElegido}
            />
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

  // Escala de la planilla: de la primera a la última hora que se atiende en la semana (mínimo 9 a 20).
  const validas = franjas.filter((f) => /^\d\d:\d\d$/.test(f.desde) && /^\d\d:\d\d$/.test(f.hasta) && f.hasta > f.desde)
  const hMin = Math.min(9, ...validas.map((f) => Math.floor(minutosDe(f.desde) / 60)))
  const hMax = Math.max(20, ...validas.map((f) => Math.ceil(minutosDe(f.hasta) / 60)))
  const horas = Array.from({ length: hMax - hMin + 1 }, (_, i) => hMin + i)
  const pos = (hora: string) => ((minutosDe(hora) - hMin * 60) / ((hMax - hMin) * 60)) * 100

  return (
    <Tarjeta titulo={`Semana de ${nombre}`}>
      {/* Escala de horas de la planilla (decorativa: cada día dice sus horarios en los campos). */}
      <div aria-hidden className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
        <span className="max-sm:hidden" />
        <div className="relative h-4">
          {horas.map((h, i) => (
            <span
              key={h}
              className={cn('mono absolute -translate-x-1/2 text-xs text-suave', i % 2 === 1 && 'max-sm:hidden')}
              style={{ left: `${(i / (horas.length - 1)) * 100}%` }}
            >
              {String(h).padStart(2, '0')}
            </span>
          ))}
        </div>
      </div>
      <ul className="mt-2 flex flex-col border-t border-texto">
        {SEMANA.map((dia) => {
          const delDia = franjas.filter((f) => f.dia === dia)
          const dibujables = validas.filter((f) => f.dia === dia)
          return (
            <li key={dia} className="grid grid-cols-[minmax(0,1fr)] gap-x-3 border-b border-linea py-3 sm:grid-cols-[7rem_minmax(0,1fr)]" aria-label={DIAS[dia]}>
              <div className="flex items-center justify-between gap-1 sm:flex-col sm:items-start sm:justify-start">
                <p className="titulo text-lg leading-tight">{DIAS[dia]}</p>
                <Boton variante="fantasma" tamano="chico" className="-mr-2 sm:-ml-2" onClick={() => agregar(dia)} aria-label={`Agregar franja al ${DIAS[dia].toLowerCase()}`}>
                  <Plus className="size-4" aria-hidden />
                  Franja
                </Boton>
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                {/* La franja dibujada en la planilla: tinta donde atiende; rayado si está cerrado. */}
                <div
                  aria-hidden
                  className={cn('relative mt-1.5 h-3.5 ring-1 ring-inset ring-linea', dibujables.length ? 'bg-superficie-2' : RAYADO)}
                  style={{ backgroundImage: dibujables.length ? `repeating-linear-gradient(to right, transparent 0 calc(${100 / (horas.length - 1)}% - 1px), var(--t-linea) 0 ${100 / (horas.length - 1)}%)` : undefined }}
                >
                  {dibujables.map((f) => (
                    <span key={f.clave} className="absolute inset-y-0 bg-acento" style={{ left: `${pos(f.desde)}%`, width: `${pos(f.hasta) - pos(f.desde)}%` }} />
                  ))}
                </div>
                {delDia.length === 0 && <p className="rotulo text-suave">Cerrado</p>}
                {delDia.map((f, i) => (
                  <div key={f.clave} className="flex items-center gap-2">
                    <input
                      type="time"
                      step={300}
                      aria-label={`${DIAS[dia]}, franja ${i + 1}: desde`}
                      value={f.desde}
                      onChange={(e) => cambiar(f.clave, { desde: e.target.value })}
                      className={cn(claseControl, 'num h-11 min-w-0 max-w-40 flex-1 px-2.5 text-[16px]')}
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
                      className={cn(claseControl, 'num h-11 min-w-0 max-w-40 flex-1 px-2.5 text-[16px]')}
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
            </li>
          )
        })}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
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
          <ul className="flex flex-col gap-2" aria-label="Bloqueos próximos">
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
