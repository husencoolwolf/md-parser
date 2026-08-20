import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

/**
 * Initializes and configures the Turndown service with GFM support and custom Lark rules.
 * @returns {TurndownService} Configured Turndown instance.
 */
function createTurndownService() {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**'
  })

  // Apply GitHub Flavored Markdown plugin (tables, task lists, strikethrough)
  turndownService.use(gfm)

  // Custom Rule: Lark Callout Blocks
  turndownService.addRule('larkCallout', {
    filter: function (node) {
      return (
        node.nodeName === 'DIV' &&
        (node.getAttribute('data-block-type') === 'callout' ||
          node.classList.contains('callout-block') ||
          node.getAttribute('data-zone-type') === 'callout')
      )
    },
    replacement: function (content) {
      const trimmed = content.trim()
      const lines = trimmed.split('\n')
      const quotedLines = lines.map((line) => `> ${line}`).join('\n')
      return `\n\n> [!NOTE]\n${quotedLines}\n\n`
    }
  })

  // Custom Rule: Lark Code Blocks with language preservation
  turndownService.addRule('larkCodeBlock', {
    filter: function (node) {
      return (
        node.nodeName === 'PRE' ||
        (node.nodeName === 'DIV' && node.getAttribute('data-block-type') === 'code')
      )
    },
    replacement: function (content, node) {
      const codeElement = node.querySelector('code') || node
      const language =
        codeElement.getAttribute('data-language') ||
        codeElement.getAttribute('data-lang') ||
        node.getAttribute('data-language') ||
        ''
      const text = codeElement.textContent || content
      return `\n\n\`\`\`${language}\n${text.trim()}\n\`\`\`\n\n`
    }
  })

  // Custom Rule: Lark Task / Checklist Items
  turndownService.addRule('larkTaskListItem', {
    filter: function (node) {
      return (
        node.nodeName === 'LI' &&
        (node.getAttribute('data-task') !== null ||
          node.querySelector('input[type="checkbox"]') !== null)
      )
    },
    replacement: function (content, node) {
      const checkbox = node.querySelector('input[type="checkbox"]')
      const isChecked = checkbox ? checkbox.checked : node.getAttribute('data-checked') === 'true'
      const checkMark = isChecked ? '[x]' : '[ ]'
      const cleanContent = content.replace(/^\[[ xX]\]\s*/, '').trim()
      return `- ${checkMark} ${cleanContent}\n`
    }
  })

  // Custom Rule: Preserve Image Elements
  turndownService.addRule('larkImages', {
    filter: 'img',
    replacement: function (content, node) {
      const alt = node.getAttribute('alt') || 'image'
      const src = node.getAttribute('src') || ''
      if (!src) return ''
      return `![${alt}](${src})`
    }
  })

  return turndownService
}

const turndownInstance = createTurndownService()

/**
 * Pre-cleans Lark HTML markup before passing it to Turndown.
 * @param {string} rawHtml - The raw HTML string copied from Lark clipboard.
 * @returns {string} Sanitized and pre-normalized HTML string.
 */
export function preCleanLarkHtml(rawHtml) {
  if (!rawHtml) return ''

  const parser = new DOMParser()
  const doc = parser.parseFromString(rawHtml, 'text/html')

  // Clean empty spans and remove excessive Lark metadata wrappers
  doc.querySelectorAll('script, style, meta, link').forEach((el) => el.remove())

  // Unwrap redundant span tags without attributes or formatting
  doc.querySelectorAll('span').forEach((span) => {
    if (!span.attributes.length && span.parentNode) {
      span.replaceWith(...span.childNodes)
    }
  })

  return doc.body.innerHTML
}

/**
 * Converts Lark HTML (or standard rich HTML) to GitHub Flavored Markdown.
 * @param {string} htmlContent - The HTML string to convert.
 * @returns {string} The resulting Markdown text.
 */
export function convertHtmlToMarkdown(htmlContent) {
  if (!htmlContent || !htmlContent.trim()) {
    return ''
  }

  try {
    const cleanedHtml = preCleanLarkHtml(htmlContent)
    const markdown = turndownInstance.turndown(cleanedHtml)
    return markdown.trim()
  } catch (error) {
    console.error('Failed to convert HTML to Markdown:', error)
    return ''
  }
}
