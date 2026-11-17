// Lo que ve el cliente cuando el negocio está bloqueado (por falta de pago, aunque eso no se le dice):
// la marca del negocio y que por ahora no toma turnos. El tema del negocio ya lo aplica AppCliente.
import { CalendarOff } from 'lucide-react'
import { Link } from 'react-router'
import type { Negocio } from '@/dominio/tipos'
import { Logo } from '@/ui/Logo'

export function NoDisponible({ n }: { n: Negocio }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 pt-segura pb-segura text-center sm:px-6">
      <Logo negocio={n} className="size-16 text-lg" />
      <p className="mt-3 text-sm font-semibold text-suave">{n.nombre}</p>
      <span className="mt-8 grid size-14 place-items-center rounded-grande bg-superficie text-suave ring-1 ring-linea">
        <CalendarOff className="size-7" aria-hidden />
      </span>
      <h1 className="mt-4 text-2xl">No disponible por el momento</h1>
      <p className="mt-2 text-suave">
        {n.nombre} no está tomando turnos desde la app por ahora. Si ya tenías uno o querés reservar, comunicate directamente con el negocio.
      </p>
      <Link
        to="/mis-turnos"
        className="mt-7 inline-flex h-12 items-center justify-center rounded-medio bg-superficie-2 px-6 font-semibold ring-1 ring-linea transition-colors hover:bg-linea/60"
      >
        Ver mis turnos
      </Link>
    </main>
  )
}
