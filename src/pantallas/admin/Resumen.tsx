// Resumen de la plataforma: negocios por estado y lo que pasó este mes en todos los negocios reales.
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useResumen } from '@/datos/admin'
import { Cargando, Cifra, FalloCarga, Tarjeta } from './comunes'

const porcentaje = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : 'Sin datos')

export function Resumen() {
  const q = useResumen()
  if (q.isPending) return <Cargando />
  if (q.isError) return <FalloCarga error={q.error} onReintentar={() => void q.refetch()} />
  const r = q.data
  const mes = format(new Date(`${r.mes}T12:00:00`), 'MMMM yyyy', { locale: es })
  const t = r.turnos
  const m = r.mensajes
  const cerrados = t.asistio + t.falto

  return (
    <div className="flex flex-col gap-4">
      <Tarjeta titulo="Negocios reales" bajada={`${r.negocios.demos} demos de venta aparte.`}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Cifra etiqueta="Activos" valor={r.negocios.activo} tono="exito" />
          <Cifra etiqueta="En prueba" valor={r.negocios.prueba} tono="aviso" />
          <Cifra etiqueta="Suspendidos" valor={r.negocios.suspendido} tono={r.negocios.suspendido ? 'peligro' : undefined} />
          <Cifra etiqueta="Nuevos este mes" valor={r.negocios.nuevos} />
        </div>
      </Tarjeta>

      <Tarjeta titulo={`Turnos de ${mes}`} bajada="Turnos que caen este mes, en todos los negocios reales.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Cifra etiqueta="Turnos" valor={t.total} detalle={`${t.desde_la_app} reservados desde la app`} />
          <Cifra etiqueta="Confirmados" valor={t.confirmado} detalle="Todavía no pasaron" />
          <Cifra etiqueta="Vinieron" valor={t.asistio} tono="exito" />
          <Cifra etiqueta="Faltaron" valor={t.falto} tono={t.falto ? 'peligro' : undefined} />
          <Cifra etiqueta="Avisaron que no venían" valor={t.cancelados_con_aviso} detalle="Cancelaron antes: el horario se liberó" />
          <Cifra etiqueta="Asistencia" valor={porcentaje(t.asistio, cerrados)} detalle="De los turnos ya marcados" />
        </div>
      </Tarjeta>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Tarjeta titulo="Mensajes del mes" bajada="WhatsApp, push y códigos de ingreso.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Cifra etiqueta="Enviados" valor={m.enviado} tono="exito" />
            <Cifra etiqueta="En cola" valor={m.pendiente + m.enviando} />
            <Cifra etiqueta="Con error" valor={m.error} tono={m.error ? 'peligro' : undefined} />
            <Cifra etiqueta="Cancelados" valor={m.cancelado} />
          </div>
        </Tarjeta>
        <Tarjeta titulo="Clientes nuevos" bajada="Se registraron este mes.">
          <Cifra etiqueta="Clientes" valor={r.clientes_nuevos} />
        </Tarjeta>
      </div>
    </div>
  )
}
