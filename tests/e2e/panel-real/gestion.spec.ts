// Herramientas de gestión del panel REAL contra la Supabase LOCAL: marca, mensajes, clientes para recuperar,
// reportes con CSV, "yo también atiendo" y aviso en vivo de turnos nuevos.
// Un mundo aislado por archivo; los tests corren en orden en un mismo worker.
import { readFile } from 'node:fs/promises'
import { deflateSync } from 'node:zlib'
import type { Page } from '@playwright/test'
import { generarTema } from '../../../src/tema/paleta'
import { aISO, CLAVE, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../../soporte/mundo'
import { crearTurno } from '../../permisos/ayuda'
import { expect, test } from '../ayudantes'

test.describe.configure({ mode: 'default' })

let m: Mundo

test.beforeAll(async () => {
  m = await prepararMundo()
})
test.afterAll(async () => {
  await limpiarMundo(m)
})

async function entrar(page: Page, seccion = '') {
  await page.goto(`/${m.negocioA.slug}/panel${seccion}`)
  await page.getByLabel('Tu mail').fill(m.usuarios.duenoA.email)
  await page.getByLabel('Contraseña').fill(CLAVE)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Negocio A' })).toBeVisible()
}

async function nuevoCliente(nombre: string, telefono: string | null = null) {
  const { data, error } = await servicio().from('clientes').insert({ negocio_id: m.negocioA.id, nombre, telefono }).select('id').single()
  if (error) throw error
  return data.id as string
}

/** PNG de 8×8 de un solo color (para probar la subida del logo). */
function png(r: number, g: number, b: number) {
  const crc = (buf: Buffer) => {
    let c = ~0
    for (const x of buf) {
      c ^= x
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
    }
    return ~c >>> 0
  }
  const bloque = (tipo: string, datos: Buffer) => {
    const largo = Buffer.alloc(4)
    largo.writeUInt32BE(datos.length)
    const cuerpo = Buffer.concat([Buffer.from(tipo), datos])
    const fin = Buffer.alloc(4)
    fin.writeUInt32BE(crc(cuerpo))
    return Buffer.concat([largo, cuerpo, fin])
  }
  const lado = 8
  const cabecera = Buffer.alloc(13)
  cabecera.writeUInt32BE(lado, 0)
  cabecera.writeUInt32BE(lado, 4)
  cabecera.set([8, 2, 0, 0, 0], 8)
  const fila = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: lado }, () => [r, g, b]).flat())])
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloque('IHDR', cabecera),
    bloque('IDAT', deflateSync(Buffer.concat(Array.from({ length: lado }, () => fila)))),
    bloque('IEND', Buffer.alloc(0)),
  ])
}

