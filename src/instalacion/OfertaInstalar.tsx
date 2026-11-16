import { motion } from 'motion/react'
import { Check, Copy, Download, Ellipsis, EllipsisVertical, ExternalLink, Share, SquarePlus } from 'lucide-react'
import { useState } from 'react'
import type { Negocio } from '@/dominio/tipos'
import { Boton } from '@/ui/Boton'
import { Hoja } from '@/ui/Hoja'
import { Logo } from '@/ui/Logo'
import { cn } from '@/ui/cn'
import { useInstalacion } from './estado'

interface Props {
  n: Negocio
  /** "tarjeta": destacada (después de reservar). "fila": compacta (en Perfil). */
  variante?: 'tarjeta' | 'fila'
  className?: string
}

/**
 * Ofrece tener la app del negocio en el inicio del celular, con el método que sirve en ESE celular:
 * - Android/Chrome: el cartel nativo de instalar.
 * - iPhone: guía paso a paso (Apple no deja poner un botón de instalar).
 * - Navegador interno de Instagram/WhatsApp/Facebook: cómo abrirla en el navegador de verdad.
 */
export function OfertaInstalar({ n, variante = 'tarjeta', className }: Props) {
  const { evento, instalada, plataforma, navegadorInterno, instalar } = useInstalacion()
  const [guia, setGuia] = useState(false)
  const [listo, setListo] = useState(false)

  if (instalada || listo) {
    return variante === 'fila' ? (
      <p className={cn('flex items-center gap-2 text-sm font-semibold text-exito', className)}>
        <Check className="size-4" aria-hidden />
        Ya la tenés en tu inicio
      </p>
    ) : null
  }

  const accion = async () => {
    if (evento && !navegadorInterno) {
      if (await instalar()) setListo(true)
      return
    }
    setGuia(true)
  }

  const textoBoton = navegadorInterno ? 'Cómo tenerla como app' : evento ? 'Instalar' : 'Agregar a inicio'

  return (
    <>
      {variante === 'tarjeta' ? (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.35 } }}
          aria-labelledby="t-instalar"
          className={cn('flex items-center gap-3 rounded-grande bg-superficie p-4 text-left ring-1 ring-linea', className)}
        >
          <Logo negocio={n} className="size-12 shrink-0 text-sm" />
          <div className="min-w-0 flex-1">
            <p id="t-instalar" className="font-bold leading-tight">Tené {n.nombre} en tu inicio</p>
            <p className="text-sm text-suave">Sacás el próximo turno en un toque y te llegan los avisos.</p>
          </div>
          <Boton tamano="chico" onClick={() => void accion()} className="shrink-0">
            <Download className="size-4" aria-hidden />
            {navegadorInterno ? 'Ver cómo' : evento ? 'Instalar' : 'Agregar'}
          </Boton>
        </motion.section>
      ) : (
        <Boton tamano="chico" onClick={() => void accion()} className={className}>
          {textoBoton}
        </Boton>
      )}

      <Hoja
        abierta={guia}
        onCerrar={() => setGuia(false)}
        titulo={navegadorInterno ? 'Abrila en tu navegador' : `Agregá ${n.nombre} a tu inicio`}
        descripcion={navegadorInterno ? `Desde ${navegadorInterno === 'otra app' ? 'esta app' : navegadorInterno} no se puede instalar.` : 'Son tres toques, una sola vez.'}
      >
        {navegadorInterno ? (
          <GuiaNavegadorInterno plataforma={plataforma} />
        ) : plataforma === 'ios' ? (
          <GuiaIphone n={n} />
        ) : (
          <GuiaAndroid n={n} />
        )}
      </Hoja>
    </>
  )
}

function Paso({ numero, children, ilustracion }: { numero: number; children: React.ReactNode; ilustracion: React.ReactNode }) {
  return (
    <li className="flex items-center gap-4 rounded-grande bg-superficie p-4 ring-1 ring-linea">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-acento text-sm font-extrabold text-sobre-acento" aria-hidden>
        {numero}
      </span>
      <div className="min-w-0 flex-1 text-[15px] leading-snug">{children}</div>
      <div className="shrink-0" aria-hidden>
        {ilustracion}
      </div>
    </li>
  )
}

