// Genera TODA la paleta de un negocio a partir de un solo color + modo claro/oscuro.
// Trabaja en OKLCH (luminosidad percibida pareja) y garantiza contraste WCAG:
// el negocio puede elegir cualquier color y la app nunca queda ilegible.
import { clampChroma, converter, formatHex, parse, wcagContrast, type Oklch } from 'culori'
import type { Modo } from '@/dominio/tipos'

const aOklch = converter('oklch')

const hex = (c: Oklch) => formatHex(clampChroma(c, 'oklch'))
const oklch = (l: number, c: number, h: number): Oklch => ({ mode: 'oklch', l, c, h })

/** Ajusta la luminosidad hasta llegar al contraste pedido contra `fondo`. */
function conContraste(color: Oklch, fondo: string, minimo: number, haciaClaro: boolean): Oklch {
  let c = { ...color }
  for (let i = 0; i < 40 && wcagContrast(hex(c), fondo) < minimo; i++) {
    c = { ...c, l: Math.min(0.99, Math.max(0.05, c.l + (haciaClaro ? 0.015 : -0.015))) }
  }
  return c
}

export type Tema = Record<string, string>

export function generarTema(colorMarca: string, modo: Modo): Tema {
  const base = aOklch(parse(colorMarca) ?? parse('#e0b352')!)!
  const h = base.h ?? 80
  const oscuro = modo === 'oscuro'
  // Neutros levemente teñidos con el tono de la marca: se siente "de la casa" sin cansar.
  const tinte = Math.min(0.018, (base.c ?? 0) * 0.12)

  const n = oscuro
    ? { fondo: 0.165, sup: 0.205, sup2: 0.245, linea: 0.31, texto: 0.965, suave: 0.74 }
    : { fondo: 0.975, sup: 1, sup2: 0.948, linea: 0.9, texto: 0.21, suave: 0.47 }

  const fondo = hex(oklch(n.fondo, tinte, h))
  const superficie = hex(oklch(n.sup, oscuro ? tinte : 0, h))

  // Acento como relleno (botones). Si el color de marca es muy oscuro en modo oscuro (o muy claro en claro),
  // se acomoda para que el botón se distinga del fondo.
  let acento: Oklch = { ...base, h }
  if (oscuro && acento.l < 0.55) acento.l = 0.62
  if (!oscuro && acento.l > 0.8) acento.l = 0.68
  acento = conContraste(acento, fondo, 3, oscuro)
  const acentoHex = hex(acento)

  // Texto sobre el acento: blanco o casi negro, el que dé más contraste.
  const tintaOscura = hex(oklch(0.18, 0.02, h))
  const sobreAcento = wcagContrast(acentoHex, '#ffffff') >= wcagContrast(acentoHex, tintaOscura) ? '#ffffff' : tintaOscura

  // Acento usado como TEXTO (links, horas destacadas): necesita 4.5:1 contra el fondo y la superficie.
  const acentoTexto = hex(conContraste(conContraste(acento, fondo, 4.5, oscuro), superficie, 4.5, oscuro))

  const peligro = oscuro ? '#f87171' : '#c62828'
  const exito = oscuro ? '#4ade80' : '#1b7a3a'
  const aviso = oscuro ? '#fbbf24' : '#a15c00'

  return {
    '--t-fondo': fondo,
    '--t-superficie': superficie,
    '--t-superficie-2': hex(oklch(n.sup2, tinte, h)),
    '--t-linea': hex(oklch(n.linea, tinte, h)),
    '--t-texto': hex(oklch(n.texto, tinte * 0.5, h)),
    '--t-suave': hex(conContraste(oklch(n.suave, tinte, h), superficie, 4.5, oscuro)),
    '--t-acento': acentoHex,
    '--t-sobre-acento': sobreAcento,
    '--t-acento-texto': acentoTexto,
    '--t-acento-suave': hex(oklch(oscuro ? 0.27 : 0.94, Math.min(0.06, (acento.c ?? 0) * 0.45), h)),
    '--t-acento-borde': hex(oklch(oscuro ? 0.42 : 0.82, Math.min(0.1, (acento.c ?? 0) * 0.7), h)),
    '--t-peligro': peligro,
    '--t-exito': exito,
    '--t-aviso': aviso,
    '--t-sombra': oscuro ? '0 0% 0%' : `${Math.round(h)} 30% 25%`,
    'color-scheme': oscuro ? 'dark' : 'light',
  }
}

/** Saca un color de marca de un logo: el tono más "con personalidad" que aparezca seguido. */
export async function colorDelLogo(src: string): Promise<string | null> {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = src
  await img.decode()
  const lado = 48
  const lienzo = document.createElement('canvas')
  lienzo.width = lienzo.height = lado
  const ctx = lienzo.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, lado, lado)
  const { data } = ctx.getImageData(0, 0, lado, lado)

  // Agrupa por tono (cubetas de 15°) y puntúa por cantidad × saturación. Ignora blancos, negros y grises.
  const cubetas = new Map<number, { peso: number; l: number; c: number; h: number; n: number }>()
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 200) continue
    const c = aOklch({ mode: 'rgb', r: data[i]! / 255, g: data[i + 1]! / 255, b: data[i + 2]! / 255 })
    if (!c || (c.c ?? 0) < 0.05 || c.l < 0.2 || c.l > 0.95) continue
    const clave = Math.round((c.h ?? 0) / 15)
    const b = cubetas.get(clave) ?? { peso: 0, l: 0, c: 0, h: 0, n: 0 }
    b.peso += c.c ?? 0
    b.l += c.l
    b.c += c.c ?? 0
    b.h += c.h ?? 0
    b.n++
    cubetas.set(clave, b)
  }
  const mejor = [...cubetas.values()].toSorted((a, b) => b.peso - a.peso)[0]
  if (!mejor) return null
  return hex(oklch(mejor.l / mejor.n, mejor.c / mejor.n, mejor.h / mejor.n))
}
