// Ajustes del negocio: reglas de reserva (columnas de negocios) y datos de contacto (dentro de config).
// El link, el estado y si es demo los cambia solo SawaTek (la base lo bloquea).
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { guardarAjustes, useAjustes, useRefrescar, type Ajustes as DatosAjustes } from '@/datos/real/panel'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { Cargando, Encabezado, ErrorEnLinea, Exito, FalloCarga, Tarjeta, useAccion, usePanel } from './comunes'

export function Ajustes() {
  const { negocioId } = usePanel()
  const ajustes = useAjustes(negocioId)
  return (
    <div className="flex flex-col gap-4">
      <Encabezado titulo="Ajustes" bajada="Reglas para reservar y los datos que ven tus clientes." />
      {ajustes.isPending ? (
        <Cargando />
      ) : ajustes.isError ? (
        <FalloCarga error={ajustes.error} onReintentar={() => void ajustes.refetch()} />
      ) : (
        <Formulario
          inicial={{
            intervalo_min: ajustes.data.intervalo_min,
            anticipacion_min: ajustes.data.anticipacion_min,
            cancelacion_horas: ajustes.data.cancelacion_horas,
            claim: String((ajustes.data.config as Record<string, unknown>)?.claim ?? ''),
            direccion: String((ajustes.data.config as Record<string, unknown>)?.direccion ?? ''),
            whatsapp: String((ajustes.data.config as Record<string, unknown>)?.whatsapp ?? ''),
          }}
        />
      )}
    </div>
  )
}

type Errores = Partial<Record<keyof DatosAjustes, string>>

/** Número entero dentro del rango, o null. */
function entero(v: string, min: number, max: number) {
  const x = Number(v)
  return v.trim() !== '' && Number.isInteger(x) && x >= min && x <= max ? x : null
}

function Formulario({ inicial }: { inicial: DatosAjustes }) {
  const { n, negocioId } = usePanel()
  const qc = useQueryClient()
  const refrescar = useRefrescar(negocioId)
  const accion = useAccion()
  const [intervalo, setIntervalo] = useState(String(inicial.intervalo_min))
  const [anticipacion, setAnticipacion] = useState(String(inicial.anticipacion_min))
  const [cancelacion, setCancelacion] = useState(String(inicial.cancelacion_horas))
  const [claim, setClaim] = useState(inicial.claim)
  const [direccion, setDireccion] = useState(inicial.direccion)
  const [whatsapp, setWhatsapp] = useState(inicial.whatsapp)
  const [errores, setErrores] = useState<Errores>({})
  const [guardado, setGuardado] = useState(false)

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setGuardado(false)
    const e: Errores = {}
    const i = entero(intervalo, 5, 120)
    const a = entero(anticipacion, 0, 10080)
    const c = entero(cancelacion, 0, 168)
    if (i === null) e.intervalo_min = 'Entre 5 y 120 minutos.'
    if (a === null) e.anticipacion_min = 'Entre 0 y 10080 minutos (una semana).'
    if (c === null) e.cancelacion_horas = 'Entre 0 y 168 horas (una semana).'
    if (claim.length > 120) e.claim = 'Máximo 120 caracteres.'
    setErrores(e)
    if (Object.keys(e).length) return
    const listo = await accion.correr(async () => {
      await guardarAjustes(negocioId, { intervalo_min: i!, anticipacion_min: a!, cancelacion_horas: c!, claim, direccion, whatsapp })
      await Promise.all([refrescar('ajustes'), refrescar('turnos'), qc.invalidateQueries({ queryKey: ['negocio', n.slug] })])
    })
    setGuardado(listo)
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
      <Tarjeta titulo="Reservas">
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo
            etiqueta="Intervalo entre turnos (min)"
            ayuda="Cada cuánto arranca un turno."
            type="number"
            inputMode="numeric"
            min={5}
            max={120}
            step={5}
            value={intervalo}
            onChange={(e) => setIntervalo(e.target.value)}
            error={errores.intervalo_min}
          />
          <Campo
            etiqueta="Anticipación mínima (min)"
            ayuda="No se puede reservar con menos tiempo."
            type="number"
            inputMode="numeric"
            min={0}
            max={10080}
            step={5}
            value={anticipacion}
            onChange={(e) => setAnticipacion(e.target.value)}
            error={errores.anticipacion_min}
          />
          <Campo
            etiqueta="Cancelar hasta (horas antes)"
            ayuda="Después, el cliente ya no puede cancelar."
            type="number"
            inputMode="numeric"
            min={0}
            max={168}
            step={1}
            value={cancelacion}
            onChange={(e) => setCancelacion(e.target.value)}
            error={errores.cancelacion_horas}
          />
        </div>
      </Tarjeta>
      <Tarjeta titulo="Datos de contacto">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Frase del negocio" className="sm:col-span-2" maxLength={120} value={claim} onChange={(e) => setClaim(e.target.value)} error={errores.claim} />
          <Campo etiqueta="Dirección" maxLength={120} value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          <Campo etiqueta="WhatsApp" type="tel" inputMode="tel" maxLength={30} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </div>
      </Tarjeta>
      <div className="flex flex-wrap items-center gap-3">
        <Boton type="submit" cargando={accion.ocupado}>
          Guardar ajustes
        </Boton>
        <Exito texto={guardado ? 'Ajustes guardados' : undefined} />
        <ErrorEnLinea texto={accion.error} />
      </div>
      <p className="text-sm text-suave">El link del negocio y el estado de la cuenta los maneja SawaTek. Si necesitás cambiarlos, escribinos.</p>
    </form>
  )
}
