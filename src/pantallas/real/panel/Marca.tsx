// Marca: el dueño edita cómo se ve y qué dice su app (logo, color, fondo, estilo, frase, avisos, promos,
// tarjeta de fidelidad y los textos de los mensajes), con la vista previa del celular en vivo.
// Todo se guarda en negocios.config (la base no deja tocar el link, el estado ni si es demo).
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Check, Eye, Gift, ImageUp, Megaphone, MessageCircle, Moon, Plus, Sun, Trash2, Wand2 } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useAjustes, useProfesionales, useRefrescar, useServicios } from '@/datos/real/panel'
import { guardarMarca, type Marca as DatosMarca } from '@/datos/real/panel-gestion'
import type { Modo, Negocio, Personalidad, Promo } from '@/dominio/tipos'
import { precio } from '@/dominio/tiempo'
import { colorDelLogo } from '@/tema/paleta'
import { estiloTema } from '@/tema/TemaNegocio'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { Hoja } from '@/ui/Hoja'
import { Logo } from '@/ui/Logo'
import { cn } from '@/ui/cn'
import { AreaTexto, Cargando, Encabezado, ErrorEnLinea, Exito, FalloCarga, Tarjeta, useAccion, usePanel } from './comunes'
import { RECUPERAR_POR_DEFECTO } from './Recuperar'

const PERSONALIDADES: { id: Personalidad; nombre: string; detalle: string }[] = [
  { id: 'moderna', nombre: 'Moderna', detalle: 'Redondeada' },
  { id: 'clasica', nombre: 'Clásica', detalle: 'Firme' },
  { id: 'serena', nombre: 'Serena', detalle: 'Con aire' },
]

/** Los mismos textos por defecto que usa la base (contenido_turno) cuando el negocio no cargó uno. */
const POR_DEFECTO = {
  recordatorio24: 'Hola {nombre}! Mañana a las {hora} tenés turno de {servicio} con {profesional} en {negocio}. ¿Confirmás?',
  recordatorio2: 'En 2 horas te esperamos en {negocio} ({hora}, {profesional}). {direccion}.',
  recuperar: RECUPERAR_POR_DEFECTO,
}
const VARIABLES = ['{nombre}', '{dia}', '{hora}', '{servicio}', '{profesional}', '{negocio}', '{direccion}']

const LIMITES = { bajada: 60, claim: 120, promos: 6, avisos: 5, mensaje: 500 }

/** Achica el logo a 256 px (data URL webp liviana) para guardarlo en la configuración, como en /admin. */
async function achicarLogo(archivo: File): Promise<string> {
  const bmp = await createImageBitmap(archivo)
  const lado = 256
  const k = Math.min(1, lado / Math.max(bmp.width, bmp.height))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(bmp.width * k)
  lienzo.height = Math.round(bmp.height * k)
  lienzo.getContext('2d')!.drawImage(bmp, 0, 0, lienzo.width, lienzo.height)
  return lienzo.toDataURL('image/webp', 0.9)
}

/** La marca actual, completando lo que falte (negocios creados con versiones viejas de la plantilla). */
function marcaDe(c: Partial<Negocio>, n: Negocio): DatosMarca {
  return {
    logo: c.logo ?? undefined,
    color: c.color || n.color,
    modo: c.modo === 'claro' ? 'claro' : 'oscuro',
    personalidad: c.personalidad ?? n.personalidad ?? 'moderna',
    bajada: c.bajada ?? '',
    claim: c.claim ?? '',
    promosTitulo: c.promosTitulo ?? '',
    promos: (c.promos ?? []).map((p) => ({ etiqueta: p.etiqueta ?? '', titulo: p.titulo ?? '', detalle: p.detalle ?? '' })),
    avisos: (c.avisos ?? []).map((a) => ({ titulo: a.titulo ?? '', detalle: a.detalle ?? '' })),
    fidelidad: { meta: c.fidelidad?.meta ?? 0, texto: c.fidelidad?.texto ?? '', premio: c.fidelidad?.premio ?? '' },
    mensajes: { recordatorio24: c.mensajes?.recordatorio24 ?? '', recordatorio2: c.mensajes?.recordatorio2 ?? '', recuperar: c.mensajes?.recuperar ?? '' },
    recuperarDias: c.recuperarDias ?? 30,
  }
}

