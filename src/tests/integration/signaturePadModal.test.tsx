import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { SignaturePadModal } from '@/features/signature/SignaturePadModal'
import { useEditorStore } from '@/state/editorStore'

const signaturePadMocks = vi.hoisted(() => {
  const constructorSpy = vi.fn()
  const clear = vi.fn()
  const isEmpty = vi.fn().mockReturnValue(false)
  const toDataURL = vi
    .fn()
    .mockReturnValue(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==',
    )
  const off = vi.fn()

  class MockSignaturePad {
    constructor(canvas: HTMLCanvasElement, options: unknown) {
      constructorSpy(canvas, options)
    }

    clear = clear
    isEmpty = isEmpty
    toDataURL = toDataURL
    off = off
  }

  return {
    MockSignaturePad,
    constructorSpy,
    clear,
    isEmpty,
    toDataURL,
    off,
  }
})

vi.mock('signature_pad', () => ({
  default: signaturePadMocks.MockSignaturePad,
}))

const resetEditorStore = (): void => {
  useEditorStore.setState({
    sourcePdf: null,
    toolMode: 'select',
    zoom: 1,
    defaultTextFontSize: 16,
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

describe('SignaturePadModal', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(() => ({
        scale: vi.fn(),
      })),
    })
  })

  beforeEach(() => {
    localStorage.clear()
    resetEditorStore()
    signaturePadMocks.constructorSpy.mockClear()
    signaturePadMocks.clear.mockClear()
    signaturePadMocks.isEmpty.mockReturnValue(false)
    signaturePadMocks.toDataURL.mockClear()
    signaturePadMocks.off.mockClear()
  })

  it('saves a drawn signature template and closes modal', async () => {
    useEditorStore.setState({ isSignaturePadOpen: true })

    const user = userEvent.setup()
    render(<SignaturePadModal />)

    expect(signaturePadMocks.constructorSpy).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      expect.objectContaining({
        backgroundColor: 'rgba(0,0,0,0)',
      }),
    )

    await user.type(screen.getByLabelText(/Signature name/i), 'Test Sig')
    await user.click(screen.getByRole('button', { name: /Save Signature/i }))

    const state = useEditorStore.getState()
    expect(state.signatureTemplateOrder).toHaveLength(1)
    const templateId = state.signatureTemplateOrder[0]
    expect(templateId).toBeDefined()

    const template = state.signatureTemplatesById[templateId as string]
    expect(template?.name).toBe('Test Sig')
    expect(state.isSignaturePadOpen).toBe(false)
  })

  it('shows validation error when signature pad is empty', async () => {
    signaturePadMocks.isEmpty.mockReturnValue(true)
    useEditorStore.setState({ isSignaturePadOpen: true })

    const user = userEvent.setup()
    render(<SignaturePadModal />)

    await user.click(screen.getByRole('button', { name: /Save Signature/i }))

    expect(screen.getByText(/Draw your signature before saving/i)).toBeInTheDocument()
  })
})
