import encodeQR from 'qr'

/** QR dibujado como SVG por React (sin innerHTML). Siempre negro sobre blanco, para que cualquier cámara lo lea. */
export function QR({ texto, className }: { texto: string; className?: string }) {
  const matriz = encodeQR(texto, 'raw', { ecc: 'medium', border: 2 })
  const lado = matriz.length
  let d = ''
  matriz.forEach((fila, y) => fila.forEach((on, x) => on && (d += `M${x} ${y}h1v1h-1z`)))
  return (
    <svg viewBox={`0 0 ${lado} ${lado}`} className={className} role="img" aria-label={`Código QR para abrir ${texto}`} shapeRendering="crispEdges">
      <rect width={lado} height={lado} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  )
}
