// Cartel del panel cuando SawaTek bloqueó el negocio por falta de pago. Reemplaza al panel entero:
// la base ya no le da ningún permiso al equipo, así que no se carga nada más.
// Más adelante lo va a prender y apagar solo la integración con Mercado Pago.
import { CreditCard, LogOut, MessageCircle } from 'lucide-react'
import { salir } from '@/datos/sesion'
import type { RolPanel } from '@/datos/real/panel'
import type { Negocio } from '@/dominio/tipos'
import { CONTACTO, MARCA } from '@/pantallas/publico/marca'
import { Boton } from '@/ui/Boton'
import { Logo } from '@/ui/Logo'

/** A dónde escribirle a SawaTek para regularizar (WhatsApp, si no mail; null si no hay contacto cargado). */
function linkPago(negocio: string): { href: string; texto: string; wa: boolean } | null {
  const texto = `Hola! Quiero regularizar el pago de ${negocio} para reactivar el panel.`
  if (CONTACTO.whatsapp) return { href: `https://wa.me/${CONTACTO.whatsapp}?text=${encodeURIComponent(texto)}`, texto: 'Regularizar por WhatsApp', wa: true }
  if (CONTACTO.email)
    return { href: `mailto:${CONTACTO.email}?subject=${encodeURIComponent(`Pago de ${negocio}`)}&body=${encodeURIComponent(texto)}`, texto: 'Escribirnos por mail', wa: false }
  return null
}

export function PagoPendiente({ n, rol, email }: { n: Negocio; rol: RolPanel; email: string }) {
  const esDueno = rol === 'dueno'
  const contacto = esDueno ? linkPago(n.nombre) : null

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 pt-segura pb-segura sm:px-6">
      <section aria-labelledby="t-pago" className="my-8 rounded-grande bg-superficie p-6 text-center ring-1 ring-linea sm:p-8">
        <div className="mx-auto flex w-fit items-center gap-2 rounded-full bg-superficie-2 py-1.5 pr-3.5 pl-1.5">
          <Logo negocio={n} className="size-8 text-xs" />
          <span className="text-sm font-semibold">{n.nombre}</span>
        </div>

        <span className="mx-auto mt-6 grid size-14 place-items-center rounded-grande bg-peligro/12 text-peligro">
          <CreditCard className="size-7" aria-hidden />
        </span>
        <h1 id="t-pago" className="mt-4 text-2xl">
          Pago pendiente
        </h1>
        <p className="mt-2 text-suave">
          {esDueno
            ? `El panel de ${n.nombre} está pausado por falta de pago del servicio de ${MARCA.nombre}.`
            : `El panel de ${n.nombre} está pausado por un pago pendiente con ${MARCA.nombre}.`}
        </p>

        <ul className="mt-5 flex flex-col gap-2 rounded-medio bg-superficie-2 p-4 text-left text-sm">
          <li>Tus clientes no pueden reservar turnos nuevos.</li>
          <li>No salen recordatorios ni confirmaciones por WhatsApp.</li>
          <li>Tus datos, turnos y clientes quedan guardados.</li>
        </ul>

        <p className="mt-5 text-sm text-suave">
          {esDueno
            ? 'Apenas se regularice el pago, todo vuelve a funcionar solo, como lo dejaste.'
            : 'Avisale al dueño del negocio para que lo regularice. Apenas se pague, vas a poder volver a entrar.'}
        </p>

        <div className="mt-6 flex flex-col gap-2">
          {contacto && (
            <a
              href={contacto.href}
              target="_blank"
              rel="noreferrer"
              className={
                contacto.wa
                  ? 'inline-flex h-12 items-center justify-center gap-2 rounded-medio bg-wa px-5 font-semibold text-[#062b14] transition-[filter] hover:brightness-105'
                  : 'inline-flex h-12 items-center justify-center gap-2 rounded-medio bg-acento px-5 font-semibold text-sobre-acento transition-[filter] hover:brightness-105'
              }
            >
              <MessageCircle className="size-5" aria-hidden />
              {contacto.texto}
            </a>
          )}
          {esDueno && !contacto && <p className="text-sm font-semibold">Escribile a {MARCA.nombre} para regularizar el pago.</p>}
          <Boton variante="secundario" onClick={() => void salir()}>
            <LogOut className="size-4" aria-hidden />
            Salir
          </Boton>
        </div>
        <p className="mt-4 text-xs text-suave">Entraste como {email}</p>
      </section>
    </main>
  )
}
