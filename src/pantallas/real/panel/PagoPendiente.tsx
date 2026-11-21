// Cartel del panel cuando SawaTek bloqueó el negocio por falta de pago. Reemplaza al panel entero:
// la base ya no le da ningún permiso al equipo, así que no se carga nada más.
// Más adelante lo va a prender y apagar solo la integración con Mercado Pago.
import { LogOut, MessageCircle } from 'lucide-react'
import { salir } from '@/datos/sesion'
import type { RolPanel } from '@/datos/real/panel'
import type { Negocio } from '@/dominio/tipos'
import { CONTACTO, MARCA } from '@/pantallas/publico/marca'
import { Boton } from '@/ui/Boton'
import { clasesBoton } from '@/ui/clasesBoton'
import { Logo } from '@/ui/Logo'
import { Sello } from '@/ui/Sello'
import { Talon } from '@/ui/Talon'

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
      {/* El aviso como un talón sellado: arriba el negocio y el sello de "Pausado"; abajo del corte, qué pasa y qué hacer. */}
      <Talon
        as="section"
        aria-labelledby="t-pago"
        className="my-8"
        cuerpo={
          <div className="px-5 pt-5 pb-7 sm:px-7">
            <div className="flex items-center gap-2.5">
              <Logo negocio={n} className="size-8 rounded-chico text-xs" />
              <span className="rotulo truncate text-suave">{n.nombre}</span>
            </div>
            <h1 id="t-pago" className="mt-6 text-[2.25rem] leading-none">
              Pago pendiente
            </h1>
            <p className="mt-3 text-suave">
              {esDueno
                ? `El panel de ${n.nombre} está pausado por falta de pago del servicio de ${MARCA.nombre}.`
                : `El panel de ${n.nombre} está pausado por un pago pendiente con ${MARCA.nombre}.`}
            </p>
          </div>
        }
        sello={
          <Sello tono="peligro" tamano="medio" giro={-6} className="bg-superficie/85">
            Pausado
          </Sello>
        }
        talon={
          <div className="px-5 pt-8 pb-5 sm:px-7">
            <ul className="flex flex-col divide-y divide-linea border-y border-linea text-sm">
              <li className="py-2.5">Tus clientes no pueden reservar turnos nuevos.</li>
              <li className="py-2.5">No salen recordatorios ni confirmaciones por WhatsApp.</li>
              <li className="py-2.5">Tus datos, turnos y clientes quedan guardados.</li>
            </ul>

            <p className="mt-4 text-sm text-suave">
              {esDueno
                ? 'Apenas se regularice el pago, todo vuelve a funcionar solo, como lo dejaste.'
                : 'Avisale al dueño del negocio para que lo regularice. Apenas se pague, vas a poder volver a entrar.'}
            </p>

            <div className="mt-5 flex flex-col gap-2">
              {contacto && (
                <a href={contacto.href} target="_blank" rel="noreferrer" className={clasesBoton({ variante: contacto.wa ? 'wa' : 'primario' })}>
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
            <p className="rotulo mt-4 text-suave">Entraste como {email}</p>
          </div>
        }
      />
    </main>
  )
}
