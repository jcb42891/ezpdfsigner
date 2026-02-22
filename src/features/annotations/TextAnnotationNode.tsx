import { useEffect, useMemo, useRef } from 'react'
import type Konva from 'konva'
import { Group, Rect, Text, Transformer } from 'react-konva'
import { pctRectToPixels, pixelRectToPct } from '@/features/annotations/coordinate'
import type { TextAnnotation } from '@/state/types'

type Props = {
  annotation: TextAnnotation
  pageWidthPx: number
  pageHeightPx: number
  zoom: number
  selected: boolean
  onSelect: () => void
  onRectChange: (nextRect: {
    xPct: number
    yPct: number
    widthPct: number
    heightPct: number
  }) => void
  onRequestTextEdit: () => void
}

export const TextAnnotationNode = ({
  annotation,
  pageWidthPx,
  pageHeightPx,
  zoom,
  selected,
  onSelect,
  onRectChange,
  onRequestTextEdit,
}: Props) => {
  const groupRef = useRef<Konva.Group>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const rectPx = useMemo(
    () => pctRectToPixels(annotation, pageWidthPx, pageHeightPx),
    [annotation, pageHeightPx, pageWidthPx],
  )

  useEffect(() => {
    if (!selected || !groupRef.current || !transformerRef.current) {
      return
    }

    transformerRef.current.nodes([groupRef.current])
    transformerRef.current.getLayer()?.batchDraw()
  }, [selected])

  const commitRectFromNode = (): void => {
    const node = groupRef.current
    if (!node) {
      return
    }

    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    const width = Math.max(40, node.width() * scaleX)
    const height = Math.max(24, node.height() * scaleY)

    node.scaleX(1)
    node.scaleY(1)

    onRectChange(
      pixelRectToPct(
        {
          x: node.x(),
          y: node.y(),
          width,
          height,
        },
        pageWidthPx,
        pageHeightPx,
      ),
    )
  }

  return (
    <>
      <Group
        ref={groupRef}
        x={rectPx.x}
        y={rectPx.y}
        width={rectPx.width}
        height={rectPx.height}
        draggable
        onClick={(event) => {
          event.cancelBubble = true
          onSelect()
        }}
        onTap={(event) => {
          event.cancelBubble = true
          onSelect()
        }}
        onDblClick={(event) => {
          event.cancelBubble = true
          onSelect()
          onRequestTextEdit()
        }}
        onDblTap={(event) => {
          event.cancelBubble = true
          onSelect()
          onRequestTextEdit()
        }}
        onDragEnd={commitRectFromNode}
        onTransformEnd={commitRectFromNode}
      >
        <Rect
          width={rectPx.width}
          height={rectPx.height}
          stroke={selected ? '#f97316' : undefined}
          strokeWidth={selected ? 2 : 0}
          fill="rgba(0,0,0,0)"
          cornerRadius={selected ? 4 : 0}
        />
        <Text
          text={annotation.text}
          width={rectPx.width}
          height={rectPx.height}
          fontSize={Math.max(8, annotation.fontSize * zoom)}
          fill={annotation.color}
          padding={6}
          verticalAlign="top"
        />
      </Group>
      {selected ? (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          flipEnabled={false}
          anchorSize={8}
          borderStroke="#f97316"
        />
      ) : null}
    </>
  )
}
