import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

// Ensure global html2canvas is set for jsPDF internal worker
if (typeof window !== 'undefined' && !window.html2canvas) {
  window.html2canvas = html2canvas
}

/**
 * Extracts a sensible document title from Markdown or HTML content.
 * @param {string} rawContent - Markdown or HTML content.
 * @param {string} fallback - Fallback title if none found.
 * @returns {string} The extracted title.
 */
export function extractDocumentTitle(rawContent, fallback = 'Lark Document') {
  if (!rawContent) return fallback

  // Check for Markdown # Title
  const mdMatch = rawContent.match(/^#\s+(.+)$/m)
  if (mdMatch && mdMatch[1]) {
    return mdMatch[1].trim()
  }

  // Check for HTML <h1>Title</h1>
  const htmlMatch = rawContent.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (htmlMatch && htmlMatch[1]) {
    // Strip any nested HTML tags from the title
    return htmlMatch[1].replace(/<[^>]+>/g, '').trim()
  }

  return fallback
}

/**
 * Sanitizes a title for use as a file name.
 * @param {string} title - The document title.
 * @returns {string} Safe filename with .pdf extension.
 */
export function sanitizeFilename(title) {
  const safeName = (title || 'lark-doc')
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5-]/g, '')
    .trim()
    .replace(/[-\s]+/g, '-')
    .slice(0, 60)
  return `${safeName || 'lark-doc'}.pdf`
}

/**
 * Builds the Lark-styled document HTML wrapper with Lark typography and header.
 * @param {string} bodyHtml - Rendered HTML content.
 * @param {object} metadata - Document metadata (title, date).
 * @returns {string} Fully styled HTML string.
 */
function buildLarkPdfTemplate(bodyHtml, { title, date }) {
  const formattedDate = date || new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  return `
    <div class="lark-pdf-page">
      <header class="lark-pdf-header">
        <div class="lark-pdf-brand">
          <svg class="lark-pdf-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#3370ff" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span class="lark-pdf-badge">Lark Doc</span>
        </div>
        <div class="lark-pdf-meta">
          <span class="lark-pdf-date">${formattedDate}</span>
        </div>
      </header>

      <article class="lark-pdf-content markdown-body">
        ${bodyHtml}
      </article>

      <footer class="lark-pdf-footer">
        <span>Exported with MD & Lark Bridge</span>
      </footer>
    </div>
  `
}

/**
 * CSS styles specifically tailored for Lark Docs PDF generation.
 */
const LARK_PDF_STYLES = `
  .lark-pdf-page {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    color: #1f2329;
    background-color: #ffffff;
    line-height: 1.6;
    font-size: 14px;
    padding: 0;
    margin: 0;
  }

  .lark-pdf-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 12px;
    margin-bottom: 24px;
    border-bottom: 1px solid #dee0e3;
  }

  .lark-pdf-brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .lark-pdf-badge {
    background-color: #e1eaff;
    color: #3370ff;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .lark-pdf-meta {
    font-size: 12px;
    color: #8f959e;
  }

  .lark-pdf-footer {
    margin-top: 36px;
    padding-top: 12px;
    border-top: 1px solid #dee0e3;
    font-size: 11px;
    color: #8f959e;
    text-align: center;
  }

  /* Content typography */
  .lark-pdf-content h1 {
    font-size: 26px;
    font-weight: 600;
    color: #1f2329;
    margin-top: 24px;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #dee0e3;
    line-height: 1.3;
    page-break-after: avoid;
    break-after: avoid;
  }

  .lark-pdf-content h2 {
    font-size: 20px;
    font-weight: 600;
    color: #1f2329;
    margin-top: 20px;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #dee0e3;
    line-height: 1.35;
    page-break-after: avoid;
    break-after: avoid;
  }

  .lark-pdf-content h3 {
    font-size: 16px;
    font-weight: 600;
    color: #1f2329;
    margin-top: 16px;
    margin-bottom: 8px;
    line-height: 1.4;
    page-break-after: avoid;
    break-after: avoid;
  }

  .lark-pdf-content p {
    margin: 0 0 10px 0;
    line-height: 1.65;
  }

  .lark-pdf-content ul, .lark-pdf-content ol {
    margin: 8px 0 14px;
    padding-left: 24px;
  }

  .lark-pdf-content li {
    margin: 4px 0;
  }

  /* Lark Callout / Blockquotes */
  .lark-pdf-content blockquote {
    background-color: #f5f6f7;
    border-left: 4px solid #3370ff;
    padding: 10px 14px;
    border-radius: 4px;
    margin: 14px 0;
    color: #1f2329;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Lark Tables */
  .lark-pdf-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    border: 1px solid #dee0e3;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .lark-pdf-content th, .lark-pdf-content td {
    padding: 8px 12px;
    border: 1px solid #dee0e3;
    font-size: 13px;
    text-align: left;
  }

  .lark-pdf-content th {
    background-color: #f5f6f7;
    font-weight: 600;
    color: #1f2329;
  }

  .lark-pdf-content tr:nth-child(even) {
    background-color: #fafafa;
  }

  /* Lark Code Blocks */
  .lark-pdf-content pre {
    background-color: #f5f6f7;
    border: 1px solid #dee0e3;
    border-radius: 6px;
    padding: 12px 14px;
    margin: 14px 0;
    font-size: 12px;
    line-height: 1.5;
    page-break-inside: avoid;
    break-inside: avoid;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .lark-pdf-content code {
    font-family: "JetBrains Mono", Consolas, Monaco, monospace;
  }

  .lark-pdf-content p code, .lark-pdf-content li code {
    background-color: #f2f3f5;
    color: #1f2329;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 85%;
  }

  /* Diagrams & Images */
  .lark-pdf-content .mermaid-container {
    text-align: center;
    margin: 20px 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .lark-pdf-content img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    display: inline-block;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Avoid page breaks inside key blocks */
  .lark-pdf-content tr,
  .lark-pdf-content pre,
  .lark-pdf-content blockquote,
  .lark-pdf-content .mermaid-container {
    page-break-inside: avoid;
    break-inside: avoid;
  }
`