test('el dueño edita la marca y el cambio se ve en la app del cliente', async ({ page }) => {
  const frase = `Frase nueva ${m.sufijo}`
  await entrar(page, '/marca')
  await expect(page.getByRole('heading', { name: 'Marca' })).toBeVisible()

  // Logo: se achica y se sugiere su color.
  await page.getByLabel('Subir logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png(30, 90, 220) })
  await expect(page.getByRole('img', { name: 'Logo actual' })).toBeVisible()
  await expect(page.getByText('Te sugerimos el color de tu logo')).toBeVisible()

  await page.getByLabel('Frase del negocio').fill(frase)
  await page.getByRole('button', { name: 'Usar color #16a34a' }).click()
  await page.getByRole('button', { name: 'Claro', exact: true }).click()
  await page.getByRole('button', { name: /^Serena/ }).click()
  await page.getByRole('button', { name: 'Agregar aviso' }).click()
  await page.getByLabel('Aviso 1: título').fill('El lunes cerramos')
  // Vista previa en vivo (en el celular se abre en una hoja), antes de guardar.
  await page.getByRole('button', { name: 'Vista previa' }).click()
  const vista = page.getByRole('dialog', { name: 'Vista previa' })
  await expect(vista.getByText(frase)).toBeVisible()
  await expect(vista.getByText('El lunes cerramos')).toBeVisible()
  await vista.getByRole('button', { name: 'Cerrar' }).click()
  await expect(vista).toHaveCount(0)
  await page.getByLabel('Visitas para el premio').fill('6')
  await page.getByLabel('Premio', { exact: true }).fill('Un corte gratis')
  await page.getByLabel('Recordatorio 24 horas antes').fill('Hola {nombre}, mañana {hora} te esperamos en {negocio}.')
  await expect(page.getByText('Hola Ana, mañana 10:30 te esperamos en Negocio A.')).toBeVisible()
  await page.getByRole('button', { name: 'Guardar marca' }).click()
  await expect(page.getByText('Marca guardada: ya se ve en tu app')).toBeVisible()

  const { data } = await servicio().from('negocios').select('slug, config').eq('id', m.negocioA.id).single()
  expect(data!.config).toMatchObject({
    slug: m.negocioA.slug,
    nombre: 'Negocio A',
    claim: frase,
    color: '#16a34a',
    modo: 'claro',
    personalidad: 'serena',
    avisos: [{ titulo: 'El lunes cerramos' }],
    fidelidad: { meta: 6, premio: 'Un corte gratis' },
    mensajes: { recordatorio24: 'Hola {nombre}, mañana {hora} te esperamos en {negocio}.' },
  })
  expect(String((data!.config as { logo: string }).logo)).toMatch(/^data:image\/(webp|png);base64,/)

  // La app del cliente ya sale con la marca nueva.
  await page.goto(`/${m.negocioA.slug}`)
  await expect(page.getByText('El lunes cerramos')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Un corte gratis' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Logo de Negocio A' }).first()).toBeVisible()
  const tema = await page.evaluate(() => ({
    acento: getComputedStyle(document.documentElement).getPropertyValue('--t-acento').trim(),
    fondo: getComputedStyle(document.documentElement).getPropertyValue('--t-fondo').trim(),
    personalidad: document.documentElement.dataset.personalidad,
  }))
  const esperado = generarTema('#16a34a', 'claro')
  expect(tema).toEqual({ acento: esperado['--t-acento'], fondo: esperado['--t-fondo'], personalidad: 'serena' })
})

test('la ficha de un cliente con turno muestra los mensajes que se le mandaron (y el detalle del turno también)', async ({ page }) => {
  const nombre = `Mensajes ${m.sufijo}`
  const cliente = await nuevoCliente(nombre, '11 2345-6789')
  const D = diaAR(3)
  const turno = await crearTurno({ negocio: m.negocioA.id, cliente, profesional: m.profesionales.p2, servicio: m.servicios.corteA, inicio: aISO(D, '10:00') })
  // La base encoló sola la confirmación y los recordatorios; simulamos que la confirmación ya salió y llegó.
  const adm = servicio()
  const ahora = new Date().toISOString()
  const { data: conf } = await adm.from('mensajes').update({ estado: 'enviado', enviado: ahora, entregado: ahora }).eq('turno_id', turno).eq('tipo', 'confirmacion').select('id')
  expect(conf).toHaveLength(1)

  await entrar(page, '/clientes')
  await page.getByLabel('Buscar cliente').fill(nombre)
  await page.getByRole('button', { name: new RegExp(nombre) }).click()
  const ficha = page.getByRole('dialog', { name: nombre })
  const lista = ficha.getByRole('list', { name: 'Historial de mensajes' })
  await expect(lista.getByRole('listitem').filter({ hasText: 'Confirmación del turno' })).toContainText('Entregado')
  await expect(lista.getByRole('listitem').filter({ hasText: 'Recordatorio (24 h antes)' })).toContainText('Programado')
  await expect(lista).toContainText('WhatsApp')
  // El texto del mensaje se puede abrir.
  await lista.getByRole('listitem').filter({ hasText: 'Confirmación del turno' }).locator('summary').click()
  await expect(lista.getByText('Tu turno en Negocio A quedó reservado', { exact: false })).toBeVisible()
  await page.keyboard.press('Escape')

  // Desde la agenda, el detalle del turno muestra lo mismo.
  await page.goto(`/${m.negocioA.slug}/panel?dia=${D}`)
  await page.getByRole('button', { name: `Turno de ${nombre} a las 10:00` }).click()
  const detalle = page.getByRole('dialog', { name: `Turno de ${nombre}` })
  await expect(detalle.getByRole('list', { name: 'Historial de mensajes' }).getByRole('listitem').filter({ hasText: 'Confirmación del turno' })).toContainText('Entregado')
})

