// Entrada del build del servidor (solo para pre-generar el HTML de la portada en `pnpm build`; no va al navegador).
// La usa el plugin `portadaPreGenerada` de vite.config.ts: arma el HTML de `/`, el tema de la marca y el JSON-LD.
// Las figuras perezosas de la portada (vitrina, chat) salen con su lugar reservado (el marco vacío): las dibuja el navegador.
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import InicioPublico from '@/pantallas/publico/Inicio'
import { MARCA, PLANES, hayPrecios } from '@/pantallas/publico/marca'
import { generarTema } from '@/tema/paleta'

/** El HTML de la portada, tal cual lo dibuja React (sin hidratar: el navegador la vuelve a dibujar con createRoot). */
export function htmlDeLaPortada(): string {
  return renderToString(
    <StrictMode>
      <StaticRouter location="/">
        <InicioPublico />
      </StaticRouter>
    </StrictMode>,
  )
}

/** Lo que useTemaNegocio pone en <html> al cargar la portada: así no hay un cuadro con otros colores. */
export function temaDeLaPortada() {
  const tema = generarTema(MARCA.color, MARCA.modo)
  return {
    estilo: Object.entries(tema)
      .map(([k, v]) => `${k}:${v}`)
      .join(';'),
    personalidad: MARCA.personalidad,
    colorBarra: tema['--t-fondo']!,
  }
}

/** Datos estructurados para buscadores (Organization + WebSite + SoftwareApplication). `sitio` sin barra final; vacío = sin URLs. */
export function jsonLdDeLaPortada(sitio: string): string {
  const conUrl = (ruta: string) => (sitio ? { url: `${sitio}${ruta}` } : {})
  const idOrganizacion = `${sitio}/#organizacion`
  const organizacion = { '@type': 'Organization', '@id': idOrganizacion, name: MARCA.nombre, ...conUrl('/'), ...(sitio ? { logo: `${sitio}/icon-512.png` } : {}) }
  const ofertas = hayPrecios()
    ? {
        offers: PLANES.filter((p) => p.precioMensual != null).map((p) => ({
          '@type': 'Offer',
          name: p.nombre,
          price: p.precioMensual,
          priceCurrency: 'ARS',
        })),
      }
    : {}
  const datos = {
    '@context': 'https://schema.org',
    '@graph': [
      organizacion,
      { '@type': 'WebSite', name: MARCA.nombre, description: MARCA.descripcion, inLanguage: 'es-AR', ...conUrl('/'), publisher: { '@id': idOrganizacion } },
      {
        '@type': 'SoftwareApplication',
        name: MARCA.nombre,
        description: MARCA.descripcion,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, Android, iOS',
        inLanguage: 'es-AR',
        ...conUrl('/'),
        publisher: { '@id': idOrganizacion },
        ...ofertas,
      },
    ],
  }
  // `<` escapado: el JSON va dentro de un <script> y no puede cerrarlo.
  return JSON.stringify(datos).replaceAll('<', '\\u003c')
}