/**
 * Downloads a Lark-compatible rendered HTML as a styled PDF file.
 * Uses high-resolution canvas capture and pagination onto A4 pages for 100% reliable rendering
 * across all PDF viewers without font or Unicode issues.
 * 
 * @param {HTMLElement|string} source - DOM element or HTML string.
 * @param {object} options - Options including title, filename, date.
 * @returns {Promise<string>} The filename of the downloaded PDF.
 */
export async function downloadLarkPdf(source, options = {}) {
  let sourceEl = null

  if (source instanceof HTMLElement) {
    sourceEl = source
  } else if (typeof source === 'string') {
    sourceEl = document.createElement('div')
    sourceEl.className = 'markdown-body'
    sourceEl.innerHTML = source
  } else {
    throw new Error('Invalid source provided for PDF generation')
  }

  const rawText = sourceEl.innerText || sourceEl.textContent || ''
  const title = options.title || extractDocumentTitle(rawText) || 'Lark Document'
  const filename = options.filename || sanitizeFilename(title)
  const formattedDate = options.date || new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  // 1. Create wrapper off-screen at fixed (0,0) to prevent clipping or displacement
  const wrapper = document.createElement('div')
  wrapper.className = 'lark-pdf-capture-container'
  wrapper.style.position = 'fixed'
  wrapper.style.left = '0'
  wrapper.style.top = '0'
  wrapper.style.width = '800px'
  wrapper.style.backgroundColor = '#ffffff'
  wrapper.style.padding = '36px 40px'
  wrapper.style.boxSizing = 'border-box'
  wrapper.style.zIndex = '-9999'
  wrapper.style.pointerEvents = 'none'

  // Lark Doc Header
  const header = document.createElement('div')
  header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #dee0e3; padding-bottom: 12px; margin-bottom: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;'
  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="background-color: #e1eaff; color: #3370ff; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">LARK DOC</span>
      <span style="font-size: 14px; font-weight: 600; color: #1f2329;">${title}</span>
    </div>
    <span style="font-size: 12px; color: #8f959e;">${formattedDate}</span>
  `
  wrapper.appendChild(header)

  // Clone content element
  const clone = sourceEl.cloneNode(true)
  wrapper.appendChild(clone)

  // Lark Doc Footer
  const footer = document.createElement('div')
  footer.style.cssText = 'margin-top: 36px; padding-top: 12px; border-top: 1px solid #dee0e3; font-size: 11px; color: #8f959e; text-align: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;'
  footer.textContent = 'Exported with MD & Lark Bridge'
  wrapper.appendChild(footer)

  document.body.appendChild(wrapper)

  try {
    // 2. Ensure all images are loaded
    const images = Array.from(wrapper.querySelectorAll('img'))
    if (images.length > 0) {
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve()
          return new Promise((resolve) => {
            img.onload = resolve
            img.onerror = resolve
            setTimeout(resolve, 2000)
          })
        })
      )
    }

    // 3. Capture high-res canvas via html2canvas (scale: 2 for sharp retina quality)
    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 800
    })

    // 4. Multi-page pagination onto A4 pages in jsPDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    })

    const pageWidth = 210
    const pageHeight = 297
    const margin = 10
    const contentWidth = pageWidth - margin * 2 // 190mm
    const pageUsableHeight = pageHeight - margin * 2 // 277mm

    const pxWidth = canvas.width
    const pxPageHeight = Math.floor((pageUsableHeight * pxWidth) / contentWidth)

    let yOffset = 0
    let isFirst = true

    while (yOffset < canvas.height) {
      if (!isFirst) {
        doc.addPage()
      }
      isFirst = false

      const sliceHeight = Math.min(pxPageHeight, canvas.height - yOffset)
      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = pxWidth
      pageCanvas.height = sliceHeight
      const ctx = pageCanvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, pxWidth, sliceHeight)
      ctx.drawImage(canvas, 0, yOffset, pxWidth, sliceHeight, 0, 0, pxWidth, sliceHeight)

      const sliceDataUrl = pageCanvas.toDataURL('image/png')
      const sliceMmHeight = (sliceHeight * contentWidth) / pxWidth
      doc.addImage(sliceDataUrl, 'PNG', margin, margin, contentWidth, sliceMmHeight, undefined, 'FAST')

      yOffset += pxPageHeight
    }

    // 5. Trigger download
    doc.save(filename)
    return filename
  } finally {
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper)
    }
  }
}
