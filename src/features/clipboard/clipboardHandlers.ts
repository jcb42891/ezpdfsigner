import { isEditableElement } from '@/utils/guards'
import type { ToolMode } from '@/state/types'

type ShortcutHandlers = {
  onCopySignature: () => void
  onPasteSignature: () => void
  onDeleteSelection: () => void
  onEscape: () => void
  onSetToolMode: (toolMode: ToolMode) => void
}

export const handleEditorShortcuts = (
  event: KeyboardEvent,
  handlers: ShortcutHandlers,
): boolean => {
  if (isEditableElement(event.target)) {
    return false
  }

  if ((event.key === 'Delete' || event.key === 'Backspace') && !event.metaKey) {
    handlers.onDeleteSelection()
    event.preventDefault()
    return true
  }

  if (event.key === 'Escape') {
    handlers.onEscape()
    event.preventDefault()
    return true
  }

  if (event.ctrlKey || event.metaKey) {
    const lowerKey = event.key.toLowerCase()

    if (lowerKey === 'c') {
      handlers.onCopySignature()
      event.preventDefault()
      return true
    }

    if (lowerKey === 'v') {
      handlers.onPasteSignature()
      event.preventDefault()
      return true
    }
  }

  if (!event.ctrlKey && !event.metaKey && !event.altKey) {
    const lowerKey = event.key.toLowerCase()
    const toolModeByHotkey: Record<string, ToolMode> = {
      v: 'select',
      t: 'text',
      s: 'signature',
    }
    const nextToolMode = toolModeByHotkey[lowerKey]
    if (nextToolMode) {
      handlers.onSetToolMode(nextToolMode)
      event.preventDefault()
      return true
    }
  }

  return false
}
