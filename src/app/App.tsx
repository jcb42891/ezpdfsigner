import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppLayout } from '@/app/AppLayout'
import { StatusBar } from '@/app/StatusBar'
import { Toolbar } from '@/app/Toolbar'
import { handleEditorShortcuts } from '@/features/clipboard/clipboardHandlers'
import { buildExportPdf, buildOutputFileName } from '@/features/export/exportPdf'
import { PdfViewer } from '@/features/pdf/PdfViewer'
import { readPdfMetadata } from '@/features/pdf/usePdfDocument'
import { SignaturePadModal } from '@/features/signature/SignaturePadModal'
import { SignaturePanel } from '@/features/signature/SignaturePanel'
import { useEditorStore } from '@/state/editorStore'
import type { Annotation, ToolMode } from '@/state/types'
import { triggerFileDownload } from '@/utils/download'

export const App = () => {
  const [loadError, setLoadError] = useState<string | null>(null)
  const [exportStatus, setExportStatus] = useState<'idle' | 'working' | 'error'>('idle')

  const sourcePdf = useEditorStore((state) => state.sourcePdf)
  const annotationOrder = useEditorStore((state) => state.annotationOrder)
  const annotationsById = useEditorStore((state) => state.annotationsById)
  const signatureTemplatesById = useEditorStore((state) => state.signatureTemplatesById)
  const selectedAnnotationId = useEditorStore((state) => state.selectedAnnotationId)
  const loadPdf = useEditorStore((state) => state.loadPdf)
  const deleteAnnotation = useEditorStore((state) => state.deleteAnnotation)
  const copySignatureAnnotation = useEditorStore((state) => state.copySignatureAnnotation)
  const pasteSignatureAnnotation = useEditorStore(
    (state) => state.pasteSignatureAnnotation,
  )
  const setSelectedAnnotationId = useEditorStore((state) => state.setSelectedAnnotationId)
  const setToolMode = useEditorStore((state) => state.setToolMode)
  const closeSignaturePad = useEditorStore((state) => state.closeSignaturePad)

  const annotations = useMemo(
    () =>
      annotationOrder
        .map((id) => annotationsById[id])
        .filter((annotation): annotation is Annotation => Boolean(annotation)),
    [annotationOrder, annotationsById],
  )

  const loadFile = useCallback(
    async (file: File): Promise<void> => {
      setLoadError(null)
      try {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
          throw new Error('Please select a .pdf file.')
        }

        const bytes = new Uint8Array(await file.arrayBuffer())
        const metadata = await readPdfMetadata(bytes)

        loadPdf({
          fileName: file.name,
          bytes,
          pageCount: metadata.pageCount,
          pageSizes: metadata.pageSizes,
        })
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Failed to load PDF.')
      }
    },
    [loadPdf],
  )

  const exportPdf = useCallback(async (): Promise<void> => {
    if (!sourcePdf) {
      return
    }

    setExportStatus('working')
    try {
      const fileBytes = await buildExportPdf({
        sourcePdf,
        annotations,
        signatureTemplatesById,
      })
      triggerFileDownload(fileBytes, buildOutputFileName(sourcePdf.fileName))
      setExportStatus('idle')
    } catch {
      setExportStatus('error')
    }
  }, [annotations, signatureTemplatesById, sourcePdf])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      handleEditorShortcuts(event, {
        onCopySignature: () => {
          return copySignatureAnnotation()
        },
        onPasteSignature: () => {
          return pasteSignatureAnnotation() !== null
        },
        onDeleteSelection: () => {
          if (!selectedAnnotationId) {
            return
          }
          deleteAnnotation(selectedAnnotationId)
        },
        onEscape: () => {
          setSelectedAnnotationId(null)
          closeSignaturePad()
        },
        onSetToolMode: (toolMode: ToolMode) => {
          if (!sourcePdf) {
            return
          }

          setToolMode(toolMode)
        },
      })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [
    closeSignaturePad,
    copySignatureAnnotation,
    deleteAnnotation,
    pasteSignatureAnnotation,
    setToolMode,
    selectedAnnotationId,
    setSelectedAnnotationId,
    sourcePdf,
  ])

  return (
    <>
      <AppLayout
        toolbar={
          <Toolbar
            onFileSelected={(file) => {
              void loadFile(file)
            }}
            onExport={() => {
              void exportPdf()
            }}
            exportStatus={exportStatus}
          />
        }
        sidebar={<SignaturePanel />}
        statusBar={<StatusBar />}
      >
        <section
          className="viewer-dropzone"
          onDragOver={(event) => {
            event.preventDefault()
          }}
          onDrop={(event) => {
            event.preventDefault()
            const file = event.dataTransfer.files?.[0]
            if (!file) {
              return
            }
            void loadFile(file)
          }}
        >
          {loadError ? <p className="banner-error">{loadError}</p> : null}
          {exportStatus === 'error' ? (
            <p className="banner-error">Export failed. Please try again.</p>
          ) : null}
          <PdfViewer />
        </section>
      </AppLayout>
      <SignaturePadModal />
    </>
  )
}
