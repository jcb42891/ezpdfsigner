import { useEditorStore } from '@/state/editorStore'

const resetEditorStore = (): void => {
  useEditorStore.setState({
    sourcePdf: null,
    toolMode: 'select',
    zoom: 1,
    selectedAnnotationId: null,
    selectedSignatureTemplateId: null,
    annotationsById: {},
    annotationOrder: [],
    signatureTemplatesById: {},
    signatureTemplateOrder: [],
    clipboard: { annotationSnapshot: null },
    isSignaturePadOpen: false,
  })
}

describe('editor store clipboard behaviors', () => {
  beforeEach(() => {
    localStorage.clear()
    resetEditorStore()
  })

  it('copies selected signature and pastes with offset and bounds clamp', () => {
    const store = useEditorStore.getState()

    store.loadPdf({
      fileName: 'sample.pdf',
      bytes: new Uint8Array([37, 80, 68, 70]),
      pageCount: 1,
      pageSizes: [{ width: 600, height: 800 }],
    })

    const templateId = store.addSignatureTemplate(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==',
      'Sig 1',
    )

    const placedId = useEditorStore.getState().placeSignature({
      pageIndex: 0,
      xPct: 0.95,
      yPct: 0.95,
      templateId,
    })
    expect(placedId).toBeTruthy()

    const copied = useEditorStore.getState().copySignatureAnnotation()
    expect(copied).toBe(true)
    const pastedId = useEditorStore.getState().pasteSignatureAnnotation()
    expect(pastedId).toBeTruthy()

    const pasted = useEditorStore.getState().annotationsById[pastedId as string]
    if (!pasted || pasted.type !== 'signature') {
      throw new Error('Expected pasted signature annotation')
    }

    expect(pasted.xPct).toBeCloseTo(0.75)
    expect(pasted.yPct).toBeCloseTo(0.9)
    expect(pasted.xPct + pasted.widthPct).toBeLessThanOrEqual(1)
    expect(pasted.yPct + pasted.heightPct).toBeLessThanOrEqual(1)
  })

  it('copies selected text annotation and pastes with offset', () => {
    const store = useEditorStore.getState()

    store.loadPdf({
      fileName: 'sample.pdf',
      bytes: new Uint8Array([37, 80, 68, 70]),
      pageCount: 1,
      pageSizes: [{ width: 600, height: 800 }],
    })

    const textId = store.addTextAnnotation({
      pageIndex: 0,
      xPct: 0.25,
      yPct: 0.35,
      widthPct: 0.3,
      heightPct: 0.08,
      text: 'Approved',
    })
    expect(textId).toBeTruthy()

    store.updateTextAnnotation({
      id: textId as string,
      fontSize: 22,
      color: '#0f766e',
    })

    const copied = useEditorStore.getState().copySignatureAnnotation()
    expect(copied).toBe(true)

    const pastedId = useEditorStore.getState().pasteSignatureAnnotation()
    expect(pastedId).toBeTruthy()

    const pasted = useEditorStore.getState().annotationsById[pastedId as string]
    if (!pasted || pasted.type !== 'text') {
      throw new Error('Expected pasted text annotation')
    }

    expect(pasted.pageIndex).toBe(0)
    expect(pasted.text).toBe('Approved')
    expect(pasted.fontSize).toBe(22)
    expect(pasted.color).toBe('#0f766e')
    expect(pasted.xPct).toBeCloseTo(0.27)
    expect(pasted.yPct).toBeCloseTo(0.37)
    expect(pasted.widthPct).toBeCloseTo(0.3)
    expect(pasted.heightPct).toBeCloseTo(0.08)
  })

  it('does not paste when clipboard is empty', () => {
    const pastedId = useEditorStore.getState().pasteSignatureAnnotation()
    expect(pastedId).toBeNull()
  })
})
