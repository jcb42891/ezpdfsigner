import type Konva from 'konva'
import { useMemo } from 'react'
import { Layer, Rect, Stage } from 'react-konva'
import { pointerToPct } from '@/features/annotations/coordinate'
import { SignatureAnnotationNode } from '@/features/annotations/SignatureAnnotationNode'
import { TextAnnotationNode } from '@/features/annotations/TextAnnotationNode'
import { isSelected } from '@/features/annotations/selection'
import { useEditorStore } from '@/state/editorStore'
import type { Annotation, TextAnnotation } from '@/state/types'

type Props = {
  pageIndex: number
  pageWidthPx: number
  pageHeightPx: number
  zoom: number
}

export const AnnotationLayer = ({
  pageIndex,
  pageWidthPx,
  pageHeightPx,
  zoom,
}: Props) => {
  const annotationOrder = useEditorStore((state) => state.annotationOrder)
  const annotationsById = useEditorStore((state) => state.annotationsById)
  const selectedAnnotationId = useEditorStore((state) => state.selectedAnnotationId)
  const signatureTemplatesById = useEditorStore((state) => state.signatureTemplatesById)
  const toolMode = useEditorStore((state) => state.toolMode)
  const addTextAnnotation = useEditorStore((state) => state.addTextAnnotation)
  const updateTextAnnotation = useEditorStore((state) => state.updateTextAnnotation)
  const placeSignature = useEditorStore((state) => state.placeSignature)
  const setSelectedAnnotationId = useEditorStore((state) => state.setSelectedAnnotationId)
  const upsertAnnotationRect = useEditorStore((state) => state.upsertAnnotationRect)

  const pageAnnotations = useMemo(
    () =>
      annotationOrder
        .map((id) => annotationsById[id])
        .filter((annotation): annotation is Annotation => Boolean(annotation))
        .filter((annotation) => annotation.pageIndex === pageIndex),
    [annotationOrder, annotationsById, pageIndex],
  )

  const maybePromptForText = (annotation: TextAnnotation): void => {
    const nextValue = window.prompt('Edit text', annotation.text)
    if (nextValue === null) {
      return
    }
    updateTextAnnotation({
      id: annotation.id,
      text: nextValue,
    })
  }

  const handleStagePointerDown = (
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ): void => {
    const targetName = event.target.name()
    const clickedBackground =
      event.target === event.target.getStage() || targetName === 'annotation-hit-area'

    if (!clickedBackground) {
      return
    }

    const stage = event.target.getStage()
    const pointer = stage?.getPointerPosition()
    if (!pointer) {
      return
    }

    const point = pointerToPct(pointer.x, pointer.y, pageWidthPx, pageHeightPx)
    if (toolMode === 'text') {
      const annotationId = addTextAnnotation({
        pageIndex,
        ...point,
      })

      if (!annotationId) {
        return
      }

      const enteredText = window.prompt('Edit text', 'New text')
      if (enteredText !== null) {
        updateTextAnnotation({
          id: annotationId,
          text: enteredText,
        })
      }
      return
    }

    if (toolMode === 'signature') {
      placeSignature({
        pageIndex,
        ...point,
      })
      return
    }

    setSelectedAnnotationId(null)
  }

  return (
    <Stage
      width={pageWidthPx}
      height={pageHeightPx}
      onMouseDown={handleStagePointerDown}
      onTouchStart={handleStagePointerDown}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Layer>
        <Rect
          name="annotation-hit-area"
          x={0}
          y={0}
          width={pageWidthPx}
          height={pageHeightPx}
          fill="rgba(0,0,0,0)"
        />
        {pageAnnotations.map((annotation) => {
          if (annotation.type === 'text') {
            return (
              <TextAnnotationNode
                key={annotation.id}
                annotation={annotation}
                pageWidthPx={pageWidthPx}
                pageHeightPx={pageHeightPx}
                zoom={zoom}
                selected={isSelected(selectedAnnotationId, annotation.id)}
                onSelect={() => {
                  setSelectedAnnotationId(annotation.id)
                }}
                onRectChange={(nextRect) => {
                  upsertAnnotationRect({
                    id: annotation.id,
                    ...nextRect,
                  })
                }}
                onRequestTextEdit={() => {
                  maybePromptForText(annotation)
                }}
              />
            )
          }

          const template = signatureTemplatesById[annotation.templateId]
          if (!template) {
            return null
          }

          return (
            <SignatureAnnotationNode
              key={annotation.id}
              annotation={annotation}
              imageDataUrl={template.imageDataUrl}
              pageWidthPx={pageWidthPx}
              pageHeightPx={pageHeightPx}
              selected={isSelected(selectedAnnotationId, annotation.id)}
              onSelect={() => {
                setSelectedAnnotationId(annotation.id)
              }}
              onRectChange={(nextRect) => {
                upsertAnnotationRect({
                  id: annotation.id,
                  ...nextRect,
                })
              }}
            />
          )
        })}
      </Layer>
    </Stage>
  )
}
