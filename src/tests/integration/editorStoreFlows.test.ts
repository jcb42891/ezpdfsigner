import { useEditorStore } from '@/state/editorStore'

const ONE_PIXEL_SIGNATURE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg=='

const resetEditorStore = (): void => {
  useEditorStore.setState({
    sourcePdf: null,
    toolMode: 'select',
    zoom: 1,
    defaultTextFontSize: 16,
    hasRecoveredDraftNotice: false,
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

describe('editor store flows', () => {
  beforeEach(() => {
    localStorage.clear()
    resetEditorStore()
    useEditorStore.getState().loadPdf({
      fileName: 'sample.pdf',
      bytes: new Uint8Array([37, 80, 68, 70]),
      pageCount: 2,
      pageSizes: [
        { width: 600, height: 800 },
        { width: 600, height: 800 },
      ],
    })
  })

  it('supports text annotation add/edit/move/delete lifecycle', () => {
    const store = useEditorStore.getState()
    store.setToolMode('text')
    const textId = store.addTextAnnotation({ pageIndex: 0, xPct: 0.2, yPct: 0.2 })
    expect(textId).toBeTruthy()
    expect(useEditorStore.getState().toolMode).toBe('text')

    const createdText = useEditorStore.getState().annotationsById[textId as string]
    expect(createdText?.type).toBe('text')

    useEditorStore.getState().updateTextAnnotation({
      id: textId as string,
      text: 'Approved',
      fontSize: 18,
      color: '#123456',
    })

    useEditorStore.getState().upsertAnnotationRect({
      id: textId as string,
      xPct: 0.9,
      yPct: 0.95,
      widthPct: 0.3,
      heightPct: 0.2,
    })

    const updatedText = useEditorStore.getState().annotationsById[textId as string]
    if (!updatedText || updatedText.type !== 'text') {
      throw new Error('Expected updated text annotation')
    }

    expect(updatedText.text).toBe('Approved')
    expect(updatedText.fontSize).toBe(18)
    expect(updatedText.color).toBe('#123456')
    expect(updatedText.xPct + updatedText.widthPct).toBeLessThanOrEqual(1)
    expect(updatedText.yPct + updatedText.heightPct).toBeLessThanOrEqual(1)

    useEditorStore.getState().deleteAnnotation(textId as string)
    expect(useEditorStore.getState().annotationsById[textId as string]).toBeUndefined()
  })

  it('applies default text size to new annotations only', () => {
    const store = useEditorStore.getState()
    store.setDefaultTextFontSize(20)

    const firstTextId = store.addTextAnnotation({ pageIndex: 0, xPct: 0.2, yPct: 0.2 })
    expect(firstTextId).toBeTruthy()

    store.updateTextAnnotation({
      id: firstTextId as string,
      fontSize: 28,
    })

    store.setDefaultTextFontSize(14)
    const secondTextId = store.addTextAnnotation({ pageIndex: 0, xPct: 0.4, yPct: 0.4 })
    expect(secondTextId).toBeTruthy()

    const firstText = useEditorStore.getState().annotationsById[firstTextId as string]
    const secondText = useEditorStore.getState().annotationsById[secondTextId as string]
    if (!firstText || !secondText || firstText.type !== 'text' || secondText.type !== 'text') {
      throw new Error('Expected text annotations')
    }

    expect(firstText.fontSize).toBe(28)
    expect(secondText.fontSize).toBe(14)
  })

  it('supports signature template create/place/copy/paste lifecycle', () => {
    const templateId = useEditorStore
      .getState()
      .addSignatureTemplate(ONE_PIXEL_SIGNATURE, 'Primary')
    expect(templateId).toBeTruthy()

    const placedId = useEditorStore.getState().placeSignature({
      pageIndex: 1,
      xPct: 0.4,
      yPct: 0.5,
      templateId,
    })
    expect(placedId).toBeTruthy()

    useEditorStore.getState().copySignatureAnnotation()
    const pastedId = useEditorStore.getState().pasteSignatureAnnotation()
    expect(pastedId).toBeTruthy()

    const placed = useEditorStore.getState().annotationsById[placedId as string]
    const pasted = useEditorStore.getState().annotationsById[pastedId as string]
    if (
      !placed ||
      !pasted ||
      placed.type !== 'signature' ||
      pasted.type !== 'signature'
    ) {
      throw new Error('Expected signature annotations')
    }

    expect(pasted.templateId).toBe(templateId)
    expect(pasted.pageIndex).toBe(placed.pageIndex)
    expect(pasted.xPct).toBeCloseTo(Math.min(1 - pasted.widthPct, placed.xPct + 0.02))
    expect(pasted.yPct).toBeCloseTo(Math.min(1 - pasted.heightPct, placed.yPct + 0.02))
  })
})
