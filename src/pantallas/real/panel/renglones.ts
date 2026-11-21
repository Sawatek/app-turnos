// Lógica pura de la libreta (la agenda del día como la de papel): arma los renglones por hora a partir de los turnos,
// los bloqueos y los horarios del día. Sin React, para poder probarla sola.
import type { Bloqueo, TurnoPanel } from '@/datos/real/panel'
import { claveDia, horaCorta, minutosDe } from '@/dominio/tiempo'

/** Una columna de la libreta: un profesional, o `id: null` = todos juntos en una sola columna. */
export interface Columna {
  id: string | null
  nombre: string
}

export type Entrada =
  | { tipo: 'turno'; id: string; col: string | null; ini: number; fin: number; t: TurnoPanel }
  | { tipo: 'bloqueo'; id: string; col: string | null; ini: number; fin: number; b: Bloqueo }

/** Lo que hay en un renglón para una columna: lo que empieza ahí, algo que viene de antes, o nada (libre). */
export type Celda =
  | { tipo: 'entradas'; entradas: Entrada[] }
  | { tipo: 'sigue'; por: 'turno' | 'bloqueo'; hasta: number }
  | { tipo: 'libre' }

export type Renglon =
  | {
      tipo: 'hora'
      clave: string
      /** Hora que se escribe en el margen (solo en el primer renglón de cada hora). */
      hora: number | null
      desde: number
      hasta: number
      pasado: boolean
      /** Bloqueos de todo el negocio cuando hay varias columnas: ocupan el ancho entero. */
      anchas: Entrada[]
      celdas: Celda[]
      /** Si es un tramo ya pasado y vacío que se plegó en un solo renglón: la hora en que termina. */
      plegadoHasta?: number
    }
  | { tipo: 'ahora'; clave: string; minuto: number }

const DIA = 24 * 60

/** Minuto del día (0–1440) de un instante, recortado al día pedido (lo de antes es 0; lo de después, 1440). */
export function minutoDelDia(iso: string, dia: string) {
  const k = claveDia(iso)
  if (k < dia) return 0
  if (k > dia) return DIA
  return minutosDe(horaCorta(iso))
}

interface Datos {
  dia: string
  hoy: string
  /** Minuto actual del día de hoy (para la línea de "ahora"). */
  ahora: number
  turnos: TurnoPanel[]
  bloqueos: Bloqueo[]
  columnas: Columna[]
  /** Franjas de atención de ese día (en minutos), de los profesionales que se muestran. */
  franjas: { desde: number; hasta: number }[]
}

/**
 * Renglones de la libreta, de la primera a la última hora del día (lo que diga el horario, estirado si hay turnos
 * por fuera). Cada hora es un renglón; la hora en curso se parte en dos con la línea de "ahora" en el medio.
 * Devuelve null si ese día no se atiende y no hay turnos (no hay nada que dibujar).
 */
