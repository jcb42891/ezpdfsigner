# EZPDFSigner Technical Specification (V1)

Version: 1.0  
Date: 2026-02-21  
Input Spec: `SPEC.md`

## 1. Purpose

Define the implementation-level architecture for a minimal PDF editor that supports only:

- PDF import/view
- Click-to-add text
- Draw/save reusable signatures
- Place/copy/paste signatures
- Export flattened PDF

This document intentionally excludes non-MVP features.

## 2. Product Boundaries

## 2.1 Goals

- Deliver a fast local-first tool for adding text/signatures to PDFs.
- Keep interaction model simple and predictable.
- Preserve placement accuracy across zoom and export.
- Produce a finalized PDF with overlays burned in.

## 2.2 Non-Goals

- Digital certificate signing.
- Form field recognition/autofill.
- OCR or text extraction.
- Cloud sync, accounts, sharing, collaboration.
- Rich annotation suite beyond text/signature.

## 3. Full Stack Selection

This is a browser-only stack (no backend for V1).

## 3.1 Runtime and Build

- Node.js 22 LTS (dev/build runtime)
- Vite 5 (bundler/dev server)
- React 18 + TypeScript 5

## 3.2 Core Libraries

- `pdfjs-dist`: PDF parsing + page rendering
- `pdf-lib`: export pipeline (embed text/image overlays into PDF bytes)
- `konva` + `react-konva`: interaction layer (drag/resize/select overlays)
- `signature_pad`: signature drawing capture
- `zustand`: editor state management
- `nanoid`: stable client IDs

## 3.3 Quality Tooling

- ESLint + TypeScript rules
- Prettier
- Vitest + React Testing Library (unit/integration)
- Playwright (E2E smoke and core flows)

## 3.4 Deployment Model

- Static site output (`dist/`)
- Can run locally (`npm run dev`) and be hosted on static hosting if desired
- No network dependency at runtime for core editing/export

## 4. High-Level Architecture

## 4.1 Subsystems

1. `UI Shell`: toolbar, page list viewport, side panel for signatures.
2. `PDF Render Engine`: renders each page to canvas bitmap via PDF.js.
3. `Annotation Engine`: interactive overlay with text/signature nodes.
4. `Signature Manager`: create/save/list signature templates.
5. `Export Engine`: writes overlays into a new PDF via pdf-lib.
6. `State Store`: normalized editor state and commands.

## 4.2 Data Flow

1. User imports PDF file.
2. PDF bytes are cached in memory and parsed for page metadata.
3. Each visible page renders canvas bitmap at current zoom.
4. Annotation layer renders objects from store for that page.
5. User actions dispatch store commands (add/move/resize/edit/copy/paste/delete).
6. Export reads store + source bytes and generates final PDF download.

## 5. Project Structure

```text
ezpdfsigner/
  README.md
  SPEC.md
  TECH_SPEC.md
  WORK_LOG.md
  package.json
  tsconfig.json
  vite.config.ts
  index.html
  src/
    main.tsx
    app/
      App.tsx
      AppLayout.tsx
      Toolbar.tsx
      StatusBar.tsx
    styles/
      globals.css
      tokens.css
    features/
      pdf/
        PdfViewer.tsx
        PdfPageCanvas.tsx
        pdfWorker.ts
        usePdfDocument.ts
      annotations/
        AnnotationLayer.tsx
        TextAnnotationNode.tsx
        SignatureAnnotationNode.tsx
        selection.ts
        coordinate.ts
      signature/
        SignaturePanel.tsx
        SignaturePadModal.tsx
        signatureImage.ts
      export/
        exportPdf.ts
        pdfCoordinateMap.ts
      clipboard/
        clipboardHandlers.ts
    state/
      editorStore.ts
      selectors.ts
      actions.ts
      types.ts
    utils/
      ids.ts
      download.ts
      guards.ts
    tests/
      unit/
      integration/
      e2e/
```

