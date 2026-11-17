// Consola de plataforma (/admin) contra la Supabase LOCAL: secciones, estado de un negocio (y que bloqueado
// no toma turnos), cuenta de dueño creada desde la consola que entra a su panel, y registro de mensajes sin códigos.
import type { Page } from '@playwright/test'
import { anonimo, CLAVE, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../../soporte/mundo'
import { libres } from '../../permisos/ayuda'
import { expect, sinErrores, test, vigilar } from '../ayudantes'

test.describe.configure({ mode: 'default' })

let m: Mundo
const mensajes: string[] = []
const cuentas: string[] = []
const CODIGO = '739182'

test.beforeAll(async () => {
  m = await prepararMundo()
})
test.afterAll(async () => {
  const adm = servicio()
  if (mensajes.length) await adm.from('mensajes').delete().in('id', mensajes)
  await Promise.all(cuentas.map((id) => adm.auth.admin.deleteUser(id)))
  await limpiarMundo(m)
})

async function entrar(page: Page, ruta = '/admin') {
  await page.goto(ruta)
  await page.getByLabel('Tu mail').fill(m.usuarios.superadmin.email)
  await page.getByLabel('Contraseña').fill(CLAVE)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

const nav = (page: Page) => page.getByRole('navigation', { name: 'Secciones de la consola' })
const h1 = (page: Page) => page.getByRole('heading', { level: 1 })

async function abrirFicha(page: Page) {
  await entrar(page, '/admin/negocios')
  await page.getByLabel('Buscar negocio').fill(m.negocioA.slug)
  await page.getByRole('link', { name: 'Ver ficha de Negocio A' }).click()
  await expect(page).toHaveURL(new RegExp(`/admin/negocios\\?id=${m.negocioA.id}$`))
  await expect(page.getByRole('region', { name: 'Datos del negocio' }).getByRole('heading', { name: 'Negocio A' })).toBeVisible()
}

test('se navega por todas las secciones de la consola', async ({ page }) => {
  await entrar(page)
  await expect(h1(page)).toHaveText('Resumen')
  await expect(page.getByRole('heading', { name: 'Negocios reales' })).toBeVisible()
  await expect(nav(page).getByRole('link')).toHaveText(['Resumen', 'Negocios', 'Demos', 'Alta real', 'Cuentas', 'Mensajes'])

  const secciones = [
    ['Negocios', '/admin/negocios', 'Negocios'],
    ['Demos', '/admin/demos', 'Nueva demo'],
    ['Alta real', '/admin/nuevo', 'Nuevo negocio real'],
    ['Cuentas', '/admin/cuentas', 'Cuentas'],
    ['Mensajes', '/admin/mensajes', 'Mensajes'],
    ['Resumen', '/admin', 'Resumen'],
  ] as const
  for (const [link, ruta, titulo] of secciones) {
    await nav(page).getByRole('link', { name: link }).click()
    await expect(page).toHaveURL(new RegExp(`${ruta}$`))
    await expect(h1(page)).toHaveText(titulo)
    await expect(nav(page).getByRole('link', { name: link })).toHaveAttribute('aria-current', 'page')
    await page.waitForLoadState('networkidle')
    // En el celular no hay scroll horizontal.
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), ruta).toBeLessThanOrEqual(0)
  }
})

