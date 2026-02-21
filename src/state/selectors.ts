import type { Annotation, TextAnnotation } from '@/state/types'
import type { EditorStore } from '@/state/editorStore'

export const selectAnnotationsForPage =
  (pageIndex: number) =>
  (state: EditorStore): Annotation[] =>
    state.annotationOrder
      .map((id) => state.annotationsById[id])
      .filter((annotation): annotation is Annotation => Boolean(annotation))
      .filter((annotation) => annotation.pageIndex === pageIndex)

export const selectSelectedAnnotation = (state: EditorStore): Annotation | null => {
  if (!state.selectedAnnotationId) {
    return null
  }

  return state.annotationsById[state.selectedAnnotationId] ?? null
}

export const selectSelectedTextAnnotation = (
  state: EditorStore,
): TextAnnotation | null => {
  const annotation = selectSelectedAnnotation(state)

  if (!annotation || annotation.type !== 'text') {
    return null
  }

  return annotation
}
