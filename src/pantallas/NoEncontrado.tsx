import { Link } from 'react-router'
import { SearchX } from 'lucide-react'

export function NoEncontrado() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <SearchX className="size-12 text-suave" aria-hidden />
      <h1 className="text-2xl">No encontramos este negocio</h1>
      <p className="text-suave">Revisá el link. Si la demo se creó en otra compu, todavía no está publicada para este dispositivo.</p>
      <Link to="/" className="mt-2 font-semibold text-acento-texto underline underline-offset-4">Ver las demos</Link>
    </main>
  )
}
