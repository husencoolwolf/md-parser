# Export to PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to export parsed Markdown and Mermaid diagrams as a high-fidelity vector PDF using native browser print capabilities with tailored print stylesheets.

**Architecture:** Add print CSS styles in `src/style.css` to isolate `.markdown-body` and format A4 margins while suppressing UI chrome. Implement `handleExportPdf` in `src/App.vue` to sanitize title, ensure diagram rendering is settled, and invoke `window.print()`.

**Tech Stack:** Vue 3, CSS3 `@media print`, SVG/Mermaid.js, Vite.

---

### Task 1: Add Print Stylesheet Rules in CSS

**Files:**
- Modify: `src/style.css:220-250`

- [ ] **Step 1: Define `@media print` rules for document isolation and page breaking**

In [src/style.css](file:///Users/ali/dev/md-parser/src/style.css), append print media rules:
```css
/* Print Media Styles for PDF Export */
@media print {
  @page {
    size: A4 portrait;
    margin: 15mm;
  }

  body {
    background: #ffffff !important;
    color: #24292f !important;
  }

  /* Hide app navigation, toolbar, left editor pane, toast, and banners */
  .app-header,
  .mode-switcher,
  .actions,
  .pane:first-child,
  .pane-header,
  .info-banner,
  .toast,
  .loading-overlay {
    display: none !important;
  }

  /* Reset main layout grid/flex into standard printable block flow */
  .main-content {
    display: block !important;
    height: auto !important;
    overflow: visible !important;
    padding: 0 !important;
  }

  .pane {
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
    height: auto !important;
    overflow: visible !important;
  }

  .preview-container {
    height: auto !important;
    overflow: visible !important;
    padding: 0 !important;
    background: transparent !important;
  }

  .markdown-body {
    color: #24292f !important;
    background: transparent !important;
    font-size: 11pt !important;
    line-height: 1.6 !important;
  }

  /* Avoid breaking diagrams, tables, and code snippets across pages */
  .mermaid-container,
  table,
  pre,
  blockquote {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }

  /* Avoid orphan headings at bottom of page */
  h1, h2, h3, h4, h5, h6 {
    break-after: avoid !important;
    page-break-after: avoid !important;
  }

  /* Ensure Mermaid diagrams scale properly within print margin */
  .mermaid-container svg {
    max-width: 100% !important;
    height: auto !important;
  }
}
```

- [ ] **Step 2: Verify CSS syntax and build**

Run: `npm run build`
Expected: Build succeeds with 0 errors.

---

### Task 2: Implement Export to PDF Handler and UI Button in App.vue

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Add `extractDocumentTitle` helper and `handleExportPdf` method**

In [src/App.vue](file:///Users/ali/dev/md-parser/src/App.vue), add the helper function and export method:
```javascript
/**
 * Extracts a document title from the first Markdown heading or returns a fallback.
 * @param {string} markdown - The raw markdown text.
 * @returns {string} Clean document title for PDF filename suggestion.
 */
const extractDocumentTitle = (markdown) => {
  if (!markdown) return 'document'
  const match = markdown.match(/^#\s+(.+)$/m)
  if (match && match[1]) {
    return match[1].trim().replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_')
  }
  return 'markdown-doc'
}

/**
 * Handles exporting the rendered Markdown preview as a PDF via native browser print.
 */
const handleExportPdf = async () => {
  if (!markdownInput.value.trim()) {
    notify('No markdown content to export', true)
    return
  }

  // If diagrams are still rendering, wait briefly
  if (isRendering.value) {
    notify('Rendering diagrams, please wait...')
    return
  }

  const previousTitle = document.title
  const suggestedTitle = extractDocumentTitle(markdownInput.value)
  
  try {
    document.title = suggestedTitle
    window.print()
  } finally {
    document.title = previousTitle
  }
}
```

- [ ] **Step 2: Add "Export PDF" button to the header actions**

In [src/App.vue](file:///Users/ali/dev/md-parser/src/App.vue) template under `currentMode === 'md-to-lark'` actions:
```html
<button class="btn btn-outline" @click="handleExportPdf" :disabled="isRendering" title="Export to PDF">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M6 9V2h12v7"></path>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
    <path d="M6 14h12v8H6z"></path>
  </svg>
  Export PDF
</button>
```

- [ ] **Step 3: Verify build and test with browser**

Run: `npm run build`
Expected: Build passes with 0 errors.

---

### Task 3: Verification & Visual Testing

**Files:**
- Test: Browser verification on `http://localhost:5173/`

- [ ] **Step 1: Start dev server and launch browser check**
- [ ] **Step 2: Confirm Export PDF button is clickable and triggers print action**
- [ ] **Step 3: Confirm print styles cleanly isolate the markdown preview without UI contamination**
