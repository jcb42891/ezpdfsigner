import type Konva from 'konva'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Layer, Rect, Stage } from 'react-konva'
import {
  clampRectPct,
  pctRectToPixels,
  pointerToPct,
  type RectPct,
} from '@/features/annotations/coordinate'
import { SignatureAnnotationNode } from '@/features/annotations/SignatureAnnotationNode'
import { TextAnnotationNode } from '@/features/annotations/TextAnnotationNode'
import { isSelected } from '@/features/annotations/selection'
import { useEditorStore } from '@/state/editorStore'
import type { Annotation } from '@/state/types'

type Props = {
  pageIndex: number
  pageWidthPx: number
  pageHeightPx: number
  zoom: number
}

const TEXT_DRAG_THRESHOLD_PCT = 0.015
const TEXT_EDITOR_MIN_HEIGHT_PX = 36

type PointPct = {
  xPct: number
  yPct: number
}

const buildDragRect = (
  start: PointPct,
  end: PointPct,
): {
  raw: RectPct
  clamped: RectPct
} => {
  const raw = {
    xPct: Math.min(start.xPct, end.xPct),
    yPct: Math.min(start.yPct, end.yPct),
    widthPct: Math.abs(end.xPct - start.xPct),
    heightPct: Math.abs(end.yPct - start.yPct),
  }

  return {
    raw,
    clamped: clampRectPct(raw),
  }
}

