// Alta en 1 minuto: nombre, rubro, logo → app con su marca, link y QR.
// La misma pantalla sirve para una DEMO de venta (todo simulado) o un NEGOCIO REAL (con base, panel y clientes).
import { AnimatePresence, motion } from 'motion/react'
import { Check, Cloud, Copy, ImageUp, KeyRound, LayoutDashboard, MonitorSmartphone, Moon, Smartphone, Sun, Trash2, Wand2 } from 'lucide-react'
import { useId, useState } from 'react'
import { Link } from 'react-router'
import { useRefrescarAdmin } from '@/datos/admin'
import { borrarNegocio, crearNegocioReal, guardarNegocio, slugLibre, useRefrescarNegocios, useTodosLosNegocios } from '@/datos/negocios'
import { hayNube } from '@/datos/supabase'
import type { Modo, Negocio, Personalidad, RubroId } from '@/dominio/tipos'
import { LISTA_RUBROS, RUBROS, negocioDesdePlantilla, slugDe } from '@/plantillas/rubros'
import { colorDelLogo } from '@/tema/paleta'
import { estiloTema } from '@/tema/TemaNegocio'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { Logo } from '@/ui/Logo'
import { cn } from '@/ui/cn'
import { QR } from './QR'

const PERSONALIDADES: { id: Personalidad; nombre: string; detalle: string }[] = [
  { id: 'moderna', nombre: 'Moderna', detalle: 'Uñas, estética' },
  { id: 'clasica', nombre: 'Clásica', detalle: 'Barbería, tattoo' },
  { id: 'serena', nombre: 'Serena', detalle: 'Salud' },
]

/** Achica el logo a 256 px (data URL liviana) para guardarlo junto con la configuración. */
export async function achicarLogo(archivo: File): Promise<string> {
  const bmp = await createImageBitmap(archivo)
  const lado = 256
  const k = Math.min(1, lado / Math.max(bmp.width, bmp.height))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(bmp.width * k)
  lienzo.height = Math.round(bmp.height * k)
  lienzo.getContext('2d')!.drawImage(bmp, 0, 0, lienzo.width, lienzo.height)
  return lienzo.toDataURL('image/webp', 0.9)
}

