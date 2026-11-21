// "Mi cuenta" del panel: el nombre de la persona logueada (se guarda en su cuenta) y salir.
// Si todavía no tiene nombre, se lo pide con un aviso suave arriba de todo (no bloquea).
import { LogOut, UserRound } from 'lucide-react'
import { useState } from 'react'
import { guardarMiNombre, salir } from '@/datos/sesion'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { Hoja } from '@/ui/Hoja'

function FormNombre({ inicial, onListo }: { inicial: string; onListo: () => void }) {
  const [nombre, setNombre] = useState(inicial)
  const [error, setError] = useState<string>()
  const [guardando, setGuardando] = useState(false)
  const guardar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setGuardando(true)
    try {
      await guardarMiNombre(nombre)
      onListo()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGuardando(false)
    }
  }
  return (
    <form onSubmit={guardar} className="flex flex-col gap-3" noValidate>
      <Campo etiqueta="Tu nombre" autoComplete="name" maxLength={80} value={nombre} onChange={(e) => setNombre(e.target.value)} error={error} />
      <Boton type="submit" cargando={guardando}>
        Guardar
      </Boton>
    </form>
  )
}

/** Botón de la cabecera que abre "Mi cuenta". */
export function BotonMiCuenta({ nombre, email, rol }: { nombre: string | null; email: string; rol: string }) {
  const [abierta, setAbierta] = useState(false)
  return (
    <>
      <Boton variante="secundario" tamano="chico" onClick={() => setAbierta(true)} aria-label="Mi cuenta">
        <UserRound className="size-4" aria-hidden />
        <span className="hidden max-w-36 truncate sm:inline">{nombre ?? 'Mi cuenta'}</span>
      </Boton>
      <Hoja abierta={abierta} onCerrar={() => setAbierta(false)} titulo="Mi cuenta" descripcion={`${rol} · ${email}`}>
        <div className="flex flex-col gap-5 pb-4">
          <FormNombre inicial={nombre ?? ''} onListo={() => setAbierta(false)} />
          <Boton variante="peligro" onClick={() => void salir()}>
            <LogOut className="size-4" aria-hidden />
            Salir
          </Boton>
        </div>
      </Hoja>
    </>
  )
}

/** Aviso para completar el nombre la primera vez. */
export function PedirNombre() {
  const [cerrado, setCerrado] = useState(false)
  if (cerrado) return null
  return (
    <section aria-labelledby="t-pedir-nombre" className="mb-5 rounded-grande border border-dashed border-acento-borde p-4">
      <h2 id="t-pedir-nombre" className="titulo text-xl">¿Cómo te llamás?</h2>
      <p className="mb-3 text-sm text-suave">Así te saludamos y tu equipo te ve con tu nombre, no con tu mail.</p>
      <FormNombre inicial="" onListo={() => setCerrado(true)} />
    </section>
  )
}
