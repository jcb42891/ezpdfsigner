import { useEffect, useMemo, useRef } from 'react'
import type Konva from 'konva'
import { Group, Image as KonvaImage, Rect, Transformer } from 'react-konva'
import { pctRectToPixels, pixelRectToPct } from '@/features/annotations/coordinate'
import { useDataUrlImage } from '@/features/signature/signatureImage'
import type { SignatureAnnotation } from '@/state/types'

type Props = {
  annotation: SignatureAnnotation
  imageDataUrl: string
  pageWidthPx: number
  pageHeightPx: number
  selected: boolean
  onSelect: () => void
  onRectChange: (nextRect: {
    xPct: number
    yPct: number
    widthPct: number
    heightPct: number
  }) => void
}

export const SignatureAnnotationNode = ({
  annotation,
  imageDataUrl,
  pageWidthPx,
  pageHeightPx,
  selected,
  onSelect,
  onRectChange,
}: Props) => {
  const groupRef = useRef<Konva.Group>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const imageElement = useDataUrlImage(imageDataUrl)
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
    const height = Math.max(20, node.height() * scaleY)

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
        onDragEnd={commitRectFromNode}
        onTransformEnd={commitRectFromNode}
      >
        <Rect
          width={rectPx.width}
          height={rectPx.height}
          fill="rgba(0,0,0,0)"
          stroke={selected ? '#f97316' : undefined}
          strokeWidth={selected ? 2 : 0}
          cornerRadius={selected ? 4 : 0}
        />
        {imageElement ? (
          <KonvaImage
            image={imageElement}
            x={2}
            y={2}
            width={Math.max(1, rectPx.width - 4)}
            height={Math.max(1, rectPx.height - 4)}
          />
        ) : null}
      </Group>
      {selected ? (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          flipEnabled={false}
          keepRatio
          anchorSize={8}
          borderStroke="#f97316"
        />
      ) : null}
    </>
  )
}
