# EZPDFSigner MVP Spec

## 1. Objective

Build a minimal PDF editing tool that does exactly this:

- Open a PDF.
- Add text by clicking where text should appear.
- Draw a signature once, then place that signature on the PDF as many times as needed.
- Copy/paste placed signatures to duplicate them quickly.
- Export a new PDF with the text and signatures burned in.

No extra features are required for V1.

## 2. Platform Choice

Use a **web app** (local-first) because it is faster to implement and easier to iterate than a native Windows app.

## 3. Scope

### In scope (MVP)

- Import PDF from local file system.
- View multi-page PDF.
- Add text annotation on click.
- Draw signature in a signature pad modal/panel.
- Save one or more signature templates.
- Place a saved signature on any page.
- Select/move/resize placed items (text/signatures).
- Copy/paste selected signature instance.
- Delete selected item.
- Export edited PDF.

### Out of scope (MVP)

- OCR, form field detection, or field auto-fill.
- Real-time collaboration.
- Cloud sync/storage/accounts.
- Redaction, highlight, comments, stamps.
- Cryptographic/digital certificate signing.

## 4. User Flows

### Flow A: Add text

1. User uploads a PDF.
2. User selects `Text` tool.
3. User clicks a location on a page.
4. A text box appears in edit mode.
5. User types text, confirms, and can drag/resize if needed.

### Flow B: Draw and reuse signature

1. User opens `Signatures` panel.
2. User draws signature in a canvas pad.
3. User saves it as a reusable signature template.
4. User selects that signature and clicks on page to place it.
5. User can copy/paste the placed signature to duplicate it elsewhere.

### Flow C: Export

1. User clicks `Export PDF`.
2. App embeds all text/signature overlays into the PDF pages.
3. Browser downloads finalized PDF.

## 5. Functional Requirements

### FR-1 PDF import/render

- Accept `.pdf` files via file picker/drag-drop.
- Render all pages with readable quality and zoom support.

### FR-2 Text tool

- Click-to-place text box.
- Editable content (single or multi-line).
- Basic controls: font size, color (black default).
- Move and resize after placement.

### FR-3 Signature creation

- Freehand drawing on a canvas pad.
- Clear and re-draw.
- Save signature template as transparent PNG (or equivalent image data).

### FR-4 Signature placement

- Place signature template on any page.
- Move/resize after placement.
- Duplicate via copy/paste keyboard shortcuts (`Ctrl+C`, `Ctrl+V`).

### FR-5 Selection and editing

- Single selection at minimum.
- Delete selected item (`Delete` key/button).
- Maintain per-page placement.

### FR-6 Export

- Generate new PDF preserving original pages.
- Burn in text and signature overlays using page coordinates.
- Download edited file.

## 6. UX Requirements

- Keep UI simple: toolbar + left panel (optional) + page canvas.
- Tool modes: `Select`, `Text`, `Signature`.
- Click behavior is predictable by active tool.
- Undo/redo optional for V1 (nice-to-have, not required).

## 7. Technical Architecture

### 7.1 Frontend stack

- React + TypeScript + Vite.
- `pdfjs-dist` for PDF rendering.
- `react-konva` (or Konva) for interactive annotation layer.
- `pdf-lib` for writing final text/signature into exported PDF.
- `signature_pad` for capture of drawn signature strokes.

### 7.2 Rendering model

- For each page:
  - Background: rasterized page canvas from PDF.js.
  - Overlay: Konva layer for annotation objects.
- Store annotation coordinates in normalized units:
  - `xPct`, `yPct`, `widthPct`, `heightPct` relative to page size.
  - Prevents misalignment across zoom/resizing.

### 7.3 Data model

```ts
type SignatureTemplate = {
  id: string
  name: string
  imageDataUrl: string // transparent PNG
  createdAt: string
}

type TextAnnotation = {
  id: string
  pageIndex: number
  type: 'text'
  xPct: number
  yPct: number
  widthPct: number
  heightPct: number
  text: string
  fontSize: number
  color: string
}

type SignatureAnnotation = {
  id: string
  pageIndex: number
  type: 'signature'
  xPct: number
  yPct: number
  widthPct: number
  heightPct: number
  templateId: string
}
```

### 7.4 Export mapping

- Load original PDF bytes with `pdf-lib`.
- For each annotation:
  - Convert normalized coordinates to absolute PDF page coordinates.
  - For text: `page.drawText(...)`.
  - For signature: embed template PNG and `page.drawImage(...)`.
- Save and trigger browser download.

## 8. File/Module Plan

- `src/app/App.tsx`: top-level state and layout.
- `src/features/pdf/PdfViewer.tsx`: page rendering + zoom.
- `src/features/annotations/AnnotationLayer.tsx`: Konva layer and interactions.
- `src/features/signature/SignaturePadModal.tsx`: draw/clear/save signature.
- `src/features/export/exportPdf.ts`: flatten annotations into PDF.
- `src/state/useEditorStore.ts`: central editor state (Zustand or React context).

## 9. Implementation Phases

### Phase 1: Viewer + data plumbing

- Upload PDF and render pages.
- Basic app state and page dimensions.

### Phase 2: Text annotations

- Add/select/move/resize text boxes.
- Inline edit text.

### Phase 3: Signature templates + placement

- Signature pad.
- Save templates and place on page.
- Copy/paste selected signature.

### Phase 4: Export

- Flatten overlays into output PDF.
- Download.

### Phase 5: Hardening

- Keyboard handling polish.
- Edge cases (very large PDFs, zoom mapping checks).

## 10. Acceptance Criteria

- User can open a PDF with multiple pages.
- User can click to add text and edit it.
- User can draw a signature and save it.
- User can place same signature multiple times.
- User can copy/paste a placed signature.
- Exported PDF contains all added text/signatures in expected positions.
- No features outside this scope are required for MVP completion.

## 11. Risks and Mitigations

- Coordinate mismatches between canvas and PDF units.
  - Mitigation: normalized coordinates + conversion helper tests.
- Large PDF performance.
  - Mitigation: virtualized page rendering and lazy page canvases.
- Browser memory with many signatures/pages.
  - Mitigation: cache limits and cleanup for offscreen canvases.
