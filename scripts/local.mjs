// Ayudas para trabajar contra la Supabase LOCAL (Docker). Nunca toca la base real.
//
//   pnpm dev:local          → la app en http://localhost:5180 conectada a la base local
//   pnpm local:semilla      → crea usuarios y un negocio real de prueba (se puede correr varias veces)
//   pnpm local:codigo [tel] → muestra el último código de ingreso por celular (el que "llega por WhatsApp")
import { execSync, spawn } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const CLAVE = 'sawatek-local-123'
const USUARIOS = {
  superadmin: 'admin@sawatek.local',
  dueno: 'dueno@sawatek.local',
  profesional: 'profesional@sawatek.local',
}
const NOMBRES = { superadmin: 'Equipo SawaTek', dueno: 'Tulio', profesional: 'Nico' }
const SLUG = 'barberia-de-prueba'

function local() {
  try {
    const salida = execSync('pnpm exec supabase status -o json', { stdio: ['ignore', 'pipe', 'ignore'] }).toString()
    return JSON.parse(salida.slice(salida.indexOf('{')))
  } catch {
    console.error('\nSupabase local no está corriendo. Primero: pnpm db:local  (con Docker abierto)\n')
    process.exit(1)
  }
}

const opciones = { auth: { persistSession: false, autoRefreshToken: false } }

async function usuario(adm, email, nombre) {
  const { data } = await adm.auth.admin.listUsers({ perPage: 1000 })
  const existente = data?.users.find((u) => u.email === email)
  if (existente) {
    await adm.auth.admin.updateUserById(existente.id, { user_metadata: { display_name: nombre } })
    return existente.id
  }
  const { data: nuevo, error } = await adm.auth.admin.createUser({
    email, password: CLAVE, email_confirm: true, user_metadata: { display_name: nombre },
  })
  if (error) throw error
  return nuevo.user.id
}

async function semilla() {
  const s = local()
  const adm = createClient(s.API_URL, s.SECRET_KEY, opciones)

  for (const [rol, email] of Object.entries(USUARIOS)) await usuario(adm, email, NOMBRES[rol])
  await adm.from('superadmins').upsert({ email: USUARIOS.superadmin })

  const { data: ya } = await adm.from('negocios').select('id').eq('slug', SLUG).maybeSingle()
  if (!ya) {
    // El alta la hace SawaTek, igual que en la app: con su sesión y la plantilla del rubro.
    const sa = createClient(s.API_URL, s.PUBLISHABLE_KEY, opciones)
    await sa.auth.signInWithPassword({ email: USUARIOS.superadmin, password: CLAVE })
    const { negocioDesdePlantilla } = await import('../src/plantillas/rubros.ts').catch(() => ({ negocioDesdePlantilla: null }))
    const config = negocioDesdePlantilla
      ? negocioDesdePlantilla('barberia', { nombre: 'Barbería de Prueba', zona: 'Moreno', slug: SLUG })
      : null
    if (!config) throw new Error('No se pudo cargar la plantilla (hace falta Node 24 o más).')
    const { error } = await sa.rpc('crear_negocio_real', { p_slug: SLUG, p_config: config, p_email_dueno: USUARIOS.dueno })
    if (error) throw error
  }
  const { data: neg } = await adm.from('negocios').select('id').eq('slug', SLUG).single()

  // El dueño acepta su invitación e invita al profesional (vinculado a "Nico", el barbero de la plantilla).
  const dueno = createClient(s.API_URL, s.PUBLISHABLE_KEY, opciones)
  await dueno.auth.signInWithPassword({ email: USUARIOS.dueno, password: CLAVE })
  await dueno.rpc('aceptar_invitaciones')
  const { data: prof } = await adm.from('profesionales').select('id, user_id').eq('negocio_id', neg.id).eq('nombre', NOMBRES.profesional).single()
  if (!prof.user_id) {
    await dueno.from('invitaciones').upsert(
      { negocio_id: neg.id, email: USUARIOS.profesional, rol: 'profesional', profesional_id: prof.id },
      { onConflict: 'negocio_id,email' },
    )
    const pro = createClient(s.API_URL, s.PUBLISHABLE_KEY, opciones)
    await pro.auth.signInWithPassword({ email: USUARIOS.profesional, password: CLAVE })
    await pro.rpc('aceptar_invitaciones')
  }

  const filas = [
    ['SawaTek (superadmin)', USUARIOS.superadmin, '/admin'],
    ['Dueño', USUARIOS.dueno, `/${SLUG}/panel`],
    ['Profesional', USUARIOS.profesional, `/${SLUG}/panel`],
    ['Cliente', 'cualquier celular', `/${SLUG}   (código: pnpm local:codigo)`],
  ]
  console.log(`\nListo. Datos de prueba en la base LOCAL. Contraseña de todos: ${CLAVE}\n`)
  for (const [rol, quien, ruta] of filas) console.log(`  ${rol.padEnd(22)}${quien.padEnd(28)}http://localhost:5180${ruta}`)
  console.log('')
}

async function codigo(tel) {
  const s = local()
  const adm = createClient(s.API_URL, s.SECRET_KEY, opciones)
  let q = adm.from('mensajes').select('destino, contenido, creado').eq('tipo', 'codigo').order('creado', { ascending: false }).limit(1)
  if (tel) q = q.like('destino', `%${tel.replace(/\D/g, '').slice(-8)}`)
  const { data } = await q
  if (!data?.length) return console.log('\nTodavía no se pidió ningún código. Pedilo desde la app y volvé a correr esto.\n')
  const m = data[0]
  console.log(`\nCódigo para +${m.destino}: ${m.contenido.codigo}   (pedido ${new Date(m.creado).toLocaleTimeString('es-AR')})\n`)
}

function dev() {
  const s = local()
  // VITE_* tiene prioridad sobre las NEXT_PUBLIC_* de .env.local (que apuntan a la base real).
  const vite = spawn('pnpm', ['exec', 'vite', ...process.argv.slice(3)], {
    stdio: 'inherit',
    env: { ...process.env, VITE_SUPABASE_URL: s.API_URL, VITE_SUPABASE_PUBLISHABLE_KEY: s.PUBLISHABLE_KEY },
  })
  vite.on('exit', (c) => process.exit(c ?? 0))
}

const comando = process.argv[2]
if (comando === 'semilla') await semilla()
else if (comando === 'codigo') await codigo(process.argv[3])
else if (comando === 'dev') dev()
else console.log('Uso: node scripts/local.mjs dev | semilla | codigo [telefono]')
