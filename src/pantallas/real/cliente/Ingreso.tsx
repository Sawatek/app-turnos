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
      <p className="flex items-start gap-2 text-sm text-suave">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        Sin contraseñas: te llega un código de {LARGO} números.
      </p>
      {/* Antes de pedir el celular se informa para qué se usa (ley 25.326). */}
      <p className="border-t border-linea pt-3 text-xs leading-relaxed text-suave">
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
      <p className="text-[15px]">
        Te mandamos un código por WhatsApp al <b className="mono whitespace-nowrap">{tel}</b>
      </p>
      {/* Casilleros de un formulario de papel: un peine de 6 lugares, uno por número. El input real va encima, invisible. */}
      <div className="flex flex-col gap-2">
        <label className="rotulo text-suave" htmlFor={idCodigo}>
          Código de {LARGO} números
        </label>
        <div className="relative">
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
            className="peer absolute inset-0 z-10 w-full opacity-0"
          />
          <div
            aria-hidden
            className={cn(
              'grid grid-cols-6 divide-x divide-linea rounded-t-chico border-b-2 bg-superficie-2/70 transition-colors peer-focus:bg-superficie-2',
              errorCodigo ? 'border-peligro' : 'border-suave peer-focus:border-acento',
              verificando && 'motion-safe:animate-pulse',
            )}
          >
            {Array.from({ length: LARGO }, (_, i) => (
              <div key={i} className="relative grid h-16 place-items-center">
                <span className="cifra text-[2.25rem]">{codigo[i] ?? ''}</span>
                {/* El casillero que sigue: una rayita de la marca, como el cursor de la máquina de escribir. */}
                {!errorCodigo && !verificando && codigo.length === i && <span className="absolute inset-x-3 bottom-2.5 h-[3px] rounded-full bg-acento motion-safe:animate-pulse" />}
              </div>
            ))}
          </div>
        </div>
        <p id={`${idCodigo}-ayuda`} role={errorCodigo ? 'alert' : undefined} className={cn('text-sm', errorCodigo ? 'font-semibold text-peligro' : 'text-suave')}>
          {errorCodigo ?? (verificando ? 'Verificando…' : reenviado ? 'Te mandamos un código nuevo. Usá el último que te llegó.' : 'Si tu celular lo sugiere, tocá el código para completarlo.')}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Boton
          variante="fantasma"
          tamano="chico"
          className="-ml-2"
          onClick={() => {
            setPaso('telefono')
            setCodigo('')
            setErrorCodigo(undefined)
            setVerificando(false)
          }}
        >
          Cambiar el número
        </Boton>
        <Boton variante="secundario" tamano="chico" disabled={espera > 0 || enviando} cargando={enviando} onClick={() => void reenviar()}>
          {espera > 0 ? `Reenviar código en ${espera} s` : 'Reenviar código'}
        </Boton>
      </div>
    </div>
  )
}

/**
 * Invitación a entrar (en Mis turnos y Perfil sin sesión): una ficha con el encabezado sobre la hoja cuadriculada
 * y, abajo de la línea, el formulario.
 */
export function InvitacionIngreso({ titulo, texto, onEntrar }: { titulo: string; texto: string } & Props) {
  return (
    <section aria-labelledby="t-invitacion" className="overflow-hidden rounded-grande bg-superficie ring-1 ring-linea">
      <header className="relative border-b border-linea px-5 pt-4 pb-4">
        <div aria-hidden className="cuadricula absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <p className="rotulo relative flex items-center gap-1.5 text-acento-texto">
          <Smartphone className="size-3.5" aria-hidden />
          Ingreso en 2 pasos
        </p>
        <h2 id="t-invitacion" className="titulo relative mt-2 text-2xl">{titulo}</h2>
        <p className="relative mt-1 text-[15px] text-suave">{texto}</p>
      </header>
      <div className="px-5 pt-5 pb-5">
        <FormIngreso onEntrar={onEntrar} />
      </div>
    </section>
  )
}
