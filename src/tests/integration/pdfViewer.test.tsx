import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { PdfViewer } from '@/features/pdf/PdfViewer'
import { useEditorStore } from '@/state/editorStore'

const { usePdfDocumentMock } = vi.hoisted(() => ({
  usePdfDocumentMock: vi.fn(),
}))

vi.mock('@/features/pdf/usePdfDocument', () => ({
  usePdfDocument: usePdfDocumentMock,
}))

vi.mock('@/features/pdf/PdfPageCanvas', () => ({
  PdfPageCanvas: ({ pageIndex }: { pageIndex: number }) => (
    <div data-testid="pdf-page-canvas">Page {pageIndex + 1}</div>
  ),
}))

const resetEditorStore = (): void => {
  useEditorStore.setState({
    sourcePdf: null,
    toolMode: 'select',
    zoom: 1,
    selectedAnnotationId: null,
    selectedSignatureTemplateId: null,
    annotationsById: {},
    annotationOrder: [],
    signatureTemplatesById: {},
    signatureTemplateOrder: [],
    clipboard: { annotationSnapshot: null },
    isSignaturePadOpen: false,
  })
}

describe('PdfViewer', () => {
  beforeEach(() => {
    resetEditorStore()
    usePdfDocumentMock.mockReset()
  })

  it('renders one page canvas per source pdf page', () => {
    useEditorStore.setState({
      sourcePdf: {
        fileName: 'multi.pdf',
        bytes: new Uint8Array([1, 2, 3]),
        pageCount: 3,
        pageSizes: [
          { width: 600, height: 800 },
          { width: 600, height: 800 },
          { width: 600, height: 800 },
        ],
      },
    })

    usePdfDocumentMock.mockReturnValue({
      status: 'ready',
      pdfDocument: { mock: true },
      error: null,
    })

    render(<PdfViewer />)

    expect(screen.getAllByTestId('pdf-page-canvas')).toHaveLength(3)
  })

  it('shows parse errors from pdf load hook', () => {
    useEditorStore.setState({
      sourcePdf: {
        fileName: 'bad.pdf',
        bytes: new Uint8Array([1]),
        pageCount: 1,
        pageSizes: [{ width: 600, height: 800 }],
      },
    })

    usePdfDocumentMock.mockReturnValue({
      status: 'error',
      pdfDocument: null,
      error: 'Invalid PDF file.',
    })

    render(<PdfViewer />)

    expect(screen.getByText(/PDF failed to load/i)).toBeInTheDocument()
    expect(screen.getByText(/Invalid PDF file\./i)).toBeInTheDocument()
  })
})
