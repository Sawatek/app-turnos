import { Bell, Download, LogOut, Pencil, Phone } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { activarPush, pushSoportado, type ResultadoPush } from '@/datos/real/push'
import { ErrorCliente, guardarNombre, salirCliente, useRefrescar } from '@/datos/real/cliente'
import { OfertaInstalar } from '@/instalacion/OfertaInstalar'
import { guardarMiNombre } from '@/datos/sesion'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { cn } from '@/ui/cn'
import { useReal } from './contexto'
import { InvitacionIngreso } from './Ingreso'
import { numeroDeTalon } from './Pase'

const permisoInicial = (): ResultadoPush | 'pendiente' => {
  if (!pushSoportado()) return 'no-soportado'
  return Notification.permission === 'granted' ? 'activado' : Notification.permission === 'denied' ? 'denegado' : 'pendiente'
}

export function Perfil() {
  const { n, uid } = useReal()
  if (!uid) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="pt-1 text-[2.75rem] leading-[0.95]">Perfil</h1>
        <InvitacionIngreso
          titulo={`Entrá a ${n.nombre}`}
          texto="Para reservar más rápido, ver tus turnos, sumar sellos y recibir los recordatorios."
        />
        <section aria-label="Ajustes" className="border-y border-linea">
          <FilaInstalar />
        </section>
      </div>
    )
  }
  return <MiPerfil />
}

function MiPerfil() {
  const { negocioId, resumen, telefono, avisar } = useReal()
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
    <div className="flex flex-col gap-7">
      <h1 className="pt-1 text-[2.75rem] leading-[0.95]">Perfil</h1>

      {/* Ficha de cliente, como la del fichero del local: número arriba, el nombre y los datos en renglones. */}
      <section aria-label="Tus datos" className="rounded-grande bg-superficie ring-1 ring-linea">
        <header className="rotulo flex items-center justify-between gap-3 border-b border-linea px-4 py-2.5 text-suave">
          <span>Ficha de cliente</span>
          {resumen.clienteId && (
            <span>
              N.º <span className="text-texto">{numeroDeTalon(resumen.clienteId)}</span>
            </span>
          )}
        </header>
        <div className="px-4 pt-4 pb-4">
          {editando ? (
            <form ref={refForm} className="flex flex-col gap-3" onSubmit={(ev) => void guardar(ev)} noValidate>
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
          ) : (
            <div className="flex items-start justify-between gap-3">
              <p className={cn('titulo min-w-0 pt-1 text-[1.75rem] leading-tight break-words', !resumen.nombre && 'text-suave')}>
                {resumen.nombre ?? 'Sin nombre todavía'}
              </p>
              {resumen.clienteId && (
                <Boton
                  variante="secundario"
                  tamano="chico"
                  className="shrink-0"
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
          )}
          {!resumen.clienteId && <p className="mt-1 text-sm text-suave">Tu nombre te lo pedimos cuando saques tu primer turno.</p>}
        </div>
        <dl className="grid grid-cols-2 border-t border-linea">
          <div className="col-span-2 border-b border-linea px-4 py-3">
            <dt className="rotulo flex items-center gap-1.5 text-suave">
              <Phone className="size-3" aria-hidden />
              Celular
            </dt>
            <dd className="mono mt-0.5 font-semibold">{telefono}</dd>
          </div>
          <div className="border-r border-linea px-4 py-3">
            <dt className="rotulo text-suave">Visitas</dt>
            <dd className="cifra mt-1 text-[2rem]">{resumen.sellos}</dd>
          </div>
          <div className="px-4 py-3">
            <dt className="rotulo text-suave">Próximos turnos</dt>
            <dd className="cifra mt-1 text-[2rem]">{resumen.activos}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="t-ajustes">
        <h2 id="t-ajustes" className="titulo border-b-2 border-texto pb-2 text-xl">Ajustes</h2>
        <div className="divide-y divide-linea border-b border-linea">
          <FilaInstalar />
          <Fila
            icono={<Bell className="size-5" aria-hidden />}
            titulo="Recordatorios en el celular"
            detalle={textoPush}
            accion={
              push !== 'no-soportado' && (
                <Boton variante="secundario" tamano="chico" cargando={activando} onClick={() => void activar()} disabled={push === 'activado' || push === 'denegado'}>
                  {push === 'activado' ? 'Activados' : 'Activar'}
                </Boton>
              )
            }
          />
        </div>
      </section>

      <div className="flex flex-col items-start gap-1">
        <Boton
          variante="peligro"
          className="-ml-3"
          cargando={saliendo}
          onClick={() => {
            setSaliendo(true)
            void salirCliente().finally(() => setSaliendo(false))
          }}
        >
          <LogOut className="size-5" aria-hidden />
          Salir
        </Boton>
        <p className="text-sm text-suave">Tus turnos quedan guardados: entrás de nuevo con tu celular.</p>
      </div>
    </div>
  )
}

/** Renglón de ajustes: ícono, qué es, una línea de detalle y la acción a la derecha. */
function Fila({ icono, titulo, detalle, accion }: { icono: React.ReactNode; titulo: string; detalle: string; accion?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 shrink-0 text-acento-texto">{icono}</span>
        <div className="min-w-0">
          <p className="font-semibold leading-snug">{titulo}</p>
          <p className="text-sm text-suave">{detalle}</p>
        </div>
      </div>
      {accion && <div className="shrink-0">{accion}</div>}
    </div>
  )
}

function FilaInstalar() {
  const { n } = useReal()
  return (
    <Fila
      icono={<Download className="size-5" aria-hidden />}
      titulo={`Tener ${n.nombre} como app`}
      detalle="Un toque y la abrís desde tu inicio."
      accion={<OfertaInstalar n={n} variante="fila" />}
    />
  )
}
