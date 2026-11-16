// /admin: SawaTek da de alta un negocio REAL (no demo) con la plantilla del rubro e invita al dueño.
import { CLAVE, crearUsuario, servicio, type Usuario } from '../soporte/mundo'
import { expect, test } from './ayudantes'

test.describe.configure({ mode: 'serial' })

const sufijo = Math.random().toString(36).slice(2, 8)
const nombre = `Peluqueria Real ${sufijo}`
const slug = `peluqueria-real-${sufijo}`
const mailDueno = `dueno-real-e2e-${sufijo}@ejemplo.com`

let superadmin: Usuario

test.beforeAll(async () => {
  superadmin = await crearUsuario(`super-real-${sufijo}@ejemplo.com`)
  const { error } = await servicio().from('superadmins').insert({ email: superadmin.email })
  if (error) throw error
})

test.afterAll(async () => {
  const adm = servicio()
  await adm.from('negocios').delete().eq('slug', slug)
  await adm.from('superadmins').delete().eq('email', superadmin.email)
  await adm.auth.admin.deleteUser(superadmin.id)
})

test('SawaTek crea un negocio real: queda con servicios, equipo, horarios e invitación al dueño', async ({ page }) => {
  await page.goto('/admin')
  await page.getByLabel('Tu mail').fill(superadmin.email)
  await page.getByLabel('Contraseña').fill(CLAVE)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Nueva demo' })).toBeVisible()

  await page.getByLabel('Nombre', { exact: true }).fill(nombre)
  await page.getByRole('button', { name: 'Peluquería / estética', exact: true }).click()
  await page.getByRole('button', { name: /Negocio real/ }).click()
  await page.getByLabel('Mail del dueño').fill(mailDueno)
  await expect(page.getByLabel('Dirección del negocio')).toHaveValue(slug)
  await page.getByRole('button', { name: 'Crear negocio real' }).click()

  await expect(page.getByText('¡Negocio creado!')).toBeVisible()
  await expect(page.getByText(mailDueno)).toBeVisible()
  // Aparece en la lista de negocios reales, con acceso al panel.
  const lista = page.getByRole('region', { name: 'Negocios reales' })
  await expect(lista.getByText(nombre)).toBeVisible()
  await expect(lista.getByRole('link', { name: 'Panel' })).toHaveAttribute('href', `/${slug}/panel`)

  const adm = servicio()
  const neg = (await adm.from('negocios').select('id, es_demo').eq('slug', slug).single()).data!
  expect(neg.es_demo).toBe(false)
  const [servicios, profesionales, inv] = await Promise.all([
    adm.from('servicios').select('id').eq('negocio_id', neg.id),
    adm.from('profesionales').select('id').eq('negocio_id', neg.id),
    adm.from('invitaciones').select('email, rol').eq('negocio_id', neg.id),
  ])
  expect(servicios.data).toHaveLength(4)
  expect(profesionales.data).toHaveLength(3)
  expect(inv.data).toEqual([{ email: mailDueno, rol: 'dueno' }])
})

test('el link del negocio real abre la app real (no la demo) en otro dispositivo', async ({ browser }) => {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto(`/${slug}`)
  await expect(page.getByText(nombre).first()).toBeVisible()
  // La demo simulada pide "Recibir código por WhatsApp" con nombre; la real no muestra datos de ejemplo.
  await expect(page.getByText('Demo hecha por SawaTek')).toHaveCount(0)
  await ctx.close()
})
