import {
  clearEditorDraft,
  parseEditorDraftPayload,
  persistEditorDraft,
  readEditorDraft,
  type EditorDraftSnapshot,
} from '@/state/editorDraftStorage'

describe('editor draft storage', () => {
  beforeEach(async () => {
    localStorage.clear()
    await clearEditorDraft()
  })

  it('returns null for malformed payloads', () => {
    expect(parseEditorDraftPayload(null, null)).toBeNull()
    expect(parseEditorDraftPayload('not-json', null)).toBeNull()
    expect(parseEditorDraftPayload({ version: 1 }, null)).toBeNull()
  })

  it('filters invalid signature annotations that reference missing templates', () => {
    const parsed = parseEditorDraftPayload(
      {
        version: 1,
        sourcePdf: {
          fileName: 'sample.pdf',
          pageCount: 1,
          pageSizes: [{ width: 600, height: 800 }],
        },
        toolMode: 'signature',
        zoom: 1,
        defaultTextFontSize: 16,
        selectedAnnotationId: 'text-1',
        selectedSignatureTemplateId: 'sig-1',
        annotationsById: {
          'text-1': {
            id: 'text-1',
            type: 'text',
            pageIndex: 0,
            xPct: 0.2,
            yPct: 0.2,
            widthPct: 0.2,
            heightPct: 0.05,
            text: 'Approved',
            fontSize: 16,
            color: '#111111',
          },
          'sig-annotation-1': {
            id: 'sig-annotation-1',
            type: 'signature',
            pageIndex: 0,
            xPct: 0.4,
            yPct: 0.5,
            widthPct: 0.2,
            heightPct: 0.08,
            templateId: 'missing-template',
          },
        },
        annotationOrder: ['text-1', 'sig-annotation-1'],
        signatureTemplatesById: {
          'sig-1': {
            id: 'sig-1',
            name: 'Primary',
            imageDataUrl:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==',
            createdAt: '2026-02-21T00:00:00.000Z',
          },
        },
        signatureTemplateOrder: ['sig-1'],
      },
      new Uint8Array([37, 80, 68, 70]),
    )

    expect(parsed).toBeTruthy()
    expect(parsed?.annotationOrder).toEqual(['text-1'])
    expect(parsed?.annotationsById['sig-annotation-1']).toBeUndefined()
  })

  it('round-trips persisted draft snapshots', async () => {
    const snapshot: EditorDraftSnapshot = {
      sourcePdf: {
        fileName: 'sample.pdf',
        bytes: new Uint8Array([37, 80, 68, 70]),
        pageCount: 1,
        pageSizes: [{ width: 600, height: 800 }],
      },
      toolMode: 'text',
      zoom: 1.25,
      defaultTextFontSize: 18,
      selectedAnnotationId: 'text-1',
      selectedSignatureTemplateId: 'sig-1',
      annotationsById: {
        'text-1': {
          id: 'text-1',
          type: 'text',
          pageIndex: 0,
          xPct: 0.2,
          yPct: 0.2,
          widthPct: 0.2,
          heightPct: 0.05,
          text: 'Approved',
          fontSize: 18,
          color: '#111111',
        },
      },
      annotationOrder: ['text-1'],
      signatureTemplatesById: {
        'sig-1': {
          id: 'sig-1',
          name: 'Primary',
          imageDataUrl:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==',
          createdAt: '2026-02-21T00:00:00.000Z',
        },
      },
      signatureTemplateOrder: ['sig-1'],
    }

    await persistEditorDraft(snapshot)

    const restored = await readEditorDraft()
    expect(restored).toEqual(snapshot)

    await clearEditorDraft()
    await expect(readEditorDraft()).resolves.toBeNull()
  })
})
