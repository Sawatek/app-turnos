import type { Negocio } from '@/dominio/tipos'
import { cn } from './cn'

export function iniciales(nombre: string) {
  const palabras = nombre.split(/\s+/).filter((p) => p.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(p))
  if (palabras.length >= 2) return palabras.slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
  // Una sola palabra: "QueTul" → "QT"; "Nailed" → "NA". Ignora prefijos como "Dra." o "Lic.".
  const p = (palabras[0] ?? nombre).replace(/\./g, '')
  const mayus = p.slice(1).match(/[A-ZÁÉÍÓÚ]/)?.[0]
  return (p[0]! + (mayus ?? p[1] ?? '')).toUpperCase()
}

/** Logo del negocio, o sus iniciales sobre el color de marca si no subió logo. */
export function Logo({ negocio, className }: { negocio: Pick<Negocio, 'nombre' | 'logo'>; className?: string }) {
  if (negocio.logo)
    return <img src={negocio.logo} alt={`Logo de ${negocio.nombre}`} className={cn('rounded-medio bg-white object-contain', className)} />
  return (
    <div aria-hidden className={cn('grid place-items-center rounded-medio bg-acento font-extrabold tracking-tight text-sobre-acento', className)}>
      {iniciales(negocio.nombre)}
    </div>
  )
}
