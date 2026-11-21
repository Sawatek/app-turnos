import { describe, expect, it } from 'vitest'
import type { Bloqueo, TurnoPanel } from '@/datos/real/panel'
import { armarLibreta, minutoDelDia, type Renglon } from './renglones'

const DIA = '2026-11-23'
const iso = (hora: string, dia = DIA) => `${dia}T${hora}:00-03:00`

function turno(id: string, desde: string, hasta: string, profesionalId = 'p1', estado: TurnoPanel['estado'] = 'confirmado'): TurnoPanel {
  return {
    id,
    inicio: iso(desde),
    fin: iso(hasta),
    estado,
    sena: 0,
    origen: 'manual',
    notas: null,
    clienteId: 'c',
    clienteNombre: `Cliente ${id}`,
    clienteTelefono: null,
    servicioId: 's',
    servicioNombre: 'Corte',
    precio: 0,
    profesionalId,
    profesionalNombre: profesionalId,
  }
}
const bloqueo = (id: string, desde: string, hasta: string, profesionalId: string | null = 'p1'): Bloqueo => ({ id, profesionalId, desde, hasta, motivo: null })

const UNA = [{ id: null, nombre: '' }]
const DOS = [
  { id: 'p1', nombre: 'P1' },
  { id: 'p2', nombre: 'P2' },
]
const horas = (r: Renglon[]) => r.flatMap((x) => (x.tipo === 'hora' && x.hora !== null ? [x.hora] : []))
const base = { dia: DIA, hoy: '2026-11-21', ahora: 0, turnos: [], bloqueos: [], columnas: UNA, franjas: [{ desde: 9 * 60, hasta: 13 * 60 }] }

describe('minutoDelDia', () => {
  it('recorta lo de otros días a los bordes', () => {
    expect(minutoDelDia(iso('10:30'), DIA)).toBe(630)
    expect(minutoDelDia(iso('23:00', '2026-11-22'), DIA)).toBe(0)
    expect(minutoDelDia(iso('00:00', '2026-11-24'), DIA)).toBe(1440)
  })
})

describe('armarLibreta', () => {
  it('sin horario ni turnos no dibuja nada', () => {
    expect(armarLibreta({ ...base, franjas: [] })).toBeNull()
  })

  it('un renglón por hora del horario, estirado si hay turnos por fuera', () => {
    expect(horas(armarLibreta(base)!)).toEqual([9, 10, 11, 12])
    expect(horas(armarLibreta({ ...base, turnos: [turno('a', '13:30', '14:15')] })!)).toEqual([9, 10, 11, 12, 13, 14])
  })

  it('un turno largo sigue en los renglones de abajo; el resto queda libre', () => {
    const r = armarLibreta({ ...base, turnos: [turno('a', '09:30', '11:15')] })!.filter((x) => x.tipo === 'hora')
    expect(r.map((x) => x.celdas[0]!.tipo)).toEqual(['entradas', 'sigue', 'sigue', 'libre'])
    expect(r[1]!.celdas[0]).toEqual({ tipo: 'sigue', por: 'turno', hasta: 11 * 60 + 15 })
  })

  it('un turno cancelado no ocupa lugar', () => {
    const r = armarLibreta({ ...base, turnos: [turno('a', '09:00', '11:00', 'p1', 'cancelado')] })!.filter((x) => x.tipo === 'hora')
    expect(r.map((x) => x.celdas[0]!.tipo)).toEqual(['entradas', 'libre', 'libre', 'libre'])
  })

  it('hoy, la hora en curso se parte con la línea de "ahora" y lo anterior queda como pasado', () => {
    const r = armarLibreta({ ...base, hoy: DIA, ahora: 10 * 60 + 20, turnos: [turno('a', '10:00', '10:30'), turno('b', '10:40', '11:00')] })!
    const i = r.findIndex((x) => x.tipo === 'ahora')
    expect(r[i]).toMatchObject({ tipo: 'ahora', minuto: 620 })
    expect(r[i - 1]).toMatchObject({ tipo: 'hora', hora: 10, pasado: true, celdas: [{ tipo: 'entradas', entradas: [{ id: 'a' }] }] })
    expect(r[i + 1]).toMatchObject({ tipo: 'hora', hora: null, pasado: false, celdas: [{ tipo: 'entradas', entradas: [{ id: 'b' }] }] })
  })

  it('las horas que ya pasaron sin nada se pliegan en un solo renglón', () => {
    const r = armarLibreta({ ...base, hoy: DIA, ahora: 12 * 60 + 10, turnos: [turno('a', '10:00', '10:30')] })!
    expect(r.map((x) => (x.tipo === 'hora' ? `${x.hora}${x.plegadoHasta ? `-${x.plegadoHasta / 60}` : ''}` : 'ahora'))).toEqual(['9', '10', '11', '12', 'ahora', 'null'])
    const tarde = armarLibreta({ ...base, hoy: DIA, ahora: 12 * 60 + 10 })!
    expect(tarde[0]).toMatchObject({ tipo: 'hora', hora: 9, plegadoHasta: 12 * 60 })
  })

  it('con varias columnas, cada turno va en la de su profesional y un bloqueo de todo el negocio va a lo ancho', () => {
    const r = armarLibreta({
      ...base,
      columnas: DOS,
      turnos: [turno('a', '09:00', '09:45', 'p2')],
      bloqueos: [bloqueo('x', iso('11:00'), iso('12:00'), null)],
    })!.filter((x) => x.tipo === 'hora')
    expect(r[0]!.celdas.map((c) => c.tipo)).toEqual(['libre', 'entradas'])
    expect(r[2]!.anchas.map((e) => e.id)).toEqual(['x'])
    expect(r[2]!.celdas.map((c) => c.tipo)).toEqual(['libre', 'libre'])
  })

  it('un bloqueo de un rato fuera del horario estira el día; uno de días enteros no', () => {
    expect(horas(armarLibreta({ ...base, bloqueos: [bloqueo('b', iso('16:00'), iso('17:00'))] })!)).toEqual([9, 10, 11, 12, 13, 14, 15, 16])
    expect(armarLibreta({ ...base, franjas: [], bloqueos: [bloqueo('b', iso('16:00'), iso('17:00'))] })!.length).toBe(1)
    expect(horas(armarLibreta({ ...base, bloqueos: [bloqueo('f', iso('00:00'), iso('00:00', '2026-11-24'))] })!)).toEqual([9, 10, 11, 12])
  })

  it('un franco de todo el día arranca en el primer renglón y tacha el resto', () => {
    const r = armarLibreta({ ...base, bloqueos: [bloqueo('f', iso('00:00'), iso('00:00', '2026-11-24'))] })!.filter((x) => x.tipo === 'hora')
    expect(r[0]!.celdas[0]).toMatchObject({ tipo: 'entradas', entradas: [{ id: 'f' }] })
    expect(r.slice(1).every((x) => x.celdas[0]!.tipo === 'sigue')).toBe(true)
  })
})
