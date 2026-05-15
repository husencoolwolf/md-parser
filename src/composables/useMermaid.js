import mermaid from 'mermaid'

try {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    flowchart: { useHtmlLabels: true },
    sequence: { useHtmlLabels: true },
    gantt: { useHtmlLabels: true },
  })
} catch (e) {
  console.error('Mermaid initialization failed:', e)
}

export async function renderMermaidToSvg(code, id) {
  try {
    const uniqueId = `${id}-${Math.random().toString(36).substr(2, 9)}`
    const { svg } = await mermaid.render(`mermaid-${uniqueId}`, code)
    return svg
  } catch (error) {
    console.error(`Mermaid rendering failed for ${id}:`, error)
    return `<div class="mermaid-error">Diagram error: ${error.message}</div>`
  }
}
