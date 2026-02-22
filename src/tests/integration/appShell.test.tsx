import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { TEXT_DEFAULT_FONT_SIZE, useEditorStore } from '@/state/editorStore'

const resetEditorStore = (): void => {
  useEditorStore.setState({
    sourcePdf: null,
    toolMode: 'select',
    zoom: 1,
    defaultTextFontSize: TEXT_DEFAULT_FONT_SIZE,
    hasRecoveredDraftNotice: false,
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

describe('app shell', () => {
  beforeEach(() => {
    localStorage.clear()
    resetEditorStore()
  })

  it('renders empty-state prompt before loading a PDF', () => {
    render(<App />)

    expect(screen.getByText(/Open a PDF to start editing/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Upload PDF/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Default text size/i)).toBeInTheDocument()
  })

  it('shows recovered draft banner and lets user discard it', async () => {
    useEditorStore.setState({
      sourcePdf: {
        fileName: 'recovered.pdf',
        bytes: new Uint8Array([37, 80, 68, 70]),
        pageCount: 1,
        pageSizes: [{ width: 600, height: 800 }],
      },
      hasRecoveredDraftNotice: true,
      annotationOrder: ['text-1'],
      annotationsById: {
        'text-1': {
          id: 'text-1',
          type: 'text',
          pageIndex: 0,
          xPct: 0.2,
          yPct: 0.2,
          widthPct: 0.2,
          heightPct: 0.05,
          text: 'Approved',
          fontSize: 16,
          color: '#111111',
        },
      },
    })

    const user = userEvent.setup()
    render(<App />)

    expect(
      screen.getByText(/Recovered your last draft from this browser\./i),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Discard draft/i }))

    expect(
      screen.queryByText(/Recovered your last draft from this browser\./i),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/No PDF loaded/i)).toBeInTheDocument()
    expect(useEditorStore.getState().annotationOrder).toHaveLength(0)
  })
})
