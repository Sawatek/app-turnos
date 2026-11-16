/** Une clases condicionales: cn('a', cond && 'b'). */
export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
