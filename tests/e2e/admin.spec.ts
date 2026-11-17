// /admin/demos contra la Supabase LOCAL: ingreso, alta de una demo por un superadmin, permisos y borrado.
// Corre en serie: el borrado usa la demo que crea el test anterior.
import type { Page } from '@playwright/test'
import { CLAVE, crearUsuario, servicio, type Usuario } from '../soporte/mundo'
import { expect, sinErrores, test, vigilar } from './ayudantes'

test.describe.configure({ mode: 'serial' })

const sufijo = Math.random().toString(36).slice(2, 8)
const nombreDemo = `Barberia E2E ${sufijo}`
const slugDemo = `barberia-e2e-${sufijo}`
const nombreSinPermiso = `Intento E2E ${sufijo}`
const slugSinPermiso = `intento-e2e-${sufijo}`

let superadmin: Usuario
let comun: Usuario

test.beforeAll(async () => {
  ;[superadmin, comun] = await Promise.all([crearUsuario(`super-e2e-${sufijo}@ejemplo.com`), crearUsuario(`comun-e2e-${sufijo}@ejemplo.com`)])
  const { error } = await servicio().from('superadmins').insert({ email: superadmin.email })
  if (error) throw error
})

test.afterAll(async () => {
  const adm = servicio()
  await adm.from('negocios').delete().in('slug', [slugDemo, slugSinPermiso])
  await adm.from('superadmins').delete().eq('email', superadmin.email)
  await Promise.all([superadmin, comun].filter(Boolean).map((u) => adm.auth.admin.deleteUser(u.id)))
})

async function entrar(page: Page, email: string, contrasena: string) {
  await page.goto('/admin/demos')
  await expect(page.getByRole('heading', { name: 'Consola de SawaTek' })).toBeVisible()
  await page.getByLabel('Tu mail').fill(email)
  await page.getByLabel('Contraseña').fill(contrasena)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

async function filaDemo(slug: string) {
  const { data, error } = await servicio().from('negocios').select('slug, es_demo, config').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data as { slug: string; es_demo: boolean; config: { nombre: string } } | null
}

test('contraseña equivocada → "Mail o contraseña incorrectos."', async ({ page, errores }) => {
  // Supabase responde 400 al login fallido: el navegador lo loguea, la app lo muestra bien.
  errores.permitir(/status of 400/)
  await entrar(page, superadmin.email, 'no-es-la-clave')
  await expect(page.getByText('Mail o contraseña incorrectos.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Nueva demo' })).toHaveCount(0)
})

test('un superadmin crea una demo, queda en la nube y abre en otro dispositivo sin sesión', async ({ page, browser }) => {
  await entrar(page, superadmin.email, CLAVE)
  await expect(page.getByRole('heading', { name: 'Nueva demo' })).toBeVisible()

  await page.getByLabel('Nombre', { exact: true }).fill(nombreDemo)
  await page.getByRole('button', { name: 'Uñas', exact: true }).click()
  await expect(page.getByLabel('Dirección de la demo')).toHaveValue(slugDemo)
  await page.getByRole('button', { name: 'Crear demo' }).click()

  const creada = page.getByRole('region', { name: 'Demo creada' })
  await expect(creada.getByText('¡Demo lista!')).toBeVisible()
  await expect(creada.getByText('Guardada en la nube', { exact: false })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Demos creadas' }).getByText(`/${slugDemo}`)).toBeVisible()

  // La fila existe en la base, como demo.
  const fila = await filaDemo(slugDemo)
  expect(fila).not.toBeNull()
  expect(fila!.es_demo).toBe(true)
  expect(fila!.config.nombre).toBe(nombreDemo)

  // Otro dispositivo, sin sesión: el link abre la app con la marca del negocio.
  const ctx = await browser.newContext()
  try {
    const otra = await ctx.newPage()
    const v = vigilar(otra, 'visitante')
    await otra.goto(`/${slugDemo}`)
    await expect(otra.getByRole('heading', { level: 1, name: nombreDemo })).toBeVisible()
    await expect(otra.getByRole('button', { name: 'Recibir código por WhatsApp' })).toBeVisible()
    sinErrores(v)
  } finally {
    await ctx.close()
  }
})

test('un usuario logueado que NO es superadmin no entra a la consola ni puede crear demos', async ({ page }) => {
  await entrar(page, comun.email, CLAVE)
  await expect(page.getByRole('heading', { name: 'Esta cuenta no es de SawaTek' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Nueva demo' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Crear demo' })).toHaveCount(0)
  // Aunque se saltee la pantalla, la base rechaza el alta (RLS).
  const r = await comun.db.from('negocios').insert({ slug: slugSinPermiso, config: { slug: slugSinPermiso, nombre: nombreSinPermiso }, es_demo: true })
  expect(r.error).not.toBeNull()
  expect(await filaDemo(slugSinPermiso)).toBeNull()
  // Y puede salir.
  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page.getByRole('heading', { name: 'Consola de SawaTek' })).toBeVisible()
})

test('el superadmin borra la demo desde "Demos creadas" y desaparece de la base', async ({ page }) => {
  expect(await filaDemo(slugDemo), 'la demo del test anterior tiene que existir').not.toBeNull()
  await entrar(page, superadmin.email, CLAVE)
  const lista = page.getByRole('region', { name: 'Demos creadas' })
  await expect(lista.getByText(`/${slugDemo}`)).toBeVisible()

  const dialogos: string[] = []
  page.on('dialog', (d) => {
    dialogos.push(d.message())
    void d.accept()
  })
  await lista.getByRole('button', { name: `Borrar la demo de ${nombreDemo}` }).click()

  await expect(lista.getByText(`/${slugDemo}`)).toHaveCount(0)
  expect(dialogos).toEqual([`¿Borrar la demo de ${nombreDemo}? No se puede deshacer.`])
  await expect.poll(() => filaDemo(slugDemo)).toBeNull()
})

