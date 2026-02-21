import { PdfPageCanvas } from '@/features/pdf/PdfPageCanvas'
import { usePdfDocument } from '@/features/pdf/usePdfDocument'
import { useEditorStore } from '@/state/editorStore'

export const PdfViewer = () => {
  const sourcePdf = useEditorStore((state) => state.sourcePdf)
  const zoom = useEditorStore((state) => state.zoom)
  const { status, pdfDocument, error } = usePdfDocument(sourcePdf?.bytes ?? null)

  if (!sourcePdf) {
    return (
      <section className="viewer-empty-state">
        <h2>Open a PDF to start editing</h2>
        <p>Use the upload button above to load a local PDF.</p>
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

  if (status === 'error') {
    return (
      <section className="viewer-empty-state">
        <h2>PDF failed to load</h2>
        <p>{error ?? 'Try re-uploading the file.'}</p>
      </section>
    )
  }

  return (
    <section className="pdf-viewer">
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