test('bloquear un negocio por falta de pago pide confirmación, deja de tomar turnos y se puede reactivar', async ({ page }) => {
  const dia = diaAR(2)
  expect((await libres(anonimo(), m.negocioA.id, m.servicios.corteA, dia)).length).toBeGreaterThan(0)
  await abrirFicha(page)
  try {
    const estado = page.getByRole('group', { name: 'Estado del negocio' })
    await expect(estado.getByRole('button', { name: 'Activo' })).toHaveAttribute('aria-pressed', 'true')
    await estado.getByRole('button', { name: 'Bloqueado' }).click()
    const confirmar = page.getByRole('alertdialog', { name: 'Confirmar cambio de estado' })
    await expect(confirmar).toContainText('la app no toma turnos')
    // Cancelar no cambia nada.
    await confirmar.getByRole('button', { name: 'Cancelar' }).click()
    await expect(confirmar).toHaveCount(0)
    expect((await servicio().from('negocios').select('estado').eq('id', m.negocioA.id).single()).data).toEqual({ estado: 'activo' })

    await estado.getByRole('button', { name: 'Bloqueado' }).click()
    await page.getByRole('button', { name: 'Sí, bloquear por falta de pago' }).click()
    await expect(estado.getByRole('button', { name: 'Bloqueado' })).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(async () => (await servicio().from('negocios').select('estado').eq('id', m.negocioA.id).single()).data?.estado).toBe('suspendido')
    // Bloqueado: no hay horarios libres para nadie.
    expect(await libres(anonimo(), m.negocioA.id, m.servicios.corteA, dia)).toEqual([])
    expect(await libres(m.usuarios.cliente1.db, m.negocioA.id, m.servicios.corteA, dia)).toEqual([])

    await estado.getByRole('button', { name: 'Activo' }).click()
    await page.getByRole('button', { name: 'Sí, pasar a activo' }).click()
    await expect(estado.getByRole('button', { name: 'Activo' })).toHaveAttribute('aria-pressed', 'true')
    expect((await libres(anonimo(), m.negocioA.id, m.servicios.corteA, dia)).length).toBeGreaterThan(0)
  } finally {
    await m.usuarios.superadmin.db.from('negocios').update({ estado: 'activo' }).eq('id', m.negocioA.id)
  }
})

