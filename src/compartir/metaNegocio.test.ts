import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BOTS_DE_VISTA_PREVIA, datosDeNegocio, escapar, reescribirMeta, slugDeRuta } from './metaNegocio'

const ORIGEN = 'https://turnos.ejemplo.com'
const INDEX = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')

const contenido = (html: string, atributo: string, clave: string) =>
  new RegExp(`<meta ${atributo}="${clave}" content="([^"]*)" />`).exec(html)?.[1]

describe('slugDeRuta', () => {
  it('acepta un solo segmento con forma de link de negocio', () => {
    expect(slugDeRuta('/barberia-de-prueba')).toBe('barberia-de-prueba')
    expect(slugDeRuta('/barberia-de-prueba/')).toBe('barberia-de-prueba')
  })
  it('rechaza reservados, archivos, varios segmentos y formas raras', () => {
    for (const r of ['/', '/admin', '/mis-turnos', '/index.html', '/sw.js', '/x/panel', '/Mayus', '/a', "/a'b", '/%3Cscript%3E']) {
      expect(slugDeRuta(r), r).toBeNull()
    }
  })
})

describe('BOTS_DE_VISTA_PREVIA', () => {
  it('reconoce a WhatsApp y Facebook pero no a un navegador', () => {
    expect(BOTS_DE_VISTA_PREVIA.test('WhatsApp/2.23.20.0 A')).toBe(true)
    expect(BOTS_DE_VISTA_PREVIA.test('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')).toBe(true)
    expect(BOTS_DE_VISTA_PREVIA.test('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36')).toBe(false)
  })
})

describe('datosDeNegocio', () => {
  it('usa el logo solo si es una URL absoluta http(s)', () => {
    const conUrl = datosDeNegocio({ nombre: 'Barbería X', logo: 'https://cdn.ejemplo.com/logo.png' }, 'barberia-x', ORIGEN)
    expect(conUrl?.imagen).toBe('https://cdn.ejemplo.com/logo.png')
    expect(conUrl?.imagenEsLogo).toBe(true)

    const conData = datosDeNegocio({ nombre: 'Barbería X', logo: 'data:image/png;base64,AAAA' }, 'barberia-x', ORIGEN)
    expect(conData?.imagen).toBe(`${ORIGEN}/compartir.jpg`)
    expect(conData?.imagenEsLogo).toBe(false)

    expect(datosDeNegocio({ nombre: 'X', logo: 'javascript:alert(1)' }, 'x1', ORIGEN)?.imagenEsLogo).toBe(false)
    expect(datosDeNegocio({ nombre: 'X', logo: '/logo.png' }, 'x1', ORIGEN)?.imagenEsLogo).toBe(false)
  })

  it('sin claim ni bajada arma una descripción con el nombre', () => {
    const d = datosDeNegocio({ nombre: 'Uñas Lola' }, 'unas-lola', ORIGEN)
    expect(d).toEqual({
      titulo: 'Uñas Lola · Reservá tu turno',
      descripcion: 'Sacá tu turno en Uñas Lola en segundos, desde el celular.',
      imagen: `${ORIGEN}/compartir.jpg`,
      imagenEsLogo: false,
      url: `${ORIGEN}/unas-lola`,
    })
  })

  it('junta claim y bajada', () => {
    expect(datosDeNegocio({ nombre: 'Q', claim: 'Cortes con onda', bajada: 'Barbería · Moreno' }, 'q1', ORIGEN)?.descripcion).toBe(
      'Cortes con onda · Barbería · Moreno',
    )
  })

  it('devuelve null si la config no sirve', () => {
    expect(datosDeNegocio(null, 'x1', ORIGEN)).toBeNull()
    expect(datosDeNegocio('hola', 'x1', ORIGEN)).toBeNull()
    expect(datosDeNegocio({ nombre: '   ' }, 'x1', ORIGEN)).toBeNull()
    expect(datosDeNegocio({ nombre: 42 }, 'x1', ORIGEN)).toBeNull()
  })
})

