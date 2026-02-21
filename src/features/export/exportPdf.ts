import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { hexToRgb, toPdfRect } from '@/features/export/pdfCoordinateMap'
import type { Annotation, SignatureTemplateMap, SourcePdf } from '@/state/types'

type ExportPdfInput = {
  sourcePdf: SourcePdf
  annotations: Annotation[]
  signatureTemplatesById: SignatureTemplateMap
}

export const buildExportPdf = async ({
  sourcePdf,
  annotations,
  signatureTemplatesById,
}: ExportPdfInput): Promise<Uint8Array> => {
  const pdfDocument = await PDFDocument.load(sourcePdf.bytes)
  const textFont = await pdfDocument.embedFont(StandardFonts.Helvetica)
  const embeddedSignatureImages = new Map<
    string,
    Awaited<ReturnType<typeof pdfDocument.embedPng>>
  >()

  for (const annotation of annotations) {
    const page = pdfDocument.getPage(annotation.pageIndex)
    if (!page) {
      continue
    }

    const pageSize = page.getSize()
    const rect = toPdfRect(annotation, pageSize.width, pageSize.height)

    if (annotation.type === 'text') {
      const textLines = annotation.text.split('\n')
      const lineHeight = annotation.fontSize * 1.2
      const color = hexToRgb(annotation.color)

      textLines.forEach((line, index) => {
        const y = rect.y + rect.height - annotation.fontSize - index * lineHeight
        if (y < rect.y) {
          return
        }

        page.drawText(line, {
          x: rect.x + 2,
          y,
          size: annotation.fontSize,
          font: textFont,
          color: rgb(color.r, color.g, color.b),
        })
      })
      continue
    }

    const template = signatureTemplatesById[annotation.templateId]
    if (!template) {
      continue
    }

    if (!embeddedSignatureImages.has(template.id)) {
      const image = await pdfDocument.embedPng(template.imageDataUrl)
      embeddedSignatureImages.set(template.id, image)
    }

    const signatureImage = embeddedSignatureImages.get(template.id)
    if (!signatureImage) {
      continue
    }

    page.drawImage(signatureImage, {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    })
  }

  return pdfDocument.save()
}

export const buildOutputFileName = (inputFileName: string): string => {
  const sanitizedInput = inputFileName
    .trim()
    .split('')
    .map((character) => {
      const isReserved = '<>:"/\\|?*'.includes(character)
      const isControlCharacter = character.charCodeAt(0) < 32
      return isReserved || isControlCharacter ? '_' : character
    })
    .join('')
  if (sanitizedInput.toLowerCase().endsWith('.pdf')) {
    return `${sanitizedInput.slice(0, -4)}-signed.pdf`
  }

  return `${sanitizedInput}-signed.pdf`
}
