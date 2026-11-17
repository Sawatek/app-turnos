// Ingreso del staff (dueño o profesional) con mail y contraseña.
import { useState } from 'react'
import { Link } from 'react-router'
import { entrarConContrasena } from '@/datos/sesion'
import type { Negocio } from '@/dominio/tipos'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { Logo } from '@/ui/Logo'

const MENSAJES_AUTH: Record<string, string> = {
  'Invalid login credentials': 'Mail o contraseña incorrectos.',
  'Email not confirmed': 'Tu usuario todavía no está confirmado.',
}

export function Ingreso({ n }: { n: Negocio }) {
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [errorMail, setErrorMail] = useState<string>()
  const [error, setError] = useState<string>()

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setErrorMail(undefined)
    setError(undefined)
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErrorMail('Escribí un mail válido.')
    if (!contrasena) return setError('Escribí tu contraseña.')
    setEnviando(true)
    try {
      await entrarConContrasena(email, contrasena) // si sale bien, cambia la sesión y se muestra el panel
    } catch (e) {
      const msg = (e as Error).message
      setError(MENSAJES_AUTH[msg] ?? msg)
      setEnviando(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-5 py-10">
      <div className="flex flex-col items-start gap-4">
        <Logo negocio={n} className="size-14 text-base" />
        <div>
          <p className="text-sm font-bold tracking-wide text-acento-texto uppercase">Panel del negocio</p>
          <h1 className="mt-1 text-3xl">{n.nombre}</h1>
          <p className="mt-2 text-suave">Entrá con tu mail y tu contraseña para ver la agenda.</p>
        </div>
      </div>
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <Campo etiqueta="Tu mail" type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errorMail} />
        <Campo
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          error={error}
        />
        <Boton type="submit" tamano="grande" cargando={enviando}>
          Entrar
        </Boton>
      </form>
      <Link to={`/${n.slug}`} className="text-center text-sm font-semibold text-acento-texto">
        Ir a la app de {n.textos.clientes || 'clientes'}
      </Link>
    </main>
  )
}
