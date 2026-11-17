// Reportes: los números de una semana, un mes o un rango. Turnos, asistencia, faltas, cancelaciones,
// confirmación, facturación estimada, por profesional y por servicio, clientes nuevos y recurrentes,
// horas y días más pedidos, y calificaciones (si están disponibles). Se exporta a CSV en el navegador.
// El profesional ve solo lo suyo (lo hace cumplir panel_reporte en la base).
import { ChevronLeft, ChevronRight, Download, Star } from 'lucide-react'
import { useState } from 'react'
import { useProfesionales } from '@/datos/real/panel'
import { porcentaje, reporteACsv, useReporte, type Reporte } from '@/datos/real/panel-gestion'
import { capitalizar, claveDia, diaCorto, diaSemana, enHora, precio, precioCorto, sumarDias } from '@/dominio/tiempo'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { cn } from '@/ui/cn'
import { Cargando, DIAS, Encabezado, ErrorEnLinea, FalloCarga, Selector, Tarjeta, Vacio, usePanel } from './comunes'

type Modo = 'semana' | 'mes' | 'rango'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const lunesDe = (dia: string) => sumarDias(dia, -((diaSemana(enHora(dia, '12:00')) + 6) % 7))
const primeroDeMes = (dia: string) => `${dia.slice(0, 8)}01`
function sumarMeses(dia: string, n: number) {
  const [y, m] = dia.split('-').map(Number) as [number, number]
  const total = y * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-01`
}
const diaYMes = (dia: string) => `${Number(dia.slice(8))} de ${MESES[Number(dia.slice(5, 7)) - 1]}`

/** [desde, hasta] del período elegido, y cómo se llama. */
function periodo(modo: Modo, ancla: string, desde: string, hasta: string) {
  if (modo === 'semana') {
    const d = lunesDe(ancla)
    const h = sumarDias(d, 6)
    return { desde: d, hasta: h, nombre: `Semana del ${diaYMes(d)} al ${diaYMes(h)}` }
  }
  if (modo === 'mes') {
    const d = primeroDeMes(ancla)
    return { desde: d, hasta: sumarDias(sumarMeses(d, 1), -1), nombre: `${capitalizar(MESES[Number(d.slice(5, 7)) - 1]!)} ${d.slice(0, 4)}` }
  }
  return { desde, hasta, nombre: desde && hasta ? `Del ${diaYMes(desde)} al ${diaYMes(hasta)}` : 'Elegí las fechas' }
}

export function Reportes() {
  const { n, negocioId, esDueno } = usePanel()
  const [hoy] = useState(() => claveDia(new Date()))
  const [modo, setModo] = useState<Modo>('semana')
  const [ancla, setAncla] = useState(hoy)
  const [desde, setDesde] = useState(() => sumarDias(hoy, -29))
  const [hasta, setHasta] = useState(hoy)
  const [profesional, setProfesional] = useState('')
  const profs = useProfesionales(negocioId)
  const p = periodo(modo, ancla, desde, hasta)
  const rangoMal = modo === 'rango' && (!desde || !hasta || desde > hasta)
  const reporte = useReporte(negocioId, p.desde, p.hasta, esDueno ? profesional || null : null)
  const nombreProf = profs.data?.find((x) => x.id === profesional)?.nombre ?? null

  const mover = (k: number) => setAncla((a) => (modo === 'semana' ? sumarDias(lunesDe(a), 7 * k) : sumarMeses(primeroDeMes(a), k)))

  const descargar = (r: Reporte) => {
    const csv = reporteACsv(r, n.nombre, nombreProf)
    const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-${n.slug}-${r.desde}-a-${r.hasta}.csv`
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="flex flex-col gap-4">
      <Encabezado titulo={esDueno ? 'Reportes' : 'Tus números'} bajada="Cómo viene el negocio: turnos, asistencia, facturación y clientes.">
        <Boton variante="secundario" disabled={!reporte.data || rangoMal} onClick={() => reporte.data && descargar(reporte.data)}>
          <Download className="size-4" aria-hidden />
          Descargar CSV
        </Boton>
      </Encabezado>

      <div className="flex flex-col gap-3">
        <fieldset className="grid grid-cols-3 gap-1 rounded-medio bg-superficie p-1 ring-1 ring-linea sm:max-w-md">
          <legend className="sr-only">Período</legend>
          {(
            [
              ['semana', 'Semana'],
              ['mes', 'Mes'],
              ['rango', 'Rango'],
            ] as const
          ).map(([id, texto]) => (
            <button
              key={id}
              type="button"
              aria-pressed={modo === id}
              onClick={() => setModo(id)}
              className={cn('h-11 rounded-chico text-sm font-semibold transition-colors', modo === id ? 'bg-acento text-sobre-acento' : 'text-suave hover:text-texto')}
            >
              {texto}
            </button>
          ))}
        </fieldset>

        <div className="flex flex-wrap items-end justify-between gap-3">
          {modo === 'rango' ? (
            <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
              <Campo etiqueta="Desde" type="date" className="sm:w-44" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
              <Campo etiqueta="Hasta" type="date" className="sm:w-44" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => mover(-1)} className="grid size-11 place-items-center rounded-full hover:bg-superficie" aria-label={modo === 'semana' ? 'Semana anterior' : 'Mes anterior'}>
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <p className="titulo text-lg" aria-live="polite">
                {p.nombre}
              </p>
              <button type="button" onClick={() => mover(1)} className="grid size-11 place-items-center rounded-full hover:bg-superficie" aria-label={modo === 'semana' ? 'Semana siguiente' : 'Mes siguiente'}>
                <ChevronRight className="size-5" aria-hidden />
              </button>
            </div>
          )}
          {esDueno && (profs.data?.length ?? 0) > 1 && (
            <Selector etiqueta="Profesional" className="w-full sm:w-56" value={profesional} onChange={(e) => setProfesional(e.target.value)}>
              <option value="">Todos</option>
              {profs.data!.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </Selector>
          )}
        </div>
        {rangoMal && <ErrorEnLinea texto='Revisá las fechas: "hasta" tiene que ser igual o posterior a "desde".' />}
      </div>

      {rangoMal ? null : reporte.isPending ? (
        <Cargando texto="Armando el reporte" />
      ) : reporte.isError ? (
        <FalloCarga error={reporte.error} onReintentar={() => void reporte.refetch()} />
      ) : (
        <Contenido r={reporte.data} esDueno={esDueno && !profesional} />
      )}
    </div>
  )
}

