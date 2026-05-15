import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import { renderMermaidToSvg } from './useMermaid'
import { svgToPngDataUrl } from './useSvgToPng'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value
      } catch (__) {}
    }
    return ''
  }
})

const MERMAID_PLACEHOLDER = '[[MERMAID_BLOCK_'

export async function renderMarkdown(rawMd, forLark = false) {
  if (!rawMd) return ''

  const mermaidBlocks = []
  
  const withPlaceholders = rawMd.replace(
    /```mermaid\s*([\s\S]*?)```/g,
    (match, code) => {
      const id = mermaidBlocks.length
      mermaidBlocks.push(code.trim())
      return `${MERMAID_PLACEHOLDER}${id}]]`
    }
  )

  let html = md.render(withPlaceholders)

  if (mermaidBlocks.length > 0) {
    const renderedBlocks = await Promise.all(
      mermaidBlocks.map(async (code, index) => {
        try {
          const svg = await renderMermaidToSvg(code, `preview-${index}`)
          
          if (forLark) {
            const png = await svgToPngDataUrl(svg)
            return { index, content: png, type: 'img' }
          } else {
            return { index, content: svg, type: 'svg' }
          }
        } catch (err) {
          console.error(`Failed to render mermaid block ${index}:`, err)
          return { index, error: true, code }
        }
      })
    )

    renderedBlocks.forEach(({ index, content, type, error, code }) => {
      const placeholder = `${MERMAID_PLACEHOLDER}${index}]]`
      const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(<p>)?${escapedPlaceholder}(</p>)?`, 'g')
      
      if (error) {
        html = html.replace(
          regex,
          `<pre class="mermaid-error"><code>${code}</code></pre>`
        )
      } else if (type === 'svg') {
        html = html.replace(
          regex,
          `<div class="mermaid-container" style="text-align: center; margin: 2rem 0;">${content}</div>`
        )
      } else {
        html = html.replace(
          regex,
          `<div class="mermaid-container" style="text-align: center; margin: 2rem 0;">
            <img src="${content}" style="max-width: 100%; height: auto;" alt="Mermaid Diagram" />
          </div>`
        )
      }
    })
  }

  return html
}
