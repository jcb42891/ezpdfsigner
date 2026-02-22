import type { Annotation, ToolMode } from '@/state/types'

export type AddTextAnnotationInput = {
  pageIndex: number
  xPct: number
  yPct: number
  widthPct?: number
  heightPct?: number
  text?: string
}

export type PlaceSignatureInput = {
  pageIndex: number
  xPct: number
  yPct: number
  templateId?: string
}

export type ResizeAnnotationInput = {
  id: string
  xPct: number
  yPct: number
  widthPct: number
  heightPct: number
}

export type UpdateTextInput = {
  id: string
  text?: string
  fontSize?: number
  color?: string
}

export type EditorActions = {
  setToolMode: (toolMode: ToolMode) => void
  setZoom: (zoom: number) => void
  setSelectedAnnotationId: (annotationId: string | null) => void
  setSelectedSignatureTemplateId: (templateId: string | null) => void
  openSignaturePad: () => void
  closeSignaturePad: () => void
  loadPdf: (params: {
    fileName: string
    bytes: Uint8Array
    pageCount: number
    pageSizes: { width: number; height: number }[]
  }) => void
  addTextAnnotation: (input: AddTextAnnotationInput) => string | null
  updateTextAnnotation: (input: UpdateTextInput) => void
  placeSignature: (input: PlaceSignatureInput) => string | null
  upsertAnnotationRect: (input: ResizeAnnotationInput) => void
  deleteAnnotation: (id: string) => void
  copySignatureAnnotation: () => void
  pasteSignatureAnnotation: () => string | null
  addSignatureTemplate: (imageDataUrl: string, name: string) => string
  deleteSignatureTemplate: (templateId: string) => void
  getSelectedAnnotation: () => Annotation | null
}
