// Negocio bloqueado por falta de pago, en el navegador: el dueño y el profesional ven el cartel de pago
// pendiente en vez del panel, el cliente ve "no disponible", SawaTek sigue entrando y al desbloquear vuelve todo.
import type { Page } from '@playwright/test'
import { CLAVE, limpiarMundo, prepararMundo, type Mundo } from '../../soporte/mundo'
import { cambiarNegocio } from '../../permisos/ayuda'
import { expect, test } from '../ayudantes'

test.describe.configure({ mode: 'default' })

let m: Mundo
test.beforeAll(async () => {
  m = await prepararMundo()
  await cambiarNegocio(m, m.negocioA.id, { estado: 'suspendido' })
})
test.afterAll(async () => {
  if (!m) return
  await cambiarNegocio(m, m.negocioA.id, { estado: 'activo' })
  await limpiarMundo(m)
})

async function entrar(page: Page, email: string) {
  await page.goto(`/${m.negocioA.slug}/panel`)
  await page.getByLabel('Tu mail').fill(email)
  await page.getByLabel('Contraseña').fill(CLAVE)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

const nav = (page: Page) => page.getByRole('navigation', { name: 'Secciones del panel' })

test('el dueño ve el cartel de pago pendiente y no el panel', async ({ page }) => {
  await entrar(page, m.usuarios.duenoA.email)
  await expect(page.getByRole('heading', { level: 1, name: 'Pago pendiente' })).toBeVisible()
  await expect(page.getByText('está pausado por falta de pago')).toBeVisible()
  await expect(page.getByText('Tus clientes no pueden reservar turnos nuevos.')).toBeVisible()
  await expect(nav(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page.getByLabel('Tu mail')).toBeVisible()
})

test('el profesional también, con el aviso para el dueño', async ({ page }) => {
  await entrar(page, m.usuarios.profesionalA.email)
  await expect(page.getByRole('heading', { level: 1, name: 'Pago pendiente' })).toBeVisible()
  await expect(page.getByText('Avisale al dueño del negocio')).toBeVisible()
  await expect(nav(page)).toHaveCount(0)
})

test('el cliente ve que no está disponible, con la marca del negocio', async ({ page }) => {
  await page.goto(`/${m.negocioA.slug}`)
  await expect(page.getByRole('heading', { level: 1, name: 'No disponible por el momento' })).toBeVisible()
  await expect(page.getByText('Negocio A', { exact: true })).toBeVisible()
  await expect(page.getByText(/pago/i)).toHaveCount(0)
})

test('SawaTek sigue entrando al panel del negocio bloqueado', async ({ page }) => {
  await entrar(page, m.usuarios.superadmin.email)
  await expect(page.getByRole('heading', { level: 1, name: 'Negocio A' })).toBeVisible()
  await expect(nav(page)).toBeVisible()
})

test('al desbloquearlo, el dueño vuelve a su panel', async ({ page }) => {
  await cambiarNegocio(m, m.negocioA.id, { estado: 'activo' })
  await entrar(page, m.usuarios.duenoA.email)
  await expect(page.getByRole('heading', { level: 1, name: 'Negocio A' })).toBeVisible()
  await expect(nav(page).getByRole('link', { name: 'Agenda' })).toBeVisible()
})
