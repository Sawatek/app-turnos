import { describe, expect, it } from 'vitest'
import { formatoTelefono, normalizarTelefono, telefonoLegible } from './cliente-telefono'

describe('normalizarTelefono', () => {
  it.each([
    ['11 2345-6789', '+5491123456789'],
    ['1123456789', '+5491123456789'],
    ['011 15 2345-6789', '+5491123456789'],
    ['11 15 2345 6789', '+5491123456789'],
    ['+54 9 11 2345-6789', '+5491123456789'],
    ['+54 11 2345-6789', '+5491123456789'],
    ['5491123456789', '+5491123456789'],
    ['351 15 123-4567', '+5493511234567'],
    ['(0351) 123-4567', '+5493511234567'],
    ['2966 15 12-3456', '+5492966123456'],
  ])('%s → %s', (entrada, esperado) => {
    const r = normalizarTelefono(entrada)
    expect(r.ok && r.e164).toBe(esperado)
  })

  it.each(['', '1234', '11 2345-678', '0800 123 4567', '9 11 2345 67890', 'abc'])('rechaza "%s"', (entrada) => {
    expect(normalizarTelefono(entrada).ok).toBe(false)
  })
})

describe('formato', () => {
  it('formatea mientras escribe', () => {
    expect(formatoTelefono('11')).toBe('11')
    expect(formatoTelefono('112345')).toBe('11 2345')
    expect(formatoTelefono('1123456789')).toBe('11 2345-6789')
    expect(formatoTelefono('+54 9 11')).toBe('+54 9 11')
  })
  it('muestra el número de la sesión', () => {
    expect(telefonoLegible('5491123456789')).toBe('11 2345-6789')
    expect(telefonoLegible(null)).toBe('')
  })
})
