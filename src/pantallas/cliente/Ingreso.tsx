import { motion } from 'motion/react'
import { MessageCircle, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useDemo } from '@/datos/demo'
import type { Negocio } from '@/dominio/tipos'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { Logo } from '@/ui/Logo'

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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-segura pb-segura">
      <motion.div
        className="flex flex-1 flex-col justify-center gap-8 py-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
      >
        <header className="flex flex-col items-center text-center">
          <Logo negocio={n} className="size-22 text-3xl sombra-suave" />
          <h1 className="mt-5 text-3xl">{n.nombre}</h1>
          <p className="mt-1 text-sm font-semibold text-acento-texto">{n.bajada}</p>
          <p className="mt-3 max-w-xs text-[15px] text-suave">{n.claim}</p>
        </header>

        {paso === 'datos' ? (
          <form className="flex flex-col gap-4" onSubmit={pedirCodigo} noValidate>
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
            />
            <Boton type="submit" tamano="grande" ancho cargando={enviando} className="mt-1">
              <MessageCircle className="size-5" aria-hidden />
              Recibir código por WhatsApp
            </Boton>
            <p className="flex items-center justify-center gap-1.5 text-center text-sm text-suave">
              <ShieldCheck className="size-4" aria-hidden />
              Sin contraseñas: te llega un código de 4 números.
            </p>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <p className="text-[15px]">
                Te mandamos un código por WhatsApp al <b className="num">{tel}</b>
              </p>
            </div>
            <label className="sr-only" htmlFor="codigo">Código de 4 números</label>
            <div className="relative mx-auto">
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
              <div className="flex gap-3" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`num grid size-16 place-items-center rounded-medio border-2 bg-superficie text-3xl font-bold transition-colors ${
                      errores.codigo ? 'border-peligro' : codigo.length === i ? 'border-acento' : 'border-linea'
                    }`}
                  >
                    {codigo[i] ?? ''}
                  </div>
                ))}
              </div>
            </div>
            <p id="codigo-ayuda" className={`text-center text-sm ${errores.codigo ? 'text-peligro' : 'text-suave'}`}>
              {errores.codigo ?? 'Tocá la notificación de WhatsApp para completarlo solo.'}
            </p>
            <Boton variante="fantasma" onClick={() => { setPaso('datos'); setCodigo('') }}>
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
