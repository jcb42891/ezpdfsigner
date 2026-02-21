import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { clampNumber, clampRectPct } from '@/features/annotations/coordinate'
import type { EditorActions } from '@/state/actions'
import type {
  AnnotationMap,
  SignatureAnnotation,
  SignatureTemplate,
  SignatureTemplateMap,
  SourcePdf,
  ToolMode,
} from '@/state/types'

const SIGNATURE_STORAGE_KEY = 'ezpdfsigner.signatureTemplates.v1'
const DEFAULT_ZOOM = 1
const MIN_ZOOM = 0.4
const MAX_ZOOM = 3
const TEXT_DEFAULT_WIDTH_PCT = 0.22
const TEXT_DEFAULT_HEIGHT_PCT = 0.06
const SIGNATURE_DEFAULT_WIDTH_PCT = 0.25
const SIGNATURE_DEFAULT_HEIGHT_PCT = 0.1
const CLIPBOARD_OFFSET_PCT = 0.02

type EditorState = {
  sourcePdf: SourcePdf | null
  toolMode: ToolMode
  zoom: number
  selectedAnnotationId: string | null
  selectedSignatureTemplateId: string | null
  annotationsById: AnnotationMap
  annotationOrder: string[]
  signatureTemplatesById: SignatureTemplateMap
  signatureTemplateOrder: string[]
  clipboard: {
    annotationSnapshot: SignatureAnnotation | null
  }
  isSignaturePadOpen: boolean
}

export type EditorStore = EditorState & EditorActions

const safeJsonParse = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

const sanitizeTemplate = (value: unknown): SignatureTemplate | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    typeof candidate.imageDataUrl !== 'string' ||
    typeof candidate.createdAt !== 'string'
  ) {
    return null
  }

  return {
    id: candidate.id,
    name: candidate.name,
    imageDataUrl: candidate.imageDataUrl,
    createdAt: candidate.createdAt,
  }
}

const readSignatureTemplates = (): SignatureTemplate[] => {
  const rawValue = localStorage.getItem(SIGNATURE_STORAGE_KEY)
  if (!rawValue) {
    return []
  }

  const parsed = safeJsonParse<unknown>(rawValue)
  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed
    .map((entry) => sanitizeTemplate(entry))
    .filter((entry): entry is SignatureTemplate => Boolean(entry))
}

const persistSignatureTemplates = (templates: SignatureTemplate[]): void => {
  localStorage.setItem(SIGNATURE_STORAGE_KEY, JSON.stringify(templates))
}

const buildTemplateMaps = (templates: SignatureTemplate[]) => {
  const signatureTemplatesById: SignatureTemplateMap = {}
  const signatureTemplateOrder: string[] = []

  templates.forEach((template) => {
    signatureTemplatesById[template.id] = template
    signatureTemplateOrder.push(template.id)
  })

  return { signatureTemplatesById, signatureTemplateOrder }
}

const initialTemplates = buildTemplateMaps(readSignatureTemplates())