const pct = (x: number | null) => (x === null ? '–' : `${x}%`)

function Contenido({ r, esDueno }: { r: Reporte; esDueno: boolean }) {
  const t = r.totales
  const asistencia = porcentaje(t.asistio, t.asistio + t.falto)
  const confirmacion = porcentaje(t.confirmados, t.turnos)
  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Resumen del período" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato titulo="Turnos" valor={String(t.turnos)} detalle={t.sin_marcar ? `${t.sin_marcar} sin marcar si vino${t.sin_marcar === 1 ? '' : 'ron'}` : undefined} />
        <Dato titulo="Asistencia" valor={pct(asistencia)} detalle={t.asistio === 1 ? '1 vino' : `${t.asistio} vinieron`} />
        <Dato titulo="Faltas" valor={String(t.falto)} detalle="No vinieron" />
        <Dato titulo="Cancelaciones" valor={String(t.cancelados)} detalle={t.reservados === 1 ? 'de 1 reservado' : `de ${t.reservados} reservados`} />
        <Dato titulo="Confirmación" valor={pct(confirmacion)} detalle={t.confirmados === 1 ? '1 confirmado' : `${t.confirmados} confirmados`} />
        <Dato titulo="Facturación estimada" valor={precioCorto(t.facturacion)} detalle="Sin cancelados ni faltas" />
        <Dato titulo="Clientes nuevos" valor={String(r.clientes.nuevos)} detalle="Primera vez" />
        <Dato titulo="Clientes recurrentes" valor={String(r.clientes.recurrentes)} detalle="Ya habían venido" />
      </section>

      {t.reservados === 0 ? (
        <Vacio>No hay turnos en este período.</Vacio>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
          {esDueno && (
            <Tarjeta titulo="Por profesional" className="lg:col-span-2">
              <Tabla
                etiqueta="Turnos por profesional"
                columnas={['Profesional', 'Turnos', 'Vino', 'No vino', 'Canceló', 'Facturación']}
                filas={r.por_profesional.map((p) => ({ id: p.id, nombre: p.nombre, valor: p.turnos, celdas: [p.asistio, p.falto, p.cancelados, precio(p.facturacion)] }))}
              />
            </Tarjeta>
          )}
          <Tarjeta titulo="Por servicio" className={esDueno ? undefined : 'lg:col-span-2'}>
            <Tabla
              etiqueta="Turnos por servicio"
              columnas={['Servicio', 'Turnos', 'Vino', 'Facturación']}
              filas={r.por_servicio.map((s) => ({ id: s.id, nombre: s.nombre, valor: s.turnos, celdas: [s.asistio, precio(s.facturacion)] }))}
            />
          </Tarjeta>
          <Tarjeta titulo="Horas más pedidas">
            <Barras etiqueta="Turnos por hora" filas={r.por_hora.map((h) => ({ clave: String(h.hora), nombre: `${String(h.hora).padStart(2, '0')}:00`, valor: h.turnos }))} />
          </Tarjeta>
          <Tarjeta titulo="Días más pedidos">
            <Barras
              etiqueta="Turnos por día de la semana"
              filas={[1, 2, 3, 4, 5, 6, 0].map((d) => ({ clave: String(d), nombre: DIAS[d]!, valor: r.por_dia_semana.find((x) => x.dia === d)?.turnos ?? 0 }))}
            />
          </Tarjeta>
        </div>
      )}

      {r.resenas && <Calificaciones resenas={r.resenas} />}
    </div>
  )
}

