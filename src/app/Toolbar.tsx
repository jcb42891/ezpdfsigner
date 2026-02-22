import { useRef } from 'react'
import {
  TEXT_MAX_FONT_SIZE,
  TEXT_MIN_FONT_SIZE,
  useEditorStore,
} from '@/state/editorStore'

type Props = {
  onFileSelected: (file: File) => void
  onExport: () => void
  exportStatus: 'idle' | 'working' | 'error'
}

export const Toolbar = ({ onFileSelected, onExport, exportStatus }: Props) => {
  const sourcePdf = useEditorStore((state) => state.sourcePdf)
  const toolMode = useEditorStore((state) => state.toolMode)
  const zoom = useEditorStore((state) => state.zoom)
  const defaultTextFontSize = useEditorStore((state) => state.defaultTextFontSize)
  const setToolMode = useEditorStore((state) => state.setToolMode)
  const setZoom = useEditorStore((state) => state.setZoom)
  const setDefaultTextFontSize = useEditorStore(
    (state) => state.setDefaultTextFontSize,
  )
  const inputRef = useRef<HTMLInputElement | null>(null)
  const hasDocument = Boolean(sourcePdf)

  return (
    <div className="toolbar" role="toolbar" aria-label="PDF editor toolbar">
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
      <section className="toolbar__section">
        <p className="toolbar__section-title">File</p>
        <div className="toolbar__section-body">
          <button
            type="button"
            onClick={() => {
              inputRef.current?.click()
            }}
          >
            Upload PDF
          </button>
          <span
            className={
              sourcePdf ? 'toolbar__file-name toolbar__file-name--loaded' : 'toolbar__file-name'
            }
            title={sourcePdf?.fileName ?? 'No file selected'}
          >
            {sourcePdf ? sourcePdf.fileName : 'No file selected'}
          </span>
        </div>
      </section>
      <section className="toolbar__section">
        <p className="toolbar__section-title">Mode</p>
        <div className="toolbar__section-body">
          <div className="toolbar__group" role="group" aria-label="Tool mode">
            <button
              type="button"
              className={toolMode === 'select' ? 'active' : ''}
              onClick={() => setToolMode('select')}
              disabled={!hasDocument}
            >
              Select
            </button>
            <button
              type="button"
              className={toolMode === 'text' ? 'active' : ''}
              onClick={() => setToolMode('text')}
              disabled={!hasDocument}
            >
              Text
            </button>
            <button
              type="button"
              className={toolMode === 'signature' ? 'active' : ''}
              onClick={() => setToolMode('signature')}
              disabled={!hasDocument}
            >
              Signature
            </button>
          </div>
        </div>
      </section>
      <section className="toolbar__section">
        <p className="toolbar__section-title">View</p>
        <div className="toolbar__section-body">
          <div className="toolbar__group toolbar__group--zoom" role="group" aria-label="Zoom">
            <button type="button" onClick={() => setZoom(zoom - 0.1)} disabled={!hasDocument}>
              -
            </button>
            <button type="button" onClick={() => setZoom(1)} disabled={!hasDocument}>
              {Math.round(zoom * 100)}%
            </button>
            <button type="button" onClick={() => setZoom(zoom + 0.1)} disabled={!hasDocument}>
              +
            </button>
          </div>
          <label className="toolbar__field">
            Default text size
            <input
              type="number"
              min={TEXT_MIN_FONT_SIZE}
              max={TEXT_MAX_FONT_SIZE}
              value={defaultTextFontSize}
              onChange={(event) => {
                const nextFontSize = event.currentTarget.valueAsNumber
                if (!Number.isFinite(nextFontSize)) {
                  return
                }
                setDefaultTextFontSize(nextFontSize)
              }}
            />
          </label>
        </div>
      </section>
      <section className="toolbar__section toolbar__section--export">
        <p className="toolbar__section-title">Output</p>
        <div className="toolbar__section-body">
          <button
            type="button"
            className="primary"
            onClick={onExport}
            disabled={!hasDocument || exportStatus === 'working'}
          >
            {exportStatus === 'working' ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </section>
    </div>
  )
}
