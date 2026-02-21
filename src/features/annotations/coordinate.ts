import type { BaseAnnotation } from '@/state/types'

export type RectPct = Pick<BaseAnnotation, 'xPct' | 'yPct' | 'widthPct' | 'heightPct'>

export type RectPx = {
  x: number
  y: number
  width: number
  height: number
}

const MIN_SIZE_PCT = 0.01

export const clampNumber = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) {
    return min
  }

  return Math.min(max, Math.max(min, value))
}

export const clampRectPct = (rect: RectPct): RectPct => {
  const widthPct = clampNumber(rect.widthPct, MIN_SIZE_PCT, 1)
  const heightPct = clampNumber(rect.heightPct, MIN_SIZE_PCT, 1)
  const xPct = clampNumber(rect.xPct, 0, 1 - widthPct)
  const yPct = clampNumber(rect.yPct, 0, 1 - heightPct)

  return { xPct, yPct, widthPct, heightPct }
}

export const pctRectToPixels = (
  rect: RectPct,
  pageWidthPx: number,
  pageHeightPx: number,
): RectPx => ({
  x: rect.xPct * pageWidthPx,
  y: rect.yPct * pageHeightPx,
  width: rect.widthPct * pageWidthPx,
  height: rect.heightPct * pageHeightPx,
})

export const pixelRectToPct = (
  rect: RectPx,
  pageWidthPx: number,
  pageHeightPx: number,
): RectPct =>
  clampRectPct({
    xPct: rect.x / pageWidthPx,
    yPct: rect.y / pageHeightPx,
    widthPct: rect.width / pageWidthPx,
    heightPct: rect.height / pageHeightPx,
  })

export const pointerToPct = (
  xPx: number,
  yPx: number,
  pageWidthPx: number,
  pageHeightPx: number,
): Pick<BaseAnnotation, 'xPct' | 'yPct'> => ({
  xPct: clampNumber(xPx / pageWidthPx, 0, 1),
  yPct: clampNumber(yPx / pageHeightPx, 0, 1),
})
