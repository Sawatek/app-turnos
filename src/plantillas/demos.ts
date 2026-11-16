import type { Negocio } from '@/dominio/tipos'
import { negocioDesdePlantilla } from './rubros'

/** Demos que vienen de fábrica: sirven para mostrar sin haber dado de alta nada. */
export const DEMOS_FIJAS: Negocio[] = [
  {
    ...negocioDesdePlantilla('barberia', { nombre: 'QueTul', zona: 'Moreno', direccion: 'Av. Victorica 1200, Moreno', slug: 'quetul' }),
  },
  {
    ...negocioDesdePlantilla('odontologia', { nombre: 'Consultorio Lema', zona: 'Paso del Rey', direccion: 'Mitre 450, Paso del Rey', slug: 'lema' }),
  },
  {
    ...negocioDesdePlantilla('unas', { nombre: 'Nailed', zona: 'Caballito', direccion: 'Rojas 320, Caballito', slug: 'nailed' }),
    color: '#d9466f',
  },
]
