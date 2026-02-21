import { useMemo } from 'react'
import { useEditorStore } from '@/state/editorStore'

export const StatusBar = () => {
  const sourcePdf = useEditorStore((state) => state.sourcePdf)
  const annotationsById = useEditorStore((state) => state.annotationsById)
  const annotationOrder = useEditorStore((state) => state.annotationOrder)
  const selectedAnnotationId = useEditorStore((state) => state.selectedAnnotationId)
  const updateTextAnnotation = useEditorStore((state) => state.updateTextAnnotation)

  const selectedAnnotation = useMemo(() => {
    if (!selectedAnnotationId) {
      return null
    }

    return annotationsById[selectedAnnotationId] ?? null
  }, [annotationsById, selectedAnnotationId])

  return (
    <div className="status-bar">
      <div className="status-bar__meta">
        <span>{sourcePdf ? sourcePdf.fileName : 'No PDF loaded'}</span>
        <span>{annotationOrder.length} annotations</span>
        <span>Shortcuts: Ctrl+C, Ctrl+V, Delete</span>
      </div>
      {selectedAnnotation && selectedAnnotation.type === 'text' ? (
        <div className="status-bar__editor">
          <label>
            Text
            <input
              value={selectedAnnotation.text}
              onChange={(event) => {
                updateTextAnnotation({
                  id: selectedAnnotation.id,
                  text: event.target.value,
                })
              }}
            />
          </label>
          <label>
            Size
            <input
              type="number"
              min={8}
              max={96}
              value={selectedAnnotation.fontSize}
              onChange={(event) => {
                updateTextAnnotation({
                  id: selectedAnnotation.id,
                  fontSize: Number(event.target.value),
                })
              }}
            />
          </label>
          <label>
            Color
            <input
              type="color"
              value={selectedAnnotation.color}
              onChange={(event) => {
                updateTextAnnotation({
                  id: selectedAnnotation.id,
                  color: event.target.value,
                })
              }}
            />
          </label>
        </div>
      ) : (
        <div className="status-bar__hint">
          {selectedAnnotation
            ? 'Signature selected.'
            : 'Select an annotation to edit it.'}
        </div>
      )}
    </div>
  )
}