test('la ficha muestra dueños, equipo e invitaciones, y guarda plan y notas internas', async ({ page }) => {
  const { error } = await servicio().from('invitaciones').insert({ negocio_id: m.negocioA.id, email: `invitado-${m.sufijo}@ejemplo.com`, rol: 'profesional', nombre: 'Invitado' })
  expect(error).toBeNull()
  await abrirFicha(page)
  const equipo = page.getByRole('list', { name: 'Equipo' })
  await expect(equipo.getByText(m.usuarios.duenoA.email)).toBeVisible()
  await expect(equipo.getByText(m.usuarios.profesionalA.email)).toBeVisible()
  await expect(page.getByRole('list', { name: 'Invitaciones' }).getByText(`invitado-${m.sufijo}@ejemplo.com`)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Abrir su panel' })).toHaveAttribute('href', `/${m.negocioA.slug}/panel`)
  await expect(page.getByRole('link', { name: 'Abrir su app' })).toHaveAttribute('href', `/${m.negocioA.slug}`)

  await page.getByLabel('Plan', { exact: true }).selectOption('Pro')
  await page.getByLabel('Notas internas', { exact: true }).fill('Paga por transferencia')
  await page.getByRole('button', { name: 'Guardar plan y notas' }).click()
  await expect(page.getByText('Guardado.')).toBeVisible()
  expect((await servicio().from('negocios').select('plan').eq('id', m.negocioA.id).single()).data).toEqual({ plan: 'Pro' })
  expect((await servicio().from('negocios_internos').select('notas_internas').eq('negocio_id', m.negocioA.id).single()).data).toEqual({ notas_internas: 'Paga por transferencia' })
})

test('SawaTek crea la cuenta del dueño desde la consola y con esa contraseña entra al panel', async ({ page, browser }) => {
  const disponible = await fetch(`${process.env.SB_URL}/functions/v1/admin-usuarios`, { method: 'OPTIONS' }).then((r) => r.ok, () => false)
  test.skip(!disponible, 'El edge runtime no está sirviendo admin-usuarios (correr: pnpm exec supabase functions serve)')

  const email = `dueno-consola-${m.sufijo}@ejemplo.com`
  await entrar(page, '/admin/cuentas')
  await page.getByLabel('Nombre y apellido').fill('Dueña Consola')
  await page.getByLabel('Mail', { exact: true }).fill(email)
  await page.getByLabel('Negocio', { exact: true }).selectOption({ label: `Negocio A (/${m.negocioA.slug})` })
  await expect(page.getByRole('button', { name: 'Dueño', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Crear cuenta' }).click()

  const generada = page.getByRole('region', { name: 'Contraseña generada' })
  await expect(generada).toContainText(`Contraseña de ${email}`)
  const contrasena = (await generada.getByTestId('contrasena').textContent())!.trim()
  expect(contrasena).toMatch(/^\S{4}-\S{4}-\S{4}$/)
  const creada = (await servicio().auth.admin.listUsers({ perPage: 1000 })).data.users.find((u) => u.email === email)
  expect(creada).toBeDefined()
  cuentas.push(creada!.id)
  await expect(generada.getByRole('link', { name: `${new URL(page.url()).host}/${m.negocioA.slug}/panel` })).toBeVisible()

  // La cuenta aparece en la lista con su negocio y rol.
  await expect(page.getByRole('region', { name: 'Cuentas' }).getByRole('listitem').filter({ hasText: email })).toContainText('Negocio A · Dueño')

  // Otro dispositivo: el dueño entra a su panel con mail y la contraseña que le pasaron.
  const ctx = await browser.newContext()
  try {
    const otra = await ctx.newPage()
    const v = vigilar(otra, 'dueño')
    await otra.goto(`/${m.negocioA.slug}/panel`)
    await otra.getByLabel('Tu mail').fill(email)
    await otra.getByLabel('Contraseña').fill(contrasena)
    await otra.getByRole('button', { name: 'Entrar' }).click()
    await expect(otra.getByRole('heading', { level: 1, name: 'Negocio A' })).toBeVisible()
    await expect(otra.getByRole('navigation', { name: 'Secciones del panel' }).getByRole('link', { name: 'Equipo' })).toBeVisible()
    sinErrores(v)
  } finally {
    await ctx.close()
  }
})

test('el registro de mensajes filtra por negocio y tipo, y nunca muestra el código de ingreso', async ({ page }) => {
  const filas = await servicio()
    .from('mensajes')
    .insert([
      { tipo: 'codigo', canal: 'whatsapp', destino: '5491166667777', contenido: { codigo: CODIGO }, estado: 'enviado' },
      { tipo: 'confirmacion', canal: 'whatsapp', destino: '5491188889999', negocio_id: m.negocioA.id, contenido: { texto: `Turno confirmado ${m.sufijo}` }, estado: 'enviado' },
    ])
    .select('id')
  expect(filas.error).toBeNull()
  mensajes.push(...filas.data!.map((f) => f.id))

  await entrar(page, '/admin/mensajes')
  const registro = page.getByRole('region', { name: 'Registro de mensajes' })
  await page.getByLabel('Negocio', { exact: true }).selectOption({ label: `Negocio A (/${m.negocioA.slug})` })
  await expect(registro.getByText(`Turno confirmado ${m.sufijo}`)).toBeVisible()
  await expect(registro.getByRole('listitem')).toHaveCount(1)

  await page.getByLabel('Negocio', { exact: true }).selectOption('')
  await page.getByLabel('Tipo', { exact: true }).selectOption('codigo')
  await expect(registro.getByText('Código de ingreso: no se muestra.').first()).toBeVisible()
  await expect(registro.getByText(`Turno confirmado ${m.sufijo}`)).toHaveCount(0)
  expect(await page.content()).not.toContain(CODIGO)
  expect(await page.content()).not.toContain('5491166667777')
})

test('borrar un negocio pide dos confirmaciones (la segunda, escribir su link)', async ({ page }) => {
  await entrar(page, `/admin/negocios?id=${m.negocioB.id}`)
  const zona = page.getByRole('region', { name: 'Borrar negocio' })
  await zona.getByRole('button', { name: 'Borrar Negocio B' }).click()
  const definitivo = zona.getByRole('button', { name: 'Borrar para siempre' })
  await expect(definitivo).toBeDisabled()
  await zona.getByLabel(`Para confirmar, escribí ${m.negocioB.slug}`).fill('otro-link')
  await expect(definitivo).toBeDisabled()
  await zona.getByLabel(`Para confirmar, escribí ${m.negocioB.slug}`).fill(m.negocioB.slug)
  await definitivo.click()
  await expect(page).toHaveURL(/\/admin\/negocios$/)
  await expect.poll(async () => (await servicio().from('negocios').select('id').eq('id', m.negocioB.id)).data).toEqual([])
})
