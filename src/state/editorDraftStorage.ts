import { sanitizeSignatureTemplate } from '@/state/signatureTemplateStorage'
import type {
  Annotation,
  AnnotationMap,
  PageSize,
  SignatureTemplateMap,
  SourcePdf,
  ToolMode,
} from '@/state/types'

const DRAFT_VERSION = 1

export const EDITOR_DRAFT_STORAGE_KEY = `ezpdfsigner.editorDraft.v${DRAFT_VERSION}`

const DRAFT_DB_NAME = 'ezpdfsigner'
const DRAFT_DB_VERSION = 1
const DRAFT_DB_STORE_NAME = 'drafts'
const DRAFT_DB_META_KEY = `editorDraft.meta.v${DRAFT_VERSION}`
const DRAFT_DB_BYTES_KEY = `editorDraft.bytes.v${DRAFT_VERSION}`

const DEFAULT_ZOOM = 1
const DEFAULT_TEXT_SIZE = 16

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const safeJsonParse = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

const sanitizeFiniteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const sanitizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const sanitized: string[] = []
  const seen = new Set<string>()

  value.forEach((entry) => {
    if (typeof entry !== 'string' || seen.has(entry)) {
      return
    }

    seen.add(entry)
    sanitized.push(entry)
  })

  return sanitized
}

const sanitizePageSize = (value: unknown): PageSize | null => {
  if (!isRecord(value)) {
    return null
  }

  const width = sanitizeFiniteNumber(value.width)
  const height = sanitizeFiniteNumber(value.height)

  if (width === null || height === null || width <= 0 || height <= 0) {
    return null
  }

  return {
    width,
    height,
  }
}

const sanitizeBytes = (value: unknown): Uint8Array | null => {
  if (value instanceof Uint8Array) {
    return value
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value)
  }

  if (!Array.isArray(value)) {
    return null
  }

  const numericValues: number[] = []

  for (const entry of value) {
    if (
      typeof entry !== 'number' ||
      !Number.isInteger(entry) ||
      entry < 0 ||
      entry > 255
    ) {
      return null
    }

    numericValues.push(entry)
  }

  return new Uint8Array(numericValues)
}

const sanitizeAnnotation = (
  value: unknown,
  pageCount: number,
): Annotation | null => {
  if (!isRecord(value)) {
    return null
  }

  const id = typeof value.id === 'string' ? value.id : null
  const type = value.type
  const pageIndex = sanitizeFiniteNumber(value.pageIndex)
  const xPct = sanitizeFiniteNumber(value.xPct)
  const yPct = sanitizeFiniteNumber(value.yPct)
  const widthPct = sanitizeFiniteNumber(value.widthPct)
  const heightPct = sanitizeFiniteNumber(value.heightPct)

  if (
    !id ||
    (type !== 'text' && type !== 'signature') ||
    pageIndex === null ||
    !Number.isInteger(pageIndex) ||
    pageIndex < 0 ||
    pageIndex >= pageCount ||
    xPct === null ||
    yPct === null ||
    widthPct === null ||
    heightPct === null
  ) {
    return null
  }

  if (type === 'text') {
    const text = typeof value.text === 'string' ? value.text : null
    const fontSize = sanitizeFiniteNumber(value.fontSize)
    const color = typeof value.color === 'string' ? value.color : null

    if (text === null || fontSize === null || color === null) {
      return null
    }

    return {
      id,
      type,
      pageIndex,
      xPct,
      yPct,
      widthPct,
      heightPct,
      text,
      fontSize,
      color,
    }
  }

  const templateId = typeof value.templateId === 'string' ? value.templateId : null

  if (!templateId) {
    return null
  }

  return {
    id,
    type,
    pageIndex,
    xPct,
    yPct,
    widthPct,
    heightPct,
    templateId,
  }
}

const sanitizeAnnotationMap = (
  value: unknown,
  pageCount: number,
): AnnotationMap => {
  if (!isRecord(value)) {
    return {}
  }

  const annotationsById: AnnotationMap = {}

  Object.values(value).forEach((entry) => {
    const annotation = sanitizeAnnotation(entry, pageCount)
    if (!annotation) {
      return
    }

    annotationsById[annotation.id] = annotation
  })

  return annotationsById
}

