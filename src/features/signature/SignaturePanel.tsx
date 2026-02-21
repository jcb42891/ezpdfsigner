import { useMemo } from 'react'
import { useEditorStore } from '@/state/editorStore'

export const SignaturePanel = () => {
  const signatureTemplateOrder = useEditorStore((state) => state.signatureTemplateOrder)
  const signatureTemplatesById = useEditorStore((state) => state.signatureTemplatesById)
  const selectedSignatureTemplateId = useEditorStore(
    (state) => state.selectedSignatureTemplateId,
  )
  const openSignaturePad = useEditorStore((state) => state.openSignaturePad)
  const setSelectedSignatureTemplateId = useEditorStore(
    (state) => state.setSelectedSignatureTemplateId,
  )
  const setToolMode = useEditorStore((state) => state.setToolMode)
  const deleteSignatureTemplate = useEditorStore((state) => state.deleteSignatureTemplate)

  const templates = useMemo(
    () =>
      signatureTemplateOrder
        .map((id) => signatureTemplatesById[id])
        .filter((template) => Boolean(template)),
    [signatureTemplateOrder, signatureTemplatesById],
  )

  return (
    <aside className="signature-panel">
      <header className="signature-panel__header">
        <h2>Signatures</h2>
        <button
          type="button"
          className="primary"
          onClick={() => {
            openSignaturePad()
          }}
        >
          New Signature
        </button>
      </header>
      {templates.length === 0 ? (
        <p className="signature-panel__empty">
          No signatures yet. Create one, then click where you want to place it.
        </p>
      ) : (
        <ul className="signature-panel__list">
          {templates.map((template) => {
            const isActive = selectedSignatureTemplateId === template.id
            return (
              <li key={template.id}>
                <button
                  type="button"
                  className={`signature-panel__item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedSignatureTemplateId(template.id)
                    setToolMode('signature')
                  }}
                >
                  <img src={template.imageDataUrl} alt={template.name} />
                  <span>{template.name}</span>
                </button>
                <button
                  type="button"
                  className="signature-panel__delete"
                  onClick={() => {
                    const confirmed = window.confirm(
                      `Delete "${template.name}"? Signatures already placed on pages using this template will also be removed.`,
                    )
                    if (!confirmed) {
                      return
                    }
                    deleteSignatureTemplate(template.id)
                  }}
                >
                  Delete
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
