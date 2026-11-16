import { describe, expect, it } from 'vitest'
import { DEMOS_FIJAS } from '@/plantillas/demos'
import { detectarNavegadorInterno, detectarPlataforma } from './estado'
import { manifestDe } from './marca'

const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  iphoneInstagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22F76 Instagram 380.0.0.29.109',
  iphoneFacebook: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22F76 [FBAN/FBIOS;FBAV/500.0.0.0]',
  androidChrome: 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  androidWebView: 'Mozilla/5.0 (Linux; Android 15; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36',
}

describe('detección del celular', () => {
  it('reconoce iPhone y Android', () => {
    expect(detectarPlataforma(UA.iphoneSafari)).toBe('ios')
    expect(detectarPlataforma(UA.androidChrome)).toBe('android')
  })
  it('Safari y Chrome no son navegadores internos', () => {
    expect(detectarNavegadorInterno(UA.iphoneSafari)).toBeNull()
    expect(detectarNavegadorInterno(UA.androidChrome)).toBeNull()
  })
  it('detecta los navegadores internos de Instagram, Facebook y WebViews', () => {
    expect(detectarNavegadorInterno(UA.iphoneInstagram)).toBe('Instagram')
    expect(detectarNavegadorInterno(UA.iphoneFacebook)).toBe('Facebook')
    expect(detectarNavegadorInterno(UA.androidWebView)).toBe('otra app')
  })
})

describe('manifest por negocio', () => {
  const n = DEMOS_FIJAS[0]!
  const m = manifestDe(n, `/m/${n.slug}`, 'abc')

  it('se instala con el nombre del negocio y abre en su app (no en la lista de demos)', () => {
    expect(m.name).toBe(n.nombre)
    expect(m.id).toBe(`/${n.slug}`)
    expect(m.start_url.startsWith(`/${n.slug}`)).toBe(true)
    expect(m.start_url.startsWith(m.scope)).toBe(true)
    expect(m.display).toBe('standalone')
  })

  it('cumple lo que pide Android para instalar: íconos de 192 y 512, y uno "maskable"', () => {
    expect(m.icons.some((i) => i.sizes === '192x192')).toBe(true)
    expect(m.icons.some((i) => i.sizes === '512x512' && i.purpose === 'any')).toBe(true)
    expect(m.icons.some((i) => i.purpose === 'maskable')).toBe(true)
    expect(m.short_name.length).toBeLessThanOrEqual(12)
  })
})