test('recuperar un cliente encola el "te extrañamos" y no deja repetirlo', async ({ page, errores }) => {
  const nombre = `Ausente ${m.sufijo}`
  const cliente = await nuevoCliente(nombre, '11 6666-7777')
  await crearTurno({ negocio: m.negocioA.id, cliente, profesional: m.profesionales.p2, servicio: m.servicios.colorA, inicio: aISO(diaAR(-60), '10:00'), estado: 'asistio', minutos: 60 })

  await entrar(page, '/clientes')
  await page.getByRole('button', { name: 'Para recuperar' }).click()
  await expect(page.getByLabel('Sin venir hace más de (días)')).toHaveValue('30')
  const fila = page.getByRole('region', { name: 'Clientes para recuperar' }).getByRole('listitem').filter({ hasText: nombre })
  await expect(fila).toContainText('hace 60 días')
  await expect(fila).toContainText('Color')
  await fila.getByRole('button', { name: 'Mandar “te extrañamos”' }).click()
  await expect(fila).toContainText('Mensaje enviado')
  await expect(fila.getByRole('button', { name: 'Mandar “te extrañamos”' })).toHaveCount(0)

  const { data } = await servicio().from('mensajes').select('tipo, destino, estado, contenido').eq('cliente_id', cliente)
  expect(data).toHaveLength(1)
  expect(data![0]).toMatchObject({ tipo: 'recuperar', destino: '5491166667777', estado: 'pendiente', contenido: { nombre: 'Ausente', negocio: 'Negocio A' } })

  // Aunque se intente de nuevo (por ejemplo, desde otra pestaña), la base no deja repetir.
  errores.permitir(/status of 400/)
  const otra = await m.usuarios.duenoA.db.rpc('panel_recuperar_cliente', { p_cliente: cliente })
  expect(otra.error?.message).toContain('recuperar_reciente')
  await page.reload()
  await page.getByRole('button', { name: 'Para recuperar' }).click()
  await expect(page.getByRole('region', { name: 'Clientes para recuperar' }).getByRole('listitem').filter({ hasText: nombre })).toContainText('Mensaje enviado')

  // Con más días de umbral, ya no aparece.
  await page.getByLabel('Sin venir hace más de (días)').fill('90')
  await expect(page.getByText(nombre)).toHaveCount(0)
})