export function armarLibreta({ dia, hoy, ahora, turnos, bloqueos, columnas, franjas }: Datos): Renglon[] | null {
  const multi = columnas.length > 1
  const deTurnos: Entrada[] = turnos.map((t) => ({
    tipo: 'turno',
    id: t.id,
    col: t.profesionalId,
    ini: minutoDelDia(t.inicio, dia),
    fin: Math.max(minutoDelDia(t.fin, dia), minutoDelDia(t.inicio, dia) + 5),
    t,
  }))
  const activos = deTurnos.filter((e) => e.tipo === 'turno' && e.t.estado !== 'cancelado')
  // Los bloqueos de un rato también estiran el día (los de días enteros no: esos se recortan a lo que se dibuja).
  const ratos = bloqueos.map((b) => ({ ini: minutoDelDia(b.desde, dia), fin: minutoDelDia(b.hasta, dia) })).filter((b) => b.ini > 0 && b.fin < DIA && b.fin > b.ini)
  const inicios = [...franjas.map((f) => f.desde), ...deTurnos.map((e) => e.ini), ...ratos.map((b) => b.ini)]
  const finales = [...franjas.map((f) => f.hasta), ...deTurnos.map((e) => e.fin), ...ratos.map((b) => b.fin)]
  if (!inicios.length) return null
  const hIni = Math.floor(Math.min(...inicios) / 60)
  const hFin = Math.min(24, Math.max(hIni + 1, Math.ceil(Math.max(...finales) / 60)))
  const abre = hIni * 60
  const cierra = hFin * 60

  // Los bloqueos se recortan al día dibujado (un franco de todo el día arranca en el primer renglón).
  const deBloqueos: Entrada[] = bloqueos
    .map((b): Entrada => ({ tipo: 'bloqueo', id: b.id, col: b.profesionalId, ini: Math.max(abre, minutoDelDia(b.desde, dia)), fin: Math.min(cierra, minutoDelDia(b.hasta, dia)), b }))
    .filter((e) => e.fin > e.ini)
  const todas = [...deTurnos, ...deBloqueos].toSorted((a, b) => a.ini - b.ini || (a.tipo === b.tipo ? 0 : a.tipo === 'bloqueo' ? -1 : 1))
  const ocupan = [...activos, ...deBloqueos]

  /** ¿La entrada va en esta columna? (en una sola columna, todo; si no, lo de ese profesional) */
  const enColumna = (e: Entrada, c: Columna) => !multi || e.col === c.id
  /** ¿La entrada ocupa esta columna? (los bloqueos de todo el negocio ocupan todas) */
  const ocupaColumna = (e: Entrada, c: Columna) => !multi || e.col === c.id || e.col === null

  const minAhora = dia === hoy && ahora >= abre && ahora < cierra ? ahora : null
  const renglones: Renglon[] = []
  for (let h = hIni; h < hFin; h++) {
    const a0 = h * 60
    const b0 = a0 + 60
    // La hora en curso se parte: lo que ya pasó, la línea de "ahora" y lo que falta.
    const cortes = minAhora !== null && minAhora >= a0 && minAhora < b0 ? [a0, minAhora, b0] : [a0, b0]
    let rotulada = false
    for (let i = 0; i < cortes.length - 1; i++) {
      const a = cortes[i]!
      const b = cortes[i + 1]!
      if (i > 0) renglones.push({ tipo: 'ahora', clave: `ahora-${a}`, minuto: a })
      if (b <= a) continue
      const empiezan = (e: Entrada) => e.ini >= a && e.ini < b
      const anchas = multi ? todas.filter((e) => e.col === null && empiezan(e)) : []
      const celdas = columnas.map((c): Celda => {
        const lista = todas.filter((e) => empiezan(e) && enColumna(e, c))
        if (lista.length) return { tipo: 'entradas', entradas: lista }
        const vienen = ocupan.filter((e) => ocupaColumna(e, c) && e.ini < a && e.fin > a)
        if (vienen.length)
          return { tipo: 'sigue', por: vienen.some((e) => e.tipo === 'bloqueo') ? 'bloqueo' : 'turno', hasta: Math.max(...vienen.map((e) => e.fin)) }
        return { tipo: 'libre' }
      })
      const pasado = dia < hoy || (dia === hoy && minAhora !== null ? b <= minAhora : dia === hoy && ahora >= cierra)
      renglones.push({ tipo: 'hora', clave: `h-${a}`, hora: rotulada ? null : h, desde: a, hasta: b, pasado, anchas, celdas })
      rotulada = true
    }
  }
  return plegarPasado(renglones)
}

/** Las horas que ya pasaron sin nada se pliegan en un solo renglón: lo que importa (ahora y lo que viene) queda a la vista. */
function plegarPasado(renglones: Renglon[]): Renglon[] {
  const vacio = (r: Renglon) => r.tipo === 'hora' && r.pasado && r.hasta - r.desde === 60 && !r.anchas.length && r.celdas.every((c) => c.tipo === 'libre')
  const salida: Renglon[] = []
  for (let i = 0; i < renglones.length; ) {
    let j = i
    while (j < renglones.length && vacio(renglones[j]!)) j++
    const primero = renglones[i]!
    const ultimo = renglones[j - 1]
    if (j - i >= 2 && primero.tipo === 'hora' && ultimo?.tipo === 'hora') {
      salida.push({ ...primero, clave: `plegado-${primero.desde}`, hora: primero.hora ?? Math.floor(primero.desde / 60), hasta: ultimo.hasta, plegadoHasta: ultimo.hasta })
      i = j
    } else {
      salida.push(primero)
      i++
    }
  }
  return salida
}