## 6. Domain Model

## 6.1 Core Types

```ts
type ToolMode = 'select' | 'text' | 'signature'

type PageSize = {
  width: number
  height: number
}

type SignatureTemplate = {
  id: string
  name: string
  imageDataUrl: string // transparent PNG
  createdAt: string
}

type BaseAnnotation = {
  id: string
  pageIndex: number
  xPct: number // 0..1
  yPct: number // 0..1 (top-left origin in UI space)
  widthPct: number // >0, <=1
  heightPct: number // >0, <=1
}

type TextAnnotation = BaseAnnotation & {
  type: 'text'
  text: string
  fontSize: number
  color: string // hex
}

type SignatureAnnotation = BaseAnnotation & {
  type: 'signature'
  templateId: string
}

type Annotation = TextAnnotation | SignatureAnnotation
```

## 6.2 Store Shape

```ts
type EditorState = {
  sourcePdf: {
    fileName: string
    bytes: Uint8Array
    pageCount: number
    pageSizes: PageSize[]
  } | null
  toolMode: ToolMode
  zoom: number
  selectedAnnotationId: string | null
  selectedSignatureTemplateId: string | null
  annotationsById: Record<string, Annotation>
  annotationOrder: string[]
  signatureTemplatesById: Record<string, SignatureTemplate>
  signatureTemplateOrder: string[]
  clipboard: {
    annotationSnapshot: SignatureAnnotation | null
  }
}
```

## 7. Interaction Spec

## 7.1 Tooling Behavior

- `Select`: select/move/resize existing annotations.
- `Text`: click page to create text annotation at pointer.
- `Signature`: place selected signature template at pointer.

## 7.2 Selection Rules

- Single selection only in V1.
- Clicking empty area clears selection.
- Selection box with drag handles for resize.

## 7.3 Text Annotation Rules

- New text box defaults:
  - font size `16`
  - color `#111111`
  - width `0.22` page pct
  - height `0.05` page pct
- Auto-enter inline edit on creation.
- Minimum width/height clamp to keep text editable.

## 7.4 Signature Template Rules

- Signature panel lists saved templates.
- Template persists in `localStorage` (V1 convenience).
- Signature placement defaults:
  - width `0.25` page pct
  - height derived from image aspect ratio
- Template cannot be deleted if currently in use without confirmation.

## 7.5 Clipboard Rules

- `Ctrl+C`: if selected annotation is `signature`, snapshot to internal clipboard.
- `Ctrl+V`: paste signature on same page with offset (+2% x/y) and select new one.
- If pasted outside bounds, clamp to page edge.
- `Ctrl+C` on text is ignored in V1 (scope control).

## 7.6 Keyboard Shortcuts

- `Delete` / `Backspace`: delete selected annotation (when not editing text input).
- `Ctrl+C`: copy selected signature annotation.
- `Ctrl+V`: paste copied signature annotation.
- `Esc`: clear selection / close active modal.

## 8. Coordinate and Rendering Spec

## 8.1 Coordinate System

- Store all annotation geometry as normalized percentages against native page dimensions.
- UI space origin: top-left.
- PDF space origin for export: bottom-left.

## 8.2 Conversion Helpers

UI absolute (px) from pct:

```ts
x = xPct * pageWidthPx
y = yPct * pageHeightPx
w = widthPct * pageWidthPx
h = heightPct * pageHeightPx
```

PDF absolute from pct:

```ts
xPdf = xPct * pageWidthPdf
yTopPdf = yPct * pageHeightPdf
hPdf = heightPct * pageHeightPdf
yPdf = pageHeightPdf - yTopPdf - hPdf
wPdf = widthPct * pageWidthPdf
```

## 8.3 PDF Rendering

- Use PDF.js worker bundle.
- Render page canvases at `devicePixelRatio` aware scale for clarity.
- Apply zoom by scaling viewport and annotation layer consistently.

## 9. Export Engine Spec

