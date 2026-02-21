import { hexToRgb, toPdfRect } from '@/features/export/pdfCoordinateMap'

describe('pdf coordinate mapping', () => {
  it('maps top-left UI coordinates to bottom-left PDF coordinates', () => {
    const rect = toPdfRect(
      {
        xPct: 0.25,
        yPct: 0.1,
        widthPct: 0.5,
        heightPct: 0.2,
      },
      600,
      800,
    )

    expect(rect.x).toBeCloseTo(150)
    expect(rect.width).toBeCloseTo(300)
    expect(rect.height).toBeCloseTo(160)
    expect(rect.y).toBeCloseTo(560)
  })

  it('parses valid hex colors', () => {
    const color = hexToRgb('#112233')
    expect(color.r).toBeCloseTo(0x11 / 255)
    expect(color.g).toBeCloseTo(0x22 / 255)
    expect(color.b).toBeCloseTo(0x33 / 255)
  })

  it('falls back when color is invalid', () => {
    const color = hexToRgb('not-a-color')
    expect(color).toEqual({
      r: 0.07,
      g: 0.07,
      b: 0.07,
    })
  })
})
