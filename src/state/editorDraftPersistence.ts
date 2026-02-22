import {
  clearEditorDraft,
  persistEditorDraft,
  readEditorDraft,
  type EditorDraftSnapshot,
} from '@/state/editorDraftStorage'
import { TEXT_DEFAULT_FONT_SIZE, useEditorStore, type EditorStore } from '@/state/editorStore'
import { persistSignatureTemplates } from '@/state/signatureTemplateStorage'
import type { SignatureTemplate, ToolMode } from '@/state/types'

const AUTOSAVE_DEBOUNCE_MS = 300

let bootstrapPromise: Promise<void> | null = null
let autosaveTimeout: ReturnType<typeof setTimeout> | null = null
let isPersisting = false
let shouldPersistAgain = false

const buildSignatureTemplateList = (draft: EditorDraftSnapshot): SignatureTemplate[] =>
  draft.signatureTemplateOrder
    .map((id) => draft.signatureTemplatesById[id])
    .filter((value): value is SignatureTemplate => Boolean(value))

const resolveToolMode = (
  toolMode: ToolMode,
  selectedSignatureTemplateId: string | null,
): ToolMode => {
  if (toolMode === 'signature' && !selectedSignatureTemplateId) {
    return 'select'
  }

  return toolMode
}

export const buildEditorDraftSnapshot = (
  state: EditorStore,
): EditorDraftSnapshot | null => {
  if (!state.sourcePdf) {
    return null
  }

  return {
    sourcePdf: state.sourcePdf,
    toolMode: state.toolMode,
    zoom: state.zoom,
    defaultTextFontSize: state.defaultTextFontSize,
    selectedAnnotationId: state.selectedAnnotationId,
    selectedSignatureTemplateId: state.selectedSignatureTemplateId,
    annotationsById: state.annotationsById,
    annotationOrder: state.annotationOrder,
    signatureTemplatesById: state.signatureTemplatesById,
    signatureTemplateOrder: state.signatureTemplateOrder,
  }
}

export const applyEditorDraftSnapshot = (draft: EditorDraftSnapshot): void => {
  const selectedSignatureTemplateId =
    typeof draft.selectedSignatureTemplateId === 'string' &&
    draft.signatureTemplatesById[draft.selectedSignatureTemplateId]
      ? draft.selectedSignatureTemplateId
      : (draft.signatureTemplateOrder.find((id) => draft.signatureTemplatesById[id]) ??
          null)

  const selectedAnnotationId =
    typeof draft.selectedAnnotationId === 'string' &&
    draft.annotationsById[draft.selectedAnnotationId]
      ? draft.selectedAnnotationId
      : null

  useEditorStore.setState({
    sourcePdf: draft.sourcePdf,
    toolMode: resolveToolMode(draft.toolMode, selectedSignatureTemplateId),
    zoom: draft.zoom,
    defaultTextFontSize:
      Number.isFinite(draft.defaultTextFontSize) && draft.defaultTextFontSize > 0
        ? draft.defaultTextFontSize
        : TEXT_DEFAULT_FONT_SIZE,
    selectedAnnotationId,
    selectedSignatureTemplateId,
    annotationsById: draft.annotationsById,
    annotationOrder: draft.annotationOrder,
    signatureTemplatesById: draft.signatureTemplatesById,
    signatureTemplateOrder: draft.signatureTemplateOrder,
    hasRecoveredDraftNotice: false,
    clipboard: { annotationSnapshot: null },
    isSignaturePadOpen: false,
  })

  persistSignatureTemplates(buildSignatureTemplateList(draft))
}

const isPristineStoreState = (state: EditorStore): boolean =>
  state.sourcePdf === null &&
  state.annotationOrder.length === 0

const persistStoreDraft = async (): Promise<void> => {
  if (isPersisting) {
    shouldPersistAgain = true
    return
  }

  isPersisting = true

  try {
    do {
      shouldPersistAgain = false

      const snapshot = buildEditorDraftSnapshot(useEditorStore.getState())
      if (snapshot) {
        await persistEditorDraft(snapshot)
        continue
      }

      await clearEditorDraft()
    } while (shouldPersistAgain)
  } catch {
    // Ignore persistence errors and continue autosave attempts.
  } finally {
    isPersisting = false
  }
}

const scheduleDraftPersist = (): void => {
  if (autosaveTimeout) {
    clearTimeout(autosaveTimeout)
  }

  autosaveTimeout = setTimeout(() => {
    autosaveTimeout = null
    void persistStoreDraft()
  }, AUTOSAVE_DEBOUNCE_MS)
}

const flushDraftPersist = (): void => {
  if (autosaveTimeout) {
    clearTimeout(autosaveTimeout)
    autosaveTimeout = null
  }

  void persistStoreDraft()
}

export const initializeEditorDraftPersistence = (): Promise<void> => {
  if (bootstrapPromise) {
    return bootstrapPromise
  }

  bootstrapPromise = (async () => {
    try {
      const existingDraft = await readEditorDraft()
      if (existingDraft && isPristineStoreState(useEditorStore.getState())) {
        applyEditorDraftSnapshot(existingDraft)
        useEditorStore.getState().setRecoveredDraftNoticeVisible(true)
      }

      useEditorStore.subscribe(() => {
        scheduleDraftPersist()
      })

      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', flushDraftPersist)
      }

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
            flushDraftPersist()
          }
        })
      }
    } catch {
      // Swallow bootstrap failures and keep editor usable.
    }
  })()

  return bootstrapPromise
}
