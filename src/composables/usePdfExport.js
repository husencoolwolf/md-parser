import { jsPDF } from 'jspdf'
import { toCanvas } from 'html-to-image'

/**
 * Configuration constants for standard A4 page layout in millimeters.
 */
const A4_CONFIG = {
  PAGE_WIDTH_MM: 210,
  PAGE_HEIGHT_MM: 297,
  MARGIN_X_MM: 10,
  MARGIN_Y_MM: 10,
}

/**
 * Calculates page dimensions and scaling factors between canvas pixels and PDF millimeters.
 *
 * @param {number} canvasWidth - Full width of source canvas in pixels.
 * @param {number} canvasHeight - Full height of source canvas in pixels.
 * @returns {object} Calculated dimension metrics including content dimensions and page counts.
 */
export function calculatePdfDimensions(canvasWidth, canvasHeight) {
  const printableWidthMm = A4_CONFIG.PAGE_WIDTH_MM - (A4_CONFIG.MARGIN_X_MM * 2)
  const printableHeightMm = A4_CONFIG.PAGE_HEIGHT_MM - (A4_CONFIG.MARGIN_Y_MM * 2)

  // Ratio to convert canvas pixels to PDF millimeters
  const mmPerPx = printableWidthMm / canvasWidth

  // Maximum canvas pixel height that can fit on a single A4 page
  const pageCanvasHeightPx = Math.floor(printableHeightMm / mmPerPx)

  const totalPages = Math.ceil(canvasHeight / pageCanvasHeightPx)

  return {
    printableWidthMm,
    printableHeightMm,
    mmPerPx,
    pageCanvasHeightPx,
    totalPages,
  }
}

/**
 * Creates a sliced canvas containing a single vertical page segment of the source canvas.
 *
 * @param {HTMLCanvasElement} sourceCanvas - The full source canvas.
 * @param {number} startY - Starting Y pixel offset on the source canvas.
 * @param {number} sliceHeight - Height in pixels for the current page slice.
 * @returns {HTMLCanvasElement} Cropped canvas for the individual page.
 */
export function createPageSliceCanvas(sourceCanvas, startY, sliceHeight) {
  const pageCanvas = document.createElement('canvas')
  pageCanvas.width = sourceCanvas.width
  pageCanvas.height = sliceHeight

  const ctx = pageCanvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to obtain 2D rendering context for PDF page slice.')
  }

  // Fill pure white background to ensure opaque print rendering
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)

  // Draw slice from source canvas
  ctx.drawImage(
    sourceCanvas,
    0,
    startY,
    sourceCanvas.width,
    sliceHeight,
    0,
    0,
    pageCanvas.width,
    sliceHeight
  )

  return pageCanvas
}

/**
 * Assembles a multi-page jsPDF document from a source canvas and triggers browser download.
 *
 * @param {HTMLCanvasElement} sourceCanvas - Full document canvas rendered from DOM.
 * @param {string} fileName - Suggested file name without extension.
 * @returns {void}
 */
export function generatePdfDocument(sourceCanvas, fileName) {
  const dimensions = calculatePdfDimensions(sourceCanvas.width, sourceCanvas.height)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  let remainingHeightPx = sourceCanvas.height
  let currentYPx = 0
  let pageIndex = 0

  while (remainingHeightPx > 0) {
    const currentSliceHeightPx = Math.min(dimensions.pageCanvasHeightPx, remainingHeightPx)
    const sliceCanvas = createPageSliceCanvas(sourceCanvas, currentYPx, currentSliceHeightPx)

    if (pageIndex > 0) {
      pdf.addPage('a4', 'portrait')
    }

    const sliceHeightMm = currentSliceHeightPx * dimensions.mmPerPx
    const sliceDataUrl = sliceCanvas.toDataURL('image/png', 1.0)

    pdf.addImage(
      sliceDataUrl,
      'PNG',
      A4_CONFIG.MARGIN_X_MM,
      A4_CONFIG.MARGIN_Y_MM,
      dimensions.printableWidthMm,
      sliceHeightMm,
      undefined,
      'FAST'
    )

    currentYPx += currentSliceHeightPx
    remainingHeightPx -= currentSliceHeightPx
    pageIndex += 1
  }

  const sanitizedFileName = (fileName || 'document').replace(/\.pdf$/i, '')
  pdf.save(`${sanitizedFileName}.pdf`)
}

/**
 * Orchestrator: Captures a target DOM element to high-DPI canvas, builds PDF pages, and downloads.
 *
 * @param {HTMLElement} targetElement - DOM element containing the rendered markdown & diagrams.
 * @param {string} documentTitle - Document title for the downloaded file.
 * @returns {Promise<void>}
 */
export async function exportElementToPdf(targetElement, documentTitle = 'document') {
  if (!targetElement) {
    throw new Error('Target element for PDF export was not found in the DOM.')
  }

  // Render high-DPI canvas using html-to-image
  const canvas = await toCanvas(targetElement, {
    backgroundColor: '#ffffff',
    pixelRatio: 2, // 2x for sharp text and SVG diagrams
    style: {
      padding: '24px',
      margin: '0',
      backgroundColor: '#ffffff',
      color: '#24292f',
    },
  })

  generatePdfDocument(canvas, documentTitle)
}
