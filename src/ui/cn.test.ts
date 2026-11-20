import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('la última clase de radio gana, también con los tokens propios', () => {
    expect(cn('rounded-medio', 'rounded-full')).toBe('rounded-full')
    expect(cn('rounded-chico rounded-medio')).toBe('rounded-medio')
  })

  it('el tamaño de texto propio y el color conviven', () => {
    expect(cn('text-entrada text-suave')).toBe('text-entrada text-suave')
    expect(cn('text-numeral', 'text-acento-texto')).toBe('text-numeral text-acento-texto')
    expect(cn('text-titular', 'text-subtitular')).toBe('text-subtitular')
  })

  it('el último color gana', () => {
    expect(cn('text-suave', 'text-texto')).toBe('text-texto')
    expect(cn('bg-acento text-sobre-acento', 'bg-peligro text-white')).toBe('bg-peligro text-white')
  })

  it('alto y alto mínimo no se pisan', () => {
    expect(cn('h-12', 'min-h-12')).toBe('h-12 min-h-12')
    expect(cn('h-10', 'h-11')).toBe('h-11')
  })

  it('la fuente editorial y el peso conviven', () => {
    expect(cn('font-editorial font-semibold')).toBe('font-editorial font-semibold')
    expect(cn('font-sans', 'font-editorial')).toBe('font-editorial')
  })

  it('ignora los valores falsos', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })
})