function Dato({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <article aria-label={titulo} className="rounded-grande bg-superficie p-4 ring-1 ring-linea">
      <p className="text-xs font-semibold text-suave">{titulo}</p>
      <p className="titulo num mt-1 text-2xl">{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-suave">{detalle}</p>}
    </article>
  )
}

/** Tabla con una barra (un solo color) en la columna principal: se lee el número y se compara de un vistazo. */
function Tabla({ etiqueta, columnas, filas }: { etiqueta: string; columnas: string[]; filas: { id: string; nombre: string; valor: number; celdas: (string | number)[] }[] }) {
  const max = Math.max(1, ...filas.map((f) => f.valor))
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[28rem] text-left text-sm" aria-label={etiqueta}>
        <thead>
          <tr className="text-xs text-suave">
            {columnas.map((c, i) => (
              <th key={c} scope="col" className={cn('pb-2 font-semibold', i > 0 && 'text-right', i === 1 && 'w-2/5')}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-linea">
          {filas.map((f) => (
            <tr key={f.id}>
              <th scope="row" className="py-2.5 pr-3 font-semibold">
                {f.nombre}
              </th>
              <td className="num py-2.5 text-right font-semibold">
                <span className="mr-2 inline-block h-2 w-[calc(100%-2.5rem)] overflow-hidden rounded-full bg-superficie-2 align-middle" aria-hidden>
                  <span className="block h-full rounded-full bg-acento" style={{ width: `${(f.valor / max) * 100}%` }} />
                </span>
                {f.valor}
              </td>
              {f.celdas.map((c, i) => (
                <td key={i} className="num py-2.5 pl-3 text-right">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Barras({ etiqueta, filas }: { etiqueta: string; filas: { clave: string; nombre: string; valor: number }[] }) {
  const max = Math.max(1, ...filas.map((f) => f.valor))
  const top = filas.length ? Math.max(...filas.map((f) => f.valor)) : 0
  if (!filas.some((f) => f.valor > 0)) return <p className="text-sm text-suave">Sin turnos.</p>
  return (
    <ul className="flex flex-col gap-1.5" aria-label={etiqueta}>
      {filas.map((f) => (
        <li key={f.clave} className="grid grid-cols-[5.5rem_minmax(0,1fr)_2rem] items-center gap-2 text-sm" title={`${f.nombre}: ${f.valor} turnos`}>
          <span className={cn('truncate', f.valor === top && top > 0 ? 'font-bold' : 'text-suave')}>{f.nombre}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-superficie-2" aria-hidden>
            <span className="block h-full rounded-full bg-acento" style={{ width: `${(f.valor / max) * 100}%` }} />
          </span>
          <span className="num text-right font-semibold">{f.valor}</span>
        </li>
      ))}
    </ul>
  )
}

function Estrellas({ puntaje, className }: { puntaje: number; className?: string }) {
  return (
    <span className={cn('inline-flex gap-0.5', className)}>
      <span className="sr-only">{`${String(puntaje).replace('.', ',')} de 5`}</span>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn('size-4', i <= Math.round(puntaje) ? 'fill-current text-acento-texto' : 'text-linea')} aria-hidden />
      ))}
    </span>
  )
}

function Calificaciones({ resenas }: { resenas: NonNullable<Reporte['resenas']> }) {
  const max = Math.max(1, ...Object.values(resenas.distribucion))
  return (
    <Tarjeta titulo="Calificaciones">
      {resenas.cantidad === 0 ? (
        <p className="text-sm text-suave">Todavía no hay calificaciones en este período.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-[14rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            <p className="flex items-baseline gap-2">
              <span className="titulo num text-4xl">{String(resenas.promedio ?? 0).replace('.', ',')}</span>
              <span className="text-sm text-suave">de 5</span>
            </p>
            <Estrellas puntaje={resenas.promedio ?? 0} />
            <p className="text-sm text-suave">{resenas.cantidad === 1 ? '1 calificación' : `${resenas.cantidad} calificaciones`}</p>
            <ul className="mt-1 flex flex-col gap-1" aria-label="Calificaciones por puntaje">
              {(['5', '4', '3', '2', '1'] as const).map((k) => (
                <li key={k} className="grid grid-cols-[1.5rem_minmax(0,1fr)_1.5rem] items-center gap-2 text-xs">
                  <span className="text-suave">{k}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-superficie-2" aria-hidden>
                    <span className="block h-full rounded-full bg-acento" style={{ width: `${(resenas.distribucion[k] / max) * 100}%` }} />
                  </span>
                  <span className="num text-right">{resenas.distribucion[k]}</span>
                </li>
              ))}
            </ul>
          </div>
          <ul className="flex flex-col divide-y divide-linea" aria-label="Últimas calificaciones">
            {resenas.ultimas.map((u, i) => (
              <li key={i} className="flex flex-col gap-1 py-2.5 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Estrellas puntaje={u.puntaje} />
                  <span className="text-xs text-suave">{capitalizar(diaCorto(u.creado))}</span>
                </div>
                {u.comentario && <p className="text-[15px]">“{u.comentario}”</p>}
                <p className="text-xs text-suave">{[u.cliente, u.servicio, u.profesional].filter(Boolean).join(' · ')}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Tarjeta>
  )
}