const sanitizeSignatureTemplateMap = (value: unknown): SignatureTemplateMap => {
  if (!isRecord(value)) {
    return {}
  }

  const templatesById: SignatureTemplateMap = {}

  Object.values(value).forEach((entry) => {
    const template = sanitizeSignatureTemplate(entry)
    if (!template) {
      return
    }

    templatesById[template.id] = template
  })

  return templatesById
}

const buildOrderedIds = (
  candidateOrder: unknown,
  valuesById: Record<string, unknown>,
): string[] => {
  const requestedOrder = sanitizeStringArray(candidateOrder)
  const validIds = new Set(Object.keys(valuesById))
  const seen = new Set<string>()
  const orderedIds: string[] = []

  requestedOrder.forEach((id) => {
    if (!validIds.has(id) || seen.has(id)) {
      return
    }

    seen.add(id)
    orderedIds.push(id)
  })

  validIds.forEach((id) => {
    if (seen.has(id)) {
      return
    }

    seen.add(id)
    orderedIds.push(id)
  })

  return orderedIds
}

const sanitizeToolMode = (value: unknown): ToolMode => {
  if (value === 'select' || value === 'text' || value === 'signature') {
    return value
  }

  return 'select'
}

const sanitizeSelectedId = (
  value: unknown,
  valuesById: Record<string, unknown>,
): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  return valuesById[value] ? value : null
}

const sanitizeSourcePdf = (
  sourcePdfValue: unknown,
  sourcePdfBytesValue: unknown,
): SourcePdf | null => {
  if (!isRecord(sourcePdfValue)) {
    return null
  }

  const fileName = typeof sourcePdfValue.fileName === 'string' ? sourcePdfValue.fileName : null
  const pageCount = sanitizeFiniteNumber(sourcePdfValue.pageCount)
  const pageSizesRaw = Array.isArray(sourcePdfValue.pageSizes)
    ? sourcePdfValue.pageSizes
    : null

  if (
    !fileName ||
    pageCount === null ||
    !Number.isInteger(pageCount) ||
    pageCount <= 0 ||
    !pageSizesRaw
  ) {
    return null
  }

  const pageSizes = pageSizesRaw
    .map((entry) => sanitizePageSize(entry))
    .filter((entry): entry is PageSize => Boolean(entry))

  if (pageSizes.length !== pageCount) {
    return null
  }

  const bytes = sanitizeBytes(sourcePdfBytesValue)
  if (!bytes) {
    return null
  }

  return {
    fileName,
    bytes,
    pageCount,
    pageSizes,
  }
}

