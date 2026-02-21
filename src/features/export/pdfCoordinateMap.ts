import type { BaseAnnotation } from '@/state/types'

export type PdfRect = {
  x: number
  y: number
  width: number
  height: number
}

export const toPdfRect = (
  annotation: Pick<BaseAnnotation, 'xPct' | 'yPct' | 'widthPct' | 'heightPct'>,
  pageWidth: number,
  pageHeight: number,
): PdfRect => {
  const width = annotation.widthPct * pageWidth
  const height = annotation.heightPct * pageHeight
  const x = annotation.xPct * pageWidth
  const yTop = annotation.yPct * pageHeight
  const y = pageHeight - yTop - height

  return {
    x,
    y,
    width,
    height,
  }
}

export const hexToRgb = (hexColor: string): { r: number; g: number; b: number } => {
  const normalized = hexColor.replace('#', '').trim()
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return { r: 0.07, g: 0.07, b: 0.07 }
  }

  const r = parseInt(normalized.slice(0, 2), 16) / 255
  const g = parseInt(normalized.slice(2, 4), 16) / 255
  const b = parseInt(normalized.slice(4, 6), 16) / 255

  return { r, g, b }
}
