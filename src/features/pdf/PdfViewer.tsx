import { useEffect, useRef } from 'react'
import { PdfPageCanvas } from '@/features/pdf/PdfPageCanvas'
import { usePdfDocument } from '@/features/pdf/usePdfDocument'
import { useEditorStore } from '@/state/editorStore'

const WHEEL_ZOOM_STEP = 0.1

export const PdfViewer = () => {
  const sourcePdf = useEditorStore((state) => state.sourcePdf)
  const zoom = useEditorStore((state) => state.zoom)
  const setZoom = useEditorStore((state) => state.setZoom)
  const { status, pdfDocument, error } = usePdfDocument(sourcePdf?.bytes ?? null)
  const viewerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const viewerElement = viewerRef.current
    if (!viewerElement) {
      return
    }

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return
      }

      if (event.deltaY === 0) {
        return
      }

      event.preventDefault()
      const zoomDelta = event.deltaY < 0 ? WHEEL_ZOOM_STEP : -WHEEL_ZOOM_STEP
      setZoom(useEditorStore.getState().zoom + zoomDelta)
    }

    viewerElement.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      viewerElement.removeEventListener('wheel', onWheel)
    }
  }, [setZoom, sourcePdf, status, pdfDocument])

  if (!sourcePdf) {
    return (
      <section className="viewer-empty-state">
        <h2>Open a PDF to start editing</h2>
        <p>Use the upload button above to load a local PDF.</p>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="viewer-empty-state">
        <h2>PDF failed to load</h2>
        <p>{error ?? 'Try re-uploading the file.'}</p>
      </section>
    )
  }

  if (status === 'loading' || !pdfDocument) {
    return (
      <section className="viewer-empty-state">
        <h2>Loading PDF</h2>
        <p>Preparing {sourcePdf.fileName}...</p>
      </section>
    )
  }

  return (
    <section ref={viewerRef} className="pdf-viewer">
      {Array.from({ length: sourcePdf.pageCount }, (_, pageIndex) => (
        <PdfPageCanvas
          key={`page-${pageIndex}`}
          pdfDocument={pdfDocument}
          pageIndex={pageIndex}
          zoom={zoom}
        />
      ))}
    </section>
  )
}
