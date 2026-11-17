// La pantalla de inicio de un celular con la app del negocio instalada (PWA): su ícono, con su logo y su color,
// al lado de las demás apps. Va adentro de <Celular> (se dibuja a 393 × 852 px).
// Lo que es del sistema del celular (globito rojo, notificación, dock) tiene sus colores propios: excepción a propósito, como el marco.
// Sin backdrop-filter: dentro del celular achicado sale caro en cada cuadro del scroll y no se nota sobre un fondo quieto.
// Los textos van más grandes que en un iPhone real porque el celular se ve achicado (~75 %).
import { Calendar, Camera, Clock, Compass, Image, Mail, Map, MessageCircle, Music, Phone, Settings, StickyNote } from 'lucide-react'
import type { Negocio } from '@/dominio/tipos'
import { estiloTema } from '@/tema/TemaNegocio'
import { cn } from '@/ui/cn'
import { Logo } from '@/ui/Logo'

const OTRAS = [
  { Icono: Calendar, nombre: 'Calendario' },
  { Icono: Image, nombre: 'Fotos' },
  { Icono: Camera, nombre: 'Cámara' },
  { Icono: Mail, nombre: 'Mail' },
  { Icono: Map, nombre: 'Mapas' },
  { Icono: Clock, nombre: 'Reloj' },
  { Icono: StickyNote, nombre: 'Notas' },
  { Icono: Music, nombre: 'Música' },
  { Icono: Settings, nombre: 'Ajustes' },
]

function IconoApp({ children, nombre, className }: { children: React.ReactNode; nombre: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-[7px]', className)}>
      {children}
      <span className="max-w-[84px] truncate text-[14px] font-semibold text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.7)]">{nombre}</span>
    </div>
  )
}

/** Inicio del celular con las apps de los negocios instaladas. La primera se destaca (recién instalada). */
export function PantallaDeInicio({ negocios }: { negocios: Negocio[] }) {
  const destacado = negocios[0]
  return (
    <div style={destacado ? estiloTema(destacado) : undefined} className="absolute inset-0 overflow-hidden bg-black">
      {/* Fondo de pantalla: tinte del color de la marca */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_20%_0%,color-mix(in_oklch,var(--t-acento)_70%,black),transparent_70%),radial-gradient(90%_60%_at_100%_100%,color-mix(in_oklch,var(--t-acento)_35%,black),black)]" />

      <div className="relative grid grid-cols-4 gap-x-[22px] gap-y-[24px] px-[26px] pt-[78px]">
        {negocios.map((n, i) => (
          <IconoApp key={n.slug} nombre={n.nombre.split(' ').at(-1)!}>
            <div style={estiloTema(n)} data-personalidad={n.personalidad} className="relative">
              <Logo negocio={n} className="size-[62px] rounded-[15px] text-[20px] shadow-[0_2px_8px_rgb(0_0_0/0.35)]" />
              {i === 0 && <span className="absolute -top-1.5 -right-1.5 grid size-[22px] place-items-center rounded-full bg-[#ff3b30] text-[13px] font-bold text-white">1</span>}
            </div>
          </IconoApp>
        ))}
        {OTRAS.slice(0, 12 - negocios.length).map(({ Icono, nombre }) => (
          <IconoApp key={nombre} nombre={nombre}>
            <div className="grid size-[62px] place-items-center rounded-[15px] bg-white/16 text-white/90 ring-1 ring-white/12">
              <Icono className="size-[28px]" strokeWidth={1.75} />
            </div>
          </IconoApp>
        ))}
      </div>

      {/* Notificación de la app instalada */}
      {destacado && (
        <div className="absolute inset-x-[12px] top-[452px] rounded-[22px] bg-[#f2f2f4] p-[16px] text-[#111] shadow-[0_8px_24px_rgb(0_0_0/0.35)]">
          <div className="flex items-start gap-3">
            <div data-personalidad={destacado.personalidad}>
              <Logo negocio={destacado} className="size-[42px] rounded-[10px] text-[14px]" />
            </div>
            <div className="min-w-0 flex-1 text-[16px] leading-snug">
              <p className="flex justify-between gap-2">
                <b className="truncate">{destacado.nombre}</b>
                <span className="text-[14px] text-[#555]">ahora</span>
              </p>
              <p>Se liberó un turno hoy a las 18:00. ¿Lo querés? Reservalo antes de que lo tome otra persona.</p>
            </div>
          </div>
        </div>
      )}

      {/* Dock */}
      <div className="absolute inset-x-[12px] bottom-[26px] flex justify-around rounded-[32px] bg-white/18 px-[14px] py-[14px]">
        {[Phone, MessageCircle, Compass, Music].map((Icono, i) => (
          <div
            key={i}
            className={cn('grid size-[62px] place-items-center rounded-[15px] text-white', i === 1 ? 'bg-wa' : 'bg-white/16 ring-1 ring-white/10')}
          >
            <Icono className="size-[28px]" strokeWidth={1.75} />
          </div>
        ))}
      </div>
    </div>
  )
}
