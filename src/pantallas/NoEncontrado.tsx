import { Link } from 'react-router'
import { LoaderCircle, SearchX } from 'lucide-react'

export function NoEncontrado() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <SearchX className="size-12 text-suave" aria-hidden />
      <h1 className="text-2xl">No encontramos este negocio</h1>
      <p className="text-suave">Revisá el link. Puede que la demo se haya borrado, o que el link tenga un error.</p>
      <Link to="/" className="mt-2 font-semibold text-acento-texto underline underline-offset-4">Ver las demos</Link>
    </main>
  )
}

export function Cargando() {
  return (
    <main className="grid min-h-dvh place-items-center" aria-busy="true">
      <LoaderCircle className="size-8 animate-spin text-suave" aria-label="Cargando" />
    </main>
  )
}
