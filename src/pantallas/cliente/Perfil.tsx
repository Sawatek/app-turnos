import { Bell, Download, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useDemo } from '@/datos/demo'
import { OfertaInstalar } from '@/instalacion/OfertaInstalar'
import { Boton } from '@/ui/Boton'
import { Logo } from '@/ui/Logo'
import { Talon } from '@/ui/Talon'
import { useCliente } from './contexto'

export function Perfil() {
  const { n, e } = useCliente()
  const salir = useDemo((s) => s.salir)
  const avisar = useDemo((s) => s.avisar)
  const [permiso, setPermiso] = useState(() => ('Notification' in window ? Notification.permission : 'denied'))

  const activarAvisos = async () => {
    if (!('Notification' in window)) return
    const p = await Notification.requestPermission()
    setPermiso(p)
    avisar(n.slug, {
      tipo: 'sistema',
      canal: 'push',
      texto: p === 'granted' ? 'Listo: te vamos a avisar antes de cada turno.' : 'Sin permiso de notificaciones: igual te avisamos por WhatsApp.',
    })
  }

  const turnos = e.turnos.filter((t) => t.propio && t.estado !== 'cancelado').length

  return (
    <div className="flex flex-col gap-6">
      <header className="pt-2">
        <p className="rotulo text-suave">Tu ficha</p>
        <h1 className="mt-1 text-[2.75rem] leading-[0.95]">Perfil</h1>
      </header>

      {/* Carnet de cliente: el nombre arriba, los números del negocio abajo del corte. */}
      <Talon
        as="section"
        aria-label="Tus datos"
        cuerpo={
          <div className="flex items-start gap-3 px-4 pt-4 pb-5">
            <div className="min-w-0 flex-1">
              <p className="rotulo text-suave">Cliente de {n.nombre}</p>
              <p className="titulo mt-2 truncate text-3xl">{e.usuario?.nombre}</p>
              <p className="mono mt-1 text-sm text-suave">{e.usuario?.tel}</p>
            </div>
            <Logo negocio={n} className="size-10 shrink-0 rounded-chico text-xs" />
          </div>
        }
        talon={
          <dl className="grid grid-cols-2 divide-x divide-linea px-4 pt-4 pb-4">
            <div className="pr-4">
              <dt className="rotulo text-suave">Turnos</dt>
              <dd className="cifra mt-1 text-4xl">{turnos}</dd>
            </div>
            <div className="pl-4">
              <dt className="rotulo text-suave">Sellos</dt>
              <dd className="cifra mt-1 text-4xl">
                {Math.min(e.sellos, n.fidelidad.meta)}
                <span className="text-xl text-suave">/{n.fidelidad.meta}</span>
              </dd>
            </div>
          </dl>
        }
      />

      <section aria-labelledby="t-ajustes">
        <h2 id="t-ajustes" className="titulo border-b-2 border-texto pb-2 text-xl">En tu celular</h2>
        <div className="flex flex-col divide-y divide-linea border-b border-linea">
          <div className="flex items-center justify-between gap-3 py-4">
            <div className="flex items-start gap-3">
              <Download className="mt-0.5 size-5 shrink-0 text-acento-texto" aria-hidden />
              <div>
                <p className="font-semibold">Tener {n.nombre} como app</p>
                <p className="text-sm text-suave">Un toque y la abrís desde tu inicio.</p>
              </div>
            </div>
            <OfertaInstalar n={n} variante="fila" className="shrink-0" />
          </div>
          <div className="flex items-center justify-between gap-3 py-4">
            <div className="flex items-start gap-3">
              <Bell className="mt-0.5 size-5 shrink-0 text-acento-texto" aria-hidden />
              <div>
                <p className="font-semibold">Recordatorios</p>
                <p className="text-sm text-suave">Por WhatsApp siempre. También en el celular, si querés.</p>
              </div>
            </div>
            <Boton tamano="chico" variante="secundario" onClick={activarAvisos} disabled={permiso === 'granted'}>
              {permiso === 'granted' ? 'Activados' : 'Activar'}
            </Boton>
          </div>
        </div>
      </section>

      <div className="flex flex-col items-center gap-2">
        <Boton variante="peligro" tamano="grande" ancho onClick={() => salir(n.slug)}>
          <LogOut className="size-5" aria-hidden />
          Salir
        </Boton>
        <p className="text-center text-xs text-suave">Al salir de la demo se borran tus turnos de prueba.</p>
      </div>
    </div>
  )
}
