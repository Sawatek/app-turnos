import type { User } from '@supabase/supabase-js'
import { MessageCircle, ShieldCheck, Smartphone } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ErrorCliente, pedirCodigo, verificarCodigo } from '@/datos/real/cliente'
import { formatoTelefono, normalizarTelefono } from '@/datos/real/cliente-telefono'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { cn } from '@/ui/cn'

const LARGO = 6
/** Segundos antes de poder pedir otro código. */
const ESPERA = 30

const textoDe = (err: unknown) => (err instanceof ErrorCliente ? err.message : 'Algo salió mal. Probá de nuevo en un momento.')

interface Props {
  /** Se llama apenas el código es correcto (la sesión ya quedó guardada). */
  onEntrar?: (usuario: User) => void | Promise<void>
}

/**
 * Entrada sin contraseña: el celular y un código que llega por WhatsApp.
 * Se usa dentro de otras pantallas (la hoja de reserva, Mis turnos, Perfil, /mis-turnos), sin perder lo que estaba.
 */
export function FormIngreso({ onEntrar }: Props) {
  const idCodigo = useId()
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
    let usuario: User
    try {
      // Si está bien, la sesión cambia y la app se entera sola.
      usuario = await verificarCodigo(e164, limpio)
    } catch (err) {
      setErrorCodigo(textoDe(err))
      setCodigo('')
      setVerificando(false)
      setTimeout(() => refCodigo.current?.focus(), 0)
      return
    }
    await onEntrar?.(usuario)
  }

  const reenviar = async () => {
    setErrorCodigo(undefined)
    if (await enviar(e164)) {
      setReenviado(true)
      setCodigo('')
      refCodigo.current?.focus()
    }
  }

  return paso === 'telefono' ? (
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
      {/* Antes de pedir el celular se informa para qué se usa (ley 25.326). */}
      <p className="text-center text-xs leading-relaxed text-suave">
        Usamos tu celular para tus turnos y recordatorios por WhatsApp.{' '}
        <Link to="/privacidad" target="_blank" className="font-semibold text-texto underline underline-offset-2">
          Ver privacidad
        </Link>{' '}
        ·{' '}
        <Link to="/terminos" target="_blank" className="font-semibold text-texto underline underline-offset-2">
          Términos
        </Link>
      </p>
    </form>
  ) : (
    <div className="flex flex-col gap-4">
      <p className="text-center text-[15px]">
        Te mandamos un código por WhatsApp al <b className="num">{tel}</b>
      </p>
      <div className="relative mx-auto">
        <label className="sr-only" htmlFor={idCodigo}>Código de {LARGO} números</label>
        <input
          ref={refCodigo}
          id={idCodigo}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={LARGO}
          value={codigo}
          disabled={verificando}
          onChange={(e) => void alEscribirCodigo(e.target.value)}
          aria-invalid={!!errorCodigo || undefined}
          aria-describedby={`${idCodigo}-ayuda`}
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
      <p id={`${idCodigo}-ayuda`} role={errorCodigo ? 'alert' : undefined} className={cn('text-center text-sm', errorCodigo ? 'font-semibold text-peligro' : 'text-suave')}>
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
  )
}

/** Tarjeta que invita a entrar (en Mis turnos y Perfil sin sesión). */
export function InvitacionIngreso({ titulo, texto, onEntrar }: { titulo: string; texto: string } & Props) {
  return (
    <section aria-labelledby="t-invitacion" className="flex flex-col gap-5 rounded-grande bg-superficie p-5 ring-1 ring-linea">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-acento-suave text-acento-texto" aria-hidden>
          <Smartphone className="size-5" />
        </span>
        <div>
          <h2 id="t-invitacion" className="titulo text-lg">{titulo}</h2>
          <p className="text-sm text-suave">{texto}</p>
        </div>
      </div>
      <FormIngreso onEntrar={onEntrar} />
    </section>
  )
}