describe('reescribirMeta', () => {
  const datos = datosDeNegocio({ nombre: 'Barbería Quetul', claim: 'Cortes con onda', bajada: 'Barbería · Moreno' }, 'quetul', ORIGEN)!

  it('reemplaza title, description, og, twitter y agrega canonical', () => {
    const h = reescribirMeta(INDEX, datos)
    expect(h).toContain('<title>Barbería Quetul · Reservá tu turno</title>')
    expect(contenido(h, 'name', 'description')).toBe('Cortes con onda · Barbería · Moreno')
    expect(contenido(h, 'property', 'og:title')).toBe('Barbería Quetul · Reservá tu turno')
    expect(contenido(h, 'property', 'og:description')).toBe('Cortes con onda · Barbería · Moreno')
    expect(contenido(h, 'property', 'og:url')).toBe(`${ORIGEN}/quetul`)
    expect(contenido(h, 'property', 'og:image')).toBe(`${ORIGEN}/compartir.jpg`)
    expect(contenido(h, 'name', 'twitter:title')).toBe('Barbería Quetul · Reservá tu turno')
    expect(contenido(h, 'name', 'twitter:image')).toBe(`${ORIGEN}/compartir.jpg`)
    expect(contenido(h, 'name', 'twitter:card')).toBe('summary_large_image')
    expect(h).toContain(`<link rel="canonical" href="${ORIGEN}/quetul" />`)
    expect(h).not.toContain('SawaTek Turnos · Turnos que se confirman solos')
    // Una sola de cada una.
    expect(h.match(/<title>/g)).toHaveLength(1)
    expect(h.match(/property="og:title"/g)).toHaveLength(1)
  })

  it('no rompe el resto del HTML', () => {
    const h = reescribirMeta(INDEX, datos)
    for (const parte of ['<!doctype html>', '<div id="raiz"></div>', '<link rel="manifest" href="/manifest.webmanifest" />', '<meta charset="UTF-8" />', '</head>', '</html>']) {
      expect(h).toContain(parte)
    }
    expect(h.indexOf('rel="canonical"')).toBeLessThan(h.indexOf('</head>'))
    expect(h.match(/<script/g)?.length).toBe(INDEX.match(/<script/g)?.length)
  })

  it('escapa lo que viene de la base', () => {
    const malo = datosDeNegocio({ nombre: '"><script>alert(1)</script> & $& $1', claim: '<img src=x onerror=alert(1)>' }, 'malo1', ORIGEN)!
    const h = reescribirMeta(INDEX, malo)
    expect(h).not.toContain('<script>alert')
    expect(h).not.toContain('<img src=x')
    expect(h).toContain('<title>&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt; &amp; $&amp; $1 · Reservá tu turno</title>')
    expect(contenido(h, 'name', 'description')).toBe('&lt;img src=x onerror=alert(1)&gt;')
    expect(h.match(/<script/g)?.length).toBe(INDEX.match(/<script/g)?.length)
  })

  it('con logo: usa el logo, saca las medidas de compartir.jpg y pasa a tarjeta chica', () => {
    const d = datosDeNegocio({ nombre: 'Lema', logo: 'https://cdn.ejemplo.com/logo.png?a=1&b=2' }, 'lema', ORIGEN)!
    const h = reescribirMeta(INDEX, d)
    expect(contenido(h, 'property', 'og:image')).toBe('https://cdn.ejemplo.com/logo.png?a=1&amp;b=2')
    expect(h).not.toContain('og:image:width')
    expect(h).not.toContain('og:image:height')
    expect(contenido(h, 'name', 'twitter:card')).toBe('summary')
  })

  it('agrega las etiquetas que falten y reemplaza un canonical existente', () => {
    const minimo = '<html><head><link rel="canonical" href="https://viejo/" /></head><body></body></html>'
    const h = reescribirMeta(minimo, datos)
    expect(h).toContain('<title>Barbería Quetul · Reservá tu turno</title>')
    expect(contenido(h, 'property', 'og:url')).toBe(`${ORIGEN}/quetul`)
    expect(h).not.toContain('https://viejo/')
    expect(h.match(/rel="canonical"/g)).toHaveLength(1)
    expect(h.endsWith('</head><body></body></html>')).toBe(true)
  })

  it('escapar cubre & < > "', () => {
    expect(escapar(`a&b<c>d"e`)).toBe('a&amp;b&lt;c&gt;d&quot;e')
  })
})
