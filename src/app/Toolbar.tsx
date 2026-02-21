import { useRef } from 'react'
import { useEditorStore } from '@/state/editorStore'

type Props = {
  onFileSelected: (file: File) => void
  onExport: () => void
  exportStatus: 'idle' | 'working' | 'error'
}

export const Toolbar = ({ onFileSelected, onExport, exportStatus }: Props) => {
  const sourcePdf = useEditorStore((state) => state.sourcePdf)
  const toolMode = useEditorStore((state) => state.toolMode)
  const zoom = useEditorStore((state) => state.zoom)
  const setToolMode = useEditorStore((state) => state.setToolMode)
  const setZoom = useEditorStore((state) => state.setZoom)
  const openSignaturePad = useEditorStore((state) => state.openSignaturePad)
  const inputRef = useRef<HTMLInputElement | null>(null)

  return (
    <div className="toolbar">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="visually-hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) {
            return
          }
          onFileSelected(file)
          event.currentTarget.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => {
          inputRef.current?.click()
        }}
      >
        Upload PDF
      </button>
      <div className="toolbar__group">
        <button
          type="button"
          className={toolMode === 'select' ? 'active' : ''}
          onClick={() => setToolMode('select')}
          disabled={!sourcePdf}
        >
          Select
        </button>
        <button
          type="button"
          className={toolMode === 'text' ? 'active' : ''}
          onClick={() => setToolMode('text')}
          disabled={!sourcePdf}
        >
          Text
        </button>
        <button
          type="button"
          className={toolMode === 'signature' ? 'active' : ''}
          onClick={() => setToolMode('signature')}
          disabled={!sourcePdf}
        >
          Signature
        </button>
      </div>
      <div className="toolbar__group">
        <button type="button" onClick={() => setZoom(zoom - 0.1)} disabled={!sourcePdf}>
          -
        </button>
        <button type="button" onClick={() => setZoom(1)} disabled={!sourcePdf}>
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" onClick={() => setZoom(zoom + 0.1)} disabled={!sourcePdf}>
          +
        </button>
      </div>
      <button type="button" onClick={openSignaturePad} disabled={!sourcePdf}>
        Draw Signature
      </button>
      <button
        type="button"
        className="primary"
        onClick={onExport}
        disabled={!sourcePdf || exportStatus === 'working'}
      >
        {exportStatus === 'working' ? 'Exporting...' : 'Export PDF'}
      </button>
    </div>
  )
}
