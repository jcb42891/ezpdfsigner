export type ToolMode = 'select' | 'text' | 'signature'

export type PageSize = {
  width: number
  height: number
}

export type SourcePdf = {
  fileName: string
  bytes: Uint8Array
  pageCount: number
  pageSizes: PageSize[]
}

export type SignatureTemplate = {
  id: string
  name: string
  imageDataUrl: string
  createdAt: string
}

export type BaseAnnotation = {
  id: string
  pageIndex: number
  xPct: number
  yPct: number
  widthPct: number
  heightPct: number
}

export type TextAnnotation = BaseAnnotation & {
  type: 'text'
  text: string
  fontSize: number
  color: string
}

export type SignatureAnnotation = BaseAnnotation & {
  type: 'signature'
  templateId: string
}

export type Annotation = TextAnnotation | SignatureAnnotation

export type AnnotationMap = Record<string, Annotation>
export type SignatureTemplateMap = Record<string, SignatureTemplate>
