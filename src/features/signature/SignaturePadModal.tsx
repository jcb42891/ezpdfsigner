import { useEffect, useRef, useState } from 'react'
import SignaturePad from 'signature_pad'
import { useEditorStore } from '@/state/editorStore'

export const SignaturePadModal = () => {
  const isOpen = useEditorStore((state) => state.isSignaturePadOpen)
  const closeSignaturePad = useEditorStore((state) => state.closeSignaturePad)
  const addSignatureTemplate = useEditorStore((state) => state.addSignatureTemplate)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const signaturePadRef = useRef<SignaturePad | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const resizeCanvas = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = Math.floor(canvas.offsetWidth * ratio)
      canvas.height = Math.floor(canvas.offsetHeight * ratio)
      canvas.getContext('2d')?.scale(ratio, ratio)
      signaturePadRef.current?.clear()
    }

    signaturePadRef.current = new SignaturePad(canvas, {
      minWidth: 0.8,
      maxWidth: 2.5,
      penColor: '#111111',
    })

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      signaturePadRef.current?.off()
      signaturePadRef.current = null
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="signature-modal" role="dialog" aria-modal="true">
        <header className="signature-modal__header">
          <h2>Draw Signature</h2>
          <p>Draw once, save it, then place it anywhere in the PDF.</p>
        </header>
        <label className="signature-modal__label" htmlFor="signature-template-name">
          Signature name
        </label>
        <input
          id="signature-template-name"
          value={templateName}
          onChange={(event) => {
            setTemplateName(event.target.value)
          }}
          placeholder="My signature"
        />
        <canvas ref={canvasRef} className="signature-modal__canvas" />
        {validationError ? (
          <p className="signature-modal__error">{validationError}</p>
        ) : null}
        <div className="signature-modal__actions">
          <button
            type="button"
            onClick={() => {
              signaturePadRef.current?.clear()
              setValidationError(null)
            }}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              closeSignaturePad()
              setValidationError(null)
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
                setValidationError('Draw your signature before saving.')
                return
              }

              const imageDataUrl = signaturePadRef.current.toDataURL('image/png')
              addSignatureTemplate(imageDataUrl, templateName)
              setTemplateName('')
              setValidationError(null)
            }}
          >
            Save Signature
          </button>
        </div>
      </div>
    </div>
  )
}
