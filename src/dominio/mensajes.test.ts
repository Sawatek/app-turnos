import { describe, expect, it } from 'vitest'
import { negocioDesdePlantilla } from '@/plantillas/rubros'
import { PLANTILLA_GRACIAS, PLANTILLA_RECORDATORIO_24, diaDeWhatsApp, sustituir, textoMensaje } from './mensajes'
import { enHora } from './tiempo'
import type { Turno } from './tipos'

const n = negocioDesdePlantilla('barberia', { nombre: 'Barbería Test', slug: 'test' })
const servicio = n.servicios[0]!
const prof = n.staff[0]!
// Lunes 16/11/2026, 08:00 en Argentina; el turno es el martes 17/11 a las 10:30.
const ahora = enHora('2026-11-16', '08:00')
const turno: Turno = {
  id: 'x', clienteNombre: 'Ana Gómez', clienteTel: '1', servicioId: servicio.id, profesionalId: prof.id,
  inicio: enHora('2026-11-17', '10:30').toISOString(), minutos: 30, estado: 'pendiente', senaPagada: 0,
  propio: true, recordatorios: {}, creado: '',
}

describe('sustituir', () => {
  it('reemplaza las claves que vienen y deja las otras tal cual', () => {
    expect(sustituir('Hola {nombre}, entrá a {link}', { nombre: 'Ana' })).toBe('Hola Ana, entrá a {link}')
  })
})

describe('textoMensaje', () => {
  it('completa todas las variables con el primer nombre y el día relativo', () => {
    expect(textoMensaje(n, PLANTILLA_RECORDATORIO_24, turno, 'Ana Gómez', ahora)).toBe(
      `Hola Ana, te recordamos tu turno de mañana en Barbería Test: ${servicio.nombre} con ${prof.nombre}, el mañana a las 10:30. Dirección: ${n.direccion}. ¿Confirmás que venís?`,
    )
  })

  it('con el formato de WhatsApp el día sale como lo escribe la base', () => {
    expect(textoMensaje(n, PLANTILLA_GRACIAS, turno, 'Ana', ahora, diaDeWhatsApp)).toBe(
      '¡Gracias Ana! Tu turno del martes 17/11 a las 10:30 en Barbería Test quedó confirmado. Te esperamos.',
    )
  })

  it('sin turno deja vacíos los datos del turno', () => {
    expect(textoMensaje(n, '{nombre} {hora}|{dia}', null, 'Ana', ahora)).toBe('Ana |')
  })
})

describe('diaDeWhatsApp', () => {
  it('usa la hora argentina y dos cifras en día y mes', () => {
    // 02:00 UTC del 5/3 todavía es el 4/3 en la Argentina.
    expect(diaDeWhatsApp('2026-03-05T02:00:00Z')).toBe('miércoles 04/03')
  })
})
