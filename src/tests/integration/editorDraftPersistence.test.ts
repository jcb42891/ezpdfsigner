import {
  applyEditorDraftSnapshot,
  buildEditorDraftSnapshot,
} from '@/state/editorDraftPersistence'
import { clearEditorDraft, persistEditorDraft, readEditorDraft } from '@/state/editorDraftStorage'
import { TEXT_DEFAULT_FONT_SIZE, useEditorStore } from '@/state/editorStore'

const ONE_PIXEL_SIGNATURE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg=='

const resetEditorStore = (): void => {
  useEditorStore.setState({
    sourcePdf: null,
    toolMode: 'select',
    zoom: 1,
    defaultTextFontSize: TEXT_DEFAULT_FONT_SIZE,
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

describe('editor draft persistence', () => {
  beforeEach(async () => {
    localStorage.clear()
    await clearEditorDraft()
    resetEditorStore()
  })

  it('restores a persisted editing session', async () => {
    const store = useEditorStore.getState()

    store.loadPdf({
      fileName: 'sample.pdf',
      bytes: new Uint8Array([37, 80, 68, 70]),
      pageCount: 2,
      pageSizes: [
        { width: 600, height: 800 },
        { width: 600, height: 800 },
      ],
    })

    store.setToolMode('text')
    store.setDefaultTextFontSize(20)

    const textId = store.addTextAnnotation({ pageIndex: 0, xPct: 0.2, yPct: 0.2 })
    expect(textId).toBeTruthy()

    useEditorStore.getState().updateTextAnnotation({
      id: textId as string,
      text: 'Approved',
      color: '#123456',
    })

    const templateId = useEditorStore
      .getState()
      .addSignatureTemplate(ONE_PIXEL_SIGNATURE, 'Primary')

    const signatureId = useEditorStore.getState().placeSignature({
      pageIndex: 1,
      xPct: 0.4,
      yPct: 0.5,
      templateId,
    })

    expect(signatureId).toBeTruthy()

    const draftSnapshot = buildEditorDraftSnapshot(useEditorStore.getState())
    expect(draftSnapshot).toBeTruthy()

    await persistEditorDraft(draftSnapshot as NonNullable<typeof draftSnapshot>)

    resetEditorStore()

    const restoredDraft = await readEditorDraft()
    expect(restoredDraft).toBeTruthy()

    applyEditorDraftSnapshot(restoredDraft as NonNullable<typeof restoredDraft>)

    const restoredState = useEditorStore.getState()
    expect(restoredState.sourcePdf?.fileName).toBe('sample.pdf')
    expect(restoredState.defaultTextFontSize).toBe(20)
    expect(restoredState.annotationOrder).toEqual([textId, signatureId])

    const restoredText = restoredState.annotationsById[textId as string]
    if (!restoredText || restoredText.type !== 'text') {
      throw new Error('Expected restored text annotation')
    }

    expect(restoredText.text).toBe('Approved')
    expect(restoredText.color).toBe('#123456')

    const restoredSignature = restoredState.annotationsById[signatureId as string]
    if (!restoredSignature || restoredSignature.type !== 'signature') {
      throw new Error('Expected restored signature annotation')
    }

    expect(restoredSignature.templateId).toBe(templateId)
    expect(restoredState.signatureTemplateOrder).toEqual([templateId])
  })
})
