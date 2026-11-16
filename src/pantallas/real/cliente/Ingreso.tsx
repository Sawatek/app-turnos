import { motion } from 'motion/react'
import { MessageCircle, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ErrorCliente, pedirCodigo, verificarCodigo } from '@/datos/real/cliente'
import { formatoTelefono, normalizarTelefono } from '@/datos/real/cliente-telefono'
import type { Negocio } from '@/dominio/tipos'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { Logo } from '@/ui/Logo'
import { cn } from '@/ui/cn'

const LARGO = 6
/** Segundos antes de poder pedir otro código. */
const ESPERA = 30

const textoDe = (err: unknown) => (err instanceof ErrorCliente ? err.message : 'Algo salió mal. Probá de nuevo en un momento.')

/** Entrada sin contraseña: el celular y un código que llega por WhatsApp. */
export function Ingreso({ n }: { n: Negocio }) {
  const [paso, setPaso] = useState<'telefono' | 'codigo'>('telefono')
  const [tel, setTel] = useState('')
  const [e164, setE164] = useState('')
  const [codigo, setCodigo] = useState('')
  const [errorTel, setErrorTel] = useState<string>()
  const [errorCodigo, setErrorCodigo] = useState<string>()
  const [enviando, setEnviando] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [reenviado, setReenviado] = useState(false)
  const [espera, setEspera] = useState(0)
  const refCodigo = useRef<HTMLInputElement>(null)

  // Cuenta regresiva para "Reenviar código".
  useEffect(() => {
    if (espera <= 0) return
    const t = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [espera])

  const enviar = async (numero: string) => {
    setEnviando(true)
    try {
      await pedirCodigo(numero)
      setEspera(ESPERA)
      return true
    } catch (err) {
      if (paso === 'telefono') setErrorTel(textoDe(err))
      else setErrorCodigo(textoDe(err))
      return false
    } finally {
      setEnviando(false)
    }
  }

  const alPedir = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const r = normalizarTelefono(tel)
    if (!r.ok) return setErrorTel(r.error)
    setErrorTel(undefined)
    if (!(await enviar(r.e164))) return
    setE164(r.e164)
    setTel(formatoTelefono(r.nacional))
    setCodigo('')
    setErrorCodigo(undefined)
    setReenviado(false)
    setPaso('codigo')
    setTimeout(() => refCodigo.current?.focus(), 300)
  }

  const alEscribirCodigo = async (valor: string) => {
    const limpio = valor.replace(/\D/g, '').slice(0, LARGO)
    setCodigo(limpio)
    setErrorCodigo(undefined)
    if (limpio.length < LARGO || verificando) return
    setVerificando(true)
    try {
      // Si está bien, la sesión cambia y la app pasa sola al inicio.
      await verificarCodigo(e164, limpio)
    } catch (err) {
      setErrorCodigo(textoDe(err))
      setCodigo('')
      setVerificando(false)
      setTimeout(() => refCodigo.current?.focus(), 0)
    }
  }

  const reenviar = async () => {
    setErrorCodigo(undefined)
    if (await enviar(e164)) {
      setReenviado(true)
      setCodigo('')
      refCodigo.current?.focus()
    }
  }

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
          {n.bajada && <p className="mt-1 text-sm font-semibold text-acento-texto">{n.bajada}</p>}
          {n.claim && <p className="mt-3 max-w-xs text-[15px] text-suave">{n.claim}</p>}
        </header>

        {paso === 'telefono' ? (
          <form className="flex flex-col gap-4" onSubmit={(ev) => void alPedir(ev)} noValidate>
            <Campo
              etiqueta="Tu celular"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="11 2345-6789"
              value={tel}
              onChange={(e) => {
                setTel(formatoTelefono(e.target.value))
                setErrorTel(undefined)
              }}
              ayuda="Con el código de área, sin el 0 ni el 15."
              error={errorTel}
            />
            <Boton type="submit" tamano="grande" ancho cargando={enviando} className="mt-1">
              <MessageCircle className="size-5" aria-hidden />
              Recibir código por WhatsApp
            </Boton>
            <p className="flex items-center justify-center gap-1.5 text-center text-sm text-suave">
              <ShieldCheck className="size-4" aria-hidden />
              Sin contraseñas: te llega un código de {LARGO} números.
            </p>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-center text-[15px]">
              Te mandamos un código por WhatsApp al <b className="num">{tel}</b>
            </p>
            <div className="relative mx-auto">
              <label className="sr-only" htmlFor="codigo-ingreso">Código de {LARGO} números</label>
              <input
                ref={refCodigo}
                id="codigo-ingreso"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={LARGO}
                value={codigo}
                disabled={verificando}
                onChange={(e) => void alEscribirCodigo(e.target.value)}
                aria-invalid={!!errorCodigo || undefined}
                aria-describedby="codigo-ayuda"
                className="absolute inset-0 z-10 w-full opacity-0"
              />
              <div className="flex gap-2" aria-hidden>
                {Array.from({ length: LARGO }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'num grid h-15 w-12 place-items-center rounded-medio border-2 bg-superficie text-2xl font-bold transition-colors',
                      errorCodigo ? 'border-peligro' : codigo.length === i ? 'border-acento' : 'border-linea',
                    )}
                  >
                    {codigo[i] ?? ''}
                  </div>
                ))}
              </div>
            </div>
            <p id="codigo-ayuda" role={errorCodigo ? 'alert' : undefined} className={cn('text-center text-sm', errorCodigo ? 'font-semibold text-peligro' : 'text-suave')}>
              {errorCodigo ?? (verificando ? 'Verificando…' : reenviado ? 'Te mandamos un código nuevo. Usá el último que te llegó.' : 'Si tu celular lo sugiere, tocá el código para completarlo.')}
            </p>
            <Boton variante="secundario" disabled={espera > 0 || enviando} cargando={enviando} onClick={() => void reenviar()}>
              {espera > 0 ? `Reenviar código en ${espera} s` : 'Reenviar código'}
            </Boton>
            <Boton
              variante="fantasma"
              onClick={() => {
                setPaso('telefono')
                setCodigo('')
                setErrorCodigo(undefined)
                setVerificando(false)
              }}
            >
              Cambiar el número
            </Boton>
          </div>
        )}
      </motion.div>
      <p className="text-center text-xs text-suave">Usamos tu celular solo para tus turnos con {n.nombre}.</p>
    </main>
  )
}
