import type { CSSProperties } from 'react'

/** Ширина шапки и полосы сеанса — как на страницах «История тревог» / «История расходов». */
export const COMMANDER_SHELL_MAX = 1100

/** Единая обёртка контента под шапкой руководителя (по горизонтали совпадает с шапкой). */
export const commanderPageBody: CSSProperties = {
  maxWidth: COMMANDER_SHELL_MAX,
  margin: '0 auto',
  padding: '24px 20px 48px',
}