export function Marca() {
  const { n, negocioId } = usePanel()
  const ajustes = useAjustes(negocioId)
  return (
    <div className="flex flex-col gap-4">
      <Encabezado titulo="Marca" bajada="Cómo se ve y qué dice tu app. La vista previa cambia mientras editás." />
      {ajustes.isPending ? (
        <Cargando />
      ) : ajustes.isError ? (
        <FalloCarga error={ajustes.error} onReintentar={() => void ajustes.refetch()} />
      ) : (
        <Editor inicial={marcaDe((ajustes.data.config ?? {}) as Partial<Negocio>, n)} />
      )}
    </div>
  )
}

type Errores = Partial<Record<'bajada' | 'claim' | 'meta' | 'recuperarDias' | 'promos' | 'avisos' | 'mensajes', string>>

function validar(m: DatosMarca, dias: string, meta: string): Errores {
  const e: Errores = {}
  if (m.bajada.length > LIMITES.bajada) e.bajada = `Máximo ${LIMITES.bajada} caracteres.`
  if (m.claim.length > LIMITES.claim) e.claim = `Máximo ${LIMITES.claim} caracteres.`
  const x = Number(meta)
  if (!/^\d{1,2}$/.test(meta.trim()) || x > 20) e.meta = 'Entre 0 y 20 (0 = sin tarjeta).'
  const d = Number(dias)
  if (!/^\d{1,4}$/.test(dias.trim()) || d < 1 || d > 3650) e.recuperarDias = 'Entre 1 y 3650 días.'
  if (m.promos.some((p) => !p.titulo.trim() && (p.etiqueta.trim() || p.detalle.trim()))) e.promos = 'Cada promo necesita un título (o borrala).'
  if ((m.avisos ?? []).some((a) => !a.titulo.trim() && a.detalle?.trim())) e.avisos = 'Cada aviso necesita un título (o borralo).'
  if (Object.values(m.mensajes).some((t) => t.length > LIMITES.mensaje)) e.mensajes = `Cada mensaje puede tener hasta ${LIMITES.mensaje} caracteres.`
  return e
}

