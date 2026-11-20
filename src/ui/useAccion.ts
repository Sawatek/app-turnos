import { useState } from 'react'

/**
 * Corre una acción async: maneja "cargando" y deja el error listo para mostrar al lado del botón o campo.
 * `mensaje` traduce el error a un texto para la persona (cada superficie tiene el suyo).
 */
export function useAccion(mensaje: (e: unknown) => string) {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string>()
  const correr = async (fn: () => Promise<unknown>) => {
    setOcupado(true)
    setError(undefined)
    try {
      await fn()
      return true
    } catch (e) {
      setError(mensaje(e))
      return false
    } finally {
      setOcupado(false)
    }
  }
  return { ocupado, error, setError, correr }
}
