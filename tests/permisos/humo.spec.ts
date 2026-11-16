// Prueba mínima de que el "mundo" de prueba se arma bien. Los tests de cada rol van en archivos aparte.
import { expect, test } from '@playwright/test'
import { aISO, diaAR, limpiarMundo, prepararMundo, type Mundo } from '../soporte/mundo'

let m: Mundo
test.beforeAll(async () => {
  m = await prepararMundo()
})
test.afterAll(async () => {
  await limpiarMundo(m)
})

test('un cliente ve horarios libres y reserva', async () => {
  const dia = diaAR(1)
  const { data: libres, error } = await m.usuarios.cliente1.db.rpc('horarios_libres', {
    p_negocio: m.negocioA.id,
    p_servicio: m.servicios.corteA,
    p_dia: dia,
  })
  expect(error).toBeNull()
  expect(libres!.length).toBeGreaterThan(10)

  const { data: id, error: e2 } = await m.usuarios.cliente1.db.rpc('reservar_turno', {
    p_negocio: m.negocioA.id,
    p_servicio: m.servicios.corteA,
    p_inicio: aISO(dia, '10:00'),
    p_nombre: 'Cliente Uno',
  })
  expect(e2).toBeNull()
  expect(id).toBeTruthy()
})