const encodeBytesToBase64 = (bytes: Uint8Array): string | null => {
  if (typeof globalThis.btoa !== 'function') {
    return null
  }

  const chunkSize = 0x8000
  let binary = ''

  for (let startIndex = 0; startIndex < bytes.length; startIndex += chunkSize) {
    const chunk = bytes.subarray(startIndex, startIndex + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return globalThis.btoa(binary)
}

const decodeBase64ToBytes = (encodedValue: string): Uint8Array | null => {
  if (typeof globalThis.atob !== 'function') {
    return null
  }

  try {
    const binary = globalThis.atob(encodedValue)
    const bytes = new Uint8Array(binary.length)

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }

    return bytes
  } catch {
    return null
  }
}

type PersistedDraftMeta = {
  version: number
  sourcePdf: {
    fileName: string
    pageCount: number
    pageSizes: PageSize[]
  }
  toolMode: ToolMode
  zoom: number
  defaultTextFontSize: number
  selectedAnnotationId: string | null
  selectedSignatureTemplateId: string | null
  annotationsById: AnnotationMap
  annotationOrder: string[]
  signatureTemplatesById: SignatureTemplateMap
  signatureTemplateOrder: string[]
}

type PersistedDraftLocalStorage = PersistedDraftMeta & {
  sourcePdfBytesBase64: string
}

export type EditorDraftSnapshot = Omit<PersistedDraftMeta, 'version'> & {
  sourcePdf: SourcePdf
}

const serializeDraftMeta = (draft: EditorDraftSnapshot): PersistedDraftMeta => ({
  version: DRAFT_VERSION,
  sourcePdf: {
    fileName: draft.sourcePdf.fileName,
    pageCount: draft.sourcePdf.pageCount,
    pageSizes: draft.sourcePdf.pageSizes,
  },
  toolMode: draft.toolMode,
  zoom: draft.zoom,
  defaultTextFontSize: draft.defaultTextFontSize,
  selectedAnnotationId: draft.selectedAnnotationId,
  selectedSignatureTemplateId: draft.selectedSignatureTemplateId,
  annotationsById: draft.annotationsById,
  annotationOrder: draft.annotationOrder,
  signatureTemplatesById: draft.signatureTemplatesById,
  signatureTemplateOrder: draft.signatureTemplateOrder,
})

export const parseEditorDraftPayload = (
  rawMetaValue: unknown,
  rawBytesValue: unknown,
): EditorDraftSnapshot | null => {
  if (!isRecord(rawMetaValue) || rawMetaValue.version !== DRAFT_VERSION) {
    return null
  }

  const sourcePdf = sanitizeSourcePdf(rawMetaValue.sourcePdf, rawBytesValue)
  if (!sourcePdf) {
    return null
  }

  const signatureTemplatesById = sanitizeSignatureTemplateMap(
    rawMetaValue.signatureTemplatesById,
  )
  const signatureTemplateOrder = buildOrderedIds(
    rawMetaValue.signatureTemplateOrder,
    signatureTemplatesById,
  )

  const annotationsById = sanitizeAnnotationMap(
    rawMetaValue.annotationsById,
    sourcePdf.pageCount,
  )

  Object.values(annotationsById).forEach((annotation) => {
    if (
      annotation.type === 'signature' &&
      !signatureTemplatesById[annotation.templateId]
    ) {
      delete annotationsById[annotation.id]
    }
  })

  const annotationOrder = buildOrderedIds(rawMetaValue.annotationOrder, annotationsById)

  const selectedAnnotationId = sanitizeSelectedId(
    rawMetaValue.selectedAnnotationId,
    annotationsById,
  )

  const selectedSignatureTemplateId = sanitizeSelectedId(
    rawMetaValue.selectedSignatureTemplateId,
    signatureTemplatesById,
  )

  const toolMode = sanitizeToolMode(rawMetaValue.toolMode)
  const zoom = sanitizeFiniteNumber(rawMetaValue.zoom)
  const defaultTextFontSize = sanitizeFiniteNumber(rawMetaValue.defaultTextFontSize)

  return {
    sourcePdf,
    toolMode,
    zoom: zoom && zoom > 0 ? zoom : DEFAULT_ZOOM,
    defaultTextFontSize:
      defaultTextFontSize && defaultTextFontSize > 0
        ? defaultTextFontSize
        : DEFAULT_TEXT_SIZE,
    selectedAnnotationId,
    selectedSignatureTemplateId,
    annotationsById,
    annotationOrder,
    signatureTemplatesById,
    signatureTemplateOrder,
  }
}

const readDraftFromLocalStorage = (): EditorDraftSnapshot | null => {
  try {
    const rawValue = localStorage.getItem(EDITOR_DRAFT_STORAGE_KEY)
    if (!rawValue) {
      return null
    }

    const parsedValue = safeJsonParse<unknown>(rawValue)
    if (!isRecord(parsedValue)) {
      return null
    }

    const rawBytesBase64 =
      typeof parsedValue.sourcePdfBytesBase64 === 'string'
        ? parsedValue.sourcePdfBytesBase64
        : null

    const bytes = rawBytesBase64 ? decodeBase64ToBytes(rawBytesBase64) : null
    if (!bytes) {
      return null
    }

    return parseEditorDraftPayload(parsedValue, bytes)
  } catch {
    return null
  }
}

const persistDraftToLocalStorage = (draft: EditorDraftSnapshot): void => {
  const bytesBase64 = encodeBytesToBase64(draft.sourcePdf.bytes)
  if (!bytesBase64) {
    return
  }

  const payload: PersistedDraftLocalStorage = {
    ...serializeDraftMeta(draft),
    sourcePdfBytesBase64: bytesBase64,
  }

  try {
    localStorage.setItem(EDITOR_DRAFT_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore quota/storage availability errors.
  }
}

const clearDraftFromLocalStorage = (): void => {
  try {
    localStorage.removeItem(EDITOR_DRAFT_STORAGE_KEY)
  } catch {
    // Ignore storage availability errors.
  }
}

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })

const transactionToPromise = (transaction: IDBTransaction): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve()
    }

    transaction.onerror = () => {
      reject(transaction.error)
    }

    transaction.onabort = () => {
      reject(transaction.error)
    }
  })