## 9.1 Export Steps

1. Load original bytes with `PDFDocument.load`.
2. Iterate annotations ordered by `annotationOrder`.
3. For each annotation on page:
   - Convert normalized geometry to PDF coordinates.
   - Draw text or image.
4. Save PDF bytes and trigger file download.

## 9.2 Text Export Rules

- Use built-in Standard Font (Helvetica) for V1 reliability.
- Draw text within annotation box origin; no advanced text wrapping in V1.
- Preserve font size and color.

## 9.3 Signature Export Rules

- Deduplicate template embedding: embed each unique PNG once.
- Draw signature image at annotation rectangle.
- Preserve transparency.

## 10. State Management and Actions

## 10.1 Required Actions

- `loadPdf(bytes, fileName, pageSizes)`
- `setToolMode(mode)`
- `setZoom(zoom)`
- `addTextAnnotation(pageIndex, xPct, yPct)`
- `updateTextAnnotation(id, patch)`
- `addSignatureTemplate(dataUrl, name)`
- `selectSignatureTemplate(id)`
- `placeSignature(pageIndex, xPct, yPct, templateId)`
- `moveAnnotation(id, xPct, yPct)`
- `resizeAnnotation(id, widthPct, heightPct, xPct, yPct)`
- `selectAnnotation(id | null)`
- `deleteAnnotation(id)`
- `copySignatureAnnotation(id)`
- `pasteSignatureAnnotation()`

## 10.2 Invariants

- Annotation geometry always clamped to page bounds.
- Annotation `pageIndex` always valid for active document.
- `signature` annotations must reference existing template IDs.

## 11. Persistence Strategy

## 11.1 In-memory

- Active PDF bytes and annotations stay in memory only.

## 11.2 Local storage

- Signature templates persist to browser `localStorage`.
- Store key: `ezpdfsigner.signatureTemplates.v1`.
- Validation on load with type guards; drop invalid entries.

## 12. Error Handling

## 12.1 User-facing errors

- Unsupported file type.
- PDF parse/render failure.
- Export failure.
- Signature template missing/corrupt.

## 12.2 Error UX

- Non-blocking toast for recoverable issues.
- Modal for hard failures with retry option.
- Keep existing work in memory when possible.

## 13. Performance Targets

- Initial render for 10-page normal PDF: under 2s on modern laptop.
- Drag/resize interactions: smooth at 30+ FPS.
- Export for 20-page doc with 20 annotations: under 3s.

## 14. Security and Privacy

- No server upload in V1.
- All processing local in browser.
- No analytics required for MVP.
- Sanitize filename used for download output.

## 15. Accessibility Baseline

- Keyboard reachable controls for toolbar and signature panel.
- Visible focus states.
- Action buttons include accessible labels.
- Default color contrast meets WCAG AA where feasible.

## 16. Test Strategy

## 16.1 Unit Tests

- Coordinate conversion helpers.
- Annotation clamp logic.
- Clipboard copy/paste behavior.
- Signature template persistence parse/validation.

## 16.2 Integration Tests

- Add text via click and edit content.
- Draw/save signature template and place on page.
- Move/resize annotation updates normalized state.

## 16.3 E2E Tests (Playwright)

- Import sample PDF.
- Add text + signature placements across pages.
- Copy/paste signature.
- Export and verify PDF bytes generated.

## 17. Definition of Done (V1)

- All acceptance criteria in `SPEC.md` pass.
- No P0/P1 open bugs in core flows.
- Test suite green for unit/integration + E2E smoke.
- Manual QA checklist completed on Chrome + Edge.
- `WORK_LOG.md` reflects all completed tasks and final verification notes.

## 18. Open Decisions (Resolve During Build)

- Keep inline text edit as HTML overlay or Konva text editing bridge.
- Use single-column scrolling view only (recommended for V1 simplicity).
- Decide whether to include page thumbnails in v1.0 or postpone.