const withTemplatePersistence = (state: EditorState): void => {
  const templates = state.signatureTemplateOrder
    .map((id) => state.signatureTemplatesById[id])
    .filter((value): value is SignatureTemplate => Boolean(value))
  persistSignatureTemplates(templates)
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  sourcePdf: null,
  toolMode: 'select',
  zoom: DEFAULT_ZOOM,
  selectedAnnotationId: null,
  selectedSignatureTemplateId: initialTemplates.signatureTemplateOrder[0] ?? null,
  annotationsById: {},
  annotationOrder: [],
  signatureTemplatesById: initialTemplates.signatureTemplatesById,
  signatureTemplateOrder: initialTemplates.signatureTemplateOrder,
  clipboard: {
    annotationSnapshot: null,
  },
  isSignaturePadOpen: false,

  setToolMode: (toolMode) => set({ toolMode }),

  setZoom: (zoom) =>
    set({
      zoom: clampNumber(zoom, MIN_ZOOM, MAX_ZOOM),
    }),

  setSelectedAnnotationId: (selectedAnnotationId) => set({ selectedAnnotationId }),

  setSelectedSignatureTemplateId: (selectedSignatureTemplateId) =>
    set({ selectedSignatureTemplateId }),

  openSignaturePad: () => set({ isSignaturePadOpen: true }),

  closeSignaturePad: () => set({ isSignaturePadOpen: false }),

  loadPdf: ({ fileName, bytes, pageCount, pageSizes }) =>
    set((state) => ({
      sourcePdf: {
        fileName,
        bytes,
        pageCount,
        pageSizes,
      },
      zoom: DEFAULT_ZOOM,
      selectedAnnotationId: null,
      annotationsById: {},
      annotationOrder: [],
      clipboard: {
        annotationSnapshot: null,
      },
      toolMode: state.selectedSignatureTemplateId ? state.toolMode : 'select',
    })),

  addTextAnnotation: ({ pageIndex, xPct, yPct }) => {
    const sourcePdf = get().sourcePdf
    if (!sourcePdf || pageIndex < 0 || pageIndex >= sourcePdf.pageCount) {
      return null
    }

    const id = nanoid()
    const rect = clampRectPct({
      xPct: xPct - TEXT_DEFAULT_WIDTH_PCT / 2,
      yPct: yPct - TEXT_DEFAULT_HEIGHT_PCT / 2,
      widthPct: TEXT_DEFAULT_WIDTH_PCT,
      heightPct: TEXT_DEFAULT_HEIGHT_PCT,
    })

    set((state) => ({
      annotationsById: {
        ...state.annotationsById,
        [id]: {
          id,
          type: 'text',
          pageIndex,
          ...rect,
          text: 'New text',
          fontSize: 16,
          color: '#111111',
        },
      },
      annotationOrder: [...state.annotationOrder, id],
      selectedAnnotationId: id,
      toolMode: 'select',
    }))

    return id
  },

  updateTextAnnotation: ({ id, text, fontSize, color }) =>
    set((state) => {
      const annotation = state.annotationsById[id]
      if (!annotation || annotation.type !== 'text') {
        return state
      }

      return {
        annotationsById: {
          ...state.annotationsById,
          [id]: {
            ...annotation,
            text: typeof text === 'string' ? text : annotation.text,
            fontSize: typeof fontSize === 'number' ? fontSize : annotation.fontSize,
            color: typeof color === 'string' ? color : annotation.color,
          },
        },
      }
    }),

  placeSignature: ({ pageIndex, xPct, yPct, templateId }) => {
    const state = get()
    const sourcePdf = state.sourcePdf
    if (!sourcePdf || pageIndex < 0 || pageIndex >= sourcePdf.pageCount) {
      return null
    }

    const resolvedTemplateId = templateId ?? state.selectedSignatureTemplateId
    if (!resolvedTemplateId || !state.signatureTemplatesById[resolvedTemplateId]) {
      return null
    }

    const id = nanoid()
    const rect = clampRectPct({
      xPct: xPct - SIGNATURE_DEFAULT_WIDTH_PCT / 2,
      yPct: yPct - SIGNATURE_DEFAULT_HEIGHT_PCT / 2,
      widthPct: SIGNATURE_DEFAULT_WIDTH_PCT,
      heightPct: SIGNATURE_DEFAULT_HEIGHT_PCT,
    })

    set((nextState) => ({
      annotationsById: {
        ...nextState.annotationsById,
        [id]: {
          id,
          type: 'signature',
          pageIndex,
          ...rect,
          templateId: resolvedTemplateId,
        },
      },
      annotationOrder: [...nextState.annotationOrder, id],
      selectedAnnotationId: id,
      toolMode: 'select',
    }))

    return id
  },

  upsertAnnotationRect: ({ id, xPct, yPct, widthPct, heightPct }) =>
    set((state) => {
      const annotation = state.annotationsById[id]
      if (!annotation) {
        return state
      }

      const rect = clampRectPct({ xPct, yPct, widthPct, heightPct })
      return {
        annotationsById: {
          ...state.annotationsById,
          [id]: {
            ...annotation,
            ...rect,
          },
        },
      }
    }),

  deleteAnnotation: (id) =>
    set((state) => {
      if (!state.annotationsById[id]) {
        return state
      }

      const annotationsById = { ...state.annotationsById }
      delete annotationsById[id]

      const selectedAnnotationId =
        state.selectedAnnotationId === id ? null : state.selectedAnnotationId

      return {
        annotationsById,
        annotationOrder: state.annotationOrder.filter(
          (annotationId) => annotationId !== id,
        ),
        selectedAnnotationId,
      }
    }),

  copySignatureAnnotation: () =>
    set((state) => {
      if (!state.selectedAnnotationId) {
        return state
      }

      const annotation = state.annotationsById[state.selectedAnnotationId]
      if (!annotation || annotation.type !== 'signature') {
        return state
      }

      return {
        clipboard: {
          annotationSnapshot: annotation,
        },
      }
    }),

  pasteSignatureAnnotation: () => {
    const state = get()
    const snapshot = state.clipboard.annotationSnapshot

    if (!snapshot || !state.signatureTemplatesById[snapshot.templateId]) {
      return null
    }

    const id = nanoid()
    const rect = clampRectPct({
      xPct: snapshot.xPct + CLIPBOARD_OFFSET_PCT,
      yPct: snapshot.yPct + CLIPBOARD_OFFSET_PCT,
      widthPct: snapshot.widthPct,
      heightPct: snapshot.heightPct,
    })

    set((nextState) => ({
      annotationsById: {
        ...nextState.annotationsById,
        [id]: {
          ...snapshot,
          id,
          ...rect,
        },
      },
      annotationOrder: [...nextState.annotationOrder, id],
      selectedAnnotationId: id,
    }))

    return id
  },

  addSignatureTemplate: (imageDataUrl, name) => {
    const id = nanoid()
    const candidateName = name.trim()
    const createdAt = new Date().toISOString()

    set((state) => {
      const templateName =
        candidateName.length > 0
          ? candidateName
          : `Signature ${state.signatureTemplateOrder.length + 1}`

      const nextState: Partial<EditorState> = {
        signatureTemplatesById: {
          ...state.signatureTemplatesById,
          [id]: {
            id,
            name: templateName,
            imageDataUrl,
            createdAt,
          },
        },
        signatureTemplateOrder: [...state.signatureTemplateOrder, id],
        selectedSignatureTemplateId: id,
        toolMode: 'signature',
        isSignaturePadOpen: false,
      }

      withTemplatePersistence({
        ...state,
        ...nextState,
      } as EditorState)
      return nextState
    })

    return id
  },

  deleteSignatureTemplate: (templateId) =>
    set((state) => {
      if (!state.signatureTemplatesById[templateId]) {
        return state
      }

      const signatureTemplatesById = { ...state.signatureTemplatesById }
      delete signatureTemplatesById[templateId]

      const annotationsById = { ...state.annotationsById }
      const annotationOrder = state.annotationOrder.filter((annotationId) => {
        const annotation = state.annotationsById[annotationId]
        if (annotation?.type === 'signature' && annotation.templateId === templateId) {
          delete annotationsById[annotationId]
          return false
        }
        return true
      })

      const nextSelectedTemplateId =
        state.selectedSignatureTemplateId === templateId
          ? (state.signatureTemplateOrder.find((id) => id !== templateId) ?? null)
          : state.selectedSignatureTemplateId

      const nextState: Partial<EditorState> = {
        signatureTemplatesById,
        signatureTemplateOrder: state.signatureTemplateOrder.filter(
          (id) => id !== templateId,
        ),
        selectedSignatureTemplateId: nextSelectedTemplateId,
        annotationsById,
        annotationOrder,
      }

      withTemplatePersistence({
        ...state,
        ...nextState,
      } as EditorState)

      return nextState
    }),

  getSelectedAnnotation: () => {
    const state = get()
    if (!state.selectedAnnotationId) {
      return null
    }

    return state.annotationsById[state.selectedAnnotationId] ?? null
  },
}))
