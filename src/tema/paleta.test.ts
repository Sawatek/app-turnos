import { wcagContrast } from 'culori'
import { describe, expect, it } from 'vitest'
import { generarTema } from './paleta'

const colores = ['#e0b352', '#2a9d8f', '#d9466f', '#111111', '#ffffff', '#ffeb3b', '#1e40af', '#7c3aed', '#00ff00']

describe('generarTema garantiza contraste con cualquier color de marca', () => {
  for (const modo of ['claro', 'oscuro'] as const) {
    for (const color of colores) {
      it(`${color} en modo ${modo}`, () => {
        const t = generarTema(color, modo)
        expect(wcagContrast(t['--t-texto']!, t['--t-fondo']!)).toBeGreaterThanOrEqual(7)
        expect(wcagContrast(t['--t-suave']!, t['--t-superficie']!)).toBeGreaterThanOrEqual(4.5)
        expect(wcagContrast(t['--t-sobre-acento']!, t['--t-acento']!)).toBeGreaterThanOrEqual(4.5)
        expect(wcagContrast(t['--t-acento-texto']!, t['--t-fondo']!)).toBeGreaterThanOrEqual(4.5)
        expect(wcagContrast(t['--t-acento']!, t['--t-fondo']!)).toBeGreaterThanOrEqual(3)
      })
    }
  }
})
