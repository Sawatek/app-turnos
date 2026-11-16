import { describe, expect, it } from 'vitest'
import { negocioDesdePlantilla } from '@/plantillas/rubros'
import { estaLibre, huecosDelDia, proximoLibre } from './horarios'
import { generarSemilla } from './semilla'
import { enHora, horaCorta } from './tiempo'
import type { Turno } from './tipos'

const barberia = negocioDesdePlantilla('barberia', { nombre: 'Test', slug: 'test' })
// Lunes 16/11/2026, 08:00 en Argentina
const lunes = '2026-11-16'
const temprano = enHora(lunes, '08:00')

const turno = (p: Partial<Turno>): Turno => ({
  id: 'x', clienteNombre: 'A', clienteTel: '1', servicioId: 'corte', profesionalId: 'p1',
  inicio: enHora(lunes, '10:00').toISOString(), minutos: 30, estado: 'confirmado', senaPagada: 0,
  propio: false, recordatorios: {}, creado: '', ...p,
})

describe('huecosDelDia', () => {
  it('ofrece horarios dentro del horario de atención y salta el descanso', () => {
    const h = huecosDelDia({ negocio: barberia, dia: lunes, servicioId: 'corte', profesionalId: 'p1', turnos: [], ahora: temprano })
    const horas = h.map((x) => horaCorta(x.inicio))
    expect(horas[0]).toBe('09:00')
    expect(horas.at(-1)).toBe('19:30')
    expect(horas).not.toContain('13:00')
    expect(horas).toContain('12:30')
    expect(horas).not.toContain('12:45') // 12:45 + 30 min pisa el descanso
  })

  it('no abre los domingos', () => {
    expect(huecosDelDia({ negocio: barberia, dia: '2026-11-15', servicioId: 'corte', profesionalId: null, turnos: [], ahora: temprano })).toEqual([])
  })

  it('no ofrece horarios superpuestos con un turno existente', () => {
    const turnos = [turno({})]
    const h = huecosDelDia({ negocio: barberia, dia: lunes, servicioId: 'corte', profesionalId: 'p1', turnos, ahora: temprano })
    const horas = h.map((x) => horaCorta(x.inicio))
    expect(horas).not.toContain('09:45')
    expect(horas).not.toContain('10:00')
    expect(horas).not.toContain('10:15')
    expect(horas).toContain('09:30')
    expect(horas).toContain('10:30')
  })

  it('un turno cancelado libera el lugar', () => {
    const turnos = [turno({ estado: 'cancelado' })]
    const h = huecosDelDia({ negocio: barberia, dia: lunes, servicioId: 'corte', profesionalId: 'p1', turnos, ahora: temprano })
    expect(h.map((x) => horaCorta(x.inicio))).toContain('10:00')
  })

  it('con "cualquiera" asigna otro profesional si el primero está ocupado', () => {
    const turnos = [turno({})]
    const h = huecosDelDia({ negocio: barberia, dia: lunes, servicioId: 'corte', profesionalId: null, turnos, ahora: temprano })
    expect(h.find((x) => horaCorta(x.inicio) === '10:00')?.profesionalId).toBe('p2')
  })

  it('no ofrece horarios que ya pasaron (con margen de 30 min)', () => {
    const ahora = enHora(lunes, '15:10')
    const h = huecosDelDia({ negocio: barberia, dia: lunes, servicioId: 'corte', profesionalId: 'p1', turnos: [], ahora })
    expect(horaCorta(h[0]!.inicio)).toBe('15:45')
  })
})

describe('proximoLibre', () => {
  it('si hoy ya cerró, busca en los días siguientes', () => {
    const ahora = enHora(lunes, '21:00')
    const h = proximoLibre({ negocio: barberia, servicioId: 'corte', profesionalId: null, turnos: [], ahora })
    expect(h && horaCorta(h.inicio)).toBe('09:00')
  })
})

describe('semilla', () => {
  it('genera turnos que nunca se superponen para un mismo profesional', () => {
    const { turnos } = generarSemilla(barberia, enHora(lunes, '11:00'))
    expect(turnos.length).toBeGreaterThan(50)
    for (const t of turnos.filter((x) => x.estado !== 'cancelado')) {
      expect(estaLibre(turnos, t.profesionalId, Date.parse(t.inicio), t.minutos, t.id)).toBe(true)
    }
  })

  it('es determinista', () => {
    const a = generarSemilla(barberia, enHora(lunes, '11:00'))
    const b = generarSemilla(barberia, enHora(lunes, '11:00'))
    expect(a.turnos).toEqual(b.turnos)
  })
})
