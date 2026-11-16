// Edge Functions de la fase 4, de punta a punta contra `supabase functions serve` (proveedor "consola"):
//   · enviar-mensajes: solo con el secreto; manda lo vencido y lo marca enviado.
//   · whatsapp-webhook: verificación GET, firma X-Hub-Signature-256, botón "Confirmo" / "Cambiar horario"
//     y estados de entrega.
// Correr con: pnpm exec playwright test -c tests/funciones
import { createHmac } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { aISO, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../soporte/mundo'
import { ENTORNO_FUNCIONES as E } from './entorno'

test.describe.configure({ mode: 'default' })

const BASE = `${process.env.SB_URL}/functions/v1`
const TEL = '5491112345678'

interface FilaMensaje {
  id: string
  tipo: string
  canal: string
  estado: string
  proveedor_id: string | null
  entregado: string | null
  leido: string | null
  error: string | null
  contenido: Record<string, string>
}

let m: Mundo

async function ok<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<NonNullable<T>> {
  const { data, error } = await p
  if (error) throw new Error(JSON.stringify(error))
  return data as NonNullable<T>
}
const mensajesDe = async (turno: string) =>
  (await ok(servicio().from('mensajes').select('*').eq('turno_id', turno).order('creado'))) as FilaMensaje[]
const estadoTurno = async (id: string) => ((await ok(servicio().from('turnos').select('estado').eq('id', id).single())) as { estado: string }).estado

async function reservar(hora: string) {
  const r = await m.usuarios.cliente1.db.rpc('reservar_turno', {
    p_negocio: m.negocioA.id,
    p_servicio: m.servicios.corteA,
    p_inicio: aISO(diaAR(3), hora),
    p_profesional: m.profesionales.p1,
  })
  expect(r.error).toBeNull()
  return r.data as string
}

const despachar = (cuerpo: unknown = { negocio_id: m.negocioA.id }, secreto: string = E.MENSAJES_SECRETO) =>
  fetch(`${BASE}/enviar-mensajes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secreto}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  })

const firmar = (cuerpo: string, secreto: string = E.WHATSAPP_APP_SECRET) => `sha256=${createHmac('sha256', secreto).update(cuerpo).digest('hex')}`

/** Aviso de Meta con lo que mandamos adentro de "value". */
const avisoMeta = (value: Record<string, unknown>) =>
  JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ id: 'WABA-PRUEBA', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '123' }, ...value } }] }],
  })
const boton = (payload: string, from = TEL) =>
  avisoMeta({
    contacts: [{ wa_id: from, profile: { name: 'Ana' } }],
    messages: [{ from, id: `wamid.${Math.random().toString(36).slice(2)}`, timestamp: `${Math.floor(Date.now() / 1000)}`, type: 'button', button: { payload, text: 'Confirmo' } }],
  })

const webhook = (cuerpo: string, firma: string | null = firmar(cuerpo)) =>
  fetch(`${BASE}/whatsapp-webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(firma ? { 'X-Hub-Signature-256': firma } : {}) },
    body: cuerpo,
  })

/** Espera a que se cumpla una condición (el webhook manda la respuesta en segundo plano). */
async function esperar(cond: () => Promise<boolean>, ms = 15_000) {
  const hasta = Date.now() + ms
  while (Date.now() < hasta) {
    if (await cond()) return
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('No se cumplió a tiempo')
}

test.beforeAll(async () => {
  m = await prepararMundo()
  // cliente1 ya es cliente del negocio A, con celular.
  await ok(servicio().from('clientes').insert({ negocio_id: m.negocioA.id, user_id: m.usuarios.cliente1.id, nombre: 'Ana', telefono: '11 1234-5678' }).select('id'))
})
test.afterAll(async () => {
  await limpiarMundo(m)
})
test.beforeEach(async () => {
  await servicio().from('turnos').delete().eq('negocio_id', m.negocioA.id)
})

test.describe('enviar-mensajes (despachador)', () => {
  test('sin el secreto: 401 y no toca nada', async () => {
    const turno = await reservar('10:00')
    expect((await despachar(undefined, 'otro')).status).toBe(401)
    expect((await fetch(`${BASE}/enviar-mensajes`, { method: 'POST', body: '{}' })).status).toBe(401)
    expect((await mensajesDe(turno)).every((f) => f.estado === 'pendiente')).toBe(true)
  })

  test('con proveedor consola: manda lo vencido y lo marca enviado; lo programado queda para después', async () => {
    const turno = await reservar('10:00')
    // Un push para el mismo cliente (sin claves VAPID, en modo consola se registra y listo).
    await ok(
      m.usuarios.cliente1.db.rpc('guardar_push', {
        p_negocio: m.negocioA.id,
        p_endpoint: `https://fcm.googleapis.com/fcm/send/prueba-${m.sufijo}`,
        p_p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
        p_auth: 'tBHItJI5svbpez7KI4CCXg',
      }),
    )
    const push = (await mensajesDe(turno)).find((f) => f.canal === 'push')!
    await ok(servicio().from('mensajes').update({ programado: new Date(Date.now() - 1000).toISOString() }).eq('id', push.id).select('id'))

    const r = await despachar()
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ tomados: 2, enviados: 2, errores: 0, reintentos: 0 })

    const filas = await mensajesDe(turno)
    const conf = filas.find((f) => f.tipo === 'confirmacion')!
    expect(conf.estado).toBe('enviado')
    expect(conf.proveedor_id).toBe(`consola-${conf.id}`)
    expect(filas.find((f) => f.canal === 'push')!.estado).toBe('enviado')
    for (const tipo of ['recordatorio24', 'recordatorio2']) {
      expect(filas.find((f) => f.tipo === tipo && f.canal === 'whatsapp')!.estado, tipo).toBe('pendiente')
    }
    // Una segunda pasada no encuentra nada.
    expect(await (await despachar()).json()).toMatchObject({ tomados: 0 })
    await servicio().from('push_suscripciones').delete().eq('negocio_id', m.negocioA.id)
  })
})

