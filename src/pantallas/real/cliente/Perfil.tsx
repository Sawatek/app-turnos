import { Bell, Download, LogOut, Pencil, Phone } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { activarPush, pushSoportado, type ResultadoPush } from '@/datos/real/push'
import { ErrorCliente, guardarNombre, salirCliente, useRefrescar } from '@/datos/real/cliente'
import { OfertaInstalar } from '@/instalacion/OfertaInstalar'
import { guardarMiNombre } from '@/datos/sesion'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { useReal } from './contexto'
import { InvitacionIngreso } from './Ingreso'

const permisoInicial = (): ResultadoPush | 'pendiente' => {
  if (!pushSoportado()) return 'no-soportado'
  return Notification.permission === 'granted' ? 'activado' : Notification.permission === 'denied' ? 'denegado' : 'pendiente'
}

export function Perfil() {
  const { n, uid } = useReal()
  if (!uid) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="pt-1 text-3xl">Perfil</h1>
        <InvitacionIngreso
          titulo={`Entrá a ${n.nombre}`}
          texto="Para reservar más rápido, ver tus turnos, sumar sellos y recibir los recordatorios."
        />
        <section aria-label="Ajustes" className="flex items-center justify-between gap-3 rounded-grande bg-superficie p-4 ring-1 ring-linea">
          <div className="flex items-center gap-3">
            <Download className="size-5 shrink-0 text-acento-texto" aria-hidden />
            <div>
              <p className="font-semibold">Tener {n.nombre} como app</p>
              <p className="text-sm text-suave">Un toque y la abrís desde tu inicio.</p>
            </div>
          </div>
          <OfertaInstalar n={n} variante="fila" className="shrink-0" />
        </section>
      </div>
    )
  }
  return <MiPerfil />
}

function MiPerfil() {
  const { n, negocioId, resumen, telefono, avisar } = useReal()
  const refrescar = useRefrescar(negocioId)
  const [editando, setEditando] = useState(false)
  const [nombre, setNombre] = useState(resumen.nombre ?? '')
  const [errorNombre, setErrorNombre] = useState<string>()
  const [guardando, setGuardando] = useState(false)
  const [push, setPush] = useState(permisoInicial)
  const [activando, setActivando] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const refForm = useRef<HTMLFormElement>(null)

  // Si el navegador ya dio permiso (por ejemplo, para otro negocio), se asegura en silencio que la
  // suscripción quede guardada también para ESTE negocio. No vuelve a preguntar nada.
  useEffect(() => {
    if (pushSoportado() && Notification.permission === 'granted') {
      void activarPush(negocioId).then(setPush).catch(() => undefined)
    }
  }, [negocioId])

  const guardar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!resumen.clienteId) return
    setGuardando(true)
    try {
      await guardarNombre(resumen.clienteId, nombre)
      await guardarMiNombre(nombre).catch(() => undefined)
      await refrescar()
      setEditando(false)
      avisar('Listo: guardamos tu nombre.')
    } catch (err) {
      setErrorNombre(err instanceof ErrorCliente ? err.message : 'No se pudo guardar. Probá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  const activar = async () => {
    setActivando(true)
    try {
      const r = await activarPush(negocioId)
      setPush(r)
      avisar(r === 'activado' ? 'Listo: te vamos a avisar en el celular antes de cada turno.' : 'Sin permiso de notificaciones: igual te avisamos por WhatsApp.')
    } catch {
      avisar('No pudimos activar las notificaciones. Igual te avisamos por WhatsApp.')
    } finally {
      setActivando(false)
    }
  }

  const textoPush =
    push === 'activado'
      ? 'Activadas en este celular.'
      : push === 'denegado'
        ? 'Están bloqueadas: activalas desde los ajustes del navegador.'
        : push === 'no-soportado'
          ? 'Este navegador no las permite. Te avisamos por WhatsApp.'
          : 'Por WhatsApp siempre. También en el celular, si querés.'

  return (
    <div className="flex flex-col gap-4">
      <h1 className="pt-1 text-3xl">Perfil</h1>

      <section aria-label="Tus datos" className="rounded-grande bg-superficie p-4 ring-1 ring-linea">
        <div className="flex items-center gap-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-full bg-acento-suave text-xl font-extrabold text-acento-texto" aria-hidden>
            {(resumen.nombre ?? telefono).trim()[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{resumen.nombre ?? 'Sin nombre todavía'}</p>
            <p className="num flex items-center gap-1.5 text-sm text-suave">
              <Phone className="size-3.5" aria-hidden />
              {telefono}
            </p>
          </div>
          {resumen.clienteId && !editando && (
            <Boton
              variante="secundario"
              aria-label="Editar nombre"
              onClick={() => {
                setNombre(resumen.nombre ?? '')
                setErrorNombre(undefined)
                setEditando(true)
                setTimeout(() => refForm.current?.querySelector('input')?.focus(), 0)
              }}
            >
              <Pencil className="size-4" aria-hidden />
              Editar
            </Boton>
          )}
        </div>
        {!resumen.clienteId && <p className="mt-3 text-sm text-suave">Tu nombre te lo pedimos cuando saques tu primer turno.</p>}
        {editando && (
          <form ref={refForm} className="mt-4 flex flex-col gap-3" onSubmit={(ev) => void guardar(ev)} noValidate>
            <Campo
              etiqueta="Tu nombre"
              autoComplete="name"
              value={nombre}
              maxLength={80}
              onChange={(e) => {
                setNombre(e.target.value)
                setErrorNombre(undefined)
              }}
              error={errorNombre}
            />
            <div className="grid grid-cols-2 gap-2">
              <Boton variante="secundario" onClick={() => setEditando(false)}>Cancelar</Boton>
              <Boton type="submit" cargando={guardando}>Guardar</Boton>
            </div>
          </form>
        )}
      </section>

      <section aria-label="Ajustes" className="flex flex-col divide-y divide-linea rounded-grande bg-superficie px-4 ring-1 ring-linea">
        <div className="flex items-center justify-between gap-3 py-3.5">
          <div className="flex items-center gap-3">
            <Download className="size-5 shrink-0 text-acento-texto" aria-hidden />
            <div>
              <p className="font-semibold">Tener {n.nombre} como app</p>
              <p className="text-sm text-suave">Un toque y la abrís desde tu inicio.</p>
            </div>
          </div>
          <OfertaInstalar n={n} variante="fila" className="shrink-0" />
        </div>
        <div className="flex items-center justify-between gap-3 py-3.5">
          <div className="flex items-center gap-3">
            <Bell className="size-5 shrink-0 text-acento-texto" aria-hidden />
            <div>
              <p className="font-semibold">Recordatorios en el celular</p>
              <p className="text-sm text-suave">{textoPush}</p>
            </div>
          </div>
          {push !== 'no-soportado' && (
            <Boton variante="secundario" className="shrink-0" cargando={activando} onClick={() => void activar()} disabled={push === 'activado' || push === 'denegado'}>
              {push === 'activado' ? 'Activados' : 'Activar'}
            </Boton>
          )}
        </div>
      </section>

      <Boton
        variante="peligro"
        tamano="grande"
        cargando={saliendo}
        onClick={() => {
          setSaliendo(true)
          void salirCliente().finally(() => setSaliendo(false))
        }}
      >
        <LogOut className="size-5" aria-hidden />
        Salir
      </Boton>
      <p className="text-center text-xs text-suave">Tus turnos quedan guardados: entrás de nuevo con tu celular.</p>
    </div>
  )
}