export const AnnotationLayer = ({
  pageIndex,
  pageWidthPx,
  pageHeightPx,
  zoom,
}: Props) => {
  const [draftTextRect, setDraftTextRect] = useState<RectPct | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const textDragStartRef = useRef<PointPct | null>(null)
  const textEditorRef = useRef<HTMLTextAreaElement | null>(null)

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

  const editingTextAnnotation = useMemo(() => {
    if (!editingTextId) {
      return null
    }

    const annotation = annotationsById[editingTextId]
    if (!annotation || annotation.type !== 'text' || annotation.pageIndex !== pageIndex) {
      return null
    }

    return annotation
  }, [annotationsById, editingTextId, pageIndex])

  const editingTextRectPx = useMemo(
    () =>
      editingTextAnnotation
        ? pctRectToPixels(editingTextAnnotation, pageWidthPx, pageHeightPx)
        : null,
    [editingTextAnnotation, pageHeightPx, pageWidthPx],
  )

  const draftTextRectPx = useMemo(
    () => (draftTextRect ? pctRectToPixels(draftTextRect, pageWidthPx, pageHeightPx) : null),
    [draftTextRect, pageHeightPx, pageWidthPx],
  )

  useEffect(() => {
    if (!editingTextId) {
      return
    }

    const annotation = annotationsById[editingTextId]
    if (!annotation || annotation.type !== 'text' || annotation.pageIndex !== pageIndex) {
      setEditingTextId(null)
    }
  }, [annotationsById, editingTextId, pageIndex])

  useEffect(() => {
    if (!editingTextId || !textEditorRef.current) {
      return
    }

    textEditorRef.current.focus()
    const cursorIndex = textEditorRef.current.value.length
    textEditorRef.current.setSelectionRange(cursorIndex, cursorIndex)
  }, [editingTextId])

  const getPointerPct = (
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ): PointPct | null => {
    const stage = event.target.getStage()
    const pointer = stage?.getPointerPosition()
    if (!pointer) {
      return null
    }

    return pointerToPct(pointer.x, pointer.y, pageWidthPx, pageHeightPx)
  }

  const finishTextDrag = (
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ): void => {
    if (toolMode !== 'text') {
      textDragStartRef.current = null
      setDraftTextRect(null)
      return
    }

    const start = textDragStartRef.current
    if (!start) {
      return
    }

    const end = getPointerPct(event)
    const dragRect = end
      ? buildDragRect(start, end)
      : draftTextRect
        ? {
            raw: draftTextRect,
            clamped: draftTextRect,
          }
        : buildDragRect(start, start)
    const { raw, clamped } = dragRect
    const shouldUseDraggedRect =
      raw.widthPct >= TEXT_DRAG_THRESHOLD_PCT || raw.heightPct >= TEXT_DRAG_THRESHOLD_PCT

    const annotationId = addTextAnnotation(
      shouldUseDraggedRect
        ? {
            pageIndex,
            xPct: clamped.xPct,
            yPct: clamped.yPct,
            widthPct: clamped.widthPct,
            heightPct: clamped.heightPct,
            text: '',
          }
        : {
            pageIndex,
            xPct: start.xPct,
            yPct: start.yPct,
            text: '',
          },
    )

    textDragStartRef.current = null
    setDraftTextRect(null)

    if (!annotationId) {
      return
    }

    setEditingTextId(annotationId)
  }

  const handleStagePointerDown = (
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ): void => {
    if ('button' in event.evt && event.evt.button !== 0) {
      return
    }

    const targetName = event.target.name()
    const clickedBackground =
      event.target === event.target.getStage() || targetName === 'annotation-hit-area'

    if (!clickedBackground) {
      return
    }

    const point = getPointerPct(event)
    if (!point) {
      return
    }

    if (toolMode === 'text') {
      textDragStartRef.current = point
      setDraftTextRect(
        clampRectPct({
          xPct: point.xPct,
          yPct: point.yPct,
          widthPct: 0.01,
          heightPct: 0.01,
        }),
      )
      setEditingTextId(null)
      setSelectedAnnotationId(null)
      return
    }

    if (toolMode === 'signature') {
      setEditingTextId(null)
      placeSignature({
        pageIndex,
        ...point,
      })
      return
    }

    setEditingTextId(null)
    setSelectedAnnotationId(null)
  }

  return (
    <div className="annotation-layer">
      <Stage
        width={pageWidthPx}
        height={pageHeightPx}
        onMouseDown={handleStagePointerDown}
        onTouchStart={handleStagePointerDown}
        onMouseMove={(event) => {
          if (toolMode !== 'text' || !textDragStartRef.current) {
            return
          }

          const point = getPointerPct(event)
          if (!point) {
            return
          }

          const { clamped } = buildDragRect(textDragStartRef.current, point)
          setDraftTextRect(clamped)
        }}
        onTouchMove={(event) => {
          if (toolMode !== 'text' || !textDragStartRef.current) {
            return
          }

          const point = getPointerPct(event)
          if (!point) {
            return
          }

          const { clamped } = buildDragRect(textDragStartRef.current, point)
          setDraftTextRect(clamped)
        }}
        onMouseUp={finishTextDrag}
        onTouchEnd={finishTextDrag}
        onMouseLeave={finishTextDrag}
        style={{
          position: 'absolute',
          inset: 0,
          cursor: toolMode === 'text' ? 'crosshair' : 'default',
        }}
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
          {draftTextRectPx ? (
            <Rect
              x={draftTextRectPx.x}
              y={draftTextRectPx.y}
              width={draftTextRectPx.width}
              height={draftTextRectPx.height}
              stroke="#f97316"
              strokeWidth={2}
              dash={[8, 4]}
              fill="rgba(249, 115, 22, 0.08)"
              listening={false}
            />
          ) : null}
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
                    setEditingTextId(null)
                    setSelectedAnnotationId(annotation.id)
                  }}
                  onRectChange={(nextRect) => {
                    upsertAnnotationRect({
                      id: annotation.id,
                      ...nextRect,
                    })
                  }}
                  onRequestTextEdit={() => {
                    setSelectedAnnotationId(annotation.id)
                    setEditingTextId(annotation.id)
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
                  setEditingTextId(null)
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
      {editingTextAnnotation && editingTextRectPx ? (
        <div
          className="annotation-text-editor"
          style={{
            left: `${editingTextRectPx.x}px`,
            top: `${editingTextRectPx.y}px`,
            width: `${editingTextRectPx.width}px`,
          }}
          onMouseDown={(event) => {
            event.stopPropagation()
          }}
          onTouchStart={(event) => {
            event.stopPropagation()
          }}
        >
          <label>
            Size
            <input
              type="number"
              min={8}
              max={96}
              value={editingTextAnnotation.fontSize}
              onChange={(event) => {
                updateTextAnnotation({
                  id: editingTextAnnotation.id,
                  fontSize: Number(event.target.value),
                })
              }}
            />
          </label>
          <textarea
            ref={textEditorRef}
            value={editingTextAnnotation.text}
            style={{
              height: `${Math.max(TEXT_EDITOR_MIN_HEIGHT_PX, editingTextRectPx.height)}px`,
              fontSize: `${Math.max(8, editingTextAnnotation.fontSize * zoom)}px`,
              color: editingTextAnnotation.color,
            }}
            onChange={(event) => {
              updateTextAnnotation({
                id: editingTextAnnotation.id,
                text: event.target.value,
              })
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Escape') {
                return
              }

              setEditingTextId(null)
              event.currentTarget.blur()
              event.stopPropagation()
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
