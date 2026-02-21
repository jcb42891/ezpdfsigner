# Sign a PDF with no BS

EZPDFSigner is a local-first web app for minimal PDF editing:

- Add text by clicking on the page
- Draw and save reusable signatures
- Place/copy/paste signatures
- Export a new PDF with edits burned in

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Commands

```bash
npm run lint
npm run test
npm run test:e2e
npm run build
```

## Current Scope (V1)

- PDF upload + multi-page rendering
- Text annotations (add/edit/move/resize/delete)
- Signature templates (draw/save/place/delete)
- Signature copy/paste (`Ctrl+C`, `Ctrl+V`)
- Flattened PDF export

## Docs

- `SPEC.md`: product-level scope and acceptance criteria
- `TECH_SPEC.md`: implementation architecture and project structure
- `WORK_LOG.md`: milestone tracker and implementation log
