import {
  clampNumber,
  clampRectPct,
  pctRectToPixels,
  pixelRectToPct,
  pointerToPct,
} from '@/features/annotations/coordinate'

describe('annotation coordinate helpers', () => {
  it('clamps numeric values', () => {
    expect(clampNumber(-1, 0, 1)).toBe(0)
    expect(clampNumber(1.4, 0, 1)).toBe(1)
    expect(clampNumber(0.45, 0, 1)).toBe(0.45)
  })

  it('clamps rectangle values into valid range', () => {
    const rect = clampRectPct({
      xPct: 0.95,
      yPct: 0.98,
      widthPct: 0.2,
      heightPct: 0.5,
    })

    expect(rect.widthPct).toBeLessThanOrEqual(1)
    expect(rect.heightPct).toBeLessThanOrEqual(1)
    expect(rect.xPct + rect.widthPct).toBeLessThanOrEqual(1)
    expect(rect.yPct + rect.heightPct).toBeLessThanOrEqual(1)
  })

  it('converts between pct and px consistently', () => {
    const source = {
      xPct: 0.1,
      yPct: 0.2,
      widthPct: 0.3,
      heightPct: 0.4,
    }
    const pixels = pctRectToPixels(source, 800, 1000)
    const roundTrip = pixelRectToPct(pixels, 800, 1000)

    expect(roundTrip.xPct).toBeCloseTo(source.xPct)
    expect(roundTrip.yPct).toBeCloseTo(source.yPct)
    expect(roundTrip.widthPct).toBeCloseTo(source.widthPct)
    expect(roundTrip.heightPct).toBeCloseTo(source.heightPct)
  })

  it('converts pointer coordinates to bounded percentages', () => {
    expect(pointerToPct(160, 240, 800, 1200)).toEqual({
      xPct: 0.2,
      yPct: 0.2,
    })
    expect(pointerToPct(-10, 1500, 800, 1200)).toEqual({
      xPct: 0,
      yPct: 1,
    })
  })
})
