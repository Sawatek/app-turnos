import { Bell, Download, LogOut, Phone } from 'lucide-react'
import { useState } from 'react'
import { useDemo } from '@/datos/demo'
import { OfertaInstalar } from '@/instalacion/OfertaInstalar'
import { Boton } from '@/ui/Boton'
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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="pt-1 text-3xl">Perfil</h1>

      <section className="flex items-center gap-4 rounded-grande bg-superficie p-4 ring-1 ring-linea">
        <div className="grid size-14 place-items-center rounded-full bg-acento-suave text-xl font-extrabold text-acento-texto" aria-hidden>
          {e.usuario?.nombre[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{e.usuario?.nombre}</p>
          <p className="num flex items-center gap-1.5 text-sm text-suave">
            <Phone className="size-3.5" aria-hidden />
            {e.usuario?.tel}
          </p>
        </div>
      </section>

      <section className="flex flex-col divide-y divide-linea rounded-grande bg-superficie px-4 ring-1 ring-linea">
        <div className="flex items-center justify-between gap-3 py-3.5">
          <div className="flex items-center gap-3">
            <Download className="size-5 text-acento-texto" aria-hidden />
            <div>
              <p className="font-semibold">Tener {n.nombre} como app</p>
              <p className="text-sm text-suave">Un toque y la abrís desde tu inicio.</p>
            </div>
          </div>
          <OfertaInstalar n={n} variante="fila" className="shrink-0" />
        </div>
        <div className="flex items-center justify-between gap-3 py-3.5">
          <div className="flex items-center gap-3">
            <Bell className="size-5 text-acento-texto" aria-hidden />
            <div>
              <p className="font-semibold">Recordatorios</p>
              <p className="text-sm text-suave">Por WhatsApp siempre. También en el celular, si querés.</p>
            </div>
          </div>
          <Boton tamano="chico" variante="secundario" onClick={activarAvisos} disabled={permiso === 'granted'}>
            {permiso === 'granted' ? 'Activados' : 'Activar'}
          </Boton>
        </div>
      </section>

      <Boton variante="peligro" tamano="grande" onClick={() => salir(n.slug)}>
        <LogOut className="size-5" aria-hidden />
        Salir
      </Boton>
      <p className="text-center text-xs text-suave">Al salir de la demo se borran tus turnos de prueba.</p>
    </div>
  )
}
