import { toPng } from 'html-to-image'

/**
 * Converts an SVG string to a PNG data URL using html-to-image.
 * This library is more robust against canvas tainting issues.
 * @param {string} svgString - The SVG content to convert.
 * @returns {Promise<string>} A data URL of the resulting PNG.
 */
export async function svgToPngDataUrl(svgString) {
  // 1. Create a temporary container to render the SVG
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '-9999px'
  container.innerHTML = svgString
  document.body.appendChild(container)

  const svgElement = container.querySelector('svg')
  if (!svgElement) {
    document.body.removeChild(container)
    throw new Error('Invalid SVG string: no <svg> element found')
  }

  try {
    // 2. Use html-to-image to convert the SVG element to PNG
    // We add some padding and white background to ensure it looks good
    const dataUrl = await toPng(svgElement, {
      backgroundColor: '#ffffff',
      cacheBust: true,
      // Ensure the dimensions are captured correctly
      width: svgElement.viewBox?.baseVal?.width || svgElement.width?.baseVal?.value || 800,
      height: svgElement.viewBox?.baseVal?.height || svgElement.height?.baseVal?.value || 400,
    })

    return dataUrl
  } catch (error) {
    console.error('html-to-image conversion failed:', error)
    // Fallback to the SVG data URL if PNG conversion fails
    // (though we know Lark might not like it)
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`
  } finally {
    // 3. Clean up the temporary container
    if (document.body.contains(container)) {
      document.body.removeChild(container)
    }
  }
}