test('reportes con números correctos para un período conocido y descarga del CSV', async ({ page }) => {
  // Período [hoy-20, hoy-14]: 5 reservados, 1 cancelado, 2 vinieron, 1 no vino, 1 confirmado sin marcar.
  const [c1, c2, c3] = await Promise.all([nuevoCliente(`R1 ${m.sufijo}`), nuevoCliente(`R2 ${m.sufijo}`), nuevoCliente(`R3 ${m.sufijo}`)])
  const t = (cliente: string, prof: string, dia: string, hora: string, estado: string, serv = m.servicios.corteA, minutos = 30) =>
    crearTurno({ negocio: m.negocioA.id, cliente, profesional: prof, servicio: serv, inicio: aISO(dia, hora), estado, minutos })
  await t(c1, m.profesionales.p1, diaAR(-20), '10:00', 'asistio')
  await t(c1, m.profesionales.p1, diaAR(-15), '10:00', 'asistio', m.servicios.colorA, 60)
  await t(c2, m.profesionales.p2, diaAR(-40), '11:00', 'asistio')
  await t(c2, m.profesionales.p2, diaAR(-18), '11:00', 'falto')
  await t(c3, m.profesionales.p1, diaAR(-16), '15:00', 'cancelado')
  await t(c3, m.profesionales.p2, diaAR(-14), '09:00', 'confirmado')

  await entrar(page, '/reportes')
  await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible()
  await page.getByRole('button', { name: 'Rango' }).click()
  await page.getByLabel('Desde').fill(diaAR(-20))
  await page.getByLabel('Hasta').fill(diaAR(-14))

  const dato = (nombre: string) => page.getByRole('article', { name: nombre })
  await expect(dato('Turnos')).toContainText('4')
  await expect(dato('Asistencia')).toContainText('67%')
  await expect(dato('Faltas')).toContainText('1')
  await expect(dato('Cancelaciones')).toContainText('de 5 reservados')
  await expect(dato('Confirmación')).toContainText('75%')
  await expect(dato('Facturación estimada')).toContainText('$49k')
  await expect(dato('Clientes nuevos')).toContainText('2')
  await expect(dato('Clientes recurrentes')).toContainText('1')

  const porProf = page.getByRole('table', { name: 'Turnos por profesional' })
  await expect(porProf.getByRole('row', { name: /P1/ })).toContainText('37.000')
  await expect(page.getByRole('table', { name: 'Turnos por servicio' }).getByRole('row', { name: /Color/ })).toContainText('1')
  await expect(page.getByRole('list', { name: 'Turnos por hora' }).getByRole('listitem').filter({ hasText: '10:00' })).toContainText('2')

  // Filtrar por profesional.
  await page.getByLabel('Profesional', { exact: true }).selectOption({ label: 'P2' })
  await expect(dato('Turnos')).toContainText('2')
  await expect(dato('Faltas')).toContainText('1')
  await page.getByLabel('Profesional', { exact: true }).selectOption({ label: 'Todos' })
  await expect(dato('Turnos')).toContainText('4')

  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar CSV' }).click()
  const archivo = await descarga
  expect(archivo.suggestedFilename()).toBe(`reporte-${m.negocioA.slug}-${diaAR(-20)}-a-${diaAR(-14)}.csv`)
  const csv = (await readFile((await archivo.path())!, 'utf8')).replace(/^﻿/, '')
  const lineas = csv.split('\r\n')
  expect(lineas).toContain('Turnos (sin cancelados);4')
  expect(lineas).toContain('Asistencia;67%')
  expect(lineas).toContain('Facturación estimada ($);49000')
  expect(lineas).toContain('P1;2;2;0;1;37000')
  expect(lineas).toContain('P2;2;0;1;0;12000')
  expect(lineas).toContain('Corte;3;1;24000')
})