export function Alta({ tipo }: { tipo: 'demo' | 'real' }) {
  const { nube, propios } = useTodosLosNegocios()
  const refrescar = useRefrescarNegocios()
  const refrescarAdmin = useRefrescarAdmin()
  const creadas = hayNube ? nube : propios
  const [guardando, setGuardando] = useState(false)

  const [nombre, setNombre] = useState('')
  const [rubro, setRubro] = useState<RubroId>('barberia')
  const [zona, setZona] = useState('')
  const [direccion, setDireccion] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [logo, setLogo] = useState<string>()
  const [color, setColor] = useState(RUBROS.barberia.color)
  const [colorLogo, setColorLogo] = useState<string | null>(null)
  const [modo, setModo] = useState<Modo>(RUBROS.barberia.modo)
  const [personalidad, setPersonalidad] = useState<Personalidad>(RUBROS.barberia.personalidad)
  const [slugManual, setSlugManual] = useState<string>()
  const [creado, setCreado] = useState<Negocio>()
  const [idReal, setIdReal] = useState<string>()
  const [emailDueno, setEmailDueno] = useState('')
  const [nombreDueno, setNombreDueno] = useState('')
  const [error, setError] = useState<string>()
  const [copiado, setCopiado] = useState(false)
  const idLogo = useId()
  const idColor = useId()
  const real = tipo === 'real'

  const slug = slugManual ?? slugDe(nombre || 'mi negocio')
  const vista = negocioDesdePlantilla(rubro, { nombre: nombre || 'Tu negocio', zona, direccion, whatsapp, logo, color, slug })
  vista.modo = modo
  vista.personalidad = personalidad

  const elegirRubro = (r: RubroId) => {
    setRubro(r)
    setModo(RUBROS[r].modo)
    setPersonalidad(RUBROS[r].personalidad)
    if (!colorLogo) setColor(RUBROS[r].color)
  }

  const subirLogo = async (archivo: File | undefined) => {
    if (!archivo) return
    const datos = await achicarLogo(archivo)
    setLogo(datos)
    const c = await colorDelLogo(datos)
    if (c) {
      setColorLogo(c)
      setColor(c)
    }
  }

  const crear = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (nombre.trim().length < 2) return setError('Poné el nombre del negocio.')
    setError(undefined)
    setGuardando(true)
    try {
      const n = { ...vista, nombre: nombre.trim() }
      if (real) {
        if (!(await slugLibre(slug))) return setError(`Ya existe un negocio con el link /${slug}. Cambiá el link.`)
        setIdReal(await crearNegocioReal(n, emailDueno, nombreDueno))
        await refrescarAdmin()
      } else {
        // Se puede re-guardar la demo recién creada; cualquier otro link repetido se rechaza.
        if (!(await slugLibre(slug, creado?.slug))) return setError(`Ya existe una demo con el link /${slug}. Cambiá el link.`)
        await guardarNegocio(n)
      }
      await refrescar()
      setCreado(n)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  const link = creado ? `${location.origin}/${creado.slug}` : ''
  const mailDueno = emailDueno.trim().toLowerCase()
  const paramsCuenta = idReal ? new URLSearchParams({ negocio: idReal, email: mailDueno, nombre: nombreDueno.trim() }).toString() : ''

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      <form className="flex flex-col gap-6" onSubmit={crear} noValidate>
        <Seccion titulo="1. El negocio">
          <Campo
            etiqueta="Nombre"
            placeholder="Ej.: Barbería Don Julio"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value)
              setCreado(undefined)
            }}
            error={error}
          />
          <div>
            <p className="mb-2 text-sm font-semibold text-suave">Rubro</p>
            <div className="flex flex-wrap gap-2">
              {LISTA_RUBROS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={rubro === r.id}
                  onClick={() => elegirRubro(r.id)}
                  className={cn(
                    'h-11 rounded-full px-4 text-sm font-semibold transition-colors',
                    rubro === r.id ? 'bg-acento text-sobre-acento' : 'bg-superficie ring-1 ring-linea hover:ring-acento-borde',
                  )}
                >
                  {r.etiqueta}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-suave">
              Trae servicios, precios, horarios, textos y promos típicos de {RUBROS[rubro].etiqueta.toLowerCase()}.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo etiqueta="Zona" placeholder={RUBROS[rubro].zonaEjemplo} value={zona} onChange={(e) => setZona(e.target.value)} />
            <Campo etiqueta="Dirección" placeholder="Opcional" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
            <Campo etiqueta="WhatsApp" type="tel" placeholder="11 2345-6789" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </div>
        </Seccion>

        <Seccion titulo="2. La marca">
          <div className="flex flex-wrap items-center gap-4">
            <label
              htmlFor={idLogo}
              className="flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-grande border-2 border-dashed border-linea bg-superficie text-xs font-semibold text-suave transition-colors hover:border-acento"
            >
              {logo ? (
                <img src={logo} alt="Logo cargado" className="size-full bg-white object-contain" />
              ) : (
                <>
                  <ImageUp className="size-6" aria-hidden />
                  Subir logo
                </>
              )}
            </label>
            <input id={idLogo} type="file" accept="image/*" className="sr-only" onChange={(e) => void subirLogo(e.target.files?.[0])} />
            <div className="flex flex-col gap-2">
              <p className="text-sm text-suave">
                {colorLogo ? (
                  <span className="flex items-center gap-1.5 font-semibold text-acento-texto">
                    <Wand2 className="size-4" aria-hidden />
                    Color sacado del logo
                  </span>
                ) : (
                  'Al subir el logo, el color se saca solo.'
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {[colorLogo, RUBROS[rubro].color, '#2563eb', '#16a34a', '#9333ea', '#ea580c', '#111827']
                  .filter((c, i, a): c is string => !!c && a.indexOf(c) === i)
                  .map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      aria-label={`Usar color ${c}`}
                      aria-pressed={color === c}
                      className={cn('size-11 rounded-full ring-offset-2 ring-offset-fondo transition-shadow', color === c && 'ring-2 ring-texto')}
                      style={{ background: c }}
                    />
                  ))}
                <label htmlFor={idColor} className="relative grid size-11 cursor-pointer place-items-center overflow-hidden rounded-full bg-superficie-2 text-xs font-bold ring-1 ring-linea" title="Otro color">
                  +
                  <input id={idColor} type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Elegir otro color" />
                </label>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold text-suave">Fondo</p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['oscuro', 'Oscuro', Moon],
                    ['claro', 'Claro', Sun],
                  ] as const
                ).map(([id, texto, Icono]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={modo === id}
                    onClick={() => setModo(id)}
                    className={cn('flex h-12 items-center justify-center gap-2 rounded-medio font-semibold', modo === id ? 'bg-acento text-sobre-acento' : 'bg-superficie ring-1 ring-linea')}
                  >
                    <Icono className="size-4" aria-hidden />
                    {texto}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-suave">Estilo</p>
              <div className="grid grid-cols-3 gap-2">
                {PERSONALIDADES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={personalidad === p.id}
                    onClick={() => setPersonalidad(p.id)}
                    className={cn(
                      'flex h-12 flex-col items-center justify-center rounded-medio text-sm leading-tight font-semibold',
                      personalidad === p.id ? 'bg-acento text-sobre-acento' : 'bg-superficie ring-1 ring-linea',
                    )}
                  >
                    {p.nombre}
                    <span className="text-[10px] font-medium opacity-75">{p.detalle}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Seccion>

        <Seccion titulo="3. Publicación">
          {real && (
            <>
              <Campo etiqueta="Nombre del dueño" autoComplete="off" placeholder="Ej.: Tulio Gómez" value={nombreDueno} onChange={(e) => setNombreDueno(e.target.value)} />
              <Campo
                etiqueta="Mail del dueño"
                type="email"
                autoComplete="off"
                placeholder="dueno@negocio.com"
                value={emailDueno}
                onChange={(e) => setEmailDueno(e.target.value)}
                ayuda="Le queda una invitación: cuando entre al panel con ese mail, queda como dueño. Después le creás la cuenta desde Cuentas."
              />
            </>
          )}
          <Campo etiqueta={real ? 'Dirección del negocio' : 'Dirección de la demo'} value={slug} onChange={(e) => setSlugManual(slugDe(e.target.value))} ayuda={`${location.host}/${slug}`} />
        </Seccion>

        <Boton type="submit" tamano="grande" cargando={guardando}>
          <Wand2 className="size-5" aria-hidden />
          {real ? 'Crear negocio real' : creado ? 'Guardar cambios' : 'Crear demo'}
        </Boton>
      </form>

      {/* Vista previa en vivo + resultado */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <VistaPrevia n={vista} />

        <AnimatePresence>
          {creado && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              aria-label={real ? 'Negocio creado' : 'Demo creada'}
              className="flex flex-col gap-4 rounded-grande bg-superficie p-5 ring-1 ring-linea"
            >
              <div className="flex items-start gap-4">
                <QR texto={link} className="size-32 shrink-0 rounded-medio" />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-bold text-exito">
                    <Check className="size-5" aria-hidden />
                    {real ? '¡Negocio creado!' : '¡Demo lista!'}
                  </p>
                  <p className="mt-1 text-sm text-suave">
                    {real
                      ? `Sus clientes reservan con este QR. El dueño entra al panel con ${mailDueno}: creale la cuenta abajo si todavía no tiene.`
                      : 'Que el dueño escanee el QR, saque un turno y la instale en su celular.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(link).catch(() => undefined)
                      setCopiado(true)
                      setTimeout(() => setCopiado(false), 1800)
                    }}
                    className="mt-2 inline-flex h-11 max-w-full items-center gap-1.5 rounded-medio bg-superficie-2 px-3 text-sm font-semibold"
                  >
                    {copiado ? <Check className="size-4 shrink-0" aria-hidden /> : <Copy className="size-4 shrink-0" aria-hidden />}
                    <span className="truncate">{copiado ? 'Copiado' : link.replace(/^https?:\/\//, '')}</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { to: `/${creado.slug}`, texto: 'Cliente', Icono: Smartphone },
                  { to: `/${creado.slug}/panel`, texto: 'Dueño', Icono: LayoutDashboard },
                  ...(real ? [] : [{ to: `/${creado.slug}/escenario`, texto: 'Escenario', Icono: MonitorSmartphone }]),
                ].map(({ to, texto, Icono }) => (
                  <Link key={to} to={to} className="flex h-16 flex-col items-center justify-center gap-1 rounded-medio bg-acento-suave text-xs font-bold text-acento-texto">
                    <Icono className="size-5" aria-hidden />
                    {texto}
                  </Link>
                ))}
              </div>
              {real && idReal && (
                <Link to={`/admin/cuentas?${paramsCuenta}`} className="flex h-12 items-center justify-center gap-2 rounded-medio bg-acento font-semibold text-sobre-acento">
                  <KeyRound className="size-4" aria-hidden />
                  Crear la cuenta del dueño
                </Link>
              )}
              <p className="flex items-center gap-1.5 text-xs text-suave">
                {hayNube ? (
                  <>
                    <Cloud className="size-3.5 shrink-0" aria-hidden />
                    Guardada en la nube: el link y el QR abren en cualquier celular.
                  </>
                ) : (
                  'Sin Supabase configurado: la demo se guarda solo en este navegador.'
                )}
              </p>
            </motion.section>
          )}
        </AnimatePresence>

        {!real && creadas.length > 0 && (
          <section aria-labelledby="t-mias" className="rounded-grande bg-superficie p-4 ring-1 ring-linea">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 id="t-mias" className="titulo text-base">
                Demos creadas
              </h2>
              <Link to="/demos" className="inline-flex h-11 items-center px-2 text-sm font-semibold text-acento-texto">
                Ver todas las demos
              </Link>
            </div>
            <ul className="flex flex-col divide-y divide-linea">
              {creadas.map((p) => (
                <li key={p.slug} className="flex items-center gap-3 py-2">
                  <div style={estiloTema(p)} data-personalidad={p.personalidad}>
                    <Logo negocio={p} className="size-9 text-xs" />
                  </div>
                  <Link to={`/${p.slug}/escenario`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.nombre}</p>
                    <p className="truncate text-xs text-suave">/{p.slug}</p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirm(`¿Borrar la demo de ${p.nombre}? No se puede deshacer.`)) return
                      void borrarNegocio(p.slug)
                        .then(refrescar)
                        .catch((err: Error) => setError(err.message))
                    }}
                    className="grid size-11 place-items-center rounded-full text-suave hover:bg-peligro/10 hover:text-peligro"
                    aria-label={`Borrar la demo de ${p.nombre}`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {!real && creadas.length === 0 && (
          <Link to="/demos" className="text-center text-sm font-semibold text-acento-texto">
            Ver las demos de fábrica
          </Link>
        )}
      </aside>
    </div>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-grande bg-superficie/50 p-5 ring-1 ring-linea">
      <legend className="titulo float-left mb-1 w-full text-lg">{titulo}</legend>
      {children}
    </fieldset>
  )
}

/** Así se va a ver: la pantalla de entrada de la app, con el tema del negocio aplicado solo a este recuadro. */
function VistaPrevia({ n }: { n: Negocio }) {
  return (
    <div className="flex justify-center">
      <div className="rounded-[44px] bg-black p-2.5 shadow-2xl ring-1 ring-white/10">
        <motion.div
          layout
          style={estiloTema(n)}
          data-personalidad={n.personalidad}
          className="flex h-[520px] w-[260px] flex-col overflow-hidden rounded-[36px] bg-fondo px-5 text-texto transition-colors duration-300"
        >
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <Logo negocio={n} className="size-16 text-xl" />
            <p className="titulo mt-3 text-xl">{n.nombre}</p>
            <p className="text-xs font-semibold text-acento-texto">{n.bajada}</p>
            <p className="mt-2 text-xs text-suave">{n.claim}</p>
          </div>
          <div className="flex flex-col gap-2 pb-6">
            <div className="rounded-medio bg-acento p-3 text-sobre-acento">
              <p className="text-[10px] font-bold opacity-85">Próximo libre</p>
              <p className="titulo text-lg">Hoy 17:30</p>
              <p className="text-[11px] font-semibold opacity-90">
                {n.servicios[0]?.nombre} con {n.staff[0]?.nombre}
              </p>
            </div>
            <div className="flex gap-1.5">
              {n.servicios.slice(0, 3).map((s) => (
                <span key={s.id} className="flex-1 truncate rounded-chico bg-superficie px-2 py-1.5 text-center text-[10px] font-semibold ring-1 ring-linea">
                  {s.nombre}
                </span>
              ))}
            </div>
            <div className="grid h-10 place-items-center rounded-medio bg-acento text-xs font-bold text-sobre-acento">{n.textos.reservar}</div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
