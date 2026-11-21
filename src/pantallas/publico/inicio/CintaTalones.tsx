// La cinta de talones: una fila de turnos sellados que se corre de costado mientras se baja (scroll-driven).
// Muestra de un vistazo lo que vende el producto: la agenda llena de turnos confirmados, y alguno que se liberó a tiempo.
// Decorativa (aria-hidden): todo lo que dice se explica con texto en las secciones. Sin soporte o con "reducir movimiento",
// queda quieta. Se pre-genera con renderToString: nada del navegador en el render.
import { Talon } from '@/ui/Talon'
import { cn } from '@/ui/cn'

interface TalonCinta {
  n: string
  dia: string
  hora: string
  servicio: string
  sello: 'Confirmado' | 'Liberado' | 'Sin confirmar'
}

const FILA_1: TalonCinta[] = [
  { n: '0412', dia: 'Mar', hora: '10:30', servicio: 'Corte + barba', sello: 'Confirmado' },
  { n: '0413', dia: 'Mar', hora: '11:15', servicio: 'Kinesiología', sello: 'Confirmado' },
  { n: '0414', dia: 'Mar', hora: '12:00', servicio: 'Esmaltado', sello: 'Liberado' },
  { n: '0415', dia: 'Mar', hora: '12:00', servicio: 'Esmaltado', sello: 'Confirmado' },
  { n: '0416', dia: 'Mar', hora: '15:30', servicio: 'Color', sello: 'Confirmado' },
  { n: '0417', dia: 'Mar', hora: '16:45', servicio: 'Consulta', sello: 'Sin confirmar' },
  { n: '0418', dia: 'Mar', hora: '17:30', servicio: 'Tatuaje', sello: 'Confirmado' },
]

const TONO = { Confirmado: 'text-exito', Liberado: 'text-acento-texto', 'Sin confirmar': 'text-aviso sello-vacio' } as const
const GIROS = [-6, 4, -9, 3, -4, 7, -7]

function TalonDeCinta({ t, i }: { t: TalonCinta; i: number }) {
  return (
    <Talon
      as="div"
      className="w-[12.5rem] shrink-0 sm:w-[15.5rem]"
      cuerpo={
        <div className="px-4 pt-3 pb-3.5">
          <p className="rotulo flex justify-between text-suave">
            <span>N.º {t.n}</span>
            <span>{t.dia}</span>
          </p>
          <p className="cifra mt-2 text-4xl sm:text-5xl">{t.hora}</p>
        </div>
      }
      sello={
        <span style={{ '--giro': `${GIROS[i % GIROS.length]}deg` } as React.CSSProperties} className={cn('sello bg-superficie text-xs', TONO[t.sello])}>
          {t.sello}
        </span>
      }
      talon={<p className="truncate px-4 pt-5 pb-3 text-sm font-semibold">{t.servicio}</p>}
    />
  )
}

export function CintaTalones() {
  return (
    // Los bordes se desvanecen: los talones entran y salen de la franja en vez de quedar cortados al ras.
    <div
      aria-hidden
      className="franja-cinta relative overflow-x-clip border-y border-linea bg-superficie-2/50 py-10 [mask-image:linear-gradient(to_right,transparent,black_1.25rem,black_calc(100%-1.25rem),transparent)] sm:py-14 sm:[mask-image:linear-gradient(to_right,transparent,black_4rem,black_calc(100%-4rem),transparent)]"
    >
      <div className="cinta flex w-max gap-3 px-5 [--recorrido:0.5] sm:gap-5 sm:px-8 sm:[--recorrido:1]">
        {FILA_1.map((t, i) => (
          <TalonDeCinta key={t.n} t={t} i={i} />
        ))}
      </div>
    </div>
  )
}
