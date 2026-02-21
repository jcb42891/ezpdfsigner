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

    useEditorStore.getState().copySignatureAnnotation()
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

  it('does not paste when clipboard is empty', () => {
    const pastedId = useEditorStore.getState().pasteSignatureAnnotation()
    expect(pastedId).toBeNull()
  })
})
