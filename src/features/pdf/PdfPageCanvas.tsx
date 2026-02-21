import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { AnnotationLayer } from '@/features/annotations/AnnotationLayer'

type Props = {
  pdfDocument: PDFDocumentProxy
  pageIndex: number
  zoom: number
}

type RenderState = {
  width: number
  height: number
  status: 'loading' | 'ready' | 'error'
}

export const PdfPageCanvas = ({ pdfDocument, pageIndex, zoom }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [renderState, setRenderState] = useState<RenderState>({
    width: 1,
    height: 1,
    status: 'loading',
  })

  useEffect(() => {
    let canceled = false
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | null = null

    const renderPage = async () => {
      try {
        setRenderState((prev) => ({ ...prev, status: 'loading' }))
        const page = await pdfDocument.getPage(pageIndex + 1)
        if (canceled) {
          return
        }

        const viewport = page.getViewport({ scale: zoom })
        const canvas = canvasRef.current
        if (!canvas) {
          return
        }

        const outputScale = window.devicePixelRatio || 1
        const context = canvas.getContext('2d')
        if (!context) {
          throw new Error('Canvas rendering context unavailable.')
        }

        canvas.width = Math.floor(viewport.width * outputScale)
        canvas.height = Math.floor(viewport.height * outputScale)
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`

        setRenderState({
          width: viewport.width,
          height: viewport.height,
          status: 'loading',
        })

        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform:
            outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
        })
        await renderTask.promise

        if (!canceled) {
          setRenderState({
            width: viewport.width,
            height: viewport.height,
            status: 'ready',
          })
        }
      } catch {
        if (!canceled) {
          setRenderState((prev) => ({ ...prev, status: 'error' }))
        }
      }
    }

    void renderPage()

    return () => {
      canceled = true
      renderTask?.cancel()
    }
  }, [pageIndex, pdfDocument, zoom])

  return (
    <section className="pdf-page-shell">
      <div className="pdf-page-label">Page {pageIndex + 1}</div>
      <div
        className="pdf-page-canvas-wrapper"
        style={{
          width: `${renderState.width}px`,
          height: `${renderState.height}px`,
        }}
      >
        <canvas ref={canvasRef} className="pdf-page-canvas" />
        {renderState.status === 'ready' ? (
          <AnnotationLayer
            pageIndex={pageIndex}
            pageWidthPx={renderState.width}
            pageHeightPx={renderState.height}
            zoom={zoom}
          />
        ) : null}
      </div>
      {renderState.status === 'error' ? (
        <p className="pdf-page-error">Failed to render page {pageIndex + 1}.</p>
      ) : null}
    </section>
  )
}
