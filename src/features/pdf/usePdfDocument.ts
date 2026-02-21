import { useEffect, useMemo, useState } from 'react'
import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { PageSize } from '@/state/types'
import '@/features/pdf/pdfWorker'

type PdfDocumentState = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  pdfDocument: PDFDocumentProxy | null
  error: string | null
}

export const readPdfMetadata = async (
  bytes: Uint8Array,
): Promise<{ pageCount: number; pageSizes: PageSize[] }> => {
  const loadingTask = getDocument({ data: bytes })
  const pdfDocument = await loadingTask.promise

  try {
    const pageSizes: PageSize[] = []
    for (let pageIndex = 0; pageIndex < pdfDocument.numPages; pageIndex += 1) {
      const page = await pdfDocument.getPage(pageIndex + 1)
      const viewport = page.getViewport({ scale: 1 })
      pageSizes.push({ width: viewport.width, height: viewport.height })
    }

    return {
      pageCount: pdfDocument.numPages,
      pageSizes,
    }
  } finally {
    await pdfDocument.destroy()
    await loadingTask.destroy()
  }
}

export const usePdfDocument = (bytes: Uint8Array | null): PdfDocumentState => {
  const [state, setState] = useState<PdfDocumentState>({
    status: 'idle',
    pdfDocument: null,
    error: null,
  })

  useEffect(() => {
    if (!bytes) {
      setState({
        status: 'idle',
        pdfDocument: null,
        error: null,
      })
      return
    }

    let canceled = false
    let activeDocument: PDFDocumentProxy | null = null
    const loadingTask = getDocument({ data: bytes })

    setState({
      status: 'loading',
      pdfDocument: null,
      error: null,
    })

    loadingTask.promise
      .then((pdfDocument) => {
        if (canceled) {
          void pdfDocument.destroy()
          return
        }

        activeDocument = pdfDocument
        setState({
          status: 'ready',
          pdfDocument,
          error: null,
        })
      })
      .catch((error: unknown) => {
        if (canceled) {
          return
        }

        setState({
          status: 'error',
          pdfDocument: null,
          error: error instanceof Error ? error.message : 'Failed to load PDF.',
        })
      })

    return () => {
      canceled = true
      if (activeDocument) {
        void activeDocument.destroy()
      }
      void loadingTask.destroy()
    }
  }, [bytes])

  return useMemo(() => state, [state])
}
