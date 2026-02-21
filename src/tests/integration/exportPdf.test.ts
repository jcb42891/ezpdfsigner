import { PDFDocument } from 'pdf-lib'
import { buildExportPdf } from '@/features/export/exportPdf'
import type { Annotation, SourcePdf } from '@/state/types'

const ONE_PIXEL_SIGNATURE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg=='

describe('buildExportPdf', () => {
  it('produces non-empty, valid PDF bytes with text and signature annotations', async () => {
    const source = await PDFDocument.create()
    source.addPage([600, 800])
    const sourceBytes = new Uint8Array(await source.save())

    const sourcePdf: SourcePdf = {
      fileName: 'source.pdf',
      bytes: sourceBytes,
      pageCount: 1,
      pageSizes: [{ width: 600, height: 800 }],
    }

    const annotations: Annotation[] = [
      {
        id: 'text-1',
        type: 'text',
        pageIndex: 0,
        xPct: 0.1,
        yPct: 0.1,
        widthPct: 0.3,
        heightPct: 0.08,
        text: 'Signed by John Doe',
        fontSize: 14,
        color: '#111111',
      },
      {
        id: 'sig-1',
        type: 'signature',
        pageIndex: 0,
        xPct: 0.12,
        yPct: 0.25,
        widthPct: 0.2,
        heightPct: 0.08,
        templateId: 'template-1',
      },
    ]

    const outputBytes = await buildExportPdf({
      sourcePdf,
      annotations,
      signatureTemplatesById: {
        'template-1': {
          id: 'template-1',
          name: 'Primary',
          imageDataUrl: ONE_PIXEL_SIGNATURE,
          createdAt: '2026-02-21T00:00:00.000Z',
        },
      },
    })

    expect(outputBytes.byteLength).toBeGreaterThan(0)

    const outputDocument = await PDFDocument.load(outputBytes)
    expect(outputDocument.getPageCount()).toBe(1)
  })
})