test('el dueño vincula su cuenta a un profesional ("yo también atiendo") y tiene agenda propia', async ({ page }) => {
  await entrar(page, '/equipo')
  const tarjeta = page.getByRole('region', { name: '¿Vos también atendés?' })
  await tarjeta.getByLabel('Mi ficha de profesional').selectOption({ label: 'P2' })
  await tarjeta.getByRole('button', { name: 'Vincular mi cuenta' }).click()
  await expect(tarjeta.getByText('Listo: ya tenés tu propia agenda.')).toBeVisible()
  await expect(tarjeta).toContainText('Tu cuenta tiene la agenda de P2')
  const { data } = await servicio().from('profesionales').select('user_id').eq('id', m.profesionales.p2).single()
  expect(data).toEqual({ user_id: m.usuarios.duenoA.id })
  await expect(page.getByRole('list', { name: 'Miembros' })).toContainText('P2')

  // En la agenda aparece su ficha marcada y sigue viendo todo el negocio.
  await page.getByRole('navigation', { name: 'Secciones del panel' }).getByRole('link', { name: 'Agenda' }).click()
  await expect(page.getByRole('button', { name: 'P2 (vos)' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true')

  // Y se puede desvincular.
  await page.getByRole('navigation', { name: 'Secciones del panel' }).getByRole('link', { name: 'Equipo' }).click()
  await tarjeta.getByRole('button', { name: 'Desvincular' }).click()
  await tarjeta.getByRole('button', { name: 'Sí, desvincular' }).click()
  await expect(tarjeta.getByText('Listo: tu cuenta ya no tiene agenda propia.')).toBeVisible()
  const { data: despues } = await servicio().from('profesionales').select('user_id').eq('id', m.profesionales.p2).single()
  expect(despues).toEqual({ user_id: null })
})

test('un turno nuevo que entra con el panel abierto se avisa (pero no los que carga el propio dueño)', async ({ page }) => {
  const D = diaAR(4)
  const [ajeno, propio] = await Promise.all([nuevoCliente(`Llega ${m.sufijo}`), nuevoCliente(`Mío ${m.sufijo}`)])
  await entrar(page)
  await expect(page.getByRole('region', { name: 'Agenda' }).or(page.getByText('No hay turnos este día.'))).toBeVisible()

  // Lo carga el propio dueño (creado_por = su usuario): no se avisa.
  const adm = servicio()
  await adm.from('turnos').insert({
    negocio_id: m.negocioA.id, cliente_id: propio, profesional_id: m.profesionales.p1, servicio_id: m.servicios.corteA,
    inicio: aISO(D, '15:00'), fin: aISO(D, '15:30'), estado: 'confirmado', origen: 'manual', creado_por: m.usuarios.duenoA.id,
  })
  // Lo saca otra persona: sí.
  await crearTurno({ negocio: m.negocioA.id, cliente: ajeno, profesional: m.profesionales.p2, servicio: m.servicios.corteA, inicio: aISO(D, '11:00') })

  const avisos = page.getByRole('status', { name: 'Turnos nuevos' })
  await expect(avisos).toContainText(`Llega ${m.sufijo}`, { timeout: 10_000 })
  await expect(avisos).toContainText('Corte con P2')
  await expect(avisos).not.toContainText(`Mío ${m.sufijo}`)
  await avisos.getByRole('link', { name: 'Ver en la agenda' }).click()
  await expect(page).toHaveURL(new RegExp(`dia=${D}`))
  await expect(page.getByRole('button', { name: `Turno de Llega ${m.sufijo} a las 11:00` })).toBeVisible()
  await expect(avisos).not.toContainText(`Llega ${m.sufijo}`)
})

test('el profesional ve "Mis números" (solo lo suyo) sin la navegación del dueño', async ({ page }) => {
  await page.goto(`/${m.negocioA.slug}/panel`)
  await page.getByLabel('Tu mail').fill(m.usuarios.profesionalA.email)
  await page.getByLabel('Contraseña').fill(CLAVE)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Tu agenda' })).toBeVisible()
  await page.getByRole('link', { name: 'Mis números' }).click()
  await expect(page.getByRole('heading', { name: 'Tus números' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Secciones del panel' })).toHaveCount(0)
  await expect(page.getByLabel('Profesional', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('table', { name: 'Turnos por profesional' })).toHaveCount(0)
  // Las secciones del dueño siguen cerradas aunque se escriba el link.
  await page.goto(`/${m.negocioA.slug}/panel/marca`)
  await expect(page.getByRole('heading', { level: 1, name: 'Tu agenda' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Marca' })).toHaveCount(0)
  await page.goto(`/${m.negocioA.slug}/panel/reportes`)
  await page.getByRole('link', { name: 'Volver a la agenda' }).click()
  await expect(page.getByRole('button', { name: 'Bloquear', exact: true })).toBeVisible()
})
