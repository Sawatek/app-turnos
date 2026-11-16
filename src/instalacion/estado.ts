// Qué puede hacer ESTE celular para instalar la app, detectado una sola vez al cargar.
// El evento `beforeinstallprompt` (Android/Chrome) puede llegar antes de que exista cualquier pantalla,
// por eso se escucha acá, a nivel de módulo, y se guarda.
import { create } from 'zustand'

export interface EventoInstalar extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type Plataforma = 'ios' | 'android' | 'otra'
/** App que abrió el link con su navegador interno (desde ahí no se puede instalar). */
export type NavegadorInterno = 'Instagram' | 'Facebook' | 'TikTok' | 'WhatsApp' | 'otra app' | null

const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent

export function detectarPlataforma(agente = ua): Plataforma {
  // iPadOS se presenta como Mac: se distingue por tener pantalla táctil.
  if (/iphone|ipad|ipod/i.test(agente) || (/Macintosh/.test(agente) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)) return 'ios'
  if (/android/i.test(agente)) return 'android'
  return 'otra'
}

export function detectarNavegadorInterno(agente = ua): NavegadorInterno {
  if (/Instagram/i.test(agente)) return 'Instagram'
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(agente)) return 'Facebook'
  if (/musical_ly|BytedanceWebview|TikTok/i.test(agente)) return 'TikTok'
  if (/WhatsApp/i.test(agente)) return 'WhatsApp'
  // WebView genérico de Android ("; wv)") o iOS sin "Safari" en el agente (app con navegador propio).
  if (/; wv\)/.test(agente)) return 'otra app'
  if (detectarPlataforma(agente) === 'ios' && !/Safari/i.test(agente)) return 'otra app'
  return null
}

const enModoApp = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)

interface EstadoInstalacion {
  evento: EventoInstalar | null
  instalada: boolean
  plataforma: Plataforma
  navegadorInterno: NavegadorInterno
  /** Abre el cartel nativo de instalar (Android/Chrome). Devuelve si la instaló. */
  instalar: () => Promise<boolean>
}

export const useInstalacion = create<EstadoInstalacion>()((set, get) => ({
  evento: null,
  instalada: enModoApp(),
  plataforma: detectarPlataforma(),
  navegadorInterno: detectarNavegadorInterno(),
  instalar: async () => {
    const ev = get().evento
    if (!ev) return false
    await ev.prompt()
    const { outcome } = await ev.userChoice
    set({ evento: null, instalada: outcome === 'accepted' })
    return outcome === 'accepted'
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (ev) => {
    ev.preventDefault() // lo mostramos nosotros, en el mejor momento (después de reservar)
    useInstalacion.setState({ evento: ev as EventoInstalar })
  })
  window.addEventListener('appinstalled', () => useInstalacion.setState({ instalada: true, evento: null }))
}