let openDraftDbPromise: Promise<IDBDatabase | null> | null = null
let lastPersistedSourcePdfRef: SourcePdf | null = null

const openDraftDb = (): Promise<IDBDatabase | null> => {
  if (openDraftDbPromise) {
    return openDraftDbPromise
  }

  if (!globalThis.indexedDB) {
    return Promise.resolve(null)
  }

  openDraftDbPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const request = globalThis.indexedDB.open(DRAFT_DB_NAME, DRAFT_DB_VERSION)

      request.onupgradeneeded = () => {
        const draftDb = request.result

        if (!draftDb.objectStoreNames.contains(DRAFT_DB_STORE_NAME)) {
          draftDb.createObjectStore(DRAFT_DB_STORE_NAME)
        }
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        resolve(null)
      }

      request.onblocked = () => {
        resolve(null)
      }
    } catch {
      resolve(null)
    }
  })

  return openDraftDbPromise
}

const readDraftFromIndexedDb = async (): Promise<EditorDraftSnapshot | null> => {
  const draftDb = await openDraftDb()
  if (!draftDb) {
    return null
  }

  try {
    const transaction = draftDb.transaction(DRAFT_DB_STORE_NAME, 'readonly')
    const store = transaction.objectStore(DRAFT_DB_STORE_NAME)

    const rawMetaValue = await requestToPromise(store.get(DRAFT_DB_META_KEY))
    const rawBytesValue = await requestToPromise(store.get(DRAFT_DB_BYTES_KEY))

    await transactionToPromise(transaction)

    if (!rawMetaValue || !rawBytesValue) {
      return null
    }

    return parseEditorDraftPayload(rawMetaValue, rawBytesValue)
  } catch {
    return null
  }
}

const persistDraftToIndexedDb = async (
  draft: EditorDraftSnapshot,
): Promise<boolean> => {
  const draftDb = await openDraftDb()
  if (!draftDb) {
    return false
  }
  const shouldWritePdfBytes = draft.sourcePdf !== lastPersistedSourcePdfRef

  try {
    const transaction = draftDb.transaction(DRAFT_DB_STORE_NAME, 'readwrite')
    const store = transaction.objectStore(DRAFT_DB_STORE_NAME)

    store.put(serializeDraftMeta(draft), DRAFT_DB_META_KEY)

    if (shouldWritePdfBytes) {
      store.put(draft.sourcePdf.bytes, DRAFT_DB_BYTES_KEY)
    }

    await transactionToPromise(transaction)

    lastPersistedSourcePdfRef = draft.sourcePdf
    return true
  } catch {
    return false
  }
}

const clearDraftFromIndexedDb = async (): Promise<boolean> => {
  const draftDb = await openDraftDb()
  if (!draftDb) {
    return false
  }

  try {
    const transaction = draftDb.transaction(DRAFT_DB_STORE_NAME, 'readwrite')
    const store = transaction.objectStore(DRAFT_DB_STORE_NAME)

    store.delete(DRAFT_DB_META_KEY)
    store.delete(DRAFT_DB_BYTES_KEY)

    await transactionToPromise(transaction)

    lastPersistedSourcePdfRef = null
    return true
  } catch {
    return false
  }
}

export const readEditorDraft = async (): Promise<EditorDraftSnapshot | null> => {
  const indexedDbDraft = await readDraftFromIndexedDb()
  if (indexedDbDraft) {
    lastPersistedSourcePdfRef = indexedDbDraft.sourcePdf
    return indexedDbDraft
  }

  const localStorageDraft = readDraftFromLocalStorage()
  if (localStorageDraft) {
    lastPersistedSourcePdfRef = localStorageDraft.sourcePdf
  }

  return localStorageDraft
}

export const persistEditorDraft = async (
  draft: EditorDraftSnapshot,
): Promise<void> => {
  const persistedInIndexedDb = await persistDraftToIndexedDb(draft)

  if (persistedInIndexedDb) {
    clearDraftFromLocalStorage()
    return
  }

  persistDraftToLocalStorage(draft)
  lastPersistedSourcePdfRef = draft.sourcePdf
}

export const clearEditorDraft = async (): Promise<void> => {
  await clearDraftFromIndexedDb()
  clearDraftFromLocalStorage()
  lastPersistedSourcePdfRef = null
}
