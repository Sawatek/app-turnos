import { CONTACTO, EMPRESA } from '../marca'

export interface SeccionLegal {
  id: string
  titulo: string
  contenido: React.ReactNode
}

/** Un dato de marca.ts, o un aviso visible de que falta completarlo. */
export function Dato({ valor, falta }: { valor: string; falta: string }) {
  if (valor) return <>{valor}</>
  return <mark className="rounded bg-aviso/15 px-1 font-semibold text-aviso">[{falta}: a completar]</mark>
}

export const Empresa = () => (
  <>
    <Dato valor={EMPRESA.razonSocial} falta="razón social" /> (CUIT <Dato valor={EMPRESA.cuit} falta="CUIT" />), con domicilio en{' '}
    <Dato valor={EMPRESA.domicilio} falta="domicilio" />
  </>
)

/** Cómo contactarnos: mail si está cargado; si no, un aviso para completarlo. */
export const Contacto = () =>
  CONTACTO.email ? <a href={`mailto:${CONTACTO.email}`}>{CONTACTO.email}</a> : <Dato valor="" falta="mail de contacto" />
