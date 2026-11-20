import { describe, expect, test } from 'vitest'
import { CONTACTO, MARCA, PLANES, linkContacto, precioPlan, type Contacto, type Plan } from './marca'

const contacto = (c: Partial<Contacto>): Contacto => ({ whatsapp: '', email: '', mensajeDemo: 'Hola! Quiero la demo.', ...c })
const plan = (precioMensual: number | null): Plan => ({ ...PLANES[0]!, precioMensual })

describe('linkContacto', () => {
  test('con WhatsApp, abre el chat con el mensaje de la demo ya escrito', () => {
    const l = linkContacto(contacto({ whatsapp: '5491123456789', email: 'hola@ejemplo.com' }))
    expect(l).toEqual({ href: `https://wa.me/5491123456789?text=${encodeURIComponent('Hola! Quiero la demo.')}`, externo: true, via: 'whatsapp' })
  })

  test('sin WhatsApp pero con mail, abre el mail con el asunto de la demo', () => {
    const l = linkContacto(contacto({ email: 'hola@ejemplo.com' }))
    expect(l.via).toBe('email')
    expect(l.externo).toBe(true)
    expect(l.href).toBe(`mailto:hola@ejemplo.com?subject=${encodeURIComponent(`Demo de ${MARCA.nombre}`)}`)
  })

  test('sin contacto, lleva a la lista de demos (link interno)', () => {
    expect(linkContacto(contacto({}))).toEqual({ href: '/demos', externo: false, via: 'demos' })
  })

  test('sin argumento usa el CONTACTO de marca.ts', () => {
    expect(linkContacto()).toEqual(linkContacto(CONTACTO))
  })
})

describe('precioPlan', () => {
  test('sin precio cargado da null (la landing muestra "A definir")', () => {
    expect(precioPlan(plan(null))).toBeNull()
  })

  test('con precio, lo formatea en pesos sin centavos', () => {
    // Intl separa el signo con un espacio duro (U+00A0): se normaliza para comparar.
    expect(precioPlan(plan(24990))?.replace(/\s/g, ' ')).toBe('$ 24.990')
    expect(precioPlan(plan(12345.6))?.replace(/\s/g, ' ')).toBe('$ 12.346')
  })

  test('un precio de 0 se muestra (no es "A definir")', () => {
    expect(precioPlan(plan(0))?.replace(/\s/g, ' ')).toBe('$ 0')
  })
})
