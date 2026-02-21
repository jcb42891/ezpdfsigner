import type { SignatureTemplate } from '@/state/types'

export const SIGNATURE_STORAGE_KEY = 'ezpdfsigner.signatureTemplates.v1'

const safeJsonParse = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export const sanitizeSignatureTemplate = (value: unknown): SignatureTemplate | null => {
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

export const parseSignatureTemplates = (rawValue: string | null): SignatureTemplate[] => {
  if (!rawValue) {
    return []
  }

  const parsed = safeJsonParse<unknown>(rawValue)
  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed
    .map((entry) => sanitizeSignatureTemplate(entry))
    .filter((entry): entry is SignatureTemplate => Boolean(entry))
}

export const readSignatureTemplates = (
  storage: Pick<Storage, 'getItem'> = localStorage,
): SignatureTemplate[] => parseSignatureTemplates(storage.getItem(SIGNATURE_STORAGE_KEY))

export const persistSignatureTemplates = (
  templates: SignatureTemplate[],
  storage: Pick<Storage, 'setItem'> = localStorage,
): void => {
  storage.setItem(SIGNATURE_STORAGE_KEY, JSON.stringify(templates))
}