function Editor({ inicial }: { inicial: DatosMarca }) {
  const { n, negocioId } = usePanel()
  const qc = useQueryClient()
  const refrescar = useRefrescar(negocioId)
  const accion = useAccion()
  const [m, setM] = useState(inicial)
  const [base, setBase] = useState(inicial)
  const [meta, setMeta] = useState(String(inicial.fidelidad.meta))
  const [dias, setDias] = useState(String(inicial.recuperarDias))
  const [colorLogo, setColorLogo] = useState<string | null>(null)
  const [errores, setErrores] = useState<Errores>({})
  const [guardado, setGuardado] = useState(false)
  const [previa, setPrevia] = useState(false)
  const idLogo = useId()
  const idColor = useId()

  // Si ya tiene logo, se sugiere el color que sale de él.
  useEffect(() => {
    if (!inicial.logo) return
    let vivo = true
    colorDelLogo(inicial.logo)
      .then((c) => vivo && setColorLogo(c))
      .catch(() => undefined)
    return () => {
      vivo = false
    }
  }, [inicial.logo])

  const cambiar = (c: Partial<DatosMarca>) => {
    setM((x) => ({ ...x, ...c }))
    setGuardado(false)
  }
  const final: DatosMarca = {
    ...m,
    fidelidad: { ...m.fidelidad, meta: Number(meta) || 0 },
    recuperarDias: Number(dias) || 30,
    promos: m.promos.filter((p) => p.titulo.trim()).map((p) => ({ etiqueta: p.etiqueta.trim(), titulo: p.titulo.trim(), detalle: p.detalle.trim() })),
    avisos: (m.avisos ?? []).filter((a) => a.titulo.trim()).map((a) => ({ titulo: a.titulo.trim(), ...(a.detalle?.trim() ? { detalle: a.detalle.trim() } : {}) })),
    bajada: m.bajada.trim(),
    claim: m.claim.trim(),
    promosTitulo: m.promosTitulo.trim(),
  }
  const hayCambios = JSON.stringify(m) !== JSON.stringify(base) || meta !== String(base.fidelidad.meta) || dias !== String(base.recuperarDias)

  const subirLogo = async (archivo: File | undefined) => {
    if (!archivo) return
    try {
      const datos = await achicarLogo(archivo)
      const c = await colorDelLogo(datos).catch(() => null)
      setColorLogo(c)
      cambiar(c ? { logo: datos, color: c } : { logo: datos })
    } catch {
      accion.setError('No pudimos leer esa imagen. Probá con un PNG o JPG.')
    }
  }

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setGuardado(false)
    const e = validar(m, dias, meta)
    setErrores(e)
    if (Object.keys(e).length) return
    const listo = await accion.correr(async () => {
      await guardarMarca(negocioId, final)
      await Promise.all([refrescar('ajustes'), qc.invalidateQueries({ queryKey: ['negocio', n.slug] })])
    })
    if (listo) {
      setBase(m)
      setGuardado(true)
    }
  }

  const vista: Negocio = { ...n, ...final }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <aside aria-label="Vista previa" className="hidden flex-col items-center gap-3 lg:sticky lg:top-6 lg:order-2 lg:flex lg:self-start">
        <VistaPrevia n={vista} />
      </aside>
      {/* En el celular no entra al lado: se abre en una hoja. */}
      <Hoja abierta={previa} onCerrar={() => setPrevia(false)} titulo="Vista previa" descripcion="Así se ve tu app con estos cambios (todavía sin guardar).">
        <div className="flex justify-center pb-2">
          <VistaPrevia n={vista} />
        </div>
      </Hoja>

      <form onSubmit={enviar} className="flex flex-col gap-4 lg:order-1" noValidate>
        <Tarjeta titulo="Logo y colores">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-4">
              <label
                htmlFor={idLogo}
                className="rotulo flex size-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-medio border-2 border-dashed border-linea bg-superficie text-center text-suave transition-colors hover:border-acento"
              >
                {m.logo ? (
                  <img src={m.logo} alt="Logo actual" className="size-full bg-white object-contain" />
                ) : (
                  <>
                    <ImageUp className="size-6" aria-hidden />
                    Subir logo
                  </>
                )}
              </label>
              <input id={idLogo} type="file" accept="image/*" className="sr-only" aria-label="Subir logo" onChange={(e) => void subirLogo(e.target.files?.[0])} />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-sm text-suave">
                  {colorLogo ? (
                    <span className="flex items-center gap-1.5 font-semibold text-acento-texto">
                      <Wand2 className="size-4" aria-hidden />
                      Te sugerimos el color de tu logo
                    </span>
                  ) : (
                    'Al subir el logo, te sugerimos un color que combine.'
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {[colorLogo, inicial.color, '#2563eb', '#16a34a', '#9333ea', '#ea580c', '#e0b352', '#111827']
                    .filter((c, i, a): c is string => !!c && a.indexOf(c) === i)
                    .map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => cambiar({ color: c })}
                        aria-label={`Usar color ${c}${c === colorLogo ? ' (del logo)' : ''}`}
                        aria-pressed={m.color.toLowerCase() === c.toLowerCase()}
                        className={cn('size-11 rounded-full ring-offset-2 ring-offset-superficie transition-shadow', m.color.toLowerCase() === c.toLowerCase() && 'ring-2 ring-texto')}
                        style={{ background: c }}
                      />
                    ))}
                  <label htmlFor={idColor} className="relative grid size-11 cursor-pointer place-items-center overflow-hidden rounded-full bg-superficie-2 text-sm font-bold ring-1 ring-linea" title="Otro color">
                    <Plus className="size-4" aria-hidden />
                    <input id={idColor} type="color" value={m.color} onChange={(e) => cambiar({ color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Elegir otro color" />
                  </label>
                </div>
                {m.logo && (
                  <Boton variante="fantasma" tamano="chico" className="self-start" onClick={() => cambiar({ logo: undefined })}>
                    <Trash2 className="size-4" aria-hidden />
                    Quitar logo
                  </Boton>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <fieldset>
                <legend className="rotulo mb-2 text-suave">Fondo</legend>
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
                      aria-pressed={m.modo === id}
                      onClick={() => cambiar({ modo: id as Modo })}
                      className={cn(
                        'flex h-12 items-center justify-center gap-2 rounded-chico font-semibold transition-colors',
                        m.modo === id ? 'bg-acento text-sobre-acento shadow-[inset_0_-3px_0_rgb(0_0_0/0.16)]' : 'bg-superficie ring-1 ring-inset ring-linea hover:ring-suave/60',
                      )}
                    >
                      <Icono className="size-4" aria-hidden />
                      {texto}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="rotulo mb-2 text-suave">Estilo</legend>
                <div className="grid grid-cols-3 gap-2">
                  {PERSONALIDADES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={m.personalidad === p.id}
                      onClick={() => cambiar({ personalidad: p.id })}
                      className={cn(
                        'flex h-13 flex-col items-center justify-center rounded-chico text-sm leading-tight font-semibold transition-colors',
                        m.personalidad === p.id ? 'bg-acento text-sobre-acento shadow-[inset_0_-3px_0_rgb(0_0_0/0.16)]' : 'bg-superficie ring-1 ring-inset ring-linea hover:ring-suave/60',
                      )}
                    >
                      {p.nombre}
                      <span className="mono text-xs font-medium opacity-80">{p.detalle}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Textos de la app">
          <div className="grid gap-4">
            <Campo etiqueta="Debajo del nombre" placeholder="Ej.: Barbería · Palermo" maxLength={LIMITES.bajada} value={m.bajada} onChange={(e) => cambiar({ bajada: e.target.value })} error={errores.bajada} />
            <Campo etiqueta="Frase del negocio" placeholder="Ej.: Tu corte, cuando quieras." maxLength={LIMITES.claim} value={m.claim} onChange={(e) => cambiar({ claim: e.target.value })} error={errores.claim} ayuda="Se ve al entrar a la app." />
          </div>
        </Tarjeta>

        <ListaAvisos avisos={m.avisos ?? []} onCambiar={(avisos) => cambiar({ avisos })} error={errores.avisos} />

        <ListaPromos titulo={m.promosTitulo} promos={m.promos} onTitulo={(promosTitulo) => cambiar({ promosTitulo })} onCambiar={(promos) => cambiar({ promos })} error={errores.promos} />

        <Tarjeta titulo="Tarjeta de fidelidad">
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo
              etiqueta="Visitas para el premio"
              type="number"
              inputMode="numeric"
              min={0}
              max={20}
              value={meta}
              onChange={(e) => {
                setMeta(e.target.value)
                setGuardado(false)
              }}
              error={errores.meta}
              ayuda="0 = sin tarjeta."
            />
            <Campo etiqueta="Texto" placeholder="Ej.: Sumá sellos con cada corte" maxLength={120} value={m.fidelidad.texto} onChange={(e) => cambiar({ fidelidad: { ...m.fidelidad, texto: e.target.value } })} />
            <Campo etiqueta="Premio" placeholder="Ej.: Un corte gratis" maxLength={60} value={m.fidelidad.premio} onChange={(e) => cambiar({ fidelidad: { ...m.fidelidad, premio: e.target.value } })} />
          </div>
        </Tarjeta>

        <Tarjeta titulo="Mensajes a tus clientes">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-suave">
              Podés usar {VARIABLES.join(' ')}: se completan solos. Si dejás un texto vacío, se usa el de siempre.
            </p>
            {(
              [
                ['recordatorio24', 'Recordatorio 24 horas antes'],
                ['recordatorio2', 'Recordatorio 2 horas antes'],
                ['recuperar', 'Te extrañamos (clientes para recuperar)'],
              ] as const
            ).map(([clave, etiqueta]) => (
              <div key={clave} className="flex flex-col gap-2">
                <AreaTexto
                  etiqueta={etiqueta}
                  maxLength={LIMITES.mensaje}
                  placeholder={POR_DEFECTO[clave]}
                  value={m.mensajes[clave]}
                  onChange={(e) => cambiar({ mensajes: { ...m.mensajes, [clave]: e.target.value } })}
                />
                <Burbuja texto={armarEjemplo(m.mensajes[clave] || POR_DEFECTO[clave], vista)} />
              </div>
            ))}
            <ErrorEnLinea texto={errores.mensajes} />
            <Campo
              etiqueta="Cliente para recuperar después de (días sin venir)"
              type="number"
              inputMode="numeric"
              min={1}
              max={3650}
              className="sm:max-w-xs"
              value={dias}
              onChange={(e) => {
                setDias(e.target.value)
                setGuardado(false)
              }}
              error={errores.recuperarDias}
            />
          </div>
        </Tarjeta>

        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-20 flex flex-wrap items-center gap-3 border-t-2 border-texto bg-fondo/95 py-3 backdrop-blur lg:bottom-0">
          <Boton type="submit" cargando={accion.ocupado}>
            Guardar marca
          </Boton>
          <Boton variante="secundario" className="lg:hidden" onClick={() => setPrevia(true)}>
            <Eye className="size-4" aria-hidden />
            Vista previa
          </Boton>
          {hayCambios && !accion.ocupado && <span className="rotulo text-aviso">Cambios sin guardar</span>}
          <Exito texto={guardado ? 'Marca guardada: ya se ve en tu app' : undefined} />
          <ErrorEnLinea texto={accion.error} />
        </div>
      </form>
    </div>
  )
}

function ListaAvisos({ avisos, onCambiar, error }: { avisos: NonNullable<Negocio['avisos']>; onCambiar: (a: NonNullable<Negocio['avisos']>) => void; error?: string }) {
  const poner = (i: number, c: Partial<(typeof avisos)[number]>) => onCambiar(avisos.map((a, j) => (j === i ? { ...a, ...c } : a)))
  return (
    <Tarjeta titulo="Avisos">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-suave">Aparecen arriba de todo en la app. Ej.: “El 24 cerramos a las 14”.</p>
        {avisos.map((a, i) => (
          <fieldset key={i} className="grid gap-3 border-l-2 border-acento-borde pl-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end">
            <legend className="sr-only">Aviso {i + 1}</legend>
            <Campo etiqueta={`Aviso ${i + 1}: título`} maxLength={80} value={a.titulo} onChange={(e) => poner(i, { titulo: e.target.value })} />
            <Campo etiqueta={`Aviso ${i + 1}: detalle (opcional)`} maxLength={200} value={a.detalle ?? ''} onChange={(e) => poner(i, { detalle: e.target.value })} />
            <Boton variante="peligro" className="h-13" aria-label={`Borrar el aviso ${i + 1}`} onClick={() => onCambiar(avisos.filter((_, j) => j !== i))}>
              <Trash2 className="size-4" aria-hidden />
            </Boton>
          </fieldset>
        ))}
        <ErrorEnLinea texto={error} />
        {avisos.length < LIMITES.avisos && (
          <Boton variante="secundario" className="self-start" onClick={() => onCambiar([...avisos, { titulo: '', detalle: '' }])}>
            <Megaphone className="size-4" aria-hidden />
            Agregar aviso
          </Boton>
        )}
      </div>
    </Tarjeta>
  )
}

function ListaPromos({
  titulo,
  promos,
  onTitulo,
  onCambiar,
  error,
}: {
  titulo: string
  promos: Promo[]
  onTitulo: (t: string) => void
  onCambiar: (p: Promo[]) => void
  error?: string
}) {
  const poner = (i: number, c: Partial<Promo>) => onCambiar(promos.map((p, j) => (j === i ? { ...p, ...c } : p)))
  return (
    <Tarjeta titulo="Promos">
      <div className="flex flex-col gap-3">
        <Campo etiqueta="Título de la sección" placeholder="Promos" maxLength={40} value={titulo} onChange={(e) => onTitulo(e.target.value)} />
        {promos.map((p, i) => (
          <fieldset key={i} className="grid gap-3 border-l-2 border-acento-borde pl-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
            <legend className="sr-only">Promo {i + 1}</legend>
            <Campo etiqueta={`Promo ${i + 1}: etiqueta`} placeholder="Ej.: -20%" maxLength={24} value={p.etiqueta} onChange={(e) => poner(i, { etiqueta: e.target.value })} />
            <Campo etiqueta={`Promo ${i + 1}: título`} placeholder="Ej.: Martes de barba" maxLength={60} value={p.titulo} onChange={(e) => poner(i, { titulo: e.target.value })} />
            <Campo etiqueta={`Promo ${i + 1}: detalle`} className="sm:col-span-2" maxLength={160} value={p.detalle} onChange={(e) => poner(i, { detalle: e.target.value })} />
            <Boton variante="peligro" tamano="chico" className="sm:col-span-2 sm:justify-self-start" onClick={() => onCambiar(promos.filter((_, j) => j !== i))}>
              <Trash2 className="size-4" aria-hidden />
              Borrar promo {i + 1}
            </Boton>
          </fieldset>
        ))}
        <ErrorEnLinea texto={error} />
        {promos.length < LIMITES.promos && (
          <Boton variante="secundario" className="self-start" onClick={() => onCambiar([...promos, { etiqueta: '', titulo: '', detalle: '' }])}>
            <Plus className="size-4" aria-hidden />
            Agregar promo
          </Boton>
        )}
      </div>
    </Tarjeta>
  )
}

/** Completa la plantilla con datos de ejemplo, como le llegaría a un cliente. */
function armarEjemplo(plantilla: string, n: Negocio) {
  const datos: Record<string, string> = {
    nombre: 'Ana',
    dia: 'jueves 19/11',
    hora: '10:30',
    servicio: n.servicios[0]?.nombre ?? 'Corte',
    profesional: n.staff[0]?.nombre ?? 'Tulio',
    negocio: n.nombre,
    direccion: n.direccion || 'tu dirección',
    link: 'el link de la app',
  }
  return plantilla.replace(/\{(\w+)\}/g, (todo, k: string) => datos[k] ?? todo)
}

function Burbuja({ texto }: { texto: string }) {
  return (
    <div className="flex items-start gap-2 rounded-medio rounded-tl-none bg-wa-fondo px-3 py-2 text-sm text-wa-tinta">
      <MessageCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        <span className="sr-only">Ejemplo de cómo le llega: </span>
        {texto}
      </p>
    </div>
  )
}

/** El celular con el tema del negocio aplicado solo a este recuadro: la pantalla de inicio de la app. */
function VistaPrevia({ n }: { n: Negocio }) {
  const { negocioId } = usePanel()
  const servicios = useServicios(negocioId).data?.filter((s) => s.activo) ?? []
  const prof = useProfesionales(negocioId).data?.find((p) => p.activo)
  const meta = Math.max(0, Math.min(20, n.fidelidad.meta))
  const promos = n.promos.filter((p) => p.titulo)
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-[44px] bg-black p-2.5 shadow-2xl ring-1 ring-white/10">
        <motion.div
          layout
          style={estiloTema(n)}
          data-personalidad={n.personalidad}
          className="sin-barra flex h-[540px] w-[270px] flex-col gap-3 overflow-y-auto rounded-[36px] bg-fondo px-4 pt-6 pb-6 text-texto transition-colors duration-300"
        >
          <div className="flex flex-col items-start gap-2">
            <Logo negocio={n} className="size-11 text-sm" />
            <p className="titulo text-2xl leading-none">{n.nombre}</p>
            {n.bajada && <p className="rotulo text-[0.75rem] text-acento-texto">{n.bajada}</p>}
          </div>
          {n.claim && <p className="text-xs text-suave">{n.claim}</p>}
          {(n.avisos ?? []).slice(0, 2).map((a, i) => (
            <div key={i} className="border-l-2 border-acento py-0.5 pl-2.5">
              <p className="text-xs font-bold">{a.titulo}</p>
              {a.detalle && <p className="text-xs text-suave">{a.detalle}</p>}
            </div>
          ))}
          {/* El talón de "Próximo libre", como en la app. */}
          <div className="contorno-talon">
            <div className="muesca-abajo rounded-t-grande bg-acento px-3 pt-2.5 pb-3 text-sobre-acento">
              <p className="rotulo text-[0.75rem] opacity-90">Próximo libre</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="titulo text-base">Hoy</span>
                <span className="cifra text-[2.25rem]">17:30</span>
              </p>
              <p className="truncate text-xs font-semibold">
                {servicios[0]?.nombre ?? 'Tu servicio'}
                {prof ? ` con ${prof.nombre}` : ''}
              </p>
            </div>
            <div className="muesca-arriba rounded-b-grande bg-acento px-3 pt-2 pb-3 text-sobre-acento">
              <div className="grid h-8 place-items-center rounded-medio bg-sobre-acento text-xs font-bold text-acento">{n.textos?.reservar || 'Reservar'}</div>
            </div>
          </div>
          {meta > 0 && (
            <div className="rounded-grande border border-dashed border-acento-borde p-3">
              <p className="titulo text-sm">Tu tarjeta</p>
              {n.fidelidad.texto && <p className="text-xs text-suave">{n.fidelidad.texto}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Array.from({ length: meta }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'grid size-6 place-items-center rounded-full text-xs font-bold',
                      i === meta - 1 ? 'border border-dashed border-acento-borde text-acento-texto' : i < 2 ? 'border-2 border-acento-texto text-acento-texto' : 'mono border border-linea text-suave',
                    )}
                  >
                    {i === meta - 1 ? <Gift className="size-3" aria-hidden /> : i < 2 ? <Check className="size-3" aria-hidden /> : i + 1}
                  </span>
                ))}
              </div>
            </div>
          )}
          {servicios.length > 0 && (
            <div>
              <p className="titulo border-b-2 border-texto pb-1 text-sm">Servicios</p>
              {servicios.slice(0, 3).map((s) => (
                <div key={s.id} className="flex items-baseline gap-1.5 border-b border-linea py-1.5 text-xs">
                  <span className="truncate font-semibold">{s.nombre}</span>
                  <span aria-hidden className="mb-0.5 min-w-2 flex-1 border-b border-dotted border-linea" />
                  {s.precio > 0 && <span className="mono shrink-0 font-bold">{precio(s.precio)}</span>}
                </div>
              ))}
            </div>
          )}
          {promos.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="titulo border-b-2 border-texto pb-1 text-sm">{n.promosTitulo || 'Promos'}</p>
              {promos.slice(0, 2).map((p, i) => (
                <div key={i} className="rounded-medio bg-acento-suave p-2.5">
                  {p.etiqueta && <span className="rotulo rounded-chico bg-fondo/60 px-1.5 text-[0.75rem] text-acento-texto">{p.etiqueta}</span>}
                  <p className="titulo mt-1 text-sm">{p.titulo}</p>
                  {p.detalle && <p className="text-xs text-suave">{p.detalle}</p>}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
      <p className="rotulo text-suave">Así se ve tu app</p>
    </div>
  )
}
