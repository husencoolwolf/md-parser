# Export to PDF Feature Design Spec

## Overview
Add an **Export to PDF** capability for the rendered Markdown document and Mermaid diagrams in the MD to Lark application.

## User Story
As a user writing Markdown with tables, code, and Mermaid diagrams, I want to export the formatted preview to a clean, high-resolution PDF document so that I can share or archive reports and specifications easily.

## Architecture & Design

### 1. Approach: Native Browser Print to PDF
- Leveraging the browser's native print engine via `window.print()` coupled with dedicated `@media print` CSS rules.
- **Why**: 
  - Produces crisp vector graphics for Mermaid SVGs without blurriness or downsampling.
  - Maintains 100% searchable and selectable text.
  - Zero added bundle weight (no heavy canvas rasterization libraries like `jspdf` or `html2pdf.js`).
  - Native standard A4 page layout handling.

### 2. UI & Interaction Flow
- In [src/App.vue](file:///Users/ali/dev/md-parser/src/App.vue), add an **"Export PDF"** button to the header action bar when `currentMode === 'md-to-lark'`.
- Clicking "Export PDF":
  1. Checks if `markdownInput` is empty. If empty, displays toast `'No markdown content to export'`.
  2. If `isRendering` is true, waits for rendering to settle.
  3. Automatically derives the document title: extracts the first `# Heading` from the Markdown string (or defaults to `MD-Document`), and assigns it to `document.title`. This ensures the browser's default suggested PDF filename is clean and relevant.
  4. Triggers `window.print()`.
  5. Restores `document.title` back to original title (`MD & Lark Bridge`).

### 3. Print Stylesheet Design (@media print)
In [src/style.css](file:///Users/ali/dev/md-parser/src/style.css):
- `@page`: set `size: A4 portrait; margin: 15mm;`.
- Hide UI chrome:
  - `.app-header`, `.mode-switcher`, `.actions`, `.pane:first-child` (markdown editor), `.pane-header`, `.info-banner`, `.toast` are all set to `display: none !important;`.
- Isolate preview container:
  - Reset heights, overflows, background colors, and borders on `.main-content`, `.pane`, and `.preview-container`.
  - Force background `#ffffff` and text `#24292f` for high contrast and ink savings.
- Page break control:
  - `break-inside: avoid; page-break-inside: avoid;` applied to `.mermaid-container`, `table`, `pre`, `code`, and `blockquote` to prevent slicing elements across page boundaries.
  - `break-after: avoid; page-break-after: avoid;` applied to headings (`h1, h2, h3, h4`) to prevent orphan headers at the bottom of pages.
- Responsive diagrams:
  - `.mermaid-container svg` set to `max-width: 100% !important; height: auto !important;` to ensure wide diagrams scale down neatly within printable margins.

## Testing Strategy
- Verification using Vite build (`npm run build`).
- End-to-end browser subagent verification:
  - Verify that the "Export PDF" button appears in the action bar.
  - Verify that clicking it initiates the export handler without JS errors.
  - Verify that print CSS correctly targets elements without breaking screen styling.
