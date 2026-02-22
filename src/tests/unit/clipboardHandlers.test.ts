import { handleEditorShortcuts } from '@/features/clipboard/clipboardHandlers'
import type { ToolMode } from '@/state/types'

const createHandlers = () => ({
  onCopySignature: vi.fn(),
  onPasteSignature: vi.fn(),
  onDeleteSelection: vi.fn(),
  onEscape: vi.fn(),
  onSetToolMode: vi.fn<(toolMode: ToolMode) => void>(),
})

const createKeyboardEvent = (key: string, init: KeyboardEventInit = {}): KeyboardEvent =>
  new KeyboardEvent('keydown', {
    key,
    cancelable: true,
    ...init,
  })

describe('handleEditorShortcuts', () => {
  it('switches tools with v/t/s hotkeys', () => {
    const handlers = createHandlers()

    const selectEvent = createKeyboardEvent('v')
    const selectHandled = handleEditorShortcuts(selectEvent, handlers)
    expect(selectHandled).toBe(true)
    expect(selectEvent.defaultPrevented).toBe(true)
    expect(handlers.onSetToolMode).toHaveBeenCalledWith('select')

    const textEvent = createKeyboardEvent('t')
    const textHandled = handleEditorShortcuts(textEvent, handlers)
    expect(textHandled).toBe(true)
    expect(textEvent.defaultPrevented).toBe(true)
    expect(handlers.onSetToolMode).toHaveBeenCalledWith('text')

    const signatureEvent = createKeyboardEvent('s')
    const signatureHandled = handleEditorShortcuts(signatureEvent, handlers)
    expect(signatureHandled).toBe(true)
    expect(signatureEvent.defaultPrevented).toBe(true)
    expect(handlers.onSetToolMode).toHaveBeenCalledWith('signature')
  })

  it('keeps ctrl+c / ctrl+v behavior without switching tools', () => {
    const handlers = createHandlers()

    const copyEvent = createKeyboardEvent('c', { ctrlKey: true })
    const copyHandled = handleEditorShortcuts(copyEvent, handlers)
    expect(copyHandled).toBe(true)
    expect(handlers.onCopySignature).toHaveBeenCalledTimes(1)

    const pasteEvent = createKeyboardEvent('v', { ctrlKey: true })
    const pasteHandled = handleEditorShortcuts(pasteEvent, handlers)
    expect(pasteHandled).toBe(true)
    expect(handlers.onPasteSignature).toHaveBeenCalledTimes(1)

    expect(handlers.onSetToolMode).not.toHaveBeenCalled()
  })

  it('ignores shortcuts while typing in editable elements', () => {
    const handlers = createHandlers()
    const target = document.createElement('input')
    const textEvent = createKeyboardEvent('t')

    Object.defineProperty(textEvent, 'target', {
      value: target,
      configurable: true,
    })

    const handled = handleEditorShortcuts(textEvent, handlers)
    expect(handled).toBe(false)
    expect(handlers.onSetToolMode).not.toHaveBeenCalled()
  })
})