test.describe('whatsapp-webhook', () => {
  test('verificación GET: con el verify token responde el desafío; sin él, 403', async () => {
    const bien = await fetch(`${BASE}/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=${E.WHATSAPP_VERIFY_TOKEN}&hub.challenge=desafio-123`)
    expect(bien.status).toBe(200)
    expect(await bien.text()).toBe('desafio-123')
    expect((await fetch(`${BASE}/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=x`)).status).toBe(403)
    expect((await fetch(`${BASE}/whatsapp-webhook`)).status).toBe(403)
  })

  test('firma inválida o ausente: 401 y no confirma', async () => {
    const turno = await reservar('10:00')
    const cuerpo = boton(`CONFIRMAR:${turno}`)
    expect((await webhook(cuerpo, firmar(cuerpo, 'otro-secreto'))).status).toBe(401)
    expect((await webhook(cuerpo, null)).status).toBe(401)
    // Cuerpo cambiado después de firmar.
    expect((await webhook(cuerpo.replace('Confirmo', 'Confirmo!'), firmar(cuerpo))).status).toBe(401)
    expect(await estadoTurno(turno)).toBe('pendiente')
  })

  test('botón "Confirmo" con firma válida: confirma el turno y responde enseguida', async () => {
    const turno = await reservar('10:00')
    const r = await webhook(boton(`CONFIRMAR:${turno}`))
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ ok: true, resultados: [{ accion: 'confirmar', turno, resultado: 'confirmado' }] })
    expect(await estadoTurno(turno)).toBe('confirmado')
    // El "¡Gracias!" sale solo, sin esperar al cron.
    await esperar(async () => (await mensajesDe(turno)).some((f) => f.tipo === 'aviso' && f.estado === 'enviado'))
  })

  test('botón "Confirmo" desde otro teléfono: no confirma', async () => {
    const turno = await reservar('11:00')
    const r = await webhook(boton(`CONFIRMAR:${turno}`, '5491199999999'))
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ resultados: [{ resultado: 'telefono_no_coincide' }] })
    expect(await estadoTurno(turno)).toBe('pendiente')
  })

  test('botón "Cambiar horario": manda el link a la app del negocio', async () => {
    const turno = await reservar('12:00')
    const r = await webhook(boton(`CAMBIAR:${turno}`))
    expect(await r.json()).toMatchObject({ resultados: [{ accion: 'cambiar', resultado: 'aviso_encolado' }] })
    await esperar(async () => (await mensajesDe(turno)).some((f) => f.tipo === 'aviso' && f.contenido.motivo === 'cambio' && f.estado === 'enviado'))
    expect(await estadoTurno(turno)).toBe('pendiente')
  })

  test('estados de entrega: entregado, leído y fallido se anotan por el id de WhatsApp', async () => {
    const turno = await reservar('14:00')
    const [conf, r24] = (await mensajesDe(turno)).filter((f) => f.tipo !== 'recordatorio2')
    const adm = servicio()
    await ok(adm.from('mensajes').update({ estado: 'enviado', proveedor_id: `wamid.ok-${m.sufijo}` }).eq('id', conf!.id).select('id'))
    await ok(adm.from('mensajes').update({ estado: 'enviado', proveedor_id: `wamid.mal-${m.sufijo}` }).eq('id', r24!.id).select('id'))
    const ts = `${Math.floor(Date.now() / 1000)}`
    const cuerpo = avisoMeta({
      statuses: [
        { id: `wamid.ok-${m.sufijo}`, status: 'delivered', timestamp: ts, recipient_id: TEL },
        { id: `wamid.ok-${m.sufijo}`, status: 'read', timestamp: ts, recipient_id: TEL },
        { id: `wamid.mal-${m.sufijo}`, status: 'failed', timestamp: ts, recipient_id: TEL, errors: [{ code: 131026, title: 'Message undeliverable' }] },
      ],
    })
    expect((await webhook(cuerpo)).status).toBe(200)
    const filas = await mensajesDe(turno)
    const a = filas.find((f) => f.id === conf!.id)!
    const b = filas.find((f) => f.id === r24!.id)!
    expect(a.estado).toBe('enviado')
    expect(a.entregado).not.toBeNull()
    expect(a.leido).not.toBeNull()
    expect(b.estado).toBe('error')
    expect(b.error).toContain('131026')
  })
})