/** Imita el botón real del sistema, para que lo reconozca en su pantalla. */
function Tecla({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('grid size-11 place-items-center rounded-xl bg-[#f2f2f7] text-[#007aff] ring-1 ring-black/5', className)}>{children}</span>
}

function GuiaIphone({ n }: { n: Negocio }) {
  return (
    <ol className="flex flex-col gap-3 pb-2">
      <Paso numero={1} ilustracion={<Tecla><Share className="size-5" /></Tecla>}>
        Tocá <b>Compartir</b> en la barra de Safari.
        <span className="mt-1 block text-sm text-suave">
          Si no lo ves, tocá primero <Ellipsis className="inline size-4 align-text-bottom" aria-label="los tres puntos" /> (en las versiones nuevas está ahí adentro).
        </span>
      </Paso>
      <Paso numero={2} ilustracion={<Tecla><SquarePlus className="size-5" /></Tecla>}>
        Bajá y elegí <b>Agregar a inicio</b>.
      </Paso>
      <Paso
        numero={3}
        ilustracion={<span className="inline-flex h-11 items-center rounded-xl bg-[#f2f2f7] px-3 text-[15px] font-semibold text-[#007aff] ring-1 ring-black/5">Agregar</span>}
      >
        Tocá <b>Agregar</b>. Te queda el ícono de <b>{n.nombre}</b> junto a tus apps.
      </Paso>
      <p className="mt-1 text-center text-sm text-suave">Tiene que ser desde Safari. Así también te llegan los avisos de tus turnos.</p>
    </ol>
  )
}

function GuiaAndroid({ n }: { n: Negocio }) {
  return (
    <ol className="flex flex-col gap-3 pb-2">
      <Paso numero={1} ilustracion={<Tecla className="text-[#3c4043]"><EllipsisVertical className="size-5" /></Tecla>}>
        Tocá el menú <b>⋮</b> del navegador (arriba a la derecha).
      </Paso>
      <Paso numero={2} ilustracion={<Tecla className="text-[#3c4043]"><Download className="size-5" /></Tecla>}>
        Elegí <b>Instalar app</b> o <b>Agregar a la pantalla principal</b>.
      </Paso>
      <Paso numero={3} ilustracion={<Logo negocio={n} className="size-11 text-xs" />}>
        Confirmá. Te queda el ícono de <b>{n.nombre}</b> con tus apps.
      </Paso>
    </ol>
  )
}

function GuiaNavegadorInterno({ plataforma }: { plataforma: string }) {
  const [copiado, setCopiado] = useState(false)
  const navegador = plataforma === 'ios' ? 'Safari' : 'Chrome'
  return (
    <div className="flex flex-col gap-3 pb-2">
      <ol className="flex flex-col gap-3">
        <Paso numero={1} ilustracion={<Tecla className="text-[#3c4043]">{plataforma === 'ios' ? <Ellipsis className="size-5" /> : <EllipsisVertical className="size-5" />}</Tecla>}>
          Tocá los <b>tres puntos</b> de arriba.
        </Paso>
        <Paso numero={2} ilustracion={<Tecla><ExternalLink className="size-5" /></Tecla>}>
          Elegí <b>Abrir en {navegador}</b> (o "Abrir en el navegador").
        </Paso>
        <Paso numero={3} ilustracion={<Tecla><Download className="size-5" /></Tecla>}>
          Ahí te va a aparecer la opción de tenerla como app.
        </Paso>
      </ol>
      <Boton
        variante="secundario"
        tamano="grande"
        onClick={() => {
          void navigator.clipboard?.writeText(location.href.split('?')[0]!)
          setCopiado(true)
        }}
      >
        {copiado ? <Check className="size-5" aria-hidden /> : <Copy className="size-5" aria-hidden />}
        {copiado ? 'Link copiado: pegalo en ' + navegador : 'Copiar el link'}
      </Boton>
    </div>
  )
}
