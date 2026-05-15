/**
 * Sanitizes and adjusts HTML for better Lark document compatibility.
 * @param {string} html - The rendered HTML content.
 * @returns {string} Compatible HTML content.
 */
export function prepareForLark(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Lark prefers certain structures.
  // 1. Ensure all images have clear styling
  doc.querySelectorAll('img').forEach(img => {
    img.style.maxWidth = '100%'
    img.style.display = 'block'
    img.style.margin = '16px auto'
  })

  // 2. Wrap tables in a div if needed (Lark handles tables okayish but styling helps)
  doc.querySelectorAll('table').forEach(table => {
    table.setAttribute('border', '1')
    table.style.borderCollapse = 'collapse'
    table.style.width = '100%'
    table.querySelectorAll('th, td').forEach(cell => {
      cell.style.border = '1px solid #ddd'
      cell.style.padding = '8px'
    })
  })

  // 3. Highlight.js blocks might need some padding for Lark
  doc.querySelectorAll('pre code').forEach(code => {
    const pre = code.parentElement
    if (pre) {
      pre.style.backgroundColor = '#f6f8fa'
      pre.style.padding = '16px'
      pre.style.borderRadius = '6px'
      pre.style.overflow = 'auto'
    }
  })

  return doc.body.innerHTML
}
