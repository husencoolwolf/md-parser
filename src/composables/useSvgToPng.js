import { toPng } from 'html-to-image'

/**
 * Converts an SVG string to a PNG data URL using html-to-image.
 * This library is more robust against canvas tainting issues.
 * To ensure Lark-compatibility, we inline computed styles (color, background, fonts)
 * so that when the SVG is cloned into a sandboxed data-URI iframe for rendering,
 * the styles are not lost.
 * 
 * To guarantee pixel-perfect styling (such as white text on dark blue backgrounds),
 * we first attempt to clone the already-rendered, fully styled SVG in the visible DOM preview pane
 * and copy computed styles directly from it. If the selector isn't found, we fall back to
 * off-screen container rendering.
 * 
 * @param {string} svgString - The fallback SVG content to convert.
 * @param {string|null} selector - Optional selector to find the already-rendered visible SVG in the DOM.
 * @returns {Promise<string>} A data URL of the resulting PNG.
 */
export async function svgToPngDataUrl(svgString, selector = null) {
  let svgElement = null
  let container = null

  const stylesToCopy = [
    'color',
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'text-align',
    'fill',
    'stroke',
    'stroke-width',
    'background-color',
    'border',
    'opacity',
    'padding',
    'margin',
    'display',
    'box-sizing'
  ]

  // 1. Try to find the already rendered visible SVG in the DOM to capture perfect computed styles
  if (selector) {
    const visibleSvg = document.querySelector(selector)
    if (visibleSvg) {
      console.log(`[Diagnostic] Selector SUCCESS: Found visible SVG in DOM with ID:`, visibleSvg.id)
      
      // Clone the visible SVG so we can style and convert it without modifying the live preview itself
      svgElement = visibleSvg.cloneNode(true)
      
      // Find all diagram node elements inside the visible SVG
      const visibleNodes = visibleSvg.querySelectorAll('.node')
      let customStyles = ''
      
      for (const visNode of visibleNodes) {
        const nodeId = visNode.id
        if (nodeId) {
          // Find any text or label element inside this node to get the computed text properties
          const textEl = visNode.querySelector('.nodeLabel, span, div, p, b')
          if (textEl) {
            const computed = window.getComputedStyle(textEl)
            const color = computed.color
            const fontFamily = computed.fontFamily
            const fontSize = computed.fontSize
            const fontWeight = computed.fontWeight
            
            // Build highly specific CSS rule targeting all elements nested inside this specific node.
            // This is extremely robust and is guaranteed to override any scoped/!important rules inside the SVG's <style> tag.
            let rule = `#${nodeId} * {`
            if (color) rule += ` color: ${color} !important;`
            if (fontFamily) rule += ` font-family: ${fontFamily} !important;`
            if (fontSize) rule += ` font-size: ${fontSize} !important;`
            if (fontWeight) rule += ` font-weight: ${fontWeight} !important;`
            rule += ` }\n`
            
            customStyles += rule
          }
        }
      }
      
      // Inject the custom stylesheet block directly inside the cloned SVG element
      if (customStyles) {
        const styleSheet = document.createElementNS('http://www.w3.org/2000/svg', 'style')
        styleSheet.textContent = customStyles
        svgElement.appendChild(styleSheet)
        console.log(`[Diagnostic] Injected custom stylesheet inside SVG:\n`, customStyles)
      }
      
      // Also copy styles for non-node elements (like connection lines, edges, arrows) inline as a general backup
      const visibleElements = visibleSvg.getElementsByTagName('*')
      const cloneElements = svgElement.getElementsByTagName('*')
      const backupStyles = ['fill', 'stroke', 'stroke-width', 'opacity']
      
      for (let i = 0; i < visibleElements.length; i++) {
        const visEl = visibleElements[i]
        const cloneEl = cloneElements[i]
        if (visEl && cloneEl && !visEl.closest('.node')) {
          const computed = window.getComputedStyle(visEl)
          for (const prop of backupStyles) {
            const val = computed.getPropertyValue(prop)
            if (val) {
              cloneEl.style.setProperty(prop, val, 'important')
            }
          }
        }
      }
    } else {
      console.log(`[Diagnostic] Selector FAILED: No visible SVG found in DOM for selector:`, selector)
    }
  }

  // 2. Fallback to rendering from string in a temporary container if not found (or in tests/non-browser envs)
  if (!svgElement) {
    container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.top = '-9999px'
    container.innerHTML = svgString
    document.body.appendChild(container)

    svgElement = container.querySelector('svg')
    if (!svgElement) {
      document.body.removeChild(container)
      throw new Error('Invalid SVG string: no <svg> element found')
    }

    // Force style layout/reflow
    container.offsetHeight

    const allElements = svgElement.getElementsByTagName('*')
    for (const el of allElements) {
      const computed = window.getComputedStyle(el)
      for (const prop of stylesToCopy) {
        const val = computed.getPropertyValue(prop)
        if (val) {
          el.style.setProperty(prop, val, 'important')
        }
      }
    }
  } else {
    // Wrap the cloned/styled SVG in a temporary off-screen container in the DOM
    // to ensure reliable canvas rendering in all browser engines.
    container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.top = '-9999px'
    container.appendChild(svgElement)
    document.body.appendChild(container)
  }

  try {
    // 3. Use html-to-image to convert the SVG element to PNG
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
    // 4. Clean up the temporary container
    if (container && document.body.contains(container)) {
      document.body.removeChild(container)
    }
  }
}
