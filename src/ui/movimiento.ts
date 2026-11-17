// "Reducir movimiento" para lo que se hace desde JS (las animaciones de motion las frena MotionConfig en main.tsx).

/** Comportamiento del scroll programático: suave, salvo que el sistema pida reducir movimiento. */
export const scrollSuave = (): ScrollBehavior =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
