// Modo claro y oscuro del sitio de la plataforma (landing, legales, /demos, 404).
// - Por defecto sigue al sistema (prefers-color-scheme). El botón del encabezado lo invierte; la elección queda en
//   <meta name="color-scheme"> ("light dark" = sistema, "light" o "dark" = elegido) y en localStorage.
// - Los colores van en un <style id="tema-sitio"> que manda según ese <meta>, no en variables en línea: así el HTML
//   pre-generado de la portada sale con el modo correcto desde el primer cuadro (un script de una línea en index.html
//   copia lo guardado al <meta> antes de pintar), y si el JS no corre, el sitio igual sigue al sistema.
// - Solo vale con data-sitio en <html> (lo ponen useMarcaSitio y el pre-render): las apps de cada negocio no se enteran.
import { generarTema } from '@/tema/paleta'
import { MARCA, PAPEL_SITIO, PAPEL_SITIO_OSCURO } from './marca'

export type Esquema = 'light' | 'dark'

export const TEMA_SITIO: Record<Esquema, Record<string, string>> = {
  light: { ...generarTema(MARCA.color, 'claro'), ...PAPEL_SITIO },
  dark: { ...generarTema(MARCA.color, 'oscuro'), ...PAPEL_SITIO_OSCURO },
}

const CLAVE = 'esquema-sitio'
const SISTEMA = 'light dark'
const meta = (contenido: string) => `> head > meta[name="color-scheme"][content="${contenido}"]`
const declaraciones = (t: Record<string, string>) =>
  Object.entries(t)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')

/** El CSS del tema del sitio: claro por defecto, oscuro si el sistema lo pide (y no se eligió claro) o si se eligió oscuro. */
export function cssTemaSitio() {
  const raiz = ':root[data-sitio]'
  return [
    `${raiz}{${declaraciones(TEMA_SITIO.light)}}`,
    `@media (prefers-color-scheme: dark){${raiz}:not(:has(${meta('light')})){${declaraciones(TEMA_SITIO.dark)}}}`,
    `${raiz}:has(${meta('dark')}){${declaraciones(TEMA_SITIO.dark)}}`,
  ].join('\n')
}

/** El script que va apenas después del <meta name="color-scheme"> en index.html (copiarlo ahí si cambia). */
export const SCRIPT_ESQUEMA = `try{var e=localStorage.getItem('${CLAVE}');if(e==='light'||e==='dark')document.querySelector('meta[name="color-scheme"]').content=e}catch(_){}`

const elMeta = () => document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')
const sistema = (): Esquema => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

/** El esquema que se ve ahora: el elegido (en el <meta>) o, si no hay, el del sistema. */
export function esquemaVisible(): Esquema {
  const elegido = elMeta()?.content
  return elegido === 'light' || elegido === 'dark' ? elegido : sistema()
}

function aplicar(elegido: Esquema | null) {
  elMeta()?.setAttribute('content', elegido ?? SISTEMA)
  window.dispatchEvent(new Event(CLAVE))
}

/**
 * Pasa al esquema opuesto al que se ve. Si el destino es el del sistema, se borra la elección (vuelve a seguirlo);
 * si no, se guarda tal cual. Si no se puede guardar (datos del sitio bloqueados), igual se aplica en esta visita.
 */
export function alternarEsquema() {
  const destino: Esquema = esquemaVisible() === 'dark' ? 'light' : 'dark'
  const elegido = destino === sistema() ? null : destino
  try {
    if (elegido) localStorage.setItem(CLAVE, elegido)
    else localStorage.removeItem(CLAVE)
  } catch {
    // Sin almacenamiento: vale para esta visita.
  }
  aplicar(elegido)
}

/** Avisa cuando cambia el esquema visible: por el botón, por el sistema o desde otra pestaña. Devuelve cómo dejar de escuchar. */
export function escucharEsquema(avisar: () => void) {
  const medio = matchMedia('(prefers-color-scheme: dark)')
  const otraPestana = (e: StorageEvent) => {
    if (e.key !== CLAVE) return
    aplicar(e.newValue === 'light' || e.newValue === 'dark' ? e.newValue : null)
  }
  medio.addEventListener('change', avisar)
  window.addEventListener(CLAVE, avisar)
  window.addEventListener('storage', otraPestana)
  return () => {
    medio.removeEventListener('change', avisar)
    window.removeEventListener(CLAVE, avisar)
    window.removeEventListener('storage', otraPestana)
  }
}
