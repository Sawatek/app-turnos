// Celulares argentinos para el ingreso por código.
// La gente los escribe de mil formas ("11 2345-6789", "011 15 2345 6789", "+54 9 11 …"): acá se llevan
// todos al formato internacional que usa Supabase Auth (+5491123456789).

export type ResultadoTelefono = { ok: true; e164: string; nacional: string } | { ok: false; error: string }

export const ERROR_TELEFONO = 'Revisá el número: son 10 números con el código de área, sin el 0 ni el 15 (ej.: 11 2345-6789).'

const soloDigitos = (s: string) => s.replace(/\D/g, '')

/** Normaliza un celular argentino. Devuelve el número en formato +549… o el error para mostrar al lado del campo. */
export function normalizarTelefono(entrada: string): ResultadoTelefono {
  let d = soloDigitos(entrada)
  if (!d) return { ok: false, error: 'Escribí tu celular, con el código de área.' }

  // Con código de país: +54 9 11… o +54 11… (sin el 9 de celulares).
  if (d.startsWith('549') && d.length >= 12) d = d.slice(3)
  else if (d.startsWith('54') && d.length >= 11) d = d.slice(2)
  // El 0 de larga distancia.
  if (d.startsWith('0')) d = d.slice(1)
  // El 15 de celular después del código de área (2, 3 o 4 números): 11 15 2345-6789 → 11 2345-6789.
  if (d.length === 12) {
    for (const largo of [2, 3, 4]) {
      if (d.slice(largo, largo + 2) === '15') {
        d = d.slice(0, largo) + d.slice(largo + 2)
        break
      }
    }
  }
  // Todos los códigos de área de Argentina empiezan con 1, 2 o 3.
  if (d.length !== 10 || !/^[123]/.test(d)) return { ok: false, error: ERROR_TELEFONO }
  return { ok: true, e164: `+549${d}`, nacional: d }
}

/** "1123456789" → "11 2345-6789" (mientras escribe, sin pasarse de 10 números… salvo que pegue el +54). */
export function formatoTelefono(entrada: string): string {
  const d = soloDigitos(entrada)
  if (d.length > 10 || entrada.trim().startsWith('+') || d.startsWith('0')) return entrada
  return d.length > 6 ? `${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6)}` : d.length > 2 ? `${d.slice(0, 2)} ${d.slice(2)}` : d
}

/** Para mostrar el número de la sesión ("5491123456789" o "+549…") como "11 2345-6789". */
export function telefonoLegible(tel: string | null | undefined): string {
  if (!tel) return ''
  const r = normalizarTelefono(tel)
  return r.ok ? formatoTelefono(r.nacional) : tel
}
