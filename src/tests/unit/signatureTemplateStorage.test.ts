import {
  parseSignatureTemplates,
  sanitizeSignatureTemplate,
  SIGNATURE_STORAGE_KEY,
} from '@/state/signatureTemplateStorage'

describe('signature template storage parsing', () => {
  it('returns empty array for invalid payloads', () => {
    expect(parseSignatureTemplates(null)).toEqual([])
    expect(parseSignatureTemplates('not-json')).toEqual([])
    expect(parseSignatureTemplates('{}')).toEqual([])
  })

  it('filters out malformed template entries', () => {
    const result = parseSignatureTemplates(
      JSON.stringify([
        {
          id: 'sig-1',
          name: 'Primary',
          imageDataUrl: 'data:image/png;base64,abc',
          createdAt: '2026-02-21T00:00:00.000Z',
        },
        { id: 'bad-1', name: 123 },
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('sig-1')
  })

  it('sanitizes only valid template-like objects', () => {
    expect(
      sanitizeSignatureTemplate({
        id: 'sig-2',
        name: 'Secondary',
        imageDataUrl: 'data:image/png;base64,xyz',
        createdAt: '2026-02-21T00:00:00.000Z',
      }),
    ).toEqual({
      id: 'sig-2',
      name: 'Secondary',
      imageDataUrl: 'data:image/png;base64,xyz',
      createdAt: '2026-02-21T00:00:00.000Z',
    })

    expect(sanitizeSignatureTemplate('invalid')).toBeNull()
  })

  it('uses expected versioned storage key', () => {
    expect(SIGNATURE_STORAGE_KEY).toBe('ezpdfsigner.signatureTemplates.v1')
  })
})
