import { motion } from 'motion/react'
import { MessageCircle, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useDemo } from '@/datos/demo'
import type { Negocio } from '@/dominio/tipos'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { Logo } from '@/ui/Logo'
import { cn } from '@/ui/cn'

const soloDigitos = (s: string) => s.replace(/\D/g, '')
const formatoTel = (s: string) => {
  const d = soloDigitos(s).slice(0, 10)
  return d.length > 6 ? `${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6)}` : d.length > 2 ? `${d.slice(0, 2)} ${d.slice(2)}` : d
}

/** Entrada sin contraseña: nombre + celular, y un código que "llega por WhatsApp". */
export function Ingreso({ n }: { n: Negocio }) {
  const avisar = useDemo((s) => s.avisar)
  const ingresar = useDemo((s) => s.ingresar)
  const [paso, setPaso] = useState<'datos' | 'codigo'>('datos')
  const [nombre, setNombre] = useState('')
  const [tel, setTel] = useState('')
  const [codigo, setCodigo] = useState('')
  const [esperado] = useState(() => String(1000 + Math.floor(Math.random() * 9000)))
  const [errores, setErrores] = useState<{ nombre?: string; tel?: string; codigo?: string }>({})
  const [enviando, setEnviando] = useState(false)
  const refCodigo = useRef<HTMLInputElement>(null)

  const pedirCodigo = (ev: React.FormEvent) => {
    ev.preventDefault()
    const err = {
      nombre: nombre.trim().length < 2 ? 'Poné tu nombre así te reconocen en el local.' : undefined,
      tel: soloDigitos(tel).length < 10 ? 'Tiene que tener 10 números, con código de área (ej.: 11 2345-6789).' : undefined,
    }
    setErrores(err)
    if (err.nombre || err.tel) return
    setEnviando(true)
    setTimeout(() => {
      setEnviando(false)
      setPaso('codigo')
      avisar(n.slug, { tipo: 'codigo', canal: 'whatsapp', texto: `${n.nombre}: tu código para entrar es ${esperado}. Vence en 10 minutos.` })
      setTimeout(() => refCodigo.current?.focus(), 350)
    }, 700)
  }

  const verificar = (valor: string) => {
    setCodigo(valor)
    if (valor.length < 4) return setErrores({})
    if (valor !== esperado) return setErrores({ codigo: 'El código no coincide. Fijate el último mensaje de WhatsApp.' })
    ingresar(n.slug, { nombre: nombre.trim(), tel: formatoTel(tel) })
  }

  // Tocar la notificación de WhatsApp completa el código (como el autocompletado del celular).
  useEffect(() => {
    const alTocar = (ev: Event) => verificar((ev as CustomEvent<string>).detail)
    window.addEventListener(EVENTO_CODIGO, alTocar)
    return () => window.removeEventListener(EVENTO_CODIGO, alTocar)
  })

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-segura pb-segura">
      {/* Hoja cuadriculada arriba, que se desvanece: la tapa de la libreta del negocio. Decorativa. */}
      <div aria-hidden className="cuadricula pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <motion.div
        className="flex flex-1 flex-col justify-center gap-9 py-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
      >
        <header className="flex flex-col items-start">
          <Logo negocio={n} className="size-16 text-2xl" />
          <h1 className="mt-5 text-[2.75rem] leading-[0.95]">{n.nombre}</h1>
          {n.bajada && <p className="rotulo mt-3 text-acento-texto">{n.bajada}</p>}
          {n.claim && <p className="mt-2 max-w-xs text-[15px] text-suave">{n.claim}</p>}
        </header>

        {paso === 'datos' ? (
          <form className="flex flex-col gap-5 border-t-2 border-texto pt-5" onSubmit={pedirCodigo} noValidate>
            <Campo etiqueta="Tu nombre" autoComplete="given-name" placeholder="Ej.: Martín" value={nombre} onChange={(e) => setNombre(e.target.value)} error={errores.nombre} />
            <Campo
              etiqueta="Tu celular"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="11 2345-6789"
              value={tel}
              onChange={(e) => setTel(formatoTel(e.target.value))}
              error={errores.tel}
              className="[&_input]:font-mono [&_input]:tabular-nums"
            />
            <Boton type="submit" tamano="grande" ancho cargando={enviando} className="mt-1">
              <MessageCircle className="size-5" aria-hidden />
              Recibir código por WhatsApp
            </Boton>
            <p className="flex items-center justify-center gap-1.5 text-center text-sm text-suave">
              <ShieldCheck className="size-4 shrink-0" aria-hidden />
              Sin contraseñas: te llega un código de 4 números.
            </p>
          </form>
        ) : (
          <div className="flex flex-col gap-5 border-t-2 border-texto pt-5">
            <p className="text-[15px]">
              Te mandamos un código por WhatsApp al <b className="mono font-bold whitespace-nowrap">{tel}</b>
            </p>
            <label className="rotulo text-suave" htmlFor="codigo">
              Código de 4 números
            </label>
            {/* El visor del "sacá número": cuatro cifras grandes. El input real está encima, invisible. */}
            <div className="group relative -mt-3 self-start">
              <input
                ref={refCodigo}
                id="codigo"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                value={codigo}
                onChange={(e) => verificar(soloDigitos(e.target.value))}
                aria-invalid={!!errores.codigo || undefined}
                aria-describedby="codigo-ayuda"
                className="absolute inset-0 z-10 opacity-0"
              />
              <div className="flex gap-2.5" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'cifra grid h-20 w-16 place-items-center rounded-medio bg-superficie text-5xl ring-inset transition-shadow',
                      // El casillero que sigue se marca con la marca solo mientras el campo tiene el foco (es el cursor).
                      errores.codigo ? 'text-peligro ring-2 ring-peligro' : codigo.length === i ? 'ring-1 ring-linea group-focus-within:ring-2 group-focus-within:ring-acento' : 'ring-1 ring-linea',
                    )}
                  >
                    {codigo[i] ?? <span className="text-linea">·</span>}
                  </div>
                ))}
              </div>
            </div>
            <p id="codigo-ayuda" className={cn('text-sm', errores.codigo ? 'font-semibold text-peligro' : 'text-suave')}>
              {errores.codigo ?? 'Tocá la notificación de WhatsApp para completarlo solo.'}
            </p>
            <Boton variante="fantasma" className="self-start" onClick={() => { setPaso('datos'); setCodigo('') }}>
              Cambiar el número
            </Boton>
          </div>
        )}
      </motion.div>
      <p className="text-center text-xs text-suave">Demo hecha por SawaTek · los datos son de ejemplo</p>
    </main>
  )
}

export const EVENTO_CODIGO = 'sawatek:codigo'
export const codigoDelAviso = (texto: string) => texto.match(/\b(\d{4})\b/)?.[1] ?? null
